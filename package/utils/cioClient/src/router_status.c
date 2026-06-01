#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>
#include <time.h>
#include <string.h> 
#include <ctype.h>
#include <sys/time.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/wait.h>

#include "cio_defaults.h"
#include "router_status.h"

char lastManufacturerIdentifier[20] = {};
unsigned long long int lastWwanDataUsageRequestTime = 0;
unsigned int previous_interface_states;
unsigned int previous_lan_interface_states;


char uploadURLPath[256] = {}; 
char notificationID[256] = {};
char httpHeaderValue[256] = {};
int countFiles = 0;
int vzoRNA = 0;

long long GetTimeNow(){
	long long tick = 0;
	struct timeval tv;
	gettimeofday(&tv, NULL);
	tick = (long long)tv.tv_sec*1000 + (long long)tv.tv_usec/1000;
	return tick;
}

static void getEpochTime(unsigned long long *time){
	struct timeval tv;    
	gettimeofday(&tv, NULL);    
	*time = (unsigned long long)(tv.tv_sec);
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
//Run AT command
int run_atcommand(char *at_cmd, char *status) {
	log_message("INFO", "Inside run_atcommand");
	if (strlen(at_cmd) > MAX_AT_CMD_LENGTH) {
		strcpy(status, "ERROR");
		return 1;
	}
	char atRes[AT_RESPONSE_LENGTH] = {0};
	char command[MONITORING_CMD_LENGTH] = {0};
	char response[AT_RESPONSE_LENGTH] = {0};
	// Check if modem is supported
	if (execute_system_command("at.sh at", atRes, sizeof(atRes)) != 0 || !strstr(atRes, "OK")) {
		strcpy(status, "Failed: Modem not supported");
		return 1;
	}
	// Construct command string safely
	snprintf(command, sizeof(command), "at.sh %s", at_cmd);
	FILE *fp = popen(command, "r");
	if (!fp) {
		strcpy(status, "Failed: Failed to run AT command");
		return 1;
	}
	// Read response from command
	if (fgets(response, sizeof(response), fp) == NULL) {
		pclose(fp);
		strcpy(status, "Failed: No response from AT command");
		return 1;
	}
	// Close command stream
	pclose(fp);
	// Store response safely
	snprintf(status, EVENT_RESPONSE_SIZE, "%s", response);
	return 0;
}
// Helper function to execute a system command and check for success
int execute_cmd(const char *cmd) {
	int ret = system(cmd);
	if (ret != 0) {
		log_message("ERROR", "Error executing command: %s", cmd);
		return -1;  // Return error if the command fails
	}
	return 0;  // Return success if the command executes properly
}

// Helper function to validate if the input string is valid (not null and within acceptable length)
int is_valid_ip(const char *ip) {
    return (strcmp(ip, "null") != 0 && strnlen(ip, MAX_IP_LEN) >= 7);
}
// Helper function to handle CURL errors
void handle_curl_error(CURL *curl, CURLcode res, char *status, char *curlErrorMessage) {
    if (res != CURLE_OK) {
        snprintf(status, LOG_BUF_SZ, "%s:%s", curl_easy_strerror(res), curlErrorMessage);
    } else {
        snprintf(status, LOG_BUF_SZ, "Success: File Uploaded");
    }
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
unsigned int get_iccid(char* iccid) {
	log_message("INFO", "Inside get_iccid");
	int ret = execute_system_command("at.sh AT+CCID | grep 'CCID:' | cut -d: -f2 | awk '{ print $1}'", iccid, LOG_BUF_SZ);
	if (ret == 0) {
		iccid[strcspn(iccid, "\n")] = '\0';  // Remove newline character
		// Check for errors in the response
		if (strstr(iccid, "ERROR")) {
	    		iccid[0] = '\0';  // Clear the ICCID value on error
	    		return -1;  // Return error code
		}
		// Check if ICCID is 20 digits
		if (strlen(iccid) == 20) {
	    		return 0;  // Success
		} else {
	    		iccid[0] = '\0';  // Clear the ICCID if the length is incorrect
	    		return -1;  // Return error code
		}
	}
	iccid[0] = '\0';  // Clear ICCID if the command failed
	return -1;  // Return error code
}
//Get Modem Firmware Version
unsigned int get_modem_firmware_version(char *modem_firmware) {
	log_message("INFO", "Inside get_modem_firmware_version");
	int ret = execute_system_command("at.sh AT+CGMR", modem_firmware, LOG_BUF_SZ);
	// Remove carriage return and newline characters
	modem_firmware[strcspn(modem_firmware, "\r\n")] = '\0';

	if (ret == 0 && strlen(modem_firmware) > 2) {
	// Check for specific firmware versions
		if (strstr(modem_firmware, "20.00.005")) {
			vzoRNA = 1;  // Version 20.00.005
		} else if (strstr(modem_firmware, "20.00.505")) {
	    		vzoRNA = 2;  // Version 20.00.505
		} else {
	    		vzoRNA = 0;  // Default version or unknown
		}
		return 0;  // Success
	}
	return -1;  // Error
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
//Get APN
unsigned int get_apn(char* apn) {
	log_message("INFO", "Inside get_apn");
	int ret = execute_system_command("at.sh AT+CGCONTRDP=1 | grep '+CGCONTRDP:' | cut -d: -f2 | cut -d, -f3 | awk '{print $1}'| sed -e 's/^\"//' -e 's/\"$//'", apn, LOG_BUF_SZ);
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
//Get IMEI
unsigned int get_imei(char* imei) {
	log_message("INFO", "Inside get_imei");
	int ret = execute_system_command("at.sh at+cgsn | cut -d' ' -f1", imei, LOG_BUF_SZ);
	// Check for errors and validate IMEI length
	if (strstr(imei, "ERROR") || strlen(imei) < 15) {
		imei[0] = '\0';  // Clear IMEI string on error
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
//Get Mode
unsigned int get_mode(char *mode) {
	log_message("INFO", "Inside get_mode");
	
	char cMode[LOG_BUF_SZ] = {0};

	// Execute system command to fetch mode
	if (!execute_system_command("api GET /modems/status | jsonfilter -e '@.http_body.data[0].conntype'", cMode, sizeof(cMode))) {
		//strip_nonprintable(cMode);
		if (cMode[0] == '\0') {  // If mode is empty, return immediately
			mode[0] = '\0';  // Ensure mode is an empty string
	    		return 0;
		}
		else
		{
			snprintf(mode, LOG_BUF_SZ, cMode); 
			return 0;
		}
	} 
	else {
		snprintf(mode, LOG_BUF_SZ, "UNIDENTIFIED"); 
		return 0;
	}
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
//Identify Manufacturer
int manufacture_identification() {
	log_message("INFO", "Inside manufacture_identification");
	static char response[100];
	memset(response, '\0', sizeof(response));
	run_atcommand("AT+CGMM", response);
	// Clear the last manufacturer identifier if no valid response
	memset(lastManufacturerIdentifier, '\0', sizeof(lastManufacturerIdentifier));
	// Map the manufacturer identifier based on response
	if (strstr(response, "LE910-EUG")) {
		strcpy(lastManufacturerIdentifier, "ER1000T-EU");
	} else if (strstr(response, "LE910-NAG")) {
		strcpy(lastManufacturerIdentifier, "ER1000T-NA");
	} else if (strstr(response, "LE910-NA1")) {
		strcpy(lastManufacturerIdentifier, "ER2000T-NA");
	} else if (strstr(response, "LE910-SV1")) {
		strcpy(lastManufacturerIdentifier, "ER2000T-VZ");
	} else if (strstr(response, "LE910-NA")) {
		strcpy(lastManufacturerIdentifier, "ER2800T");
	} else if (strstr(response, "SIMCOM")) {
		strcpy(lastManufacturerIdentifier, "SIMCom");
	} else if (strstr(response, "Qualcom")) {
		strcpy(lastManufacturerIdentifier, "Qualcom");
	} else if (strstr(response, "Failed")) {
		strcpy(lastManufacturerIdentifier, response);
	} else {
	// Default case
		strcpy(lastManufacturerIdentifier, "NA");
		return 1;
	}
	return 0;
}
//Get Data Usage
unsigned int get_wwan_data_usage(char* data_usage) {
	log_message("INFO", "Inside get_wwan_data_usage");
	char RXBytes_WAN[LOG_BUF_SZ] = {0};
	char TXBytes_WAN[LOG_BUF_SZ] = {0};
	char RXBytes_WWAN1[LOG_BUF_SZ] = {0};
	char TXBytes_WWAN1[LOG_BUF_SZ] = {0};
	char RXBytes_WWAN2[LOG_BUF_SZ] = {0};
	char TXBytes_WWAN2[LOG_BUF_SZ] = {0};
	unsigned long long int currentTime;
	int fCheckin = 0;
	char simIntf1[8] = {0};
	char simIntf2[8] = {0};
	char simSlot[1]={0};
	// Fetch manufacture identification only if needed
	if (lastManufacturerIdentifier[0] == '\0') {
		manufacture_identification();
	}
	// Check boot status efficiently
	char bootSt[LOG_BUF_SZ] = {0};
	execute_system_command("uci get system.@system[0].booted", bootSt, sizeof(bootSt));
	if (bootSt[0] == '1') {
		fCheckin = 1;
		system("uci set system.@system[0].booted=0 && uci commit system");
	}
	execute_system_command("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",  simIntf1, sizeof(simIntf1));
	execute_system_command("ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",  simIntf2, sizeof(simIntf2));

	if(strstr(simIntf1,"true") && strstr(simIntf2,"false")){
		// Get sim1 data usage
		execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 rx",  RXBytes_WWAN1, sizeof(RXBytes_WWAN1));
		execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 tx", TXBytes_WWAN1, sizeof(TXBytes_WWAN1));		
		strcpy(simSlot, "1");
		strcpy(RXBytes_WWAN2, "1");
		strcpy(TXBytes_WWAN2, "1");
	}			
	else if(strstr(simIntf2,"true") && strstr(simIntf1,"false")){
		// Get sim2 data usage
		execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 rx",  RXBytes_WWAN2, sizeof(RXBytes_WWAN2));
        	execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 tx",  TXBytes_WWAN2, sizeof(TXBytes_WWAN2));	
		strcpy(simSlot, "2");
		strcpy(RXBytes_WWAN1, "1");
		strcpy(TXBytes_WWAN1, "1");	
	}
	else if(strstr(simIntf2,"true") && strstr(simIntf1,"true")){
		// Get sim1/sim2 data usage
		execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 rx",  RXBytes_WWAN1, sizeof(RXBytes_WWAN1));
		execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 tx", TXBytes_WWAN1, sizeof(TXBytes_WWAN1));		
		execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 rx",  RXBytes_WWAN2, sizeof(RXBytes_WWAN2));
        	execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 tx",  TXBytes_WWAN2, sizeof(TXBytes_WWAN2));	
		strcpy(simSlot, "1");	
	}	
	else{
		strcpy(RXBytes_WWAN1, "1");
		strcpy(TXBytes_WWAN1, "1");
		strcpy(RXBytes_WWAN2, "1");
		strcpy(TXBytes_WWAN2, "1");		
		strcpy(simSlot, "");
	}			
	// Get wan data usage
	execute_system_command("ifconfig wan | grep 'RX bytes:' | cut -d: -f2 | awk '{print $1}'", RXBytes_WAN, sizeof(RXBytes_WAN));
	execute_system_command("ifconfig wan | grep 'TX bytes:' | cut -d: -f3 | awk '{print $1}'", TXBytes_WAN, sizeof(TXBytes_WAN));	
	int Sim_num = atoi(simSlot);				
	// Get current time
	getEpochTime(&currentTime);
	lastWwanDataUsageRequestTime = currentTime;

	sprintf(data_usage,"\"b\":\"%s\",\"c\":\"%s\",\"d\":\"%s\",\"e\":\"%s\",\"f\":\"%llu\",\"g\":\"%d\",\"h\":\"%s\",\"i\":\"%s\"",RXBytes_WAN,TXBytes_WAN,RXBytes_WWAN1,TXBytes_WWAN1,currentTime,fCheckin,RXBytes_WWAN2,TXBytes_WWAN2);

	return 0;
}
//Get Lan IP
unsigned int get_lan_ip(char* lan_ip_address) {
	log_message("INFO", "Inside get_lan_ip");
	int ret;
	// Run the system command to get LAN IP address
	ret = execute_system_command("ifconfig br-lan | grep 'inet addr:' | cut -d: -f2 | awk '{ print $1}'", lan_ip_address, LOG_BUF_SZ);
	// Remove any trailing newline or spaces
	lan_ip_address[strcspn(lan_ip_address, "\n")] = 0;
	// Check if a valid IP address was retrieved
	if (ret == 0 && strlen(lan_ip_address) >= 7) {
		return 0;  // Success
	}
	// If IP address retrieval failed or is invalid, return error
	return 1;
}
//Get WAN IP
unsigned int get_wan_ip(char* wan_ip_address) {
	int ret;
	log_message("INFO", "Get WAN IP by running IFCONFIG command");
	// Execute the system command to get the WAN IP
	ret = execute_system_command("ifconfig wan | grep 'inet addr:' | cut -d: -f2 | awk '{ print $1}'", wan_ip_address, sizeof(wan_ip_address));
	// Remove trailing newline
	wan_ip_address[strcspn(wan_ip_address, "\n")] = 0;
	// Check if the IP address length is valid
	if (strlen(wan_ip_address) >= 7) {
		return 0;  // Success
	}
	return 1;  // Error
}
//Get WWAN IP
unsigned int get_wwan_ip(char* wwan_ip_address) {
	int ret, ret1;
	char wwan_intf[LOG_BUF_SZ] = {};
	char cell_intf_methd[LOG_BUF_SZ] = {};

	log_message("INFO", "Get WWAN IP by running IFCONFIG command");

	// Get the WWAN interface
	execute_system_command("ip -o link show qmimux0 | awk -F': ' '{print $2}'", wwan_intf, sizeof(wwan_intf));

	if (strlen(wwan_intf) >= 2) {
		// Get the cell interface method
		ret1 = execute_system_command("uci get network.mob1s1a1.method", cell_intf_methd, sizeof(cell_intf_methd));
		if (strstr(cell_intf_methd, "passthrough")) {
    			// Passthrough → fetch bridge IP
    			ret1 = execute_system_command("ifstatus mob1s1a1 | jsonfilter -e '@[\"data\"].bridge_ipaddr'", wwan_ip_address, sizeof(wwan_ip_address));
		} else {
    			// Try IPv4 first
    			ret = execute_system_command("ip -4 addr show qmimux0 | grep inet | awk '{print $2}' | cut -d/ -f1", wwan_ip_address, sizeof(wwan_ip_address));

    			// If no IPv4, try IPv6
    			if (strlen(wwan_ip_address) <= 1) {
        			memset(wwan_ip_address, '\0', sizeof(wwan_ip_address));
        			ret = execute_system_command("ip -6 addr show qmimux0 scope global | grep inet6 | awk '{print $2}' | cut -d/ -f1", wwan_ip_address, sizeof(wwan_ip_address));
    			}
		}
	}

	// Trim newline/space
	wwan_ip_address[strcspn(wwan_ip_address, "\n")] = 0;
	// Check if valid
	if (strnlen(wwan_ip_address, sizeof(wwan_ip_address)) >= 7) {
		return 0;  // Success
	}
	return 1;  // Error
}
//Get Interface Status
unsigned int get_intf_stat(int interface_name){
	log_message("INFO", "Inside get_intf_stat");
	char ip_address[64] = {0};
	char buf[200] = {0};    
	switch (interface_name)
	{
	case WWAN:
	    get_wwan_ip(ip_address);
	    break;
	case WAN:
	    get_wan_ip(ip_address);
	    break;
	case LAN:
	    get_lan_ip(ip_address);
	    break;
	default:
	    break;
	}    
	if (strlen(ip_address) > 7)
	{
		return 1;
	}else {
		return 0;
	}
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
	    get_wwan_ip(ip_address);
	    break;
	case WAN:
	    execute_system_command(SCRIPT_NETWOK_STAT" br-wan", neSt, sizeof(neSt));	    
	    break;
	case LAN:
	    execute_system_command(SCRIPT_NETWOK_STAT" br-lan", neSt, sizeof(neSt));
	    neSt[strcspn(neSt, "\n")] = 0; 
	    return atoi(neSt);
	    //get_lan_ip(ip_address);
	    //break;
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
		neSt[strcspn(neSt, "\n")] = 0; 
		if(strcmp(neSt, "1") == 0){		
			execute_system_command("route | grep 'default' | cut -d: -f2 | awk '{ print $8}' | head -1",  viaInternet, sizeof(viaInternet));
			viaInternet[strcspn(viaInternet, "\n")] = 0;
			if(strcmp(viaInternet, "wan") == 0 || strcmp(viaInternet, "eth1") == 0)		
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
}
// Device interface change alerts
unsigned int check_device_alerts(char *current_interface, char *prev_interface){
	log_message("INFO", "Inside check_device_alerts");
	unsigned int current_interface_states = 0;
	unsigned int iwan,ilan,iwwan;
	char lanSt[1]={0};
	char wanSt[1]={0};
	char wwanSt[1]={0};

	execute_system_command(SCRIPT_NETWOK_STAT" br-wan", wanSt, sizeof(wanSt));
	execute_system_command(SCRIPT_NETWOK_STAT" br-lan", lanSt, sizeof(lanSt));
	wanSt[strcspn(wanSt, "\n")] = 0;
	lanSt[strcspn(lanSt, "\n")] = 0;

	iwwan   =  get_intf_stat(WWAN);
	iwan    =  atoi(wanSt)<<1;
	ilan    =  atoi(lanSt)<<2;

	log_message("INFO", "%d...%d...%d", iwwan,iwan,ilan);
	current_interface_states = iwwan + iwan + ilan;
	sprintf(current_interface, "%d", current_interface_states);
	sprintf(prev_interface, "%d", previous_interface_states);		
	log_message("INFO", "current_interface_states = %d previous_interface_states = %d\n", current_interface_states, previous_interface_states);
	if(previous_interface_states != current_interface_states){
		previous_interface_states = current_interface_states;
	}
	return 0;
}
//Get WIFI associated devices
unsigned int get_assoc_list(char *assoc_hosts){
	log_message("INFO", "Inside get_assoc_list");
	FILE *fp;
	fp = popen(SCRIPT_ASSOC_LIST, "r");
	if (fp == NULL) {
		log_message("ERROR", "Failed to run assocList.sh");
    		return 1;
	}
	fscanf(fp,"%s", assoc_hosts);
	pclose(fp);
    	return 0;
}
//Get Ethernet associated devices
unsigned int get_ethernet_list(char *eth_hosts) {
	log_message("INFO", "Inside get_ethernet_list");
	// Clear the buffer to avoid old data
	memset(eth_hosts, 0, sizeof(eth_hosts));
	// Run the system command and check if it succeeds
	int ret = execute_system_command(SCRIPT_STATION_LIST, eth_hosts, sizeof(eth_hosts));
	if (ret != 0) {
		log_message("ERROR", "Failed to run getStationLists.sh");
		return 1; // Return error code if command execution fails
	}
	// Ensure the output is properly null-terminated
	eth_hosts[strcspn(eth_hosts, "\n")] = 0;
	return 0;
}
//Get  Load Avg devices
unsigned int get_loadAvg_list(char *load_list){
	log_message("INFO", "Inside get_loadAvg_list");
	// Clear the buffer to avoid old data
	memset(load_list, 0, sizeof(load_list));
	// Run the system command and check if it succeeds
	int ret = execute_system_command(SCRIPT_LOAD_AVG, load_list, sizeof(load_list));
	if (ret != 0) {
		log_message("ERROR", "Failed to run loadAvg.sh");		
		return 1; // Return error code if command execution fails
	}
	// Ensure the output is properly null-terminated
	load_list[strcspn(load_list, "\n")] = 0;
	return 0;
}
//Get MemInfo
unsigned int get_memInfo_list(char *mem_list){
	log_message("INFO", "Inside get_memInfo_list");
	// Clear the buffer to avoid old data
	memset(mem_list, 0, sizeof(mem_list));
	// Run the system command and check if it succeeds
	int ret = execute_system_command(SCRIPT_MEM_INFO, mem_list, sizeof(mem_list));
	if (ret != 0) {
		log_message("ERROR", "Failed to run memInfo.sh");
		return 1; // Return error code if command execution fails
	}
	// Ensure the output is properly null-terminated
	mem_list[strcspn(mem_list, "\n")] = 0;
	return 0;
}
//Get DF Info
unsigned int get_df_list(char *df_list){
	log_message("INFO", "Inside get_df_list");
	// Clear the buffer to avoid old data
	memset(df_list, 0, sizeof(df_list));
	// Run the system command and check if it succeeds
	int ret = execute_system_command(SCRIPT_DF_OUTPUT, df_list, sizeof(df_list));
	if (ret != 0) {
		log_message("ERROR", "Failed to run dfOutput.sh");
		return 1; // Return error code if command execution fails
	}
	// Ensure the output is properly null-terminated
	df_list[strcspn(df_list, "\n")] = 0;
	return 0;
}
//Get Wifi Settings
unsigned int get_wifi_settings(char* wifi_Info){
	log_message("INFO", "Inside get_wifi_settings");
	// Clear the buffer to avoid old data
	memset(wifi_Info, 0, sizeof(wifi_Info));
	// Run the system command and check if it succeeds
	int ret = execute_system_command(SCRIPT_WIFI_PARAMS, wifi_Info, sizeof(wifi_Info));
	if (ret != 0) {
		log_message("ERROR", "Failed to run wifiParams.sh");
		return 1; // Return error code if command execution fails
	}
	// Ensure the output is properly null-terminated
	wifi_Info[strcspn(wifi_Info, "\n")] = 0;
	return 0;
}
//Get device details
unsigned int get_device_details(char* device_info) {
	log_message("INFO", "Inside get_device_details");
	char firmware_version[LOG_BUF_SZ] = {};
	char iccid[LOG_BUF_SZ] = {};
	char apn[LOG_BUF_SZ] = {};
	char operator_id[LOG_BUF_SZ] = {};
	char phone_number[LOG_BUF_SZ] = {};
	char modem_firmware_version[LOG_BUF_SZ] = {};
	char modem_module[LOG_BUF_SZ] = {};
	char simIntf1[8] = {0};
	char simIntf2[8] = {0};
	char simSlot[1]={0};
	// Get individual details using their respective functions
	get_firmware_version(firmware_version);
	get_iccid(iccid);
	get_apn(apn);
	get_operator(operator_id);
	get_phoneNumber(phone_number);
	get_modem_firmware_version(modem_firmware_version);
	get_modem_module(modem_module);
	
	execute_system_command("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",  simIntf1, sizeof(simIntf1));
	execute_system_command("ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",  simIntf2, sizeof(simIntf2));
	if(strstr(simIntf1,"true"))
		strcpy(simSlot, "0");			
	else if(strstr(simIntf2,"true"))
		strcpy(simSlot, "1");
	else
		strcpy(simSlot, "");
			
	// Ensure ICCID is valid, otherwise reset it
	if (strlen(iccid) != 20) {
		strcpy(iccid, "");
	}
	// Format the device details in JSON-like structure
	sprintf(device_info,
	"\"b\":\"%s\","
	"\"c\":\"%s\","
	"\"d\":{\"a\":{\"a\":\"%s\",\"b\":\"%s\",\"c\":\"%s\"}},"
	"\"e\":\"%s\","
	"\"f\":\"%s\",\"g\":\"%s\"",
	firmware_version, iccid, apn, operator_id, phone_number, modem_firmware_version, modem_module, simSlot);
	return 0;
}
//Get Device network info
unsigned int get_device_network_info(char* device_network){
	log_message("INFO", "Inside get_device_network_info");
	char simIntf1[8] = {0};
	char simIntf2[8] = {0};
	char simSlot[1]={0};	
	// Clear the device_network buffer to avoid old data
	memset(device_network, 0, sizeof(device_network));

	// Retrieve the network information
	char snr[LOG_BUF_SZ] = {};
	if (get_snr(snr) != 0) {
		strcpy(snr, "ERROR"); // In case of failure, set to "ERROR"
	}
	char mode[LOG_BUF_SZ] = {};
	if (get_mode(mode) != 0) {
		strcpy(mode, "ERROR"); // In case of failure, set to "ERROR"
	}

	char signal_strength[LOG_BUF_SZ] = {};
	if (get_signal_strength(signal_strength) != 0) {
		strcpy(signal_strength, "ERROR"); // In case of failure, set to "ERROR"
	}

	char system_uptime[SYSTEM_UPTIME_SIZE] = {};
	if (get_system_uptime(system_uptime) != 0) {
		strcpy(system_uptime, "ERROR"); // In case of failure, set to "ERROR"
	}
	
	execute_system_command("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",  simIntf1, sizeof(simIntf1));
	execute_system_command("ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",  simIntf2, sizeof(simIntf2));
	if(strstr(simIntf1,"true"))
		strcpy(simSlot, "0");			
	else if(strstr(simIntf2,"true"))
		strcpy(simSlot, "1");
	else
		strcpy(simSlot, "");
			
	sprintf(device_network,"\"b\":\"%s\",\"c\":\"%s\",\"d\":\"%s\",\"e\":\"%s\",\"f\":\"%s\"",snr, mode, signal_strength, system_uptime, simSlot);
	return 0;
}
//Get LAN status
unsigned int check_lan_status(char *current_interface, char *prev_interface){
	log_message("INFO","Inside check_lan_status");
	unsigned int current_interface_states = 0;
	unsigned int l1,l2,l3,l4;
	char lan1[1]={0};
	char lan2[1]={0};
	char lan3[1]={0};
	char lan4[1]={0};	
	log_message("INFO", "Get LAN Status by running the script, portstatus.sh");	    	    
	execute_system_command(SCRIPT_PORT_STATUS" lan1", lan1, sizeof(lan1));
	execute_system_command(SCRIPT_PORT_STATUS" lan2", lan2, sizeof(lan2));
	execute_system_command(SCRIPT_PORT_STATUS" lan3", lan3, sizeof(lan3));
	execute_system_command(SCRIPT_PORT_STATUS" lan4", lan4, sizeof(lan4));	
	l1   =  atoi(lan1);
	l2   =  atoi(lan2)<<1;
	l3   =  atoi(lan3)<<2;
	l4   =  atoi(lan4)<<3;		
	current_interface_states = l1 + l2 + l3 + l4;
	sprintf(current_interface, "%d", current_interface_states);
	sprintf(prev_interface, "%d", previous_lan_interface_states);		
	log_message("INFO", "Current_interface_states = %d, Previous_lan_interface_states = %d", current_interface_states, previous_lan_interface_states);	    	    	
	if(previous_lan_interface_states != current_interface_states){
		previous_lan_interface_states = current_interface_states;
	}
	return 0;
}
//Gather Info for refresh
unsigned int get_refresh_data(char* refresh_data){
	log_message("INFO", "Inside get_refresh_data");
	// Clear the refresh_data buffer to avoid carrying old data
	memset(refresh_data, 0, sizeof(refresh_data));

	// Declare and initialize buffer variables for each piece of data
	char data_usage[LOG_BUF_SZ] = {};
	char assoc_hosts[4096] = {};
	char wifi_info[2048] = {};
	char device_info[1024] = {};
	char device_network[1024] = {};
	char interface_status[5120] = {};
	char eth_info[2048] = {};

	char wanRxDx[32] = {0};
	char wanTxDx[32] = {0};
	char wwanRxDx[32] = {0};
	char wwanTxDx[32] = {0};
	char lan1RxDx[32] = {0};
	char lan1TxDx[32] = {0};
	char lan2RxDx[32] = {0};
	char lan2TxDx[32] = {0};
	char lan3RxDx[32] = {0};
	char lan3TxDx[32] = {0};
	char lan4RxDx[32] = {0};
	char lan4TxDx[32] = {0};
	char lan1Mac[32] = {0};
	char lan2Mac[32] = {0};
	char lan3Mac[32] = {0};
	char lan4Mac[32] = {0};

	char wanMac[32] = {0};
	char wwanMac[32] = {0};
	char simIntf1[8] = {0};
	char simIntf2[8] = {0};
	char simSlot[1]={0};
	char slan1[8] = {0};
	char slan2[8] = {0};
	char slan3[8] = {0};
	char slan4[8] = {0};
			
	unsigned int iwan, ilan, iwwan;
	char wwan_ip_address[64] = {0};
	char wan_ip_address[64] = {0};
	char lan_ip_address[64] = {0};

	// Gather all the data
	get_wwan_data_usage(data_usage);
	get_assoc_list(assoc_hosts);
	get_device_details(device_info);
	get_device_network_info(device_network);
	get_ethernet_list(eth_info);

	iwwan = get_interface_status(WWAN);
	iwan = get_interface_status(WAN);
	ilan = get_interface_status(LAN);

	execute_system_command(SCRIPT_PORT_STATUS" lan1", slan1, sizeof(slan1));	
	slan1[strcspn(slan1, "\n")] = 0;

	execute_system_command(SCRIPT_PORT_STATUS" lan2", slan2, sizeof(slan2));	
	slan2[strcspn(slan2, "\n")] = 0;

	execute_system_command(SCRIPT_PORT_STATUS" lan3", slan3, sizeof(slan3));	
	slan3[strcspn(slan3, "\n")] = 0;

	execute_system_command(SCRIPT_PORT_STATUS" lan4", slan4, sizeof(slan4));	
	slan4[strcspn(slan4, "\n")] = 0;
			
	// Get IPs and stats
	get_wwan_ip(wwan_ip_address);
	get_wan_ip(wan_ip_address);
	get_lan_ip(lan_ip_address);

	execute_system_command("ifconfig wan | grep 'RX bytes:' | cut -d: -f2 | awk '{print $1}'", wanRxDx, sizeof(wanRxDx));
	execute_system_command("ifconfig wan | grep 'TX bytes:' | cut -d: -f3 | awk '{print $1}'", wanTxDx, sizeof(wanTxDx));
	execute_system_command("cat /sys/class/net/wan/address", wanMac, sizeof(wanMac));
	
	execute_system_command("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",  simIntf1, sizeof(simIntf1));
	execute_system_command("ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",  simIntf2, sizeof(simIntf2));
		
	if(strlen(simIntf1)>=2 && strlen(simIntf2)>=2){
		if(strstr(simIntf1,"true")) {
			strcpy(simSlot, "1");			
			execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 rx",  wwanRxDx, sizeof(wwanRxDx));
			execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 tx",  wwanTxDx, sizeof(wwanTxDx));
		} else if(strstr(simIntf2,"true")) {
			strcpy(simSlot, "2");
			execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 rx",  wwanRxDx, sizeof(wwanRxDx));
			execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 tx",  wwanTxDx, sizeof(wwanTxDx));
			
		} else {
			strcpy(simSlot, "");
			execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 rx",  wwanRxDx, sizeof(wwanRxDx));
			execute_system_command("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 tx",  wwanTxDx, sizeof(wwanTxDx));
		}			

		execute_system_command("cat /sys/class/net/`ifconfig | grep qmimu | cut -d' ' -f1`/address",  wwanMac, sizeof(wwanMac));
	}	
	execute_system_command("ifconfig lan1 | grep 'RX bytes:' | cut -d: -f2 | awk '{print $1}'",  lan1RxDx, sizeof(lan1RxDx));
	execute_system_command("ifconfig lan1 | grep 'TX bytes:' | cut -d: -f3 | awk '{print $1}'",  lan1TxDx, sizeof(lan1TxDx));
	execute_system_command("cat /sys/class/net/lan1/address",  lan1Mac, sizeof(lan1Mac));
	execute_system_command("ifconfig lan2 | grep 'RX bytes:' | cut -d: -f2 | awk '{print $1}'",  lan2RxDx, sizeof(lan2RxDx));
	execute_system_command("ifconfig lan2 | grep 'TX bytes:' | cut -d: -f3 | awk '{print $1}'",  lan2TxDx, sizeof(lan2TxDx));
	execute_system_command("cat /sys/class/net/lan2/address",  lan2Mac, sizeof(lan2Mac));
	execute_system_command("ifconfig lan3 | grep 'RX bytes:' | cut -d: -f2 | awk '{print $1}'",  lan3RxDx, sizeof(lan3RxDx));
	execute_system_command("ifconfig lan3 | grep 'TX bytes:' | cut -d: -f3 | awk '{print $1}'",  lan3TxDx, sizeof(lan3TxDx));
	execute_system_command("cat /sys/class/net/lan3/address",  lan3Mac, sizeof(lan3Mac));
	execute_system_command("ifconfig lan4 | grep 'RX bytes:' | cut -d: -f2 | awk '{print $1}'",  lan4RxDx, sizeof(lan4RxDx));
	execute_system_command("ifconfig lan4 | grep 'TX bytes:' | cut -d: -f3 | awk '{print $1}'",  lan4TxDx, sizeof(lan4TxDx));
	execute_system_command("cat /sys/class/net/lan4/address",  lan4Mac, sizeof(lan4Mac));	
	
	// Format the interface status JSON-like string
	sprintf(interface_status,"\"b\":{\"a\":{\"a\":\"%s\",\"b\":\"%d\",\"c\":\"%s\",\"d\":\"%s\",\"e\":\"%s\"}},\"c\":{\"a\":{\"a\":\"%s\",\"b\":\"%d\",\"c\":\"%s\",\"d\":\"%s\",\"e\":\"%s\",\"f\":\"%s\"}},\"d\":{\"a\":{\"a\":\"%s\",\"b\":\"%s\",\"c\":\"%s\",\"d\":\"%s\",\"e\":\"%s\"},\"b\":{\"a\":\"%s\",\"b\":\"%s\",\"c\":\"%s\",\"d\":\"%s\",\"e\":\"%s\"},\"c\":{\"a\":\"%s\",\"b\":\"%s\",\"c\":\"%s\",\"d\":\"%s\",\"e\":\"%s\"},\"d\":{\"a\":\"%s\",\"b\":\"%s\",\"c\":\"%s\",\"d\":\"%s\",\"e\":\"%s\"}}",wan_ip_address, iwan, wanRxDx,wanTxDx, wanMac, wwan_ip_address, iwwan, wwanRxDx, wwanTxDx, wwanMac, simSlot, lan_ip_address, slan1, lan1RxDx,lan1TxDx, lan1Mac, lan_ip_address, slan2, lan2RxDx,lan2TxDx, lan2Mac, lan_ip_address, slan3, lan3RxDx,lan3TxDx,lan3Mac, lan_ip_address, slan4, lan4RxDx,lan4TxDx,lan4Mac);

	// Format the final refresh_data string
	sprintf(refresh_data,
	     "\"c\":{\"I\":{%s},\"C\":{%s},\"D\":{%s},\"F\":{%s},\"G\":{%s},\"H\":{%s}",
	     data_usage, interface_status, assoc_hosts, device_info, device_network, eth_info);
	return 0;
}
// Helper function to set the firewall rule
void set_firewall_rule(unsigned int rule_index, unsigned int flag, unsigned int setting) {
	const char *action = (setting & flag) ? "ACCEPT" : "REJECT";
	char cmd[LOG_BUF_SZ];
	snprintf(cmd, sizeof(cmd), "uci set firewall.@rule[%d].target=%s", rule_index, action);
	if (system(cmd) != 0) {
		printf("Failed to set rule %d to %s\n", rule_index, action);
	}
}

unsigned int set_firewall_settings(char *firewall_setting, char *hostname, char *status) {
	log_message("INFO", "Inside set_firewall_settings");
	unsigned int ifirewall_settings = 0;
	unsigned char cHostname[MAX_HOSTNAME_LEN] = {};
	char t_data[LOG_BUF_SZ] = {};
	log_message("INFO", "Firewall Settings: %s, Hostname: %s\n", firewall_setting, hostname);
	// Convert the firewall_setting string to an integer
	ifirewall_settings = strtol(firewall_setting, NULL, 16);
	// Set firewall rules based on the provided bitmask
	set_firewall_rule(RULE_DHCP_RENEW, DHCP_RENEW, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_PING, ALLOW_PING, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_IGMP, ALLOW_IGMP, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_DHCPv6, ALLOW_DHCPv6, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_MLD, ALLOW_MLD, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_ICMPv6_INPUT, ALLOW_ICMPv6_INPUT, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_ICMPv6_FWD, ALLOW_ICMPv6_FWD, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_PING_SSH, ALLOW_PING_SSH, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_SSH_WAN, ALLOW_SSH_WAN, ifirewall_settings);

	// Commit and restart firewall
	if (system("uci commit firewall") != 0) {
		log_message("ERROR", "Failed to commit firewall settings\n");
	}
	if (system("/etc/init.d/firewall restart") != 0) {
		log_message("ERROR", "Failed to restart firewall\n");
	}
	// Set hostname
	snprintf(t_data, sizeof(t_data), "uci set system.@system[0].hostname=%s", hostname);
	if (system(t_data) != 0) {
		log_message("ERROR", "Failed to set hostname\n");
	}

	// Commit and restart system
	if (system("uci commit system") != 0) {
		log_message("ERROR", "Failed to commit system settings\n");
	}
	if (system("/etc/init.d/system restart") != 0) {
		log_message("ERROR", "Failed to restart system\n");
	}
	return 0;
}

int cio_kaa_helper_set_webaccess_policy(int enable) {
	log_message("INFO", "Inside cio_kaa_helper_set_webaccess_policy");
	static char t_status[LOG_BUF_SZ] = {};
	int ret = 0;
	// Enable or disable web access based on the flag
	if (enable) {
		ret = execute_system_command(SCRIPT_WEB_ACCESS" enable", t_status, sizeof(t_status));
		if (ret != 0) return ret;  // Return if the command fails
	} else {
		ret = execute_system_command(SCRIPT_WEB_ACCESS" disable", t_status, sizeof(t_status));
		if (ret != 0) return ret;  // Return if the command fails	
	}
	return 0;  // Return success
}

// Helper function to get the firewall rule status
unsigned int get_firewall_rule_status(unsigned int rule_index) {
	log_message("INFO", "Inside get_firewall_rule_status");
	char t_status[LOG_BUF_SZ] = {};
	char cmd[LOG_BUF_SZ];
	snprintf(cmd, sizeof(cmd), "uci get firewall.@rule[%d].target", rule_index);
	if (execute_system_command(cmd, t_status, sizeof(t_status)) != 0) {
		log_message("ERROR", "Failed to get rule %d status\n", rule_index);
		return 0;  // Return 0 if the command failed
	}

	if (strstr(t_status, "ACCEPT")) {
		return 1;  // Rule is ACCEPT
	} else if (strstr(t_status, "REJECT")) {
		return 0;  // Rule is REJECT
	} else {
		return 0;  // Default to REJECT in case of error
	}
}

unsigned int read_firewall_settings(char *status) {
	log_message("INFO", "Inside read_firewall_settings");
	unsigned int errcode = 0;
	unsigned int firewall_settings = 0;

	// Read each rule and update the firewall settings bitmask
	firewall_settings |= get_firewall_rule_status(0) ? DHCP_RENEW : 0;
	firewall_settings |= get_firewall_rule_status(1) ? ALLOW_PING : 0;
	firewall_settings |= get_firewall_rule_status(2) ? ALLOW_IGMP : 0;
	firewall_settings |= get_firewall_rule_status(3) ? ALLOW_DHCPv6 : 0;
	firewall_settings |= get_firewall_rule_status(4) ? ALLOW_MLD : 0;
	firewall_settings |= get_firewall_rule_status(5) ? ALLOW_ICMPv6_INPUT : 0;
	firewall_settings |= get_firewall_rule_status(6) ? ALLOW_ICMPv6_FWD : 0;
	firewall_settings |= get_firewall_rule_status(9) ? ALLOW_PING_SSH : 0;
	firewall_settings |= get_firewall_rule_status(9) ? ALLOW_SSH_WAN : 0;

	// Set error codes for rules that couldn't be fetched
	errcode |= (get_firewall_rule_status(0) == 0) ? DHCP_RENEW : 0;
	errcode |= (get_firewall_rule_status(1) == 0) ? ALLOW_PING : 0;
	errcode |= (get_firewall_rule_status(2) == 0) ? ALLOW_IGMP : 0;
	errcode |= (get_firewall_rule_status(3) == 0) ? ALLOW_DHCPv6 : 0;
	errcode |= (get_firewall_rule_status(4) == 0) ? ALLOW_MLD : 0;
	errcode |= (get_firewall_rule_status(5) == 0) ? ALLOW_ICMPv6_INPUT : 0;
	errcode |= (get_firewall_rule_status(6) == 0) ? ALLOW_ICMPv6_FWD : 0;
	errcode |= (get_firewall_rule_status(9) == 0) ? ALLOW_PING_SSH : 0;
	errcode |= (get_firewall_rule_status(9) == 0) ? ALLOW_SSH_WAN : 0;

	// Fetch the system hostname
	char hostname[MAX_HOSTNAME_LEN] = {};
	if (execute_system_command("uci get system.@system[0].hostname", hostname, sizeof(hostname)) != 0) {
		log_message("ERROR", "Failed to get hostname\n");
		return 1;  // Return error if hostname fetch fails
	}
	// Format and return the status
	snprintf(status, LOG_BUF_SZ, "Success:Firewall_Settings:%04X:Err_Code:%d:Hostname:%s", firewall_settings, errcode, hostname);
	log_message("INFO", "%s", status);
	return 0;
}

/* Return:
 * @0 - webaccess deny
 * @1 - webaccess allow */
int cio_kaa_helper_get_webaccess_policy(){
	log_message("INFO", "Inside cio_kaa_helper_get_webaccess_policy");
	char cmd[200];
	char v[100];
	char *t_response = NULL;
	sprintf(cmd,"uci get system.@system[0].enable_web_access=0");
	if (!execute_system_command(cmd,v, sizeof(v))){
		return 0;
	}else{
		return 1;
	}
}
//Function for setting WIFI parameters
unsigned int set_wifi_settings(char *wifi_setting) {
	log_message("INFO", "Inside set_wifi_settings");
	char *pts;
	int ind = 0;
	pts = strtok (wifi_setting,",");
	char cmd[MONITORING_CMD_LENGTH] = {};
	int wifiInd = 0;
	while (pts != NULL) {
	memset(cmd,'\0',sizeof(cmd));
	if (ind == 0){//Wifi Index
		wifiInd = atoi(pts);
	}
	else if (ind == 1){//wifiDisabled
		if (strcmp(pts, "true") == 0){
			sprintf(cmd,"uci set wireless.@wifi-iface[%d].disabled=1", wifiInd);
			system(cmd);
			}
		else{
			sprintf(cmd,"uci delete wireless.@wifi-iface[%d].disabled", wifiInd);			
			system(cmd);
			}
	}
	else if (ind == 2){//wifiSsid
		sprintf(cmd,"uci set wireless.@wifi-iface[%d].ssid=%s", wifiInd, pts);
		system(cmd);
	}
	else if (ind == 3){//wifiMode
		sprintf(cmd,"uci set wireless.@wifi-iface[%d].mode=%s", wifiInd, pts);
		system(cmd);
	}
	else if (ind == 4){//wifiEncryption
		sprintf(cmd,"uci set wireless.@wifi-iface[%d].encryption=%s", wifiInd, pts);
		system(cmd);
	}
	else if (ind == 5){//wifiPassword
		sprintf(cmd,"uci set wireless.@wifi-iface[%d].key=%s", wifiInd, pts);
		system(cmd);
	}
	else if (ind == 6){//wifiSsidHide
		if (strcmp(pts, "true") == 0){
			sprintf(cmd,"uci set wireless.@wifi-iface[%d].hidden=1", wifiInd);
			system(cmd);
		}
		else{
			sprintf(cmd,"uci delete wireless.@wifi-iface[%d].hidden", wifiInd);			
			system(cmd);
		}
	}
	pts = strtok (NULL, ",");
	ind++;
	}
	system("uci commit wireless");
	system("wifi");
	return 0;
}
//Function for getting LAN1 parameters
unsigned int get_lan1_interface_details(char* interfaceString){
	log_message("INFO", "Inside get_lan_interface_details");
	char intf_name[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.device'", intf_name, sizeof(intf_name)) != 0) {
	return -1;
	}

	char lanip[LOG_BUF_SZ] = {};
	if (get_lan_ip(lanip) != 0) {
		return -1;
	}
	char intf_mask[LOG_BUF_SZ] = {};
	if (execute_system_command("ifconfig lan1 | grep 'Mask:' | cut -d: -f4 | awk '{ print $1}'", intf_mask, sizeof(intf_mask)) != 0) {
		return -1;
	}
	char intf_mac[LOG_BUF_SZ] = {};
	if (execute_system_command("cat /sys/class/net/lan1/address", intf_mac, sizeof(intf_mac)) != 0) {
		return -1;
	}
	// RX/TX bytes and packets
	char rx_bytes[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan1\"}' | jsonfilter -e '$.statistics.rx_bytes'", rx_bytes, sizeof(rx_bytes)) != 0) {
		strcpy(rx_bytes, "0");
	}
	char rx_pkts[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan1\"}' | jsonfilter -e '$.statistics.rx_packets'", rx_pkts, sizeof(rx_pkts)) != 0) {
		strcpy(rx_pkts, "0");
	}
	char tx_bytes[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan1\"}' | jsonfilter -e '$.statistics.tx_bytes'", tx_bytes, sizeof(tx_bytes)) != 0) {
		strcpy(tx_bytes, "0");
	}
	char tx_pkts[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan1\"}' | jsonfilter -e '$.statistics.tx_packets'", tx_pkts, sizeof(tx_pkts)) != 0) {
		strcpy(tx_pkts, "0");
	}
	char proto[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.proto'", proto, sizeof(proto)) != 0) {
		return -1;
	}
	char uptime[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.uptime'", uptime, sizeof(uptime)) != 0) {
		return -1;
	}
	char status[8] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.up'", status, sizeof(status)) != 0) {
		return -1;
	}
	// Formatting the result as JSON string
	snprintf(interfaceString, LOG_BUF_SZ,
	"{\"interfaceName\":\"%s\",\"mac\":\"%s\",\"rx\":\"%s Bytes(%s Pkts)\","
	"\"tx\":\"%s Bytes(%s Pkts)\",\"ipV4\":\"%s\",\"ipV4NetMask\":\"%s\","
	"\"protocol\":\"%s\",\"upTime\":\"%s\",\"ipV6\":\"\",\"status\":\"%s\"}",
	intf_name, intf_mac, rx_bytes, rx_pkts, tx_bytes, tx_pkts, lanip, intf_mask, proto, uptime, status);

	return 0;  // Success
}

//Function for getting LAN2 parameters
unsigned int get_lan2_interface_details(char* interfaceString){
	log_message("INFO", "Inside get_lan_interface_details");
	char intf_name[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.device'", intf_name, sizeof(intf_name)) != 0) {
	return -1;
	}

	char lanip[LOG_BUF_SZ] = {};
	if (get_lan_ip(lanip) != 0) {
		return -1;
	}
	char intf_mask[LOG_BUF_SZ] = {};
	if (execute_system_command("ifconfig lan2 | grep 'Mask:' | cut -d: -f4 | awk '{ print $1}'", intf_mask, sizeof(intf_mask)) != 0) {
		return -1;
	}
	char intf_mac[LOG_BUF_SZ] = {};
	if (execute_system_command("cat /sys/class/net/lan2/address", intf_mac, sizeof(intf_mac)) != 0) {
		return -1;
	}
	// RX/TX bytes and packets
	char rx_bytes[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan2\"}' | jsonfilter -e '$.statistics.rx_bytes'", rx_bytes, sizeof(rx_bytes)) != 0) {
		strcpy(rx_bytes, "0");
	}
	char rx_pkts[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan2\"}' | jsonfilter -e '$.statistics.rx_packets'", rx_pkts, sizeof(rx_pkts)) != 0) {
		strcpy(rx_pkts, "0");
	}
	char tx_bytes[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan2\"}' | jsonfilter -e '$.statistics.tx_bytes'", tx_bytes, sizeof(tx_bytes)) != 0) {
		strcpy(tx_bytes, "0");
	}
	char tx_pkts[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan2\"}' | jsonfilter -e '$.statistics.tx_packets'", tx_pkts, sizeof(tx_pkts)) != 0) {
		strcpy(tx_pkts, "0");
	}
	char proto[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.proto'", proto, sizeof(proto)) != 0) {
		return -1;
	}
	char uptime[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.uptime'", uptime, sizeof(uptime)) != 0) {
		return -1;
	}
	char status[8] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.up'", status, sizeof(status)) != 0) {
		return -1;
	}
	// Formatting the result as JSON string
	snprintf(interfaceString, LOG_BUF_SZ,
	"{\"interfaceName\":\"%s\",\"mac\":\"%s\",\"rx\":\"%s Bytes(%s Pkts)\","
	"\"tx\":\"%s Bytes(%s Pkts)\",\"ipV4\":\"%s\",\"ipV4NetMask\":\"%s\","
	"\"protocol\":\"%s\",\"upTime\":\"%s\",\"ipV6\":\"\",\"status\":\"%s\"}",
	intf_name, intf_mac, rx_bytes, rx_pkts, tx_bytes, tx_pkts, lanip, intf_mask, proto, uptime, status);

	return 0;  // Success
}

