// coap_watchdog.c
// Build: link with -lcoap-3 -lssl -lcrypto -ljson-c -lm
#include <coap3/coap.h>
#include <json-c/json.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <signal.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <errno.h>
#include <termios.h>
#include <sys/wait.h>

#include <uci.h>

#include "cioclient_log.h"
#include "single_instance.h"

#define CF_JSON 50
#define CLIENTID_DIRECTORY     "/etc/clientID"
#define CLIENTID_FILE_PATH      "/etc/clientID/imei.txt"
#define LOG_BUF_SZ               128
#define MAX_RETRY_COUNT 	2  // Allow 2 re-executions (3 total attempts)
static void die_on_alarm(int sig){ _exit(3); }

/* ===== Hard-coded Creds===== */
static const char *SITU_SCRIPT = "/usr/bin/cio/make_situation_json.sh | jsonfilter -e '@'";
static const char *RUN_SCRIPT  = "/usr/bin/cio/run_cmd_to_json.sh";

static char HOST_IP[64] = "52.25.126.205";
static uint16_t HOST_PORT = 5685;
static char PSK_ID[64] = "device-002";
static char PSK_HEX[128] = "95132c963ea8103ed40f692f23d9dcb7fa65acc14ce9d60d7a0271638bc331b7";

/* ====================== */

static char cachedIMEI[16] = "";
#define CMD_GET_DELAY  60   // Delay (in seconds) after POST before GET
#define DEFAULT_SMS_NUMBER "+18174427714"  
/* Define caps to keep the total JSON under ~900 bytes */
#define STDOUT_LIMIT 350
#define STDERR_LIMIT 150
static void ensure_dir_exists(const char *dir) {
    /* ignore error if it already exists */
    mkdir(dir, 0775);
}

/* Get device serial number using `mnf_info -s` */
int get_device_serial(char *buf, size_t buflen) {
	if (!buf || buflen == 0) return -1;

	FILE *fp = popen("mnf_info -s 2>/dev/null", "r");
	if (!fp) {
		buf[0] = '\0';
		return -1;
	}

	char line[128] = {0};
	if (fgets(line, sizeof(line), fp) == NULL) {
		pclose(fp);
		buf[0] = '\0';
		return -1;
	}
	pclose(fp);

	// Trim trailing newline
	size_t len = strlen(line);
	if (len > 0 && line[len - 1] == '\n') {
		line[len - 1] = '\0';
	}

	// Copy safely to output buffer
	strncpy(buf, line, buflen - 1);
	buf[buflen - 1] = '\0';

	return (strlen(buf) > 0) ? 0 : -1;
}

/* Get modem ICCID number using `mnf_info -s` */
int get_modem_iccid(char *buf, size_t buflen) {
	if (!buf || buflen == 0) return -1;

	FILE *fp = popen("gsmctl -J 2>/dev/null", "r");
	if (!fp) {
		buf[0] = '\0';
		return -1;
	}

	char line[128] = {0};
	if (fgets(line, sizeof(line), fp) == NULL) {
		pclose(fp);
		buf[0] = '\0';
		return -1;
	}
	pclose(fp);

	// Trim trailing newline
	size_t len = strlen(line);
	if (len > 0 && line[len - 1] == '\n') {
		line[len - 1] = '\0';
	}

	// Copy safely to output buffer
	strncpy(buf, line, buflen - 1);
	buf[buflen - 1] = '\0';

	return (strlen(buf) > 0) ? 0 : -1;
}


/* Run a simple connectivity check */
int has_internet(void) {
	int ret = system("ping -c1 -W2 8.8.8.8 >/dev/null 2>&1");
	return (ret == 0);
}

/* Check SIM/network registration */
int has_active_sim(void) {
	char buf[64] = {0};
	FILE *pp = popen("gsmctl -g 2>/dev/null", "r");
	if (!pp) return 0;
	if (fgets(buf, sizeof(buf), pp) == NULL) {
		pclose(pp);
		return 0;
	}
	pclose(pp);

	if (strstr(buf, "Registered")) {
		return 1;  // SIM is present and network registered
	}
	return 0;      // Not registered or SIM missing
}

/* Read SMS phone number from UCI (/etc/config/sms-server), 
   fallback to hardcoded number if not found */
int get_sms_number(char *buf, size_t buflen) {
	struct stat st;
	const char *num = NULL;

	// If config file exists, try reading from UCI
	if (stat("/etc/config/sms-server", &st) == 0) {
		struct uci_context *ctx = uci_alloc_context();
		if (!ctx) goto fallback;

		struct uci_package *pkg = NULL;
		if (uci_load(ctx, "sms-server", &pkg) == UCI_OK) {
			struct uci_element *e;
	    		uci_foreach_element(&pkg->sections, e) {
				struct uci_section *s = uci_to_section(e);
				if (strcmp(s->e.name, "sms") == 0) {   // section "sms"
		    			struct uci_option *o = uci_lookup_option(ctx, s, "phone");
		    				if (o && o->type == UCI_TYPE_STRING) {
		        				num = o->v.string;
		        				break;
		    				}
				}
	    		}
	    		uci_unload(ctx, pkg);
		}
		uci_free_context(ctx);
	}

	fallback:
	if (!num) {
		num = DEFAULT_SMS_NUMBER;  // fallback
	}

	if (snprintf(buf, buflen, "%s", num) >= (int)buflen) {
		return -1; // buffer too small
	}
	return 0;
}

