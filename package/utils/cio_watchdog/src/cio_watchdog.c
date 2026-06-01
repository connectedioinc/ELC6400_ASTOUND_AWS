#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <mosquitto.h>
#include <sys/stat.h>
#include <time.h>
#include "cioclient_log.h"

#define TOPIC "router/health"
#define MQTTCLIENT_PROCNAME 		"/bin/cioClient"         // name as shown in `ps` or `pidof`
#define LOG_FILE 			"/overlay/cioClient.log"
#define LOG_STALE_THRESHOLD 		900                  // seconds
#define CLIENTID_FILE_PATH      	"/etc/clientID/imei.txt"
#define CLIENTID_DIRECTORY     		"/etc/clientID"
#define LOG_BUF_SZ                    	128
#define MQTT_SEND_TOPIC			"cio/device/status"
#define MQTT_TLS_FILE			"/etc/cioRootCA.crt"

//Macro for masking - characters
#define mask_char(a) (a)+0x35
#define mask_str(str) \
	do { \
		char * ptr = str ; \
		while (*ptr) \
			*ptr++ += 0x35; \
	}\
	while(0)

#define unmask_str(str) \
	do{ \
		char * ptr = str ; \
		while (*ptr) \
			*ptr++ -= 0x35; \
	}\
	while(0)
	
static int publish_success = 0;

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

// returns 0 if no imei, 1 if imei is returned and validated
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
		log_message("INFO", "ERROR: Failed to retrieve IMEI\n");
		return NULL;
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

	return 1;
}


// MQTT connect callback
void on_connect(struct mosquitto *mosq, void *obj, int rc) {
	if (rc == 0) {
		mosquitto_publish(mosq, NULL, TOPIC, 4, "ping", 1, false);
	} else {
		log_message("ERROR", "MQTT connect failed (rc=%d)", rc);
	}
}

// MQTT publish callback
void on_publish(struct mosquitto *mosq, void *obj, int mid) {
	publish_success = 1;
}

// Check if the log file was updated recently and is non-empty
int check_log_activity(const char *filepath, int max_age_seconds) {
	struct stat st;
	if (stat(filepath, &st) != 0) {
		log_message("ERROR", "Log stat failed");
		return 0;
	}

	time_t now = time(NULL);
	if ((now - st.st_mtime) > max_age_seconds) {
		log_message("ERROR", "Log file %s is stale (%ld seconds old)", filepath, (long)(now - st.st_mtime));
		return 0;
	}

	if (st.st_size == 0) {
		log_message("ERROR", "Log file %s is empty", filepath);
		return 0;
	}

	return 1;
}

// Check if the process is running using pidof
int is_process_running(const char *procname) {
	char cmd[128];
	snprintf(cmd, sizeof(cmd), "pidof %s > /dev/null", procname);
	return (system(cmd) == 0);
}

