/*utilities.c - Helper Functions*/

/* Standard includes. */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>
#include <time.h>
#include <sys/time.h>
#include <dirent.h>
#include <signal.h>
#include <stdint.h>
#include <linux/errno.h>
#include <sys/errno.h>
#include <sys/types.h>
#include <sys/stat.h>	
#include <sys/un.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <syslog.h>
#include <netdb.h>
#include <zlib.h>
#include <ifaddrs.h>
#include <arpa/inet.h>
#include "core_mqtt.h"
#include "core_mqtt_state.h"
/* OpenSSL sockets transport implementation. */
#include "openssl_posix.h"
/*Include backoff algorithm header for retry logic.*/
#include "backoff_algorithm.h"
/* Clock for timer. */
#include "clock.h"
#include "mqtt_sync.h"
#include "utilities.h"
#include "cio_defaults.h"

#define CLIENTID_DIRECTORY     "/etc/clientID"
#define CLIENTID_FILE_PATH      "/etc/clientID/imei.txt"
#define LOG_BUF_SZ               128

#define OVERLAY_CERTS "/overlay/certs"
#define LOG_CERTS "/log/certs"
#define CERT_FILE "deviceCert.crt"
#define KEY_FILE  "privateKey.key"

//IMEI
#define CLIENT_ID_MAX_LEN 64
char clientIdentifier[CLIENT_ID_MAX_LEN] = {0};
uint16_t clientIdentifierLength = 0;
static char cachedIMEI[16] = "";
int vzoRNA = 0;
//extern volatile bool g_mqtt_hard_restart;
//Structure for returning interface status
typedef enum {
    IF_DOWN = 0,
    IF_UP_DEFAULT = 1,
    IF_UP_NOT_DEFAULT = 2
} if_status_t;

// Delete all files in a directory, then delete the directory itself
int delete_directory_recursive(const char *path)
{
    DIR *d = opendir(path);
    if (!d) return -1;

    struct dirent *entry;
    char fullpath[512];

    while ((entry = readdir(d)) != NULL) {
        if (strcmp(entry->d_name, ".") == 0 ||
            strcmp(entry->d_name, "..") == 0)
            continue;

        snprintf(fullpath, sizeof(fullpath), "%s/%s", path, entry->d_name);

        struct stat st;
        if (stat(fullpath, &st) == 0) {
            if (S_ISDIR(st.st_mode)) {
                delete_directory_recursive(fullpath);
                rmdir(fullpath);
            } else {
                unlink(fullpath);
            }
        }
    }

    closedir(d);
    return rmdir(path);
}

int maskToPort(int mask) {
    if (mask <= 0) return -1;
    int port = 0;
    while ((mask & 1) == 0) {
        mask >>= 1;
        port++;
    }
    return port;
}

static int file_exists(const char *path)
{
    struct stat st;
    return (stat(path, &st) == 0 && S_ISREG(st.st_mode));
}
static int create_directory(const char *path)
{
    if (mkdir(path, 0755) == -1 && errno != EEXIST)
        return -1;
    return 0;
}
static int copy_file(const char *src, const char *dst)
{
    char buffer[4096];
    size_t bytes;

    FILE *fsrc = fopen(src, "rb");
    if (!fsrc) return -1;

    FILE *fdst = fopen(dst, "wb");
    if (!fdst) {
        fclose(fsrc);
        return -1;
    }

    while ((bytes = fread(buffer, 1, sizeof(buffer), fsrc)) > 0)
        fwrite(buffer, 1, bytes, fdst);

    fclose(fsrc);
    fclose(fdst);
    return 0;
}
/* Helper: check if /etc/config/mqtt exists */
int mqtt_config_exists(void)
{
    struct stat st;
    return (stat("/etc/config/mqtt", &st) == 0);
}

/* Helper: safely get integer from UCI key */
int uci_get_int(const char *key, int default_value)
{
    char cmd[128];
    snprintf(cmd, sizeof(cmd), "uci -q get %s 2>/dev/null", key);
    FILE *fp = popen(cmd, "r");
    if (!fp)
        return default_value;

    char buf[64] = {0};
    if (!fgets(buf, sizeof(buf), fp))
    {
        pclose(fp);
        return default_value;
    }
    pclose(fp);

    int val = atoi(buf);
    return (val > 0) ? val : default_value;
}
/* New helper for string values */
int uci_get_string(const char *key, char *out, size_t outlen, const char *default_value)
{
    char cmd[256];
    snprintf(cmd, sizeof(cmd), "uci -q get %s 2>/dev/null", key);
    FILE *fp = popen(cmd, "r");
    if (!fp)
    {
        strncpy(out, default_value, outlen - 1);
        out[outlen - 1] = '\0';
        return -1;
    }

    char buf[256] = {0};
    if (!fgets(buf, sizeof(buf), fp))
    {
        strncpy(out, default_value, outlen - 1);
        out[outlen - 1] = '\0';
        pclose(fp);
        return -1;
    }
    pclose(fp);

    // remove newline
    buf[strcspn(buf, "\r\n")] = '\0';
    strncpy(out, buf, outlen - 1);
    out[outlen - 1] = '\0';
    return 0;
}

