
#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "command_handler.h"
#include "cioclient_log.h"
#include "cjson/cJSON.h"
#include "mqtt_sync.h"
#include "cio_defaults.h" 
#include "utilities.h"
#include "firmware_upgrade.h"
#include "log_upload.h"
#include "config_restore.h"
#include "modem_upgrade.h"
#include "data_track.h"
//extern volatile bool g_mqtt_hard_restart;
extern volatile bool g_upgrade_started;
//Enclose response in ""
/*void publish_command_response(MQTTContext_t *pMqttContext,
                              const char *topic,
                              const char *notificationID,
                              const char *status,
                              const char *response)
{
    if (!pMqttContext || !topic || !notificationID || !status)
        return;

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "a", notificationID);
    cJSON_AddStringToObject(root, "b", status);

    if (response && strlen(response) > 0)
    {
        char quoted[16384];
        snprintf(quoted, sizeof(quoted), "\"%s\"", response);
        cJSON_AddRawToObject(root, "c", quoted);
    }
    else
    {
        cJSON_AddStringToObject(root, "c", "");
    }

    char *jsonStr = cJSON_PrintUnformatted(root);
    log_message("INFO", "Publishing response JSON: %s", jsonStr);

    MQTTStatus_t mqttStatus = publishToTopicQOS(pMqttContext, topic, jsonStr, MQTTQoS0);
    if (mqttStatus == MQTTNoMemory)
    {
        log_message("ERROR", "MQTTNoMemory during publish");
        g_mqtt_hard_restart = true;
    }
    else if (mqttStatus != MQTTSuccess)
        log_message("ERROR", "Failed to publish command response: %s", MQTT_Status_strerror(mqttStatus));
    else
        log_message("INFO", "Published response to topic %s", topic);

    cJSON_Delete(root);
    free(jsonStr);
}*/

void publish_command_response_bash(MQTTContext_t *pMqttContext,
                              const char *topic,
                              const char *notificationID,
                              const char *status,
                              const char *response)
{
    if (!pMqttContext || !topic || !notificationID || !status)
    {
    	log_message("ERROR", "Publish failed: Null parameters provided");
        return;
    }

    if (!mqtt_connected) {
        log_message("WARN", "Publish skipped: mqtt_connected is FALSE");
        return;
    }

    if (g_mqtt_hard_restart) {
        log_message("WARN", "Publish skipped: g_mqtt_hard_restart is TRUE");
        return;
    }
        
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "a", notificationID);
    cJSON_AddStringToObject(root, "b", status);

    if (response && strlen(response) > 0)
    {
        char quoted[16384];
        snprintf(quoted, sizeof(quoted), "\"%s\"", response);
        cJSON_AddRawToObject(root, "c", quoted);
    }
    else
    {
        cJSON_AddStringToObject(root, "c", "");
    }

    char *jsonStr = cJSON_PrintUnformatted(root);
    log_message("INFO", "Publishing response JSON: %s", jsonStr);

    MQTTStatus_t mqttStatus = publishToTopicQOS(pMqttContext, topic, jsonStr, MQTTQoS1);
    if (mqttStatus != MQTTSuccess)
        log_message("ERROR", "Failed to publish command response: %s", MQTT_Status_strerror(mqttStatus));
    else
        log_message("INFO", "Published response to topic %s", topic);

    cJSON_Delete(root);
    free(jsonStr);
}