/* Send SMS using EC25 AT commands */
int send_sms(const char *phone, const char *msg) {
	int fd = open("/dev/ttyUSB2", O_RDWR | O_NOCTTY | O_SYNC);
	if (fd < 0) {
		perror("open modem");
		return -1;
	}

	struct termios tty;
	memset(&tty, 0, sizeof tty);
	tcgetattr(fd, &tty);
	cfsetospeed(&tty, B115200);
	cfsetispeed(&tty, B115200);
	tty.c_cflag = (tty.c_cflag & ~CSIZE) | CS8;
	tty.c_iflag = 0;
	tty.c_oflag = 0;
	tty.c_lflag = 0;
	tty.c_cc[VMIN] = 0;
	tty.c_cc[VTIME] = 5;
	tcsetattr(fd, TCSANOW, &tty);

	char cmd[256];
	dprintf(fd, "AT+CMGF=1\r");
	usleep(200000);
	snprintf(cmd, sizeof(cmd), "AT+CMGS=\"%s\"\r", phone);
	dprintf(fd, "%s", cmd);
	usleep(200000);
	dprintf(fd, "%s\x1A", msg); // CTRL+Z ends SMS
	close(fd);
	return 0;
}

/* Resolve hostname to IPv4 string.
   Returns 1 on success, 0 on failure */
int resolve_hostname(const char *hostname, char *ipbuf, size_t ipbuflen) {
	struct addrinfo hints, *res, *p;
	int rv;

	memset(&hints, 0, sizeof(hints));
	hints.ai_family = AF_INET; // IPv4 only
	hints.ai_socktype = SOCK_STREAM;

	if ((rv = getaddrinfo(hostname, NULL, &hints, &res)) != 0) {
		return 0;
	}

	for (p = res; p != NULL; p = p->ai_next) {
		struct sockaddr_in *addr = (struct sockaddr_in *)p->ai_addr;
		const char *s = inet_ntop(AF_INET, &addr->sin_addr, ipbuf, ipbuflen);
		if (s) {
	    	freeaddrinfo(res);
	    	return 1;
		}
	}

	freeaddrinfo(res);
	return 0;
}

int load_server_hosts(char *live_host, size_t lsz,
                      char *beta_host, size_t bsz) {
	struct uci_context *ctx = NULL;
	struct uci_package *pkg = NULL;
	struct uci_section *sec;
	const char *val;

	if (access("/etc/config/server", R_OK) != 0) {
		return 0; // config not present, keep defaults
	}

	ctx = uci_alloc_context();
	if (!ctx) return -1;

	if (uci_load(ctx, "server", &pkg) != UCI_OK || !pkg) {
		uci_free_context(ctx);
		return -1;
	}

	// Expect section "mqtt"
	sec = uci_lookup_section(ctx, pkg, "mqtt");
	if (sec) {
		val = uci_lookup_option_string(ctx, sec, "live");
		if (val) snprintf(live_host, lsz, "%s", val);

		val = uci_lookup_option_string(ctx, sec, "beta");
		if (val) snprintf(beta_host, bsz, "%s", val);
	}

	uci_unload(ctx, pkg);
	uci_free_context(ctx);
	return 1;
}

static void load_coap_config(void) {
	struct stat st;
	if (stat("/etc/config/coap", &st) != 0) {
		// File not found 
		log_message("INFO", "No /etc/config/coap found, using defaults");
		return;
	}

	struct uci_context *ctx = uci_alloc_context();
	if (!ctx) return;

	struct uci_package *pkg = NULL;
	if (uci_load(ctx, "/etc/config/coap", &pkg) != UCI_OK) {
		log_message("ERROR", "Failed to load /etc/config/coap, using defaults");
		uci_free_context(ctx);
		return;
	}

	struct uci_section *s;
	struct uci_element *e;
	uci_foreach_element(&pkg->sections, e) {
		s = uci_to_section(e);
		if (strcmp(s->type, "coap") == 0) {
	    		const char *val;

	    		val = uci_lookup_option_string(ctx, s, "host_ip");
	    		if (val) strncpy(HOST_IP, val, sizeof(HOST_IP)-1);

	    		val = uci_lookup_option_string(ctx, s, "host_port");
	    		if (val) HOST_PORT = (uint16_t)atoi(val);

	    		val = uci_lookup_option_string(ctx, s, "psk_id");
	    		if (val) strncpy(PSK_ID, val, sizeof(PSK_ID)-1);

	    		val = uci_lookup_option_string(ctx, s, "psk_hex");
	    		if (val) strncpy(PSK_HEX, val, sizeof(PSK_HEX)-1);
		}
	}

	log_message("INFO", "Loaded CoAP config: host=%s port=%u psk_id=%s", HOST_IP, HOST_PORT, PSK_ID);

	uci_unload(ctx, pkg);
	uci_free_context(ctx);
}