int publishToTopicQOS(MQTTContext_t *pMqttContext,
                          const char *topic,
                          const char *message,
                          MQTTQoS_t qos)
{
    	if (!pMqttContext || !topic || !message)
    	{
        	log_message("ERROR", "Invalid parameter: ctx=%p topic=%p msg=%p",
                    pMqttContext, topic, message);
        	return EXIT_FAILURE;
    	}
    	if (!mqtt_connected )
    	{
        	log_message("WARN", "Cannot publish — MQTT disconnected");
        	return EXIT_FAILURE;
    	}
	log_message("DEBUG", "Topic='%s' (len=%zu), payloadLen=%zu",
            topic, strlen(topic), strlen(message));
    	MQTTPublishInfo_t publishInfo = { 0 };

    	publishInfo.qos = qos;
    	publishInfo.pTopicName = topic;
    	publishInfo.topicNameLength = strlen(topic);
    	publishInfo.pPayload = message;
    	publishInfo.payloadLength = strlen(message);
    	uint16_t packetId = MQTT_GetPacketId( pMqttContext );
    	if (packetId == 0)
    	{
        	log_message("ERROR", "Invalid packetId");
        	//g_force_mqtt_reconnect = 1;
        	//mqtt_connected = false;
        	return EXIT_FAILURE;
    	}
	pthread_mutex_lock(&mqtt_mutex);
    	MQTTStatus_t status = MQTT_Publish(pMqttContext, &publishInfo, packetId);
	pthread_mutex_unlock(&mqtt_mutex);
    	if (status == MQTTNoMemory)
    	{
        	log_message("ERROR", "MQTTNoMemory during publish");
        	g_mqtt_hard_restart = true;
        	return EXIT_FAILURE;
    	}
    	else if ( status == MQTTStatusDisconnectPending ) 
    	{
    		log_message("WARN", "Publish failed (%s): Connection is shutting down.", MQTT_Status_strerror(status));    
        	mqtt_connected = false;
        	return EXIT_FAILURE;  
    	}			
    	else if (status != MQTTSuccess)
    	{
        	log_message("ERROR", "Publish failed (%s)", MQTT_Status_strerror(status));
        	//g_force_mqtt_reconnect = 1;
        	//mqtt_connected = false;
        	return EXIT_FAILURE;
    	}
    	else
        	log_message("INFO", "Published response to topic %s", topic);

    	log_message("INFO", "Published to %s: %s", topic, message);
    	return EXIT_SUCCESS;
}
// Strip non-alphanumeric characters from a string
void strip_nonprintable(char *src) {
	char *dst = src;
	while (*src) {
		if (isalnum((unsigned char)*src)) {
	    		*dst++ = *src;
	}
		src++;
	}
	*dst = '\0';
}
//Get SNR
unsigned int get_snr(char *snr) {
	log_message("INFO", "Inside get_snr");
	char cSNR[LOG_BUF_SZ] = {0};
	// Execute system command to fetch SNR value
	if (!execute_system_command("gsmctl -q | grep -i SINR | awk '{print $2}'", cSNR, sizeof(cSNR))) {    
		strip_nonprintable(cSNR);  // Remove unwanted characters
		if (cSNR[0] == '\0') {  // Check if output is empty
	    		snprintf(snr, LOG_BUF_SZ, "ERROR");
	    		return 0;
		}
		if (strstr(cSNR, "ERROR")) {  // Handle AT command errors
			snprintf(snr, LOG_BUF_SZ, "ERROR");
	    		return 0;
		}
	} else {
		snprintf(snr, LOG_BUF_SZ, "ERROR");  // Command execution failed
		return 0;
	}
	// Convert SNR value
	int snr_value = (atoi(cSNR) * 2) - 113;
	snprintf(snr, LOG_BUF_SZ, "%d", snr_value);
	log_message("INFO", "SNR Value: %s", snr);	
	return 0;	
	
}

unsigned int get_system_uptime(char* system_uptime){
	log_message("INFO", "Inside get_system_uptime");
	// Clear the buffer to avoid old data
	memset(system_uptime, 0, sizeof(system_uptime));
	// Run the system command and check if it succeeds
	int ret = execute_system_command("cat /proc/uptime | awk '{print $1}'", system_uptime, sizeof(system_uptime));
	if (ret != 0) {
		log_message("INFO", "Failed to run cat /proc/uptime");		
		return 1; // Return error code if command execution fails
	}
	// Ensure the output is properly null-terminated
	system_uptime[strcspn(system_uptime, "\n")] = 0;
	return 0;    	
}