void publish_command_response(MQTTContext_t *pMqttContext,
                              const char *topic,
                              const char *notificationID,
                              const char *status,
                              const char *response)
{
    if (!pMqttContext || !topic || !notificationID || !status)
    {
    	log_message("ERROR", "Publish failed: Null parameters provided");
        return;
    }

    if (!mqtt_connected) {
        log_message("WARN", "Publish skipped: mqtt_connected is FALSE");
        return;
    }

    if (g_mqtt_hard_restart) {
        log_message("WARN", "Publish skipped: g_mqtt_hard_restart is TRUE");
        return;
    }

    cJSON *root = cJSON_CreateObject();
    
    if (!root){
    	log_message("WARN", "Publish skipped: JSON memory alloc failed");
        return;
    }

    cJSON_AddStringToObject(root, "a", notificationID);
    cJSON_AddStringToObject(root, "b", status);

    /* This already adds quotes correctly */
    cJSON_AddStringToObject(root, "c", response ? response : "");

    /* Preallocated JSON buffer */
    static char jsonBuf[16384];
    memset(jsonBuf, 0, sizeof(jsonBuf));

    if (!cJSON_PrintPreallocated(root, jsonBuf, sizeof(jsonBuf), 0))
    {
        log_message("ERROR", "JSON buffer too small");
        cJSON_Delete(root);
        return;
    }

    log_message("INFO", "Publishing response JSON: %s", jsonBuf);

    MQTTStatus_t mqttStatus =
        publishToTopicQOS(pMqttContext, topic, jsonBuf, MQTTQoS1);

    if (mqttStatus != MQTTSuccess)
        log_message("ERROR", "Failed to publish command response: %s", MQTT_Status_strerror(mqttStatus));
    else
        log_message("INFO", "Published response to topic %s", topic);

    cJSON_Delete(root);
}

//Enclose response in []
void publish_command_response_mod(MQTTContext_t *pMqttContext,
                              const char *topic,
                              const char *notificationID,
                              const char *status,
                              const char *response)
{
    if (!pMqttContext || !topic || !notificationID || !status)
    {
    	log_message("ERROR", "Publish failed: Null parameters provided");
        return;
    }

    if (!mqtt_connected) {
        log_message("WARN", "Publish skipped: mqtt_connected is FALSE");
        return;
    }

    if (g_mqtt_hard_restart) {
        log_message("WARN", "Publish skipped: g_mqtt_hard_restart is TRUE");
        return;
    }
        
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "a", notificationID);
    cJSON_AddStringToObject(root, "b", status);

    if (response && strlen(response) > 0)
    {
        // Always enclose response in double quotes
        char quoted[16384];
        snprintf(quoted, sizeof(quoted), "[%s]", response);
        cJSON_AddRawToObject(root, "c", quoted);
    }
    else
    {
        cJSON_AddStringToObject(root, "c", "[]");
    }

    char *jsonStr = cJSON_PrintUnformatted(root);
    log_message("INFO", "Publishing response JSON: %s", jsonStr);

    MQTTStatus_t mqttStatus = publishToTopicQOS(pMqttContext, topic, jsonStr, MQTTQoS1);
    if (mqttStatus != MQTTSuccess)
        log_message("ERROR", "Failed to publish command response: %s", MQTT_Status_strerror(mqttStatus));
    else
        log_message("INFO", "Published response to topic %s", topic);

    cJSON_Delete(root);
    free(jsonStr);
}

/*void publish_command_response_mod(MQTTContext_t *pMqttContext,
                                  const char *topic,
                                  const char *notificationID,
                                  const char *status,
                                  const char *response)
{
    if (!pMqttContext || !topic || !notificationID || !status)
        return;

    if (!mqtt_connected || g_mqtt_hard_restart)
        return;

    cJSON *root = cJSON_CreateObject();
    if (!root)
        return;

    cJSON_AddStringToObject(root, "a", notificationID);
    cJSON_AddStringToObject(root, "b", status);

    cJSON *arr = cJSON_CreateArray();
    cJSON_AddItemToArray(arr,
        cJSON_CreateString(response ? response : ""));
    cJSON_AddItemToObject(root, "c", arr);

    static char jsonBuf[16384];
    if (!cJSON_PrintPreallocated(root, jsonBuf, sizeof(jsonBuf), 0))
    {
        log_message("ERROR", "JSON buffer too small");
        cJSON_Delete(root);
        return;
    }

    log_message("INFO", "Publishing response JSON: %s", jsonBuf);

    MQTTStatus_t st = publishToTopicQOS(pMqttContext, topic, jsonBuf, MQTTQoS0);
    if (st == MQTTNoMemory)
        g_mqtt_hard_restart = true;

    cJSON_Delete(root);
}*/