static void log_json_to_file(const char *path, const char *s) {
	if (!s) return;
	int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0644);
	if (fd < 0) return;
	(void)write(fd, s, strlen(s));
	close(fd);
}

/* Run coap-client as a child process to POST JSON from file */
static int post_json_file(const char *path, const char *uri) {
	/* Log file for all coap-client CLI output */
	const char *cli_log = "/var/coap/client.log";
	char cmd[2048];
	snprintf(cmd, sizeof(cmd),
    			"coap-client -v 9 "
    			"-u %s "
    			"-k %s "
    			"-b 1024 "
    			"-m POST "
    			"-t 50 "
    			"-f %s "
    			"coaps://%s:%u/v1/device/situation-report "
    			">> %s 2>&1",
    			PSK_ID, PSK_HEX, path, HOST_IP, HOST_PORT, cli_log);


	log_message("INFO", "Running: %s", cmd);

	FILE *fp = popen(cmd, "r");
	if (!fp) {
		log_message("ERROR", "Failed to run coap-client");
		return -1;
	}

	char line[512];
	while (fgets(line, sizeof(line), fp)) {
		// Echo coap-client output into your log
		line[strcspn(line, "\n")] = 0;
		log_message("DEBUG", "%s", line);
	}

	int rc = pclose(fp);
	if (rc != 0) {
		log_message("ERROR", "coap-client exited with %d", rc);
		return -1;
	}

	return 0;
}

//Execute System command
unsigned int execute_system_command(char *cmd, char *status, size_t max_size) {
	if (!cmd || !status || max_size == 0) {
		return 1;  // Invalid arguments
	}	
	FILE *fp;
	char res[1024];
	fp = popen(cmd, "r");
	if (fp == NULL) {
		log_message("ERROR", "Failed to run command:%s\n", cmd);
		exit(1);
	}
	while (fgets(res, sizeof(res) - 1, fp) != NULL) {
		sprintf(status, "%s", res);
	}
	pclose(fp);
	return 0;	  	
}

//Get IMEI
unsigned int get_imei(char* imei) {
	log_message("INFO", "Inside get_imei");
	int ret = execute_system_command("gsmctl -i", imei, LOG_BUF_SZ);
	// Check for errors and validate IMEI length
	if (strstr(imei, "ERROR") || strlen(imei) < 15) {
		imei[0] = '\0';  // Clear IMEI string on error
		return 1;
	}
	return 0;
}

int get_device_imei(void *buf, int max)
{
	char cmd[64] = { 0 };
	int i=0;
	static char modemIMEI[16] = {'I','N','V','A','L','I','D',0,8,9,10,11,12,13,14,0};

	FILE *fp;
	char imei_output[64] = { 0 };

	FILE *handler;
	char imei_d[16] = {0};

	if (max < 16) {
		return 0;
	}

	if (strlen(cachedIMEI) == 15) {
		strcpy(buf, cachedIMEI);
		return 1;
	}

	// Had we previously gotten the IMEI? If so, just
	// use the one that's stored.   
	if ((strcmp(modemIMEI,"INVALID")!=0) && (strlen(modemIMEI) == 15)) {
		for (i=0; i<15; i++) {
	    		if (!isdigit(modemIMEI[i])){
				log_message("DEBUG", "IMEI char is not a digit");
				return 0;
	    		}
		}
		log_message("INFO","IMEI number retrieved: %s\r\n", modemIMEI);
		memset(buf, 0, max);
		memcpy(buf, modemIMEI, 15);
		return 1;
	}

	/* Try to read IMEI from file /tmp/clientID/imei.txt*/
	handler = fopen(CLIENTID_FILE_PATH, "r");
	if(handler){
		fread(imei_d, sizeof(char), 15, handler);
		imei_d[15] = '\0';
		if (strlen(imei_d) == 15){
			for (i=0; i<15; i++) {
				if (isdigit(imei_d[i])) {
	    				modemIMEI[i] = imei_d[i];
				} else if (!isdigit(imei_output[i])){
					log_message("DEBUG", "IMEI char is not a digit");
					return 0;
				}
			}
			memset(buf, 0, max);
			memcpy(buf, modemIMEI, 15);
			log_message("INFO","IMEI number retrieved from file system: %s\r\n", buf);
			fclose(handler);
			return 1;
		}
		fclose(handler);
	}

	if(get_imei(imei_output) == 0)
	{
		log_message("INFO","GSMCTL imei %s, strlen %d\n", imei_output, strlen(imei_output));
	}
	else
	{
		fp = popen("at.sh AT+CGSN", "r");
		if (fp == NULL) {
			log_message("INFO", "Failed to retrieve IMEI\n");
			return 0;
		}

		while (fgets(imei_output, sizeof(imei_output)-1, fp) != NULL) {
			log_message("INFO", "POPEN imei %s, strlen %d\n", imei_output, strlen(imei_output));
		}
		pclose(fp);
	}
	memset(modemIMEI, 0, 16);
	// Store IMEI to static global memory
	for (i=0; i<15; i++) {
		if (isdigit(imei_output[i])) {
	    		modemIMEI[i] = imei_output[i];
		} else if (!isdigit(imei_output[i])){
	    		log_message("DEBUG", "IMEI char is not a digit");
	    		return 0;
		}
	}
	log_message("INFO", "POPEN imei %s, strlen %d\n", imei_output, strlen(imei_output));
	log_message("INFO", "modemimei %s, strlen %d\n", modemIMEI, strlen(modemIMEI));

	memset(cmd,'\0',sizeof(cmd));
	sprintf(cmd,"mkdir -p %s", CLIENTID_DIRECTORY);
	system(cmd);
	memset(cmd,'\0',sizeof(cmd));
	sprintf(cmd, "rm -rf %s/*", CLIENTID_DIRECTORY);
	system(cmd);

	memset(cmd,'\0',sizeof(cmd));
	sprintf(cmd,"echo %s > %s", modemIMEI, CLIENTID_FILE_PATH);
	system(cmd);

	memset(buf, 0, max);
	memcpy(buf, modemIMEI, 15);

	memcpy(cachedIMEI, modemIMEI, 15);
	return 1;
}