//Get Mode
unsigned int get_mode(char *mode)
{
    log_message("INFO", "Inside get_mode using gsmctl utility");
    char cMode[LOG_BUF_SZ] = {0};
    const char *cmd = "gsmctl -t";
    if (!execute_system_command(cmd, cMode, sizeof(cMode)))
    {
        cMode[strcspn(cMode, "\r\n ")] = 0;
        if (cMode[0] == '\0' || strstr(cMode, "N/A"))
        {
            log_message("WARN", "gsmctl returned no data, modem may be initializing");
            snprintf(mode, LOG_BUF_SZ, "SEARCHING");
            return 1;
        }
        if (strstr(cMode, "LTE")) 
        {
            snprintf(mode, LOG_BUF_SZ, "4G");
        } 
        else if (strstr(cMode, "NR") || strstr(cMode, "5G")) 
        {
            snprintf(mode, LOG_BUF_SZ, "5G");
        } 
        else if (strstr(cMode, "WCDMA") || strstr(cMode, "HSPA") || strstr(cMode, "UMTS")) 
        {
            snprintf(mode, LOG_BUF_SZ, "3G");
        } 
        else if (strstr(cMode, "GPRS") || strstr(cMode, "EDGE")) 
        {
            snprintf(mode, LOG_BUF_SZ, "2G");
        } 
        else 
        {
            snprintf(mode, LOG_BUF_SZ, "%s", cMode);
        }

        log_message("INFO", "Network Mode detected: %s", mode);
        return 0;
    }
    else
    {
        log_message("ERROR", "Failed to execute gsmctl command");
        snprintf(mode, LOG_BUF_SZ, "ERROR");
        return 1;
    }
}

//Get Signal Strength
unsigned int get_signal_strength(char* signal_strength) {
	log_message("INFO", "Inside get_signal_strength");
	// Get signal strength using gsmctl
	int ret = execute_system_command("gsmctl -q | grep -i RSSI | awk '{print $2}'", signal_strength, LOG_BUF_SZ);

	// Check for errors in the signal strength result
	if (ret == 0 && (strstr(signal_strength, "ERROR") || strlen(signal_strength) == 0)) {
		// If the initial method fails, fall back to the alternative method
		ret = execute_system_command("gsmctl -q | grep -i RSSI | awk '{print $2}'", signal_strength, LOG_BUF_SZ);
		if (ret != 0 || strlen(signal_strength) == 0 || strstr(signal_strength, "ERROR")) {
	    		// If both methods fail, return error
	    		strcpy(signal_strength, "ERROR");
	    		return 1;
		}
	}
	return 0;  // Success
}

//Get Firmware Version
unsigned int get_firmware_version(char* openwrt_version) {
	log_message("INFO", "Inside get_firmware_version");
	char version[LOG_BUF_SZ] = {};
	char build[LOG_BUF_SZ] = {};
	// Attempt to get the version from /usr/bin/build
	if (execute_system_command("/usr/bin/build", openwrt_version, LOG_BUF_SZ)) {
		// Fallback to reading version from /etc/openwrt_version
		FILE *handler = fopen("/etc/openwrt_version", "r");
		if (handler) {
	    		if (fgets(version, sizeof(version), handler)) {
				version[strcspn(version, "\n")] = '\0';  // Clean up newline
				strncpy(openwrt_version, version, LOG_BUF_SZ);  // Copy version to output
	    		}
	    		pclose(handler);
		}
	} else {
		// Extract version and build from the system build output
		execute_system_command("/usr/bin/build | grep 'Base OS Version  :'| sed 's/Base OS Version  : //'", version, sizeof(version));
		execute_system_command("/usr/bin/build | grep 'CIO Build Number :'| sed 's/CIO Build Number ://' | awk '{print $1}'", build, sizeof(build));
		version[strcspn(version, "\n")] = '\0';
		build[strcspn(build, "\n")] = '\0';
		snprintf(openwrt_version, LOG_BUF_SZ, "%s", version);
	}
	return 0;
}

//Get ICCID
unsigned int get_iccid(char *iccid)
{
    log_message("INFO", "Inside get_iccid");
    int ret = execute_system_command("gsmctl -J", iccid, LOG_BUF_SZ);
    if (ret != 0) {
        iccid[0] = '\0';
        return -1;
    }
    // Remove newline and carriage return
    iccid[strcspn(iccid, "\r\n")] = '\0';
    // Validate ICCID:
    int len = strlen(iccid);
    if (len < 19 || len > 22) {
        iccid[0] = '\0';
        return -1;
    }
    // Ensure all digits
    for (int i = 0; i < len; i++) {
        if (!isxdigit((unsigned char)iccid[i])) {
            log_message("ERROR", "Invalid character in ICCID");
            iccid[0] = '\0';
            return -1;
        }
    }
    return 0; // Success
}


//Get APN
unsigned int get_apn(char* apn) {
	log_message("INFO", "Inside get_apn");
	int ret = execute_system_command("gsmctl -A \"AT+CGCONTRDP=1\" | awk -F, '/^\\+CGCONTRDP:/ {gsub(/\"/, \"\", $3); print $3}'", apn, LOG_BUF_SZ);
	// Check for errors in response
	if (strstr(apn, "ERROR")) {
		apn[0] = '\0';  // Clear apn string on error
		return 1;
	}
	return 0;
}