//Function for getting LAN3 parameters
unsigned int get_lan3_interface_details(char* interfaceString){
	log_message("INFO", "Inside get_lan_interface_details");
	char intf_name[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.device'", intf_name, sizeof(intf_name)) != 0) {
	return -1;
	}

	char lanip[LOG_BUF_SZ] = {};
	if (get_lan_ip(lanip) != 0) {
		return -1;
	}
	char intf_mask[LOG_BUF_SZ] = {};
	if (execute_system_command("ifconfig lan3 | grep 'Mask:' | cut -d: -f4 | awk '{ print $1}'", intf_mask, sizeof(intf_mask)) != 0) {
		return -1;
	}
	char intf_mac[LOG_BUF_SZ] = {};
	if (execute_system_command("cat /sys/class/net/lan3/address", intf_mac, sizeof(intf_mac)) != 0) {
		return -1;
	}
	// RX/TX bytes and packets
	char rx_bytes[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan3\"}' | jsonfilter -e '$.statistics.rx_bytes'", rx_bytes, sizeof(rx_bytes)) != 0) {
		strcpy(rx_bytes, "0");
	}
	char rx_pkts[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan3\"}' | jsonfilter -e '$.statistics.rx_packets'", rx_pkts, sizeof(rx_pkts)) != 0) {
		strcpy(rx_pkts, "0");
	}
	char tx_bytes[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan3\"}' | jsonfilter -e '$.statistics.tx_bytes'", tx_bytes, sizeof(tx_bytes)) != 0) {
		strcpy(tx_bytes, "0");
	}
	char tx_pkts[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan3\"}' | jsonfilter -e '$.statistics.tx_packets'", tx_pkts, sizeof(tx_pkts)) != 0) {
		strcpy(tx_pkts, "0");
	}
	char proto[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.proto'", proto, sizeof(proto)) != 0) {
		return -1;
	}
	char uptime[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.uptime'", uptime, sizeof(uptime)) != 0) {
		return -1;
	}
	char status[8] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.up'", status, sizeof(status)) != 0) {
		return -1;
	}
	// Formatting the result as JSON string
	snprintf(interfaceString, LOG_BUF_SZ,
	"{\"interfaceName\":\"%s\",\"mac\":\"%s\",\"rx\":\"%s Bytes(%s Pkts)\","
	"\"tx\":\"%s Bytes(%s Pkts)\",\"ipV4\":\"%s\",\"ipV4NetMask\":\"%s\","
	"\"protocol\":\"%s\",\"upTime\":\"%s\",\"ipV6\":\"\",\"status\":\"%s\"}",
	intf_name, intf_mac, rx_bytes, rx_pkts, tx_bytes, tx_pkts, lanip, intf_mask, proto, uptime, status);

	return 0;  // Success
}