/* Run the situation script and capture its JSON output */
static char* get_situation_json(void) {
  	char cmd[256]; 
  	char live_host[128] = "connector.connectedio.com";
	char beta_host[128] = "c1.connectedio.com";
	char live_ip[64] = "", beta_ip[64] = "";
	/* If config file exists, override defaults */
	load_server_hosts(live_host, sizeof(live_host), beta_host, sizeof(beta_host));
	/* Resolve hostnames to IPs */
	if (!resolve_hostname(live_host, live_ip, sizeof(live_ip))) {
		log_message("ERROR", "Failed to resolve live host %s", live_host);
	}
	if (!resolve_hostname(beta_host, beta_ip, sizeof(beta_ip))) {
		log_message("ERROR", "Failed to resolve beta host %s", beta_host);
	}
	snprintf(cmd, sizeof(cmd),
    		"/usr/bin/cio/make_situation_json.sh %s %s | jsonfilter -e '@'",
    		live_ip, beta_ip);	
    	    			
  	FILE *p = popen(cmd,"r"); 
  	if (!p) 
  		return NULL;
  	char *buf=NULL; 
  	size_t cap=0,
  	len=0; 
  	char tmp[4096];
  	while (!feof(p)) 
  	{ 
  		size_t n = fread(tmp,1,sizeof(tmp),p); 
  		if (!n) break;
    		if (len+n+1>cap) { cap = cap?cap*2:8192; buf = realloc(buf,cap); }
    		memcpy(buf+len,tmp,n); len+=n; 
    	}
  	int rc=pclose(p); 
  	if (!buf || rc!=0) 
  	{ 
  		free(buf); 
  		return NULL; 
  	}
  	buf[len]='\0'; 
  	return buf;
}

static struct json_object* run_cmd_to_json(const char *cmd_id, const char *cmd) {
    if (!cmd) return NULL;

    char outtmp[] = "/tmp/cmdoutXXXXXX";
    char errtmp[] = "/tmp/cmderrXXXXXX";
    int outfd = mkstemp(outtmp);
    int errfd = mkstemp(errtmp);
    
    if (outfd < 0 || errfd < 0) {
        if (outfd >= 0) { close(outfd); unlink(outtmp); }
        if (errfd >= 0) { close(errfd); unlink(errtmp); }
        return NULL;
    }

    close(outfd); close(errfd);

    char syscmd[1024];
    snprintf(syscmd, sizeof(syscmd), "sh -c \"%s\" 1>%s 2>%s", cmd, outtmp, errtmp);

    int rc = system(syscmd);
    int exit_code = -1;
    if (WIFEXITED(rc)) exit_code = WEXITSTATUS(rc);