//Send only response
/*void publish_command_response_ref(MQTTContext_t *pMqttContext,
                              const char *topic,
                              const char *notificationID,
                              const char *status,
                              const char *response)
{
    if (!pMqttContext || !topic || !notificationID || !status)
        return;

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "a", notificationID);
    cJSON_AddStringToObject(root, "b", status);

    if (response && strlen(response) > 0)
    {
        // Always enclose response in double quotes
        char quoted[16384];
        snprintf(quoted, sizeof(quoted), "%s", response);
        cJSON_AddRawToObject(root, "c", quoted);
    }
    else
    {
        cJSON_AddStringToObject(root, "c", "");
    }

    char *jsonStr = cJSON_PrintUnformatted(root);
    log_message("INFO", "Publishing response JSON: %s", jsonStr);

    MQTTStatus_t mqttStatus = publishToTopicQOS(pMqttContext, topic, jsonStr, MQTTQoS0);
    if (mqttStatus == MQTTNoMemory)
    {
        log_message("ERROR", "MQTTNoMemory during publish");
        g_mqtt_hard_restart = true;
    }
    else if (mqttStatus != MQTTSuccess)
        log_message("ERROR", "Failed to publish command response: %s", MQTT_Status_strerror(mqttStatus));
    else
        log_message("INFO", "Published response to topic %s", topic);

    cJSON_Delete(root);
    free(jsonStr);
}*/

void publish_command_response_ref(MQTTContext_t *pMqttContext,
                                  const char *topic,
                                  const char *notificationID,
                                  const char *status,
                                  const char *response)
{
    if (!pMqttContext || !topic || !notificationID || !status)
    {
    	log_message("ERROR", "Publish failed: Null parameters provided");
        return;
    }

    if (!mqtt_connected) {
        log_message("WARN", "Publish skipped: mqtt_connected is FALSE");
        return;
    }

    if (g_mqtt_hard_restart) {
        log_message("WARN", "Publish skipped: g_mqtt_hard_restart is TRUE");
        return;
    }

    cJSON *root = cJSON_CreateObject();
    if (!root){
    	log_message("WARN", "Publish skipped: JSON memory alloc failed");
        return;
    }

    cJSON_AddStringToObject(root, "a", notificationID);
    cJSON_AddStringToObject(root, "b", status);

    if (response && *response)
    {
        cJSON *parsed = cJSON_Parse(response);
        if (parsed)
        {
            /* Takes ownership of parsed */
            cJSON_AddItemToObject(root, "c", parsed);
        }
        else
        {
            log_message("ERROR", "Invalid JSON response, using null");
            cJSON_AddNullToObject(root, "c");
        }
    }
    else
    {
        cJSON_AddNullToObject(root, "c");
    }

    static char jsonBuf[16384];
    if (!cJSON_PrintPreallocated(root, jsonBuf, sizeof(jsonBuf), 0))
    {
        log_message("ERROR", "JSON buffer too small");
        cJSON_Delete(root);
        return;
    }

    log_message("INFO", "Publishing response JSON: %s", jsonBuf);

    MQTTStatus_t st =
        publishToTopicQOS(pMqttContext, topic, jsonBuf, MQTTQoS1);

    if (st != MQTTSuccess)
        log_message("ERROR", "Failed to publish command response: %s", MQTT_Status_strerror(st));
    else
        log_message("INFO", "Published response to topic %s", topic);

    cJSON_Delete(root);
}