int main() {
    	int rc;
	char serverIP[LOG_BUF_SZ] = "connector.connectedio.com";
	char port_number[LOG_BUF_SZ] = "8883";
	char ssl_enabled[LOG_BUF_SZ] = "1";
	char keepalive_time[LOG_BUF_SZ] = "300";
	char SrcIMEI[16] = {0};
	char clientid[24] = {0};
        char mqttConnId[64] = {0};
        char mqttConnPwd[64] = {0};
	char mqttID_1[32]="{0}";
	char mqttPwd_1[32]="{0}";
	char strWillPayload[1024] = {0};
	char strWillTopic[260] = {0};
							
	//Connection Credentials
	char connectionID_Str[] = {mask_char('P') , mask_char('s') , mask_char('Q') , mask_char('m') , mask_char('S') , mask_char('@') , mask_char('*') , mask_char('$'), '\0'};
	char connectionpwd_Str[] = {mask_char('W') , mask_char('q') , mask_char('S') , mask_char('7') , mask_char('L') , mask_char('x') , mask_char('Z') , mask_char('a'), '\0'};
	// Step 1: Check MQTT client process
	if (!is_process_running(MQTTCLIENT_PROCNAME)) {
		log_message("ERROR", "MQTT client process '%s' not running", MQTTCLIENT_PROCNAME);
		goto restart;
	}

	// Step 2: Check log activity
	if (!check_log_activity(LOG_FILE, LOG_STALE_THRESHOLD)) {
		log_message("ERROR", "MQTT client log inactive\n");
		goto restart;
	}

	// Step 3: MQTT publish test
	/*mosquitto_lib_init();
	int imRet = get_device_imei(SrcIMEI, 16);
	if(imRet == 0  || strlen(SrcIMEI) != 15){
		log_message("ERROR", "Cannot detect IMEI number, exiting..\n");
		return EXIT_FAILURE;
	}
	snprintf(clientid, 23, "%s", SrcIMEI);
	log_message("INFO", "Client ID(IMEI) : %s", SrcIMEI);
	
	//MQTT ID and Password creation 
	if(strlen(SrcIMEI) == 15) {  
		strncpy(mqttID_1, SrcIMEI + 9, 6);
		strncpy(mqttPwd_1, SrcIMEI + 11, 4);

		unmask_str(connectionID_Str);
		unmask_str(connectionpwd_Str);

		mask_str(mqttID_1);	
		mask_str(mqttPwd_1);

		if(strlen(mqttID_1) > 0 && strlen(mqttPwd_1) && strlen(connectionID_Str) && strlen(connectionpwd_Str))
		{
			snprintf(mqttConnId, 64, "%s%s",mqttID_1, connectionID_Str);
			snprintf(mqttConnPwd, 64, "%s%s",mqttPwd_1,connectionpwd_Str);			
		}
	}
	else
	{
		log_message("ERROR", "Cannot detect IMEI number, exiting cioClient(Main2)\n");
		return EXIT_FAILURE;	
	}
			
	struct mosquitto *mosq = mosquitto_new(clientid, true, NULL);
	if (!mosq) {
		log_message("ERROR", "Failed to create mosquitto instance");
		return 1;
	}

	//Declare MQTT callbacks
	if( strlen(mqttConnId)>0 && strlen(mqttConnPwd)>0)
		mosquitto_username_pw_set(mosq, mqttConnId, mqttConnPwd);

	if(atoi(ssl_enabled) == 1) {
		rc = mosquitto_tls_set(mosq, MQTT_TLS_FILE, NULL, NULL, NULL, NULL);
		if (rc) {
			log_message("ERROR",  "ERROR: Setting TLS failed %d\n", rc);
		}
	}
	mosquitto_will_clear(mosq);
	sprintf(strWillTopic, MQTT_SEND_TOPIC);
	sprintf(strWillPayload, "{\"A\":{\"a\":\"%s\",\"b\":\"0\"}}", SrcIMEI);
	mosquitto_will_set(mosq, strWillTopic ,strlen(strWillPayload) ,strWillPayload, 1, false);
		
	mosquitto_connect_callback_set(mosq, on_connect);
	mosquitto_publish_callback_set(mosq, on_publish);

	rc = mosquitto_connect_async(mosq, serverIP, atoi(port_number), atoi(keepalive_time));
	if (rc != MOSQ_ERR_SUCCESS) {
		log_message("ERROR", "MQTT async connect failed: %s", mosquitto_strerror(rc));
		mosquitto_destroy(mosq);
		goto restart;
	}

	mosquitto_loop_start(mosq);

	// Wait up to 10 seconds for publish to succeed
	for (int i = 0; i < 10 && !publish_success; ++i) {
		sleep(1);
	}

	mosquitto_loop_stop(mosq, true);
	mosquitto_disconnect(mosq);
	mosquitto_destroy(mosq);
	mosquitto_lib_cleanup();

	if (!publish_success) {
		log_message("ERROR", "MQTT publish failed");
		goto restart;
	}*/

	log_message("INFO", "Watchdog check passed ");
	return 0;

	restart:
    		log_message("INFO", "Restarting MQTT client");
    		system("killall -9 cioClient");
    		return 1;
}