//Function for getting LAN4 parameters
unsigned int get_lan4_interface_details(char* interfaceString){
	log_message("INFO", "Inside get_lan_interface_details");
	char intf_name[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.device'", intf_name, sizeof(intf_name)) != 0) {
	return -1;
	}

	char lanip[LOG_BUF_SZ] = {};
	if (get_lan_ip(lanip) != 0) {
		return -1;
	}
	char intf_mask[LOG_BUF_SZ] = {};
	if (execute_system_command("ifconfig lan4 | grep 'Mask:' | cut -d: -f4 | awk '{ print $1}'", intf_mask, sizeof(intf_mask)) != 0) {
		return -1;
	}
	char intf_mac[LOG_BUF_SZ] = {};
	if (execute_system_command("cat /sys/class/net/lan4/address", intf_mac, sizeof(intf_mac)) != 0) {
		return -1;
	}
	// RX/TX bytes and packets
	char rx_bytes[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan4\"}' | jsonfilter -e '$.statistics.rx_bytes'", rx_bytes, sizeof(rx_bytes)) != 0) {
		strcpy(rx_bytes, "0");
	}
	char rx_pkts[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan4\"}' | jsonfilter -e '$.statistics.rx_packets'", rx_pkts, sizeof(rx_pkts)) != 0) {
		strcpy(rx_pkts, "0");
	}
	char tx_bytes[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan4\"}' | jsonfilter -e '$.statistics.tx_bytes'", tx_bytes, sizeof(tx_bytes)) != 0) {
		strcpy(tx_bytes, "0");
	}
	char tx_pkts[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus call network.device status '{\"name\":\"lan4\"}' | jsonfilter -e '$.statistics.tx_packets'", tx_pkts, sizeof(tx_pkts)) != 0) {
		strcpy(tx_pkts, "0");
	}
	char proto[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.proto'", proto, sizeof(proto)) != 0) {
		return -1;
	}
	char uptime[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.uptime'", uptime, sizeof(uptime)) != 0) {
		return -1;
	}
	char status[8] = {};
	if (execute_system_command("ubus -v call network.interface.lan status | jsonfilter -e '$.up'", status, sizeof(status)) != 0) {
		return -1;
	}
	// Formatting the result as JSON string
	snprintf(interfaceString, LOG_BUF_SZ,
	"{\"interfaceName\":\"%s\",\"mac\":\"%s\",\"rx\":\"%s Bytes(%s Pkts)\","
	"\"tx\":\"%s Bytes(%s Pkts)\",\"ipV4\":\"%s\",\"ipV4NetMask\":\"%s\","
	"\"protocol\":\"%s\",\"upTime\":\"%s\",\"ipV6\":\"\",\"status\":\"%s\"}",
	intf_name, intf_mac, rx_bytes, rx_pkts, tx_bytes, tx_pkts, lanip, intf_mask, proto, uptime, status);

	return 0;  // Success
}