void publish_command_response_intf(MQTTContext_t *pMqttContext,
                              const char *topic,
                              const char *notificationID,
                              const char *status,
                              const char *response)
{
    if (!pMqttContext || !topic || !notificationID || !status)
    {
    	log_message("ERROR", "Publish failed: Null parameters provided");
        return;
    }

    if (!mqtt_connected) {
        log_message("WARN", "Publish skipped: mqtt_connected is FALSE");
        return;
    }

    if (g_mqtt_hard_restart) {
        log_message("WARN", "Publish skipped: g_mqtt_hard_restart is TRUE");
        return;
    }

    cJSON *root = cJSON_CreateObject();
    
    if (!root){
    	log_message("WARN", "Publish skipped: JSON memory alloc failed");
        return;
    }

    cJSON_AddStringToObject(root, "a", notificationID);
    cJSON_AddStringToObject(root, "b", status);

    /* This already adds quotes correctly */
    //cJSON_AddStringToObject(root, "c", response ? response : "");
    if (response && strlen(response) > 0) {
    // Parse the response string into a temporary cJSON object
    cJSON *response_obj = cJSON_Parse(response);    
    if (response_obj) {
        // Add the parsed object to "root" under key "c"
        // cJSON_Delete(root) will now also delete response_obj.
        cJSON_AddItemToObject(root, "c", response_obj);
    } else {
        cJSON_AddStringToObject(root, "c", response);
    }
    } else {
    	cJSON_AddStringToObject(root, "c", "");
    }

    /* Preallocated JSON buffer */
    static char jsonBuf[16384];
    memset(jsonBuf, 0, sizeof(jsonBuf));

    if (!cJSON_PrintPreallocated(root, jsonBuf, sizeof(jsonBuf), 0))
    {
        log_message("ERROR", "JSON buffer too small");
        cJSON_Delete(root);
        return;
    }

    log_message("INFO", "Publishing response JSON: %s", jsonBuf);

    MQTTStatus_t mqttStatus =
        publishToTopicQOS(pMqttContext, topic, jsonBuf, MQTTQoS1);

    if (mqttStatus != MQTTSuccess)
        log_message("ERROR", "Failed to publish command response: %s", MQTT_Status_strerror(mqttStatus));
    else
        log_message("INFO", "Published response to topic %s", topic);

    cJSON_Delete(root);
}