    /* --- Read stdout with Restriction --- */
    char *stdout_buf = NULL;
    FILE *f = fopen(outtmp, "rb");
    if (f) {
        fseek(f, 0, SEEK_END);
        long s = ftell(f);
        fseek(f, 0, SEEK_SET);
        
        if (s > 0) {
            /* Cap the read size to STDOUT_LIMIT */
            size_t to_read = (s > STDOUT_LIMIT) ? STDOUT_LIMIT : (size_t)s;
            stdout_buf = malloc(to_read + 1);
            if (stdout_buf) {
                size_t n = fread(stdout_buf, 1, to_read, f);
                stdout_buf[n] = '\0';
            }
        }
        fclose(f);
    }

    /* --- Read stderr with Restriction --- */
    char *stderr_buf = NULL;
    f = fopen(errtmp, "rb");
    if (f) {
        fseek(f, 0, SEEK_END);
        long s = ftell(f);
        fseek(f, 0, SEEK_SET);
        
        if (s > 0) {
            /* Cap the read size to STDERR_LIMIT */
            size_t to_read = (s > STDERR_LIMIT) ? STDERR_LIMIT : (size_t)s;
            stderr_buf = malloc(to_read + 1);
            if (stderr_buf) {
                size_t n = fread(stderr_buf, 1, to_read, f);
                stderr_buf[n] = '\0';
            }
        }
        fclose(f);
    }

    unlink(outtmp);
    unlink(errtmp);

    struct json_object *o = json_object_new_object();
    json_object_object_add(o, "command_id", json_object_new_string(cmd_id ? cmd_id : ""));
    json_object_object_add(o, "command", json_object_new_string(cmd));
    json_object_object_add(o, "executed", json_object_new_boolean(exit_code == 0));
    json_object_object_add(o, "exit_code", json_object_new_int(exit_code));
    
    /* json-c handles NULL pointers by creating an empty string or null, 
       but we explicitly provide an empty string for safety */
    json_object_object_add(o, "stdout", json_object_new_string(stdout_buf ? stdout_buf : ""));
    json_object_object_add(o, "stderr", json_object_new_string(stderr_buf ? stderr_buf : ""));

    free(stdout_buf);
    free(stderr_buf);

    return o;
}


/* Use shell command, capture stdout & stderr separately and return JSON */
/*static struct json_object* run_cmd_to_json(const char *cmd_id, const char *cmd) {
	if (!cmd) return NULL;

	char outtmp[] = "/tmp/cmdoutXXXXXX";
	char errtmp[] = "/tmp/cmderrXXXXXX";
	int outfd = mkstemp(outtmp);
	int errfd = mkstemp(errtmp);
	if (outfd < 0 || errfd < 0) {
		if (outfd >= 0) { close(outfd); unlink(outtmp); }
		if (errfd >= 0) { close(errfd); unlink(errtmp); }
		return NULL;
	}

	close(outfd); close(errfd);

	//Build the shell invocation so stdout -> outtmp, stderr -> errtmp
	char syscmd[1024];
	snprintf(syscmd, sizeof(syscmd), "sh -c \"%s\" 1>%s 2>%s", cmd, outtmp, errtmp);

	int rc = system(syscmd);
	int exit_code = -1;
	if (WIFEXITED(rc)) exit_code = WEXITSTATUS(rc);

	/* Read stdout
	char *stdout_buf = NULL;
	size_t stdout_len = 0;
	FILE *f = fopen(outtmp, "rb");
	if (f) {
		fseek(f, 0, SEEK_END);
		long s = ftell(f);
		fseek(f, 0, SEEK_SET);
		if (s > 0) {
	    		stdout_buf = malloc((size_t)s + 1);
	    		if (stdout_buf) {
				size_t n = fread(stdout_buf, 1, (size_t)s, f);
				stdout_buf[n] = '\0';
				stdout_len = n;
	    		}
		}
		fclose(f);
	}

	//Read stderr
	char *stderr_buf = NULL;
	size_t stderr_len = 0;
	f = fopen(errtmp, "rb");
	if (f) {
		fseek(f, 0, SEEK_END);
		long s = ftell(f);
		fseek(f, 0, SEEK_SET);
		if (s > 0) {
	    		stderr_buf = malloc((size_t)s + 1);
	    		if (stderr_buf) {
				size_t n = fread(stderr_buf, 1, (size_t)s, f);
				stderr_buf[n] = '\0';
				stderr_len = n;
	    		}
		}
		fclose(f);
	}

	unlink(outtmp);
	unlink(errtmp);

	//Build JSON object according to your schema
	struct json_object *o = json_object_new_object();
	json_object_object_add(o, "command_id", json_object_new_string(cmd_id ? cmd_id : ""));
	json_object_object_add(o, "command", json_object_new_string(cmd));
	json_object_object_add(o, "executed", json_object_new_boolean(exit_code == 0)); 
	json_object_object_add(o, "exit_code", json_object_new_int(exit_code));
	json_object_object_add(o, "stdout",
		           json_object_new_string(stdout_buf ? stdout_buf : ""));
	json_object_object_add(o, "stderr",
		           json_object_new_string(stderr_buf ? stderr_buf : ""));

	free(stdout_buf);
	free(stderr_buf);

	return o;
}*/