unsigned int get_lan_interface_details(char* interfaceString)
{
	char intf_lan1[1024] = {};
	char intf_lan2[1024] = {};
	char intf_lan3[1024] = {};
	char intf_lan4[1024] = {};	
	get_lan1_interface_details(intf_lan1);
	get_lan2_interface_details(intf_lan2);
	get_lan3_interface_details(intf_lan3);
	get_lan4_interface_details(intf_lan4);	
	sprintf(interfaceString, "%s,%s,%s,%s", intf_lan1, intf_lan2, intf_lan3, intf_lan4);
	return 0;	
}


//Get WAN interface parameters
unsigned int get_wan_interface_details(char* interfaceString){
	log_message("INFO", "Inside get_wan_interface_details");
	char intf_name[LOG_BUF_SZ] = {};
	execute_system_command("ubus -v call network.interface.wan status | jsonfilter -e '$.device'", intf_name, sizeof(intf_name));

	char wanip[LOG_BUF_SZ] = {};
	get_wan_ip(wanip);

	char intf_mask[LOG_BUF_SZ] = {0};
	char intf_mac[LOG_BUF_SZ] = {0};
	char rx_bytes[LOG_BUF_SZ] = {0};
	char rx_pkts[LOG_BUF_SZ] = {0};
	char tx_bytes[LOG_BUF_SZ] = {0};
	char tx_pkts[LOG_BUF_SZ] = {0};
	execute_system_command("ifconfig wan| grep 'Mask:' | cut -d: -f4 | awk '{ print $1}'",  intf_mask, sizeof(intf_mask));
	execute_system_command("cat /sys/class/net/wan/address", intf_mac, sizeof(intf_mac));
	execute_system_command("ubus call network.device status '{\"name\":\"wan\"}'| jsonfilter -e '$.statistics'|jsonfilter -e '$.rx_bytes'", rx_bytes, sizeof(rx_bytes));
	if(rx_bytes == "")
		strcpy(rx_bytes, "0");
	execute_system_command("ubus call network.device status '{\"name\":\"wan\"}'| jsonfilter -e '$.statistics'|jsonfilter -e '$.rx_packets'", rx_pkts, sizeof(rx_pkts));
	if(rx_pkts == "")
		strcpy(rx_pkts, "0");
	execute_system_command("ubus call network.device status '{\"name\":\"wan\"}'| jsonfilter -e '$.statistics'|jsonfilter -e '$.tx_bytes'",  tx_bytes, sizeof(tx_bytes));
	if(tx_bytes == "")
		strcpy(tx_bytes, "0");
	execute_system_command("ubus call network.device status '{\"name\":\"wan\"}'| jsonfilter -e '$.statistics'|jsonfilter -e '$.tx_packets'",  tx_pkts, sizeof(tx_pkts));
	if(tx_pkts == "")
		strcpy(tx_pkts, "0");
	if(tx_pkts == "")
		strcpy(tx_pkts, "0");
	char proto[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.wan status | jsonfilter -e '$.proto'", proto, sizeof(proto)) != 0) {
		return -1;
	}

	char uptime[LOG_BUF_SZ] = {};
	if (execute_system_command("ubus -v call network.interface.wan status | jsonfilter -e '$.uptime'", uptime, sizeof(uptime)) != 0) {
		return -1;
	}

	char status[8] = {};
	if (execute_system_command("ubus -v call network.interface.wan status | jsonfilter -e '$.up'", status, sizeof(status)) != 0) {
		return -1;
	}
	sprintf(interfaceString, "{\"interfaceName\":\"%s\",\"mac\":\"%s\",\"rx\":\"%s Bytes(%s Pkts)\",\"tx\":\"%sBytes (%s Pkts)\",\"ipV4\":\"%s\",\"ipV4NetMask\":\"%s\",\"protocol\":\"%s\",\"upTime\":\"%s\",\"ipV6\":\"\",\"status\":\"%s\"}", intf_name, intf_mac, rx_bytes, rx_pkts, tx_bytes, tx_pkts, wanip, intf_mask, proto, uptime, status);

	return 0;    
}
//Get WAN interface parameters
unsigned int get_wwan_interface_details(char* interfaceString){
	log_message("INFO", "Inside get_wwan_interface_details");
	char intf_name[LOG_BUF_SZ] = {};
	execute_system_command("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.device'",  intf_name, sizeof(intf_name));
	char wwanip[LOG_BUF_SZ] = {};
	get_wwan_ip(wwanip);
	char intf_mask[LOG_BUF_SZ] = {};
	execute_system_command("ifconfig qmimux0| grep 'Mask:' | cut -d: -f4 | awk '{ print $1}'",  intf_mask, sizeof(intf_mask));
	char rx_bytes[LOG_BUF_SZ] = {};
	execute_system_command("ubus call network.device status '{\"name\":\"mob1s1a1\"}'| jsonfilter -e '$.statistics'|jsonfilter -e '$.rx_bytes'",  rx_bytes, sizeof(rx_bytes));
	if(rx_bytes == "")
		strcpy(rx_bytes, "0");
	char rx_pkts[LOG_BUF_SZ] = {};
	execute_system_command("ubus call network.device status '{\"name\":\"mob1s1a1\"}'| jsonfilter -e '$.statistics'|jsonfilter -e '$.rx_packets'",  rx_pkts, sizeof(rx_pkts));
	if(rx_pkts == "")
		strcpy(rx_pkts, "0");
	char tx_bytes[LOG_BUF_SZ] = {};
	execute_system_command("ubus call network.device status '{\"name\":\"mob1s1a1\"}'| jsonfilter -e '$.statistics'|jsonfilter -e '$.tx_bytes'",  tx_bytes, sizeof(tx_bytes));
	if(tx_bytes == "")
		strcpy(tx_bytes, "0");
	char tx_pkts[LOG_BUF_SZ] = {};
	execute_system_command("ubus call network.device status '{\"name\":\"mob1s1a1\"}'| jsonfilter -e '$.statistics'|jsonfilter -e '$.tx_packets'",  tx_pkts, sizeof(tx_pkts));
	if(tx_pkts == "")
		strcpy(tx_pkts, "0");
	char proto[LOG_BUF_SZ] = {};
	execute_system_command("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.proto'",  proto, sizeof(proto));
	char uptime[LOG_BUF_SZ] = {};
	execute_system_command("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.uptime'",  uptime, sizeof(uptime));
	char status[8] = {};
	execute_system_command("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",  status, sizeof(status));
	sprintf(interfaceString, "{\"interfaceName\":\"%s\",\"mac\":\"\",\"rx\":\"%s Bytes(%s Pkts)\",\"tx\":\"%s Bytes(%s Pkts)\",\"ipV4\":\"%s\",\"ipV4NetMask\":\"%s\",\"protocol\":\"%s\",\"upTime\":\"%s\",\"ipV6\":\"\",\"status\":\"%s\"}", intf_name, rx_bytes, rx_pkts, tx_bytes, tx_pkts, wwanip, intf_mask, proto, uptime, status);
	return 0; 
}
//Function for getting all LAN WAN and WWAN
unsigned int get_interface_settings(char* status){
	log_message("INFO", "Inside get_interface_settings");
	char intf_lan[4096] = {};
	char intf_wan[1024] = {};
	char intf_wwan[1024] = {};	
	get_lan_interface_details(intf_lan);
	get_wan_interface_details(intf_wan);
	get_wwan_interface_details(intf_wwan);	
	snprintf(status, sizeof(status), "{\"LAN\":[%s],\"WAN\":[%s],\"WWAN\":[%s]}", intf_lan, intf_wan, intf_wwan);
	log_message("INFO", "%s", status);	    	    	
	return 0;
}
//Set Interface parameters
unsigned int set_interface_settings(char* lanIP, char* lanProto, char* lanMask, 
                                    char* wanIP, char* wanProto, char* wanMask, 
                                    char* wwanIP, char* wwanProto, char* wwanMask){
	log_message("INFO", "Inside set_interface_settings");
	char cmd[MONITORING_CMD_LENGTH] = {};
	// LAN settings
	if (is_valid_ip(lanIP)) {
		snprintf(cmd, sizeof(cmd), "uci set network.lan.ipaddr=%s", lanIP);
		if (execute_cmd(cmd) != 0) return -1;
	}
	if (strcmp(lanProto, "null") != 0) {
		snprintf(cmd, sizeof(cmd), "uci set network.lan.proto=%s", lanProto);
		if (execute_cmd(cmd) != 0) return -1;
	}
	if (is_valid_ip(lanMask)) {
		snprintf(cmd, sizeof(cmd), "uci set network.lan.netmask=%s", lanMask);
		if (execute_cmd(cmd) != 0) return -1;
	}
	// WAN settings
	if (is_valid_ip(wanIP)) {
		snprintf(cmd, sizeof(cmd), "uci set network.wan.ipaddr=%s", wanIP);
		if (execute_cmd(cmd) != 0) return -1;
	}
	if (strcmp(wanProto, "null") != 0) {
		snprintf(cmd, sizeof(cmd), "uci set network.wan.proto=%s", wanProto);
		if (execute_cmd(cmd) != 0) return -1;
	}
	if (is_valid_ip(wanMask)) {
		snprintf(cmd, sizeof(cmd), "uci set network.wan.netmask=%s", wanMask);
		if (execute_cmd(cmd) != 0) return -1;
	}
	// WWAN settings
	if (is_valid_ip(wwanIP)) {
		snprintf(cmd, sizeof(cmd), "uci set network.wwan0_1.ipaddr=%s", wwanIP);
		if (execute_cmd(cmd) != 0) return -1;
	}
	if (strcmp(wwanProto, "null") != 0) {
		snprintf(cmd, sizeof(cmd), "uci set network.wwan0_1.proto=%s", wwanProto);
		if (execute_cmd(cmd) != 0) return -1;
	}
	if (is_valid_ip(wwanMask)) {
	snprintf(cmd, sizeof(cmd), "uci set network.wwan0_1.netmask=%s", wwanMask);
	if (execute_cmd(cmd) != 0) return -1;
	}
	// Commit changes and reload network
	if (execute_cmd("uci commit network") != 0) return -1;
	if (execute_cmd("/etc/init.d/network reload") != 0) return -1;

	return 0;
}
//Function for calculating number of data tracking files
int cio_kaa_helper_set_data_traffic_policy(int enable, char *uploadURL, char *timeDuration, char *notID, char *httpHeader) {
	log_message("INFO", "Inside cio_kaa_helper_set_data_traffic_policy");
	char cmd[200];
	char cmd1[200];
	char status[LOG_BUF_SZ];
	char respCmd[8] = {0};
	// Validate inputs
	if (uploadURL == NULL || notID == NULL || httpHeader == NULL) {
		snprintf(status, sizeof(status), "Invalid parameters: %s, %s, %s", uploadURL, notID, httpHeader);
		log_message("INFO", "%s", status);	    	    		
		return 0;
	}

	log_message("INFO", "URL:%s, Time:%s, API Key:%s, NoID:%s", uploadURL, timeDuration, httpHeader, notID);	    	    
	if (enable) {
		// Create directory for storing data
		snprintf(cmd, sizeof(cmd), "mkdir -p %s", LOCAL_DIRECTORY);
		execute_system_command(cmd,  respCmd, sizeof(respCmd));		
		/*if (execute_cmd(cmd) != 0) {
			log_message("ERROR", "Failed to create directory: %s", LOCAL_DIRECTORY);	    	    	    		
	    		return;
		}*/

		// Calculate the number of files to capture based on timeDuration
		int noFiles = 1;
		if (timeDuration != NULL) {
	    		noFiles = atoi(timeDuration) / 15;
		}
		if (noFiles < 1) {
	    		noFiles = 1;
		}

		// Start data tracking using tcpdump
		snprintf(cmd, sizeof(cmd), "("SCRIPT_TCP_DUMP" dataTracking %d >/dev/null 2>&1) &", noFiles);
		execute_system_command(cmd,  respCmd, sizeof(respCmd));
		/*if (execute_cmd(cmd) != 0) {
			log_message("ERROR", "Failed to start tcpDump for data tracking.");	    	    	    		
	    		return;
		}*/

		// Update configuration using uci
		snprintf(cmd1, sizeof(cmd1), "uci set system.@system[0].data_tracking_upload_url=%s", uploadURL);
		execute_system_command(cmd1,  respCmd, sizeof(respCmd));		
		/*if (execute_cmd(cmd1) != 0) {
			log_message("ERROR","Failed to set data tracking URL.");	    	    	    		
	    		return;
		}*/
		execute_system_command("uci set system.@system[0].enable_data_traffic=1",  respCmd, sizeof(respCmd));		
		/*if (execute_cmd("uci set system.@system[0].enable_data_traffic=1") != 0) {
			log_message("ERROR", "Failed to enable data traffic.");	    	    	    		
	    		return;
		}*/
		execute_system_command("uci commit system",  respCmd, sizeof(respCmd));		
		/*if (execute_cmd("uci commit system") != 0) {
			log_message("ERROR", "Failed to commit system configuration.");	    	    	    		
	    		return;
		}*/

		// Set global variables
		strcpy(uploadURLPath, uploadURL);
		strcpy(notificationID, notID);
		strcpy(httpHeaderValue, httpHeader);
		countFiles = noFiles;

	} else {
		// Disable data tracking and gzip captured data
		snprintf(cmd, sizeof(cmd), SCRIPT_TCP_DUMP" dataTrackingOff");
		execute_system_command(cmd,  respCmd, sizeof(respCmd));				
		/*if (execute_cmd(cmd) != 0) {
			log_message("ERROR", "Failed to stop data tracking.");	    	    	    		
	    		return;
		}*/
		execute_system_command("gzip /etc/dataTrack/Capture* 2>/dev/null",  respCmd, sizeof(respCmd));				
		/*if (execute_cmd("gzip /etc/dataTrack/Capture* 2>/dev/null") != 0) {
			log_message("ERROR", "Failed to gzip captured files.");	    	    	    		
	    		return;
		}*/

		// Disable data traffic in uci
		execute_system_command("uci set system.@system[0].enable_data_traffic=0",  respCmd, sizeof(respCmd));						
		/*if (execute_cmd("uci set system.@system[0].enable_data_traffic=0") != 0) {
			log_message("ERROR", "Failed to disable data traffic.");	    	    	    		
	    		return;
		}*/
		execute_system_command("uci commit system",  respCmd, sizeof(respCmd));						
		/*if (execute_cmd("uci commit system") != 0) {
			log_message("ERROR", "Failed to commit system configuration.");	    	    	    		
	    		return;
		}*/
	}
	return 0;
}
//Function for getting data tracking status
int cio_kaa_helper_get_data_traffic_policy(){
	log_message("INFO", "Inside cio_kaa_helper_get_data_traffic_policy");
	char cmd[200];
	char v[8] = {};
	sprintf(cmd,"uci get system.@system[0].enable_data_traffic");
	execute_system_command(cmd, v, sizeof(v));
	if (strstr(v, "0") == 0){
		return 0;
	}else{
		return 1;
	}
}
//Get number of files to upload
int cio_kaa_helper_get_number_files_to_upload(){
	log_message("INFO", "Inside cio_kaa_helper_get_number_files_to_upload");
	return countFiles;
}
//Return notification ID
unsigned int cio_kaa_helper_get_notification_ID(char *notID){
	log_message("INFO", "Inside cio_kaa_helper_get_notification_ID");
	if (notificationID != NULL){
		strcpy(notID, notificationID);
		return 0;
	}
	else {
		return 1;
	}
}
// Main function to push data traffic details
int push_data_traffic_details(char *filePath, char *status, char *SrcIMEI) {
	log_message("INFO", "Inside push_data_traffic_details");
	if (strlen(uploadURLPath) <= 0 || strlen(httpHeaderValue) <= 0) {
		sprintf(status, "Invalid parameters");
		log_message("ERROR", "Invalid parameters");	    	    
		return 0;
	}

	// Remove the file before uploading
	char cmd[256];
	sprintf(cmd, "rm -rf %s", filePath);

	FILE *handler = fopen(filePath, "r");
	if (!handler) {
		sprintf(status, "Failed: Could not open file %s", filePath);
		log_message("ERROR", "%s", status);	    	    
		return 0;
	}
	fclose(handler);

	// Prepare the topic for MQTT
	char strBufferTopic[128] = {0};
	sprintf(strBufferTopic, "cio/device/DS/%s", SrcIMEI);

	// Initialize CURL and prepare file upload
	CURL *curl = curl_easy_init();
	if (!curl) {
		sprintf(status, "Failed: CURL initialization failed");
		log_message("ERROR", "Failed: CURL initialization failed");	    	    
		return 0;
	}

	struct curl_httppost *formpost = NULL, *lastptr = NULL;
	struct curl_slist *headerlist = NULL, *list = NULL;
	static const char buf[] = "Expect:";
	headerlist = curl_slist_append(headerlist, buf);

	// Set up file upload
	curl_formadd(&formpost, &lastptr, CURLFORM_COPYNAME, "backup", CURLFORM_FILE, filePath, CURLFORM_END);
	curl_easy_setopt(curl, CURLOPT_URL, uploadURLPath);
	curl_easy_setopt(curl, CURLOPT_HTTPPOST, formpost);
	curl_easy_setopt(curl, CURLOPT_FAILONERROR, 1L);
	curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);

	char apiKey[128] = {0};
	sprintf(apiKey, "X-API-KEY:%s", httpHeaderValue);
	list = curl_slist_append(list, apiKey);
	curl_easy_setopt(curl, CURLOPT_HTTPHEADER, list);

	// If debugging is enabled, print verbose output
	if (DEBUG) {
		curl_easy_setopt(curl, CURLOPT_VERBOSE, 1L);
	}

	// Perform the file upload
	CURLcode res = curl_easy_perform(curl);
	char curlErrorMessage[CURL_ERROR_MESSAGE_SIZE] = {0};
	curl_easy_setopt(curl, CURLOPT_ERRORBUFFER, curlErrorMessage);

	// Handle CURL result
	handle_curl_error(curl, res, status, curlErrorMessage);

	// Clean up CURL resources
	curl_easy_cleanup(curl);
	curl_formfree(formpost);
	curl_slist_free_all(headerlist);
	curl_slist_free_all(list);

	// Update the status based on file upload result
	countFiles -= 1;
	char dataTrack[LOG_BUF_SZ];
	execute_system_command("uci get system.@system[0].enable_data_traffic", dataTrack, sizeof(dataTrack));
	char statusRet[1024];
	if (countFiles <= 0 || strstr(dataTrack, "0")) {
		sprintf(statusRet, "Completed:%s:%s", notificationID, filePath);
		countFiles = 0;
	} else {
		sprintf(statusRet, "InProgress:%s:%s", notificationID, filePath);
	}
	// Send the status to the MQTT broker
	sprintf(status, "{\"a\":\"%s\",\"b\":\"InProgress\",\"c\":\"%s\"}", notificationID, statusRet);
	//mosquitto_publish(mosq, NULL, strBufferTopic, strlen(status), status, 0, 0);
	log_message("INFO", "Sent Topic: %s, Payload: %s", strBufferTopic, status);	    	    
	// Clean up file if needed
	system(cmd);
	return 0;
}
//Get connection status
unsigned int get_connection_status(char *eth_hosts){
	log_message("INFO", "Inside get_connection_status");
	// Clear the buffer to avoid old data
	memset(eth_hosts, 0, sizeof(eth_hosts));
	// Run the system command and check if it succeeds
	int ret = execute_system_command(SCRIPT_STATION_CONN, eth_hosts, sizeof(eth_hosts));
	if (ret != 0) {
		perror("Failed to run /etc/stationConnStatus.sh");
		return 1; // Return error code if command execution fails
	}
	// Ensure the output is properly null-terminated
	eth_hosts[strcspn(eth_hosts, "\n")] = 0;
	return 0;	
	
}