//Get Operator
unsigned int get_operator(char* op) {
	log_message("INFO", "Inside get_operator");
	int ret = execute_system_command("gsmctl -o", op, LOG_BUF_SZ);
	// Check for errors in response
	if (strstr(op, "ERROR")) {
		op[0] = '\0';  // Clear operator string on error
		return 1;
	}
	return 0;
}

//Get Phonenumber
unsigned int get_phoneNumber(char* phoneNumber) {
	log_message("INFO", "Inside get_phoneNumber");
	int ret = execute_system_command("at.sh AT+CNUM | grep 'CNUM:' | cut -d, -f2 | tr '\"' ' ' | awk '{ print $1}'", phoneNumber, LOG_BUF_SZ);
	// Check for errors in response
	if (strstr(phoneNumber, "ERROR")) {
		phoneNumber[0] = '\0';  // Clear phone number string on error
		return 1;
	}
	// Check for valid phone number length
	return (ret == 0 && strlen(phoneNumber) >= 7) ? 0 : 1;
}

//Get Modem Firmware Version
unsigned int get_modem_firmware_version(char *modem_firmware)
{
    log_message("INFO", "Inside get_modem_firmware_version");
    int ret = execute_system_command("gsmctl -y", modem_firmware, LOG_BUF_SZ);
    // Remove carriage return and newline characters
    modem_firmware[strcspn(modem_firmware, "\r\n")] = '\0';
    if (ret == 0 && strlen(modem_firmware) > 2) {
        return 0;
    }
    return -1;
}

//Get Modem Module
unsigned int get_modem_module(char* modem_module) {
	log_message("INFO", "Inside get_modem_module");
	int ret = execute_system_command("at.sh AT+CGMM | awk '{print $1}'", modem_module, LOG_BUF_SZ);
	// Remove carriage return and newline
	modem_module[strcspn(modem_module, "\r\n")] = '\0';
	// Check for valid response
	return (ret == 0 && strlen(modem_module) > 2) ? 0 : -1;
}

const char *get_interface_ip(const char *ifname)
{
	static char ip[64] = {0};
	*ip = '\0';

	struct ifaddrs *ifaddr, *ifa;
	if (getifaddrs(&ifaddr) == -1)
	return "0.0.0.0";

	for (ifa = ifaddr; ifa != NULL; ifa = ifa->ifa_next)
	{
		if (ifa->ifa_addr == NULL)
	    		continue;

		if (ifa->ifa_addr->sa_family == AF_INET &&
	    		strcmp(ifa->ifa_name, ifname) == 0)
		{
	    		struct sockaddr_in *sa = (struct sockaddr_in *)ifa->ifa_addr;
	    		inet_ntop(AF_INET, &(sa->sin_addr), ip, sizeof(ip));
	    		break;
		}
	}
	freeifaddrs(ifaddr);

	if (*ip == '\0')
	{
		// fallback to shell if interface not found (for br-lan or qmi)
		char cmd[128];
		snprintf(cmd, sizeof(cmd),
		 "ip -4 addr show %s | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}' 2>/dev/null",
		 ifname);
		FILE *fp = popen(cmd, "r");
		if (fp)
		{
	    		fgets(ip, sizeof(ip), fp);
	    		ip[strcspn(ip, "\r\n")] = '\0';
	    		pclose(fp);
		}
	}
	return (*ip) ? ip : "0.0.0.0";
}

char *get_lan_ip(void)
{
	const char *ip = get_interface_ip("br-lan");
	if (strcmp(ip, "0.0.0.0") == 0)
	ip = get_interface_ip("eth0");  // fallback
	return ip;
}

/*char *get_wan_ip(void)
{
    const char *ip = get_interface_ip("wan");
    if (strcmp(ip, "0.0.0.0") == 0)
        ip = get_interface_ip("eth1");  
    return ip;
}*/

char *get_wan_ip(void)
{
    FILE *fp;
    char line[256];
    char ip[64];

    const int timeout_sec = 7;
    const int poll_interval = 1;  /* seconds */

    time_t start = time(NULL);

    while (time(NULL) - start < timeout_sec)
    {
        ip[0] = '\0';

        fp = popen("ubus call network.interface.wan status 2>/dev/null", "r");
        if (!fp)
            break;

        while (fgets(line, sizeof(line), fp))
        {
            char *p = strstr(line, "\"address\"");
            if (!p)
                continue;

            p = strchr(p, ':');
            if (!p)
                continue;

            p++;
            while (*p == ' ' || *p == '\"')
                p++;

            char *end = strchr(p, '\"');
            if (!end)
                continue;

            size_t len = end - p;
            if (len < sizeof(ip))
            {
                strncpy(ip, p, len);
                ip[len] = '\0';
                break;
            }
        }

        pclose(fp);

        /* IP acquired */
        if (ip[0] != '\0' && strcmp(ip, "0.0.0.0") != 0)
            return strdup(ip);

        /* DHCP still running */
        sleep(poll_interval);
    }
    return strdup("0.0.0.0");
}