int main(void) {

	int retry_count = 0;
    	char *retry_env = getenv("WATCHDOG_RETRY_COUNT");
    	if (retry_env) {
        	retry_count = atoi(retry_env);
    	}
	if (retry_count == 0) {
        	if (single_instance_or_exit() != 0) {
            		return 0; // Quietly exit if a DIFFERENT process is active
        	}
    	}
    	if (retry_count > 2) {
        	log_message("ERROR", "Max restarts reached. Server is stuck. Exiting.");
        	return 1; 
    	}	
		
	load_coap_config();   // override defaults if config file exists
	// Dir for writing sent and received JSONs
	ensure_dir_exists("/var/coap");

	struct sigaction sa = {0};
	sa.sa_handler = die_on_alarm;
	sigaction(SIGALRM, &sa, NULL);
	alarm(300);
	//IMEI
	char SrcIMEI[64] = {0};
	get_device_imei(SrcIMEI, sizeof(SrcIMEI));
	//Serial No
	char serial[64];
	char iccid[64];	
	if (get_device_serial(serial, sizeof(serial)) == 0) {
		log_message("INFO", "Device Serial: %s", serial);
	} else {
		log_message("ERROR", "Failed to get device serial");
	}
	if (get_modem_iccid(iccid, sizeof(iccid)) == 0) {
		log_message("INFO", "Modem ICCID: %s", iccid);
	} else {
		log_message("ERROR", "Failed to get modem iccid");
	}	
	
	if (!has_internet()) {
		if (!has_active_sim()) {
        		log_message("ERROR", "No internet and SIM not registered, skipping SMS.");
        		return 0;
    		}
		char phone[32];
		if (get_sms_number(phone, sizeof(phone)) == 0) {
			char msg[256];
			snprintf(msg, sizeof(msg), "IMEI:%s,SERIAL:%s,ICC:%s", SrcIMEI, serial, iccid);
			send_sms(phone, msg);
			log_message("WARN", "No internet, SMS sent to %s, Message: %s", phone, msg);
		} else {
			log_message("ERROR", "No internet, but failed to get SMS number");
		}
		return 0; // Exit instead of running CoAP
	}
	/* Log file for all coap-client CLI output */
	const char *cli_log = "/var/coap/client.log";

	/* 1) POST situation-report */
	char *situ = get_situation_json();
	if (!situ)
		situ = strdup("{\"imei\":\"\"}");

	const char *situ_path = "/var/coap/situ.json";
	log_json_to_file(situ_path, situ);

	if (post_json_file(situ_path, "/v1/device/situation-report") != 0) {
		log_message("ERROR", "situation-report failed via coap-client");
		return 1; 
	} else {
		/*char cmdline[2048];
		snprintf(cmdline, sizeof(cmdline),
    			"coap-client -v 9 "
    			"-u %s "
    			"-k %s "
    			"-b 1024 "
    			"-m POST "
    			"-t 50 "
    			"-f %s "
    			"coaps://%s:%u/v1/device/situation-report "
    			">> %s 2>&1",
    			PSK_ID, PSK_HEX, situ_path, HOST_IP, HOST_PORT, cli_log);
		system(cmdline);*/
		log_message("INFO", "situation-report sent successfully.");
    		unlink(situ_path);
	}
	log_message("INFO","Situation Report: %s", situ);
	if (situ) free(situ);
	/* Add configurable delay before GET */
	if (CMD_GET_DELAY > 0) {
		log_message("INFO", "Waiting %d seconds before GET command", CMD_GET_DELAY);
		sleep(CMD_GET_DELAY);
	}
	/* 2) GET commands */
	const char *cmd_path = "/var/coap/commands.json";
			
	char payload_template[] = "/tmp/coap_get_payloadXXXXXX";
	int pfd = mkstemp(payload_template);
	if (pfd < 0) {
		log_message("ERROR", "mkstemp() failed for payload file: %s", strerror(errno));
	} else {
		/* Ensure only owner can read/write */
		fchmod(pfd, S_IRUSR | S_IWUSR);

		/* Build JSON payload: {"imei":"..."} */
		/* If blank, fallback to empty string */
		if (SrcIMEI[0] == '\0') strncpy(SrcIMEI, "unknown", sizeof(SrcIMEI)-1);
		char payload[256];
		int pw = snprintf(payload, sizeof(payload), "{\"imei\":\"%s\",\"serial\": \"%s\"}", SrcIMEI, serial);
		if (pw < 0 || (size_t)pw >= sizeof(payload)) {
	    		log_message("ERROR", "payload generation truncated");
		} else {
	    		ssize_t wrote = write(pfd, payload, (size_t)pw);
	    		if (wrote != pw) {
				log_message("ERROR", "write(payload) failed: %s", strerror(errno));
	    		}
		}

		close(pfd); /* close fd: file itself remains at payload_template */
		log_message("INFO", "Payload of GET: %s", payload);
		/* Build coap-client command using -f <payload_template> for request body */
		char cmdline[2048];
		snprintf(cmdline, sizeof(cmdline),
	    		"coap-client -u %s "
	    		"-k %s "
    			"-b 1024 "		    					    		
	    		"-m GET "
	    		"-t 50 "
	    		"-f %s "	    		
	    		"coaps://%s:%u/v1/device/command "
	    		"> %s 2>> %s",
	    		PSK_ID, PSK_HEX, payload_template,
	    		HOST_IP, HOST_PORT, cmd_path, cli_log);

		log_message("DEBUG", "Running: %s", cmdline);
		int rc = system(cmdline);
		if (rc != 0) {
	    		log_message("ERROR", "coap-client GET command failed (rc=%d)", rc);
		}

		/* remove the temporary payload file */
		unlink(payload_template);
	}

	FILE *f = fopen(cmd_path, "r");
	if (f) {
		fseek(f, 0, SEEK_END);
		long sz = ftell(f);
		fseek(f, 0, SEEK_SET);

		char *buf = malloc((size_t)sz + 1);
		if (buf) {
			fread(buf, 1, (size_t)sz, f);
			buf[sz] = '\0';

			struct json_object *root = json_tokener_parse(buf);
			if (root) {
				/* ---Check for Situation Report Request --- */
    				struct json_object *jmsg = NULL;
    				if (json_object_object_get_ex(root, "message", &jmsg)) {
        				const char *msg_str = json_object_get_string(jmsg);
        
        				// Check if the message contains the trigger phrase
        				if (msg_str && strstr(msg_str, "situation report not available")) {
            					log_message("INFO", "Server requested situation-report. Processing...");

            					/*char *situ = get_situation_json();
            					if (!situ) situ = strdup("{\"imei\":\"\"}");

            					const char *situ_path = "/var/coap/situ.json";
            					log_json_to_file(situ_path, situ);

            					//Prepare the POST command for situation-report 
            					char situ_cmd[2048];
            					snprintf(situ_cmd, sizeof(situ_cmd),
                				"coap-client -v 9 -u %s -k %s -b 1024 -m POST -t 50 -f %s "
                				"coaps://%s:%u/v1/device/situation-report >> %s 2>&1",
                				PSK_ID, PSK_HEX, situ_path, HOST_IP, HOST_PORT, cli_log);

            					log_message("INFO", "Sending situation-report...");
            					int situ_rc = system(situ_cmd);

            					if (situ_rc != 0) {
                					log_message("ERROR", "Server requested situation-report POST failed (rc=%d)", situ_rc);
            					} else {
                					log_message("INFO", "Server requested situation-report sent successfully.");
                					unlink(situ_path); // Clean up
            					}
            
            					if (situ) free(situ);
            					goto cleanup_json;*/
						// Increment the counter and update the environment
    						char next_count[16];
    						snprintf(next_count, sizeof(next_count), "%d", retry_count + 1);
    						setenv("WATCHDOG_RETRY_COUNT", next_count, 1); // 1 = overwrite            					    						
    						// Absolute path is mandatory
    						char *const binary_path = "/usr/bin/coap_watchdog";
    						char *const args[] = {binary_path, NULL};

    						sleep(2);

    						log_message("INFO", "Executing replacement: %s", binary_path);
    
    						// Execute replacement
    						execv(args[0], args);

    						/* execv DEFINITELY failed --- */
    						log_message("ERROR", "execv failed: %s", strerror(errno));
    						goto cleanup_json;            					
        				}
    				}		
				/* ---Check for Command Execution --- */				
	    			struct json_object *details = NULL, *cmds_str = NULL, *qid_obj = NULL;
	    			json_object_object_get_ex(root, "details", &details);

	    			if (details) {
					/* server sent commands as a JSON string in details.commands */
					json_object_object_get_ex(details, "commands", &cmds_str);
					json_object_object_get_ex(details, "qId", &qid_obj);
	    			}
	    			/* parse commands text into array if it's a string */
	    			struct json_object *cmds = NULL;
	    			if (cmds_str && json_object_is_type(cmds_str, json_type_string)) {
					const char *cmds_text = json_object_get_string(cmds_str);
					cmds = json_tokener_parse(cmds_text);
	    			} else if (cmds_str && json_object_is_type(cmds_str, json_type_array)) {
					cmds = json_object_get(cmds_str); /* already array */
	    			}

				/* Check if there are actually any commands to run --- */
				if (!cmds || json_object_array_length(cmds) == 0) {
				    log_message("INFO", "No commands. Skipping response.");
				    if (cmds) json_object_put(cmds); // Clean up if it was an empty array
				    goto cleanup_json; 
				}
	    			/* Build the status object */
	    			struct json_object *status = json_object_new_object();
	    			struct json_object *arr = json_object_new_array();

	    			json_object_object_add(status, "imei", json_object_new_string(SrcIMEI));
	    			json_object_object_add(status, "serial", json_object_new_string(serial));	    			

	    			char tbuf[64];
	    			time_t now = time(NULL);
	    			struct tm g;
	    			gmtime_r(&now, &g);
	    			strftime(tbuf, sizeof(tbuf), "%Y-%m-%dT%H:%M:%SZ", &g);
	    			json_object_object_add(status, "timestamp", json_object_new_string(tbuf));

	    			if (qid_obj)
					json_object_object_add(status, "qId", json_object_get(qid_obj)); /* copy */

	    				json_object_object_add(status, "status_report", arr);

	    				if (cmds && json_object_is_type(cmds, json_type_array)) {
						int n = json_object_array_length(cmds);
						for (int i = 0; i < n; i++) {
		    					struct json_object *c = json_object_array_get_idx(cmds, i);
		    					struct json_object *jid = NULL, *jtype = NULL, *jcmd = NULL;
		    					json_object_object_get_ex(c, "id", &jid);
		    					json_object_object_get_ex(c, "type", &jtype);
		    					json_object_object_get_ex(c, "command", &jcmd);

		    					if (jtype && strcmp(json_object_get_string(jtype), "shell") == 0 && jcmd) {
								const char *id = jid ? json_object_get_string(jid) : "";
								const char *cmd = json_object_get_string(jcmd);
								struct json_object *entry = run_cmd_to_json(id, cmd);
								if (entry) json_object_array_add(arr, entry);
		    					}
						}
	    				}

	    				/* write the status JSON to disk for debugging / coap-client -f */
	    				//const char *status_str = json_object_to_json_string_ext(status, JSON_C_TO_STRING_PLAIN);
	    				//log_json_to_file("/var/coap/status.json", status_str);

					/*char detached_sender[4096];
					snprintf(detached_sender, sizeof(detached_sender),
    					"( "
    					"  for i in 1 2 3 4 5 6; do "             // Try 6 times (1 minute total)
    					"    sleep 10; "                          // Wait for network/firewall to settle
    					"    coap-client -v 9 -u %s -k %s -b 1024 -m POST -t 50 -f /var/coap/status.json "
    					"    coaps://%s:%u/v1/device/command-status >> %s 2>&1; "
    					"    if [ $? -eq 0 ]; then rm -f /var/coap/status.json; break; fi; " // Delete on success and exit loop
    					"  done "
    					") >/dev/null 2>&1 &", 
    					PSK_ID, PSK_HEX, HOST_IP, HOST_PORT, cli_log);

					log_message("INFO", "Handing off response to background sender and exiting.");
					system(detached_sender);*/


					const char *status_str = json_object_to_json_string_ext(status, JSON_C_TO_STRING_PLAIN);

					// Check if total size exceeds 900 bytes
					if (strlen(status_str) > 900) {
    						log_message("WARN", "JSON size %d exceeds 900b. Truncating logs.", (int)strlen(status_str));
    
    						// Get the array of results
    						struct json_object *arr = NULL;
    						if (json_object_object_get_ex(status, "status_report", &arr)) {
							int n = json_object_array_length(arr);
							for (int i = 0; i < n; i++) {
	    							struct json_object *entry = json_object_array_get_idx(arr, i);
	    
	    							// Replace long strings with a tiny "Truncated" message
	    							json_object_object_add(entry, "stdout", json_object_new_string("Log too large - truncated"));
	    							json_object_object_add(entry, "stderr", json_object_new_string("Log too large - truncated"));
							}
    						}
    
    						// Re-generate the string after truncation
    						status_str = json_object_to_json_string_ext(status, JSON_C_TO_STRING_PLAIN);
					}
					// Now save the JSON to file
					log_json_to_file("/var/coap/status.json", status_str);

	    				/* POST back using coap-client */
	    				char postline[4096];
	    				snprintf(postline, sizeof(postline),
		    				"coap-client -v 9 "
		    				"-u %s "
		    				"-k %s "
    						"-b 1024 "		    				
		    				"-m POST "
		    				"-t 50 "
		    				"-f /var/coap/status.json "
		    				"coaps://%s:%u/v1/device/command-status "
		    				">> %s 2>&1",
		    				PSK_ID, PSK_HEX, HOST_IP, HOST_PORT, cli_log);
	    				log_message("INFO", "Running: %s", postline);
	    				system(postline);

	    				json_object_put(status);
	   	 			if (cmds && cmds != cmds_str) json_object_put(cmds); /* if we created a new parsed object */
	    				//json_object_put(root);
	    				cleanup_json:
                				json_object_put(root);
			}
			if (buf) free(buf);
		}
		fclose(f);
	}

	single_instance_cleanup();
	log_message("INFO","Exiting COAP Client");
	return 0;
}