void handle_server_command(MQTTContext_t * pMqttContext, const ServerCommand *cmd)
{
	if (!cmd) return;

	log_message("INFO", "Handling command: %s", cmd->commandType);
	char imei[64] = { 0 };
	if(get_imei(imei) == 0)
		log_message("INFO","GSMCTL imei %s, strlen %d", imei, strlen(imei));
	else
		log_message("ERROR","Couldnt extractIMEI");
	        
	if(strcmp(cmd->commandType, SUBCMD_GET_INTERFACE_STATUS)==0)
	{
		char *ifaceJson = build_interface_group_json();
		if (ifaceJson) {
			log_message("INFO", "Interface summary JSON: %s", ifaceJson);
			publish_command_response_intf(pMqttContext, g_publishTopic, cmd->notificationID, "Success", ifaceJson);
			free(ifaceJson);
		}
	}
	else if(strcmp(cmd->commandType, "1000") == 0)
	{
		char *respJson = build_simple_ack_json(imei, "1");
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", respJson);
	}
	else if(strcmp(cmd->commandType, UPDATE_FW)==0)
	{		
		//Key set for identifying firmware upgrade
		g_upgrade_started = true;
		FirmwareUpgradeInfo info = {0};
		strncpy(info.url, cmd->params[0], sizeof(info.url)-1);
		strncpy(info.checksum, cmd->params[1], sizeof(info.checksum)-1);
		info.keepConfig = (strcmp(cmd->params[2], "1") == 0);
		log_message("INFO", "Firmware upgrade command received: %s:%s", cmd->params[0], info.checksum);
		if (start_firmware_upgrade_async(pMqttContext, &info, cmd->notificationID, g_publishTopic) == 0) {
			log_message("INFO", "Upgrade started in background");
		} else {
			log_message("ERROR", "Upgrade start failed or already running");
		}				
															    							
	}
	else if(strcmp(cmd->commandType, PERFORM_RESET)==0)
	{
		log_message("INFO", "Executing Factory Reset command.");
		delete_log_certs_if_beta(); //Delete backup creds if existing connection is with beta
		int result = perform_factory_reset();
		if (result == 0)
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", "Factory reset executed successfully. Rebooting device...");
			sleep(2);  // Give time for MQTT publish to flush
			system("reboot -f");				
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failure", "Factory reset command failed.");				
		}

	}
	else if(strcmp(cmd->commandType, RESTORE_CFG)==0)
	{
		log_message("INFO", "Restore config command received");	
		const char *url = cmd->params[0];
		const char *checksum = cmd->params[1];
		start_config_restore_async(pMqttContext, g_publishTopic, cmd->notificationID, url, checksum);
	}
	else if(strcmp(cmd->commandType, BACKUP_CFG)==0)
	{
		log_message("INFO", "Backup config command received");		
		LogUploadInfo info = {0};
		strncpy(info.url, cmd->params[0], sizeof(info.url) - 1);
		info.type = CONFIG_BACKUP;
		start_single_log_upload_async(pMqttContext, &info, cmd->notificationID, g_publishTopic);								
	}
	else if(strcmp(cmd->commandType, GET_SYS_LOG)==0)
	{
		log_message("INFO", "System log fetch command received");			
		LogUploadInfo info = {0};
		strncpy(info.url, cmd->params[0], sizeof(info.url) - 1);
		info.type = LOG_TYPE_SYSLOG;
		start_single_log_upload_async(pMqttContext, &info, cmd->notificationID, g_publishTopic);							
	}
	else if(strcmp(cmd->commandType, GET_KERNEL_LOG)==0)
	{
		log_message("INFO", "Kernel log fetch command received");				
		LogUploadInfo info = {0};
		strncpy(info.url, cmd->params[0], sizeof(info.url) - 1);
		info.type = LOG_TYPE_KERNEL;
		start_single_log_upload_async(pMqttContext, &info, cmd->notificationID, g_publishTopic);
	}
	else if(strcmp(cmd->commandType, EXECUTE_AT_CMD)==0)
	{
		const char *atCmd = cmd->params[0];
		log_message("INFO", "Executing AT command from server: %s", atCmd);
		char *response = execute_at_command(atCmd);
		if (response)
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", response);
			free(response);
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}
	}
	else if(strcmp(cmd->commandType, GET_FIREWALL)==0)
	{
		log_message("INFO", "Get firewall command received");
		char *response = read_firewall_settings();
		if (response)
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", response);
			free(response);
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}		
	}
	else if(strcmp(cmd->commandType, SET_FIREWALL)==0)
	{
		log_message("INFO", "Executing set firewall command:%s", cmd->params[0]);
		int result = set_firewall_settings(cmd->params[0], cmd->params[1]);
		if (result == 0)
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", "Success:Firewall_Set");
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}					
	}
	else if(strcmp(cmd->commandType, MODEM_FW_UPDATE)==0)
	{
		log_message("INFO", "Modem firmware upgrade command received");
		int result = perform_modem_upgrade(&pMqttContext, g_publishTopic, cmd->notificationID, cmd->params[0], cmd->params[1], cmd->params[2]);
		if (result == 0)
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", "Success:Modem Upgrade");
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}						
	}
	else if(strcmp(cmd->commandType, SOFT_REBOOT)==0)
	{
		log_message("INFO", "Reboot command received");
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", "Initiating_Reboot");				            		            		
		perform_soft_reboot();								
	}
	else if(strcmp(cmd->commandType, GET_DEVICE_STATUS)==0)
	{
		log_message("INFO", "Refresh command received");	
		char *refreshPayload = buildFullRefreshJson(imei);
		if (refreshPayload)
		{
		    	publish_command_response_ref(pMqttContext, g_publishTopic, cmd->notificationID, "Success", refreshPayload);
			free(refreshPayload);
		}
	
	}
	else if(strcmp(cmd->commandType, BASH_COMMAND)==0)
	{
		const char *command_str = cmd->params[0];			
		log_message("INFO", "Executing shell command from server: %s", command_str);
		char *result = execute_shell_command(command_str);
		if (result)
		{
			char copy[14336];
			strncpy(copy, result, sizeof(copy)-1);
			copy[sizeof(copy)-1] = '\0';
			publish_command_response_bash(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
			free(result);
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}
				
	}
	else if(strcmp(cmd->commandType, SUBCMD_DISABLE_WEB_ACCESS)==0)
	{
		log_message("INFO", "Disable web access command received");	
		char *result = set_web_access(0);
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", "web access disabled");
		free(result);											
	}
	else if(strcmp(cmd->commandType, SUBCMD_ENABLE_WEB_ACCESS)==0)
	{
		log_message("INFO", "Enable web access command received");		
		char *result = set_web_access(1);
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", "web access enabled");
		free(result);	
	}
	else if(strcmp(cmd->commandType, SUBCMD_SET_CHECKIN_INTERVAL)==0)
	{
		int newInterval = atoi(cmd->params[0]);
		char *result = set_checkin_interval(newInterval);
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", cmd->params[0]);
		free(result);											
	}
	else if(strcmp(cmd->commandType, SUBCMD_SET_KEEPALIVE_INTERVAL)==0)
	{
		int newKeepAlive = atoi(cmd->params[0]);
		log_message("INFO", "Received MQTT keepalive update to %d sec", newKeepAlive);
		char *result = set_mqtt_keepalive(newKeepAlive);
		if (result)
		{
			char copy[256];
			strncpy(copy, result, sizeof(copy)-1);
			copy[sizeof(copy)-1] = '\0';
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
			free(result);
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}								
	}
	else if(strcmp(cmd->commandType, SUBCMD_GET_KEEPALIVE_INTERVAL)==0)
	{
		log_message("INFO", "Get keepalive time command received");			
		char *result = get_mqtt_keepalive();
		if (result)
		{
			char copy[256];
			strncpy(copy, result, sizeof(copy)-1);
			copy[sizeof(copy)-1] = '\0';		
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
			free(result);
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}
	}
	else if(strcmp(cmd->commandType, SUBCMD_GET_CHECKIN_INTERVAL)==0)
	{
		log_message("INFO", "Get checkin time command received");				
		char *result = get_checkin_interval();
		if (result)
		{
			char copy[256];
			strncpy(copy, result, sizeof(copy)-1);
			copy[sizeof(copy)-1] = '\0';		
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
			free(result);
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}					
	}
	else if(strcmp(cmd->commandType, SUBCMD_GET_CONNECTED_IP_MAC_LIST_ON_LAN)==0)
	{
		log_message("INFO", "Get connected IP MAC command received");					
		char *result = get_station_connection_details();			
		if(result)
		{
			char copy[1024];
			strncpy(copy, result, sizeof(copy)-1);
			copy[sizeof(copy)-1] = '\0';		
			publish_command_response_mod(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
			free(result);			
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}		
	}
	else if(strcmp(cmd->commandType, SUBCMD_SET_ALLOW_ONLY_MAC_ADDRESSES)==0)
	{
		log_message("INFO", "Set allow only MAC command received");						
		const char *mac = cmd->params[0];
		int flag = atoi(cmd->params[1]);
		char *result = set_mac_filter_rule(mac, flag);
		char copy[256];
		strncpy(copy, result, sizeof(copy)-1);
		copy[sizeof(copy)-1] = '\0';
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
		free(result);
	}
	else if(strcmp(cmd->commandType, WIFI_SETTING)==0)
	{
		log_message("INFO", "Set WIFI command received");							
		const char *ifaceIndex = cmd->params[0];
		const char *disabled   = cmd->params[1];
		const char *ssid       = cmd->params[2];
		const char *mode       = cmd->params[3];
		const char *encryption = cmd->params[4];
		const char *password   = cmd->params[5];
		const char *ssidHide   = cmd->params[6];
		char *result = set_wifi_config(ifaceIndex, disabled, ssid, mode, encryption, password, ssidHide);
		char copy[1024];
		strncpy(copy, result, sizeof(copy)-1);
		copy[sizeof(copy)-1] = '\0';		
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
		free(result);										
	}
	else if(strcmp(cmd->commandType, SUBCMD_SET_INTERFACE_STATUS)==0)
	{
		log_message("INFO", "Set Interface command received");								
		const char *lanIp      = cmd->params[0];
		const char *lanProto   = cmd->params[1];
		const char *lanMask    = cmd->params[2];
		const char *wanIp      = cmd->params[3];
		const char *wanProto   = cmd->params[4];
		const char *wanMask    = cmd->params[5];
		const char *wwanIp     = cmd->params[6];
		const char *wwanProto  = cmd->params[7];
		const char *wwanMask   = cmd->params[8];

		char *result = set_network_config(lanIp, lanProto, lanMask,
					      wanIp, wanProto, wanMask,
					      wwanIp, wwanProto, wwanMask);
		char copy[1024];
		strncpy(copy, result, sizeof(copy)-1);
		copy[sizeof(copy)-1] = '\0';					      			
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
		free(result);											
	}
	else if(strcmp(cmd->commandType, SUBCMD_ENABLE_DATA_TRACKING)==0)
	{
		log_message("INFO", "Enable data tracking command received");									
		const char *url = cmd->params[0];
		int duration = atoi(cmd->params[1]);
		const char *header = cmd->params[2];
		char dataTrack[LOG_BUF_SZ] = {0};
		char sts[128] = {0};			
		execute_system_command("uci get system.@system[0].enable_data_traffic", dataTrack, sizeof(dataTrack));
		if(strstr(dataTrack, "0")){			
			char *result = start_data_track(url, duration, header, cmd->notificationID);			
			if (!strstr(result, "Failed")){
				snprintf(sts, sizeof(sts), "Initialized:%s:Data tracking enabled", cmd->notificationID);		
				publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", sts);
				free(result);
			}
			else
				publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failure", "Failure");
			
		}
		else
		{
				const char *notifToUse = strlen(g_dataTrackNotifId) > 0 ? g_dataTrackNotifId : cmd->notificationID;
				snprintf(sts, sizeof(sts), "Failed:%s:Data tracking already enabled", notifToUse);
				publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failure", sts);				
		}				
			
	}
	else if(strcmp(cmd->commandType, SUBCMD_DISABLE_DATA_TRACKING)==0)
	{
		log_message("INFO", "Disable data tracking command received");										
		const char *notifToUse = strlen(g_dataTrackNotifId) > 0 ? g_dataTrackNotifId : cmd->notificationID;
		char dataTrack[LOG_BUF_SZ] = {0};
		char sts[128] = {0};
		execute_system_command("uci get system.@system[0].enable_data_traffic", dataTrack, sizeof(dataTrack));
		if(strstr(dataTrack, "1")){
			char *result = stop_data_track();
			snprintf(sts, RESPONSE_SIZE, "Terminated:%s:Data tracking disabled", notifToUse);
			free(result);		
		}
		else{
			snprintf(sts, RESPONSE_SIZE, "Failed:%s:Data tracking already disabled", notifToUse);		
		 }					
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", sts);							
	}
	else if(strcmp(cmd->commandType, DATA_TRACKING_STATUS)==0)
	{
		log_message("INFO", "Get data tracking status command received");											
		char *result = get_data_track_status();
		if(result)
		{
			char copy[256];
			strncpy(copy, result, sizeof(copy)-1);
			copy[sizeof(copy)-1] = '\0';		
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
			free(result);					
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}
	
	}
	else if(strcmp(cmd->commandType, SUBCMD_GET_HOST_DETAILS)==0)
	{
		log_message("INFO", "Get host details command received");												
		char *result = get_wifi_hosts_details(imei);			
		if(result)
		{
			char copy[2048];
			strncpy(copy, result, sizeof(copy)-1);
			copy[sizeof(copy)-1] = '\0';		
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
			free(result);					
		}
		else
		{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failed", "No response");
		}			
	}
	else if(strcmp(cmd->commandType, SUBCMD_FILE_UPLOAD)==0)
	{
		log_message("INFO", "File upload command received");													
		const char *url = cmd->params[0];
		const char *filename = cmd->params[1];
		char *result = perform_file_upload(url, filename);
		if (strstr(result, "successful")){
			char copy[256];
			strncpy(copy, result, sizeof(copy)-1);
			copy[sizeof(copy)-1] = '\0';		
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
			free(result);					
		}
		else{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failure", result);
		}			
	}
	else if(strcmp(cmd->commandType, SUBCMD_FILE_DOWNLOAD)==0)
	{
		log_message("INFO", "File download command received");														
		const char *url = cmd->params[0];
		const char *filename = cmd->params[1];
		char *result = perform_file_download(url, filename);
		if (strstr(result, "successful")){
			char copy[256];
			strncpy(copy, result, sizeof(copy)-1);
			copy[sizeof(copy)-1] = '\0';		
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", copy);
			free(result);					
		}
		else{
			publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Failure", result);
		}		
	}
	else
	{
		publish_command_response(pMqttContext, g_publishTopic, cmd->notificationID, "Success", "");					
	}    

}