/*char *get_qmi_ip(void)
{
    const char *ip = get_interface_ip("wwan0");
    if (strcmp(ip, "0.0.0.0") == 0)
        ip = get_interface_ip("qmimux0");  // fallback
    return ip;
}*/

char *get_qmi_ip(void)
{
    static char ip_addr[128];
    const char *logical_interfaces[] = {"mob1s1a1", "mob1s2a1"};
    char method[32];
    char cmd[512];

    for (int i = 0; i < 2; i++) 
    {
        const char *iface = logical_interfaces[i];
        memset(ip_addr, 0, sizeof(ip_addr));
        memset(method, 0, sizeof(method));

        // Check Method
        snprintf(cmd, sizeof(cmd), "uci -q get network.%s.method", iface);
        execute_system_command(cmd, method, sizeof(method));

        // Try IPv4 from the Logical Interface
        if (strstr(method, "passthrough")) {
            snprintf(cmd, sizeof(cmd), "ifstatus %s | jsonfilter -e '@[\"data\"].bridge_ipaddr'", iface);
        } else {
            snprintf(cmd, sizeof(cmd), "ifstatus %s | jsonfilter -e '@[\"ipv4-address\"][0].address'", iface);
        }
        execute_system_command(cmd, ip_addr, sizeof(ip_addr));
        ip_addr[strcspn(ip_addr, " \r\n")] = 0;

        // Fallback: Try IPv6 from the Logical Interface
        if (strlen(ip_addr) < 7) {
            snprintf(cmd, sizeof(cmd), "ifstatus %s | jsonfilter -e '@[\"ipv6-address\"][0].address'", iface);
            execute_system_command(cmd, ip_addr, sizeof(ip_addr));
            ip_addr[strcspn(ip_addr, " \r\n")] = 0;
        }

        // Final Fallback: Query the Modem directly using corrected JSON path
        // We check CID 1 (index 0 in the list) as it is usually the primary data context
        if (strlen(ip_addr) < 7) {
            // Try IPv4 from modem list
            execute_system_command("ubus call gsm.modem0 get_pdp_addr_list | jsonfilter -e '@.list[0].addr'", 
                                   ip_addr, sizeof(ip_addr));
            ip_addr[strcspn(ip_addr, " \r\n")] = 0;

            if (strlen(ip_addr) < 7) {
                // Try IPv6 from modem list
                execute_system_command("ubus call gsm.modem0 get_pdp_addr_list | jsonfilter -e '@.list[0].addr_v6'", 
                                       ip_addr, sizeof(ip_addr));
                ip_addr[strcspn(ip_addr, " \r\n")] = 0;
            }
        }

        // Return if any valid IP was found on this SIM
        if (strlen(ip_addr) >= 7) {
            return ip_addr;
        }
    }

    return "0.0.0.0";
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
//Execute System command
unsigned int execute_system_command(char *cmd, char *status, size_t max_size) {
	if (!cmd || !status || max_size == 0) {
		return 1;  // Invalid arguments
	}	
	FILE *fp;
	char res[1024];
	fp = popen(cmd, "r");
	if (fp == NULL) {
		log_message("ERROR", "Failed to run command:%s", cmd);
		exit(1);
	}
	while (fgets(res, sizeof(res) - 1, fp) != NULL) {
		sprintf(status, "%s", res);
	}
	pclose(fp);
	return 0;	  	
}

/* Helper to run system commands into buffer */
void get_cmd_output(const char *cmd, char *buf, size_t len)
{
    	execute_system_command(cmd, buf, len);
    	buf[len - 1] = '\0';  // Safety
}

/* Helper to safely trim trailing newline/space */
void trim(char *s)
{
	if (!s) return;
	size_t len = strlen(s);
	while (len > 0 && (s[len - 1] == '\n' || s[len - 1] == '\r' || s[len - 1] == ' '))
	s[--len] = '\0';
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
	trim(imei);
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
		log_message("INFO","IMEI number retrieved: %s", modemIMEI);
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
			log_message("INFO","IMEI number retrieved from file system: %s", buf);
			fclose(handler);
			return 1;
		}
		fclose(handler);
	}

	if(get_imei(imei_output) == 0)
	{
		log_message("INFO","GSMCTL imei %s, strlen %d", imei_output, strlen(imei_output));
	}
	else
	{
		fp = popen("at.sh AT+CGSN", "r");
		if (fp == NULL) {
			log_message("INFO", "Failed to retrieve IMEI");
			return 0;
		}

		while (fgets(imei_output, sizeof(imei_output)-1, fp) != NULL) {
			log_message("INFO", "POPEN imei %s, strlen %d", imei_output, strlen(imei_output));
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
	log_message("INFO", "POPEN imei %s, strlen %d", imei_output, strlen(imei_output));
	log_message("INFO", "modemimei %s, strlen %d", modemIMEI, strlen(modemIMEI));

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

int buildClientIdentifier(void)
{
	char SrcIMEI[32] = {0};
	char serial[32] = {0};	
	get_device_imei(SrcIMEI, sizeof(SrcIMEI));
	if (get_device_serial(serial, sizeof(serial)) == 0) {
		log_message("INFO", "Device Serial: %s", serial);
	} else {
		log_message("ERROR", "Failed to get device serial");
	}

	/* Abort if either is missing */
	if (strlen(SrcIMEI) == 0 || strlen(serial) == 0)
	{
		log_message("ERROR", "IMEI or Serial number missing, cannot start MQTT client");
		return -1;
	}
	snprintf(clientIdentifier, sizeof(clientIdentifier), "RT_%s_%s", SrcIMEI, serial);
	clientIdentifierLength = strlen(clientIdentifier);
	log_message("INFO", "Built Client ID: '%s' (len=%u)", clientIdentifier, (unsigned)clientIdentifierLength);
	return 0;
}

int ensure_dir_exists(const char *path)
{
    struct stat st = {0};

    if (stat(path, &st) == -1) {
        // Directory does not exist, create it
        if (mkdir(path, 0700) != 0) {
            log_message("ERROR", "Failed to create directory %s: %s",
                        path, strerror(errno));
            return -1;
        }
    }
    return 0;
}

int save_file_secure(const char *path, const char *data)
{
    // Create parent directory if needed
    char dir[256];
    snprintf(dir, sizeof(dir), "%s", path);

    char *slash = strrchr(dir, '/');
    if (slash) {
        *slash = '\0'; 
        ensure_dir_exists(dir);
    }

    FILE *f = fopen(path, "w");
    if (!f) {
        log_message("ERROR", "Failed to write file %s", path);
        return -1;
    }

    fwrite(data, 1, strlen(data), f);
    fclose(f);
    chmod(path, 0600);
    return 0;
}

char *read_file(const char *path)
{
    	FILE *f = fopen(path, "r");
   	if (!f) return NULL;
    	fseek(f, 0, SEEK_END);
    	long len = ftell(f);
    	fseek(f, 0, SEEK_SET);
    	char *buf = malloc(len+1);
    	if (!buf) { fclose(f); return NULL; }
    	fread(buf, 1, len, f);
    	buf[len] = '\0';
    	fclose(f);
    	return buf;
}

/* Checks if interface has a valid IP address */
static bool has_ip_address(const char *iface)
{
    char cmd[LOG_BUF_SZ], buf[128];
    snprintf(cmd, sizeof(cmd), "ip -4 addr show dev %s | grep -q 'inet ' >/dev/null && echo 1 || echo 0", iface);
    get_cmd_output(cmd, buf, sizeof(buf));
    // Trim trailing newline if present
    buf[strcspn(buf, "\r\n")] = '\0';    
    return (strcmp(buf, "1") == 0);
}

/* Checks if interface is the default route */
static bool is_default_route(const char *iface)
{
    char cmd[LOG_BUF_SZ], buf[128];
    snprintf(cmd, sizeof(cmd), "ip route show default | grep -w '%s' >/dev/null && echo 1 || echo 0", iface);
    get_cmd_output(cmd, buf, sizeof(buf));
    // Trim trailing newline if present
    buf[strcspn(buf, "\r\n")] = '\0';    
    return (strcmp(buf, "1") == 0);
}

/* Checks if link is detected  */
static bool link_is_up(const char *iface)
{
    char path[64], state[8] = {0};
    snprintf(path, sizeof(path), "/sys/class/net/%s/carrier", iface);
    FILE *fp = fopen(path, "r");
    if (!fp)
        return false;
    if (fgets(state, sizeof(state), fp))
    {
        fclose(fp);
        return (state[0] == '1');
    }
    fclose(fp);
    return false;
}

/* Helper: get default route interface */
static int get_default_iface(char *iface, size_t len)
{
    if (!iface || len == 0)
        return -1;
    iface[0] = '\0';
    execute_system_command("route | grep 'default' | cut -d: -f2 | awk '{ print $8}' | head -1", iface, len);
    trim(iface);
    return (iface[0] != '\0') ? 0 : -1;
}
/* Returns 0=down, 1=up+internet, 2=up-no-route */
/*unsigned int get_interface_status(int interface_name){
	log_message("INFO", "Inside get_interface_status");
	char ip_address[64] = {0};
	char buf[200] = {0};

	unsigned int iNet;
	char neSt[1]={0};
	char viaInternet[10] = {0};
	char pinStatus[32] = {0};
					
	switch (interface_name)
	{
	case WWAN:
	{
        	const char *qmi_ip = get_qmi_ip();
		if (qmi_ip && strcmp(qmi_ip, "0.0.0.0") != 0)
		{
    			strncpy(ip_address, qmi_ip, sizeof(ip_address) - 1);
    			ip_address[sizeof(ip_address) - 1] = '\0';
		}
	    	break;
	}
	case WAN:
	    sleep(2);
	    execute_system_command(SCRIPT_NETWOK_STAT" br-wan", neSt, sizeof(neSt));	    
	    break;
	case LAN:
	    execute_system_command(SCRIPT_NETWOK_STAT" br-lan", neSt, sizeof(neSt));
	    neSt[strcspn(neSt, "\n")] = 0; 
	    return atoi(neSt);
	default:
	    break;
	}

	if (interface_name == WWAN)
	{	
		if(strlen(ip_address) > 7){
			execute_system_command("route | grep 'default' | cut -d: -f2 | awk '{ print $8}' | head -1",  viaInternet, sizeof(viaInternet));
			viaInternet[strcspn(viaInternet, "\n")] = 0;
			if(strstr(viaInternet, "qmimu"))		
				return 1;
			else
				return 2;
		}
		else
			return 0;
	}
	else if(interface_name == WAN)
	{
		trim(neSt); 
		if(strstr(neSt, "1")){		
			execute_system_command("route | grep 'default' | cut -d: -f2 | awk '{ print $8}' | head -1",  viaInternet, sizeof(viaInternet));
			trim(viaInternet);
			if(strstr(viaInternet, "wan") || strstr(viaInternet, "eth1"))		
				return 1;
			else
				return 2;
		}
		else
			return 0;	
	}
	else {
		return 0;
	}
}*/

// Helper to get the metric of a specific interface
int get_route_metric(const char *ifname) {
    char cmd[128];
    char result[16] = {0};
    // This command finds the default route for a specific interface and prints its metric
    snprintf(cmd, sizeof(cmd), "ip route show default dev %s | awk '{print $NF}'", ifname);
    execute_system_command(cmd, result, sizeof(result));
    if (strlen(result) == 0) return 9999; // No route exists
    return atoi(result);
}

//Get Interface Status - 1
unsigned int get_interface_status(int interface_name){
	log_message("INFO", "Inside get_interface_status");
	char ip_address[64] = {0};
	char buf[200] = {0};

	unsigned int iNet;
	char neSt[1]={0};
	char viaInternet[10] = {0};
	char pinStatus[32] = {0};
					
	switch (interface_name)
	{
	case WWAN:
	{
        	const char *qmi_ip = get_qmi_ip();
		if (qmi_ip && strcmp(qmi_ip, "0.0.0.0") != 0)
		{
    			strncpy(ip_address, qmi_ip, sizeof(ip_address) - 1);
    			ip_address[sizeof(ip_address) - 1] = '\0';
		}
	    	break;
	}
	case WAN:
	    execute_system_command(SCRIPT_NETWOK_STAT" br-wan", neSt, sizeof(neSt));	    
	    break;
	case LAN:
	    execute_system_command(SCRIPT_NETWOK_STAT" br-lan", neSt, sizeof(neSt));
	    neSt[strcspn(neSt, "\n")] = 0; 
	    return atoi(neSt);
	default:
	    break;
	}
	sleep(3);	
	int wan_metric = get_route_metric("eth1"); 
    	int wwan_metric = get_route_metric("qmimux0");	
	if (interface_name == WWAN)
	{	
		if(strlen(ip_address) > 7){
			return (wwan_metric < wan_metric) ? 1 : 2;
		}
		else
			return 0;
	}
	else if(interface_name == WAN)
	{
		neSt[strcspn(neSt, "\n")] = 0; 
		if(strcmp(neSt, "1") == 0){
			return 1;
		}
		else{
			log_message("INFO", "WAN Status:0");
			return 0;
		}	
	}
	else {
		log_message("INFO", "Interface Status:0");
		return 0;
	}
}

int backup_certs_to_log(void)
{
    char overlay_cert[256], overlay_key[256];
    char log_cert[256], log_key[256];
    snprintf(overlay_cert, sizeof(overlay_cert), "%s/%s", OVERLAY_CERTS, CERT_FILE);
    snprintf(overlay_key, sizeof(overlay_key), "%s/%s", OVERLAY_CERTS, KEY_FILE);
    snprintf(log_cert, sizeof(log_cert), "%s/%s", LOG_CERTS, CERT_FILE);
    snprintf(log_key, sizeof(log_key), "%s/%s", LOG_CERTS, KEY_FILE);
    // Check if both certs exist in overlay
    if (!file_exists(overlay_cert) || !file_exists(overlay_key)) {
    	log_message("INFO", "Overlay certs not fully present; skipping backup");
        return 0;
    }
    // Create /log/certs if missing
    if (create_directory(LOG_CERTS) != 0) {
     	log_message("ERROR", "Failed to create certs");       
        return -1;
    }    
    // If BOTH files exist in /log/certs
    if (file_exists(log_cert) && file_exists(log_key)) {
     	log_message("INFO", "Backup already present");               
        return 0;
    }    
    log_message("INFO", "Backing up Certs");                   
    // Copy cert
    if (copy_file(overlay_cert, log_cert) != 0)
     	log_message("INFO", "Failed to copy Certs-Cert");                   
    else
     	log_message("INFO", "Copied Certs-Cert");                       
    // Copy key
    if (copy_file(overlay_key, log_key) != 0)
     	log_message("INFO", "Failed to copy Certs-Key");                       
    else
     	log_message("INFO", "Copied Certs-Key");                           

    return 0;
}

int restore_certs_from_log(void)
{
    char overlay_cert[256], overlay_key[256];
    char log_cert[256], log_key[256];

    snprintf(overlay_cert, sizeof(overlay_cert), "%s/deviceCert.crt", "/overlay/certs");
    snprintf(overlay_key, sizeof(overlay_key), "%s/privateKey.key", "/overlay/certs");

    snprintf(log_cert, sizeof(log_cert), "%s/deviceCert.crt", "/log/certs");
    snprintf(log_key, sizeof(log_key), "%s/privateKey.key", "/log/certs");

    if (file_exists(overlay_cert) && file_exists(overlay_key)) {
    	log_message("INFO", "Certificates exist - no restoration from /log");
        return 0; // nothing to restore
    }
    // No backup
    if (!file_exists(log_cert) || !file_exists(log_key)) {
    	log_message("INFO", "Certificates does not exist in /log - provisioning required");
        return -1; // backup missing
    }
    log_message("INFO", "Restoring certs");

    create_directory(OVERLAY_CERTS);

    if (copy_file(log_cert, overlay_cert) != 0) return -1;
    if (copy_file(log_key, overlay_key) != 0) return -1;

    return 1;
}

int get_wifi_interfaces(char ifaces[][32], int max)
{
    FILE *fp = popen("iw dev | awk '$1==\"Interface\" {print $2}'", "r");
    if (!fp)
        return 0;

    int count = 0;
    while (count < max && fgets(ifaces[count], sizeof(ifaces[count]), fp))
    {
        trim(ifaces[count]);
        if (strlen(ifaces[count]) > 0)
            count++;
    }

    pclose(fp);
    return count;
}

int get_elc_port_stats_strings(int lan_idx, LanPortStatsStrings *stats) {
    int target_port = lan_idx + 1; // LAN1=2, LAN2=3, LAN3=4
    char port_header[32];
    snprintf(port_header, sizeof(port_header), "Port %d:", target_port);

    FILE *fp = popen("swconfig dev switch0 show", "r");
    if (!fp) return -1;

    char line[256];
    int in_block = 0;
    unsigned long long rx = 0, tx = 0;

    while (fgets(line, sizeof(line), fp)) {
        if (strncmp(line, port_header, strlen(port_header)) == 0) {
            in_block = 1;
            continue;
        }
        if (in_block && (strncmp(line, "Port ", 5) == 0 || strncmp(line, "VLAN", 4) == 0)) {
            break;
        }

        if (in_block) {
            char *trimmed = line;
            while(*trimmed == ' ' || *trimmed == '\t') trimmed++;

            if (strncmp(trimmed, "RxGoodByte", 10) == 0) {
                sscanf(trimmed, "RxGoodByte : %llu", &rx);
            } 
            else if (strncmp(trimmed, "TxByte", 6) == 0) {
                sscanf(trimmed, "TxByte : %llu", &tx);
            }
        }
    }
    pclose(fp);

    // Convert to strings for JSON
    snprintf(stats->rx_str, sizeof(stats->rx_str), "%llu", rx);
    snprintf(stats->tx_str, sizeof(stats->tx_str), "%llu", tx);
    
    return 0;
}

void get_port_stats(int port_id, char *rx_out, char *tx_out, size_t max_len) {
    // Default fallbacks
    strncpy(rx_out, "0", max_len);
    strncpy(tx_out, "0", max_len);

    FILE *sf = popen("swconfig dev switch0 show", "r");
    if (!sf) return;

    char line[256];
    int current_port = -1;
    int found_rx = 0, found_tx = 0;

    while (fgets(line, sizeof(line), sf)) {
        int p;
        unsigned long long bytes;

        // Detect the start of a port block 
        if (sscanf(line, "Port %d:", &p) == 1) {
            current_port = p;
            continue;
        }

        // Only parse if we are within the matching port block
        if (current_port == port_id) {
            // Parse Rx bytes using the "RxGoodByte" label
            if (!found_rx && strstr(line, "RxGoodByte")) {
                char *colon = strchr(line, ':');
                if (colon) {
                    bytes = strtoull(colon + 1, NULL, 10);
                    snprintf(rx_out, max_len, "%llu", bytes);
                    found_rx = 1;
                }
            }
            
            // Parse Tx bytes using the "TxByte" label
            if (!found_tx && strstr(line, "TxByte")) {
                char *colon = strchr(line, ':');
                if (colon) {
                    bytes = strtoull(colon + 1, NULL, 10);
                    snprintf(tx_out, max_len, "%llu", bytes);
                    found_tx = 1;
                }
            }
        }

        if (found_rx && found_tx) break;
    }
    pclose(sf);
}
