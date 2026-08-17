/*onConnectData.c - Helper for sending initial JSONs*/

/* Standard includes. */
#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <json-c/json.h>
/*Config settings*/
#include "cioClient_config.h"
/* MQTT API headers. */
#include "core_mqtt.h"
#include "core_mqtt_state.h"
/* OpenSSL sockets transport implementation. */
#include "openssl_posix.h"
/*Include backoff algorithm header for retry logic.*/
#include "backoff_algorithm.h"
/* Clock for timer. */
#include "clock.h"
/* MQTT Client constants/Markers */
#include "cio_defaults.h"
#include "utilities.h"
#include "cjson/cJSON.h"

/* Core JSON builder */
void buildStatusJson(MQTTContext_t *pMqttContext, const char *imei, const char *topic)
{
    char rx[64], tx[64], status[64], mac[64], cmd[128];
    char simIntf1[8] = {0}, simIntf2[8] = {0};
    char simSlot[8] = {0};

    /* ------- Detect SIM slot (1 or 2) -------- */
    get_cmd_output("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",
                   simIntf1, sizeof(simIntf1));
    get_cmd_output("ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",
                   simIntf2, sizeof(simIntf2));

    trim(simIntf1);
    trim(simIntf2);

    if (strstr(simIntf1, "true"))
        strcpy(simSlot, "1");
    else if (strstr(simIntf2, "true"))
        strcpy(simSlot, "2");
    else
        strcpy(simSlot, "-");

    /* -------- Create Root JSON = Q -------- */
    cJSON *root = cJSON_CreateObject();
    cJSON *Q = cJSON_CreateObject();
    cJSON_AddItemToObject(root, "Q", Q);

    /* Add IMEI */
    cJSON_AddStringToObject(Q, "a", imei);

    /* Array of interface entries */
    cJSON *arr = cJSON_CreateArray();
    cJSON_AddItemToObject(Q, "b", arr);

    /* =========================================================
                          WAN INTERFACE
       ========================================================= */
    {
        get_cmd_output("ifconfig eth1 | grep 'RX bytes:' | cut -d: -f2 | awk '{print $1}'",
                       rx, sizeof(rx));
        get_cmd_output("ifconfig eth1 | grep 'TX bytes:' | cut -d: -f3 | awk '{print $1}'",
                       tx, sizeof(tx));
        get_cmd_output("cat /sys/class/net/eth1/address", mac, sizeof(mac));

        int wanStatus = get_interface_status(WAN);
	log_message("INFO", "wanStatus: %d", wanStatus);
        trim(rx); trim(tx); trim(mac);

        cJSON *wan = cJSON_CreateObject();
        cJSON_AddStringToObject(wan, "a", get_wan_ip());
 	char buf0[16];
	sprintf(buf0, "%d", wanStatus); 
	cJSON_AddStringToObject(wan, "b", buf0); 
        cJSON_AddStringToObject(wan, "c", rx);
        cJSON_AddStringToObject(wan, "d", tx);
        cJSON_AddStringToObject(wan, "e", mac);
        cJSON_AddStringToObject(wan, "f", "WAN");
        cJSON_AddStringToObject(wan, "g", "1");   

        cJSON_AddItemToArray(arr, wan);
    }

    /* =========================================================
                           WWAN (MODEM)
       ========================================================= */
    {
        /* RX/TX for modem */
        get_cmd_output("ifconfig qmimux0 | grep 'RX bytes:' | cut -d: -f2 | awk '{print $1}'",
                       rx, sizeof(rx));
        get_cmd_output("ifconfig qmimux0 | grep 'TX bytes:' | cut -d: -f3 | awk '{print $1}'",
                       tx, sizeof(tx));
        get_cmd_output("cat /sys/class/net/wwan0/address", mac, sizeof(mac));

        int wwanStatus = get_interface_status(WWAN);

        trim(rx); trim(tx); trim(mac);

        cJSON *wwan = cJSON_CreateObject();
        cJSON_AddStringToObject(wwan, "a", get_qmi_ip());
 	char buf1[16];
	sprintf(buf1, "%d", wwanStatus); 
	cJSON_AddStringToObject(wwan, "b", buf1);
        cJSON_AddStringToObject(wwan, "c", rx);
        cJSON_AddStringToObject(wwan, "d", tx);
        cJSON_AddStringToObject(wwan, "e", mac);
        cJSON_AddStringToObject(wwan, "f", "WWAN");
        cJSON_AddStringToObject(wwan, "g", simSlot);   // active SIM slot

        cJSON_AddItemToArray(arr, wwan);
    }

    /* =========================================================
                           LAN PORTS (lan1..lan3)
       ========================================================= */
    for (int i = 1; i <= 3; i++)
    {
        char ifname[16], lanStatus[16];
        snprintf(ifname, sizeof(ifname), "eth0");
	LanPortStatsStrings s;
	get_elc_port_stats_strings(i, &s);

        snprintf(cmd, sizeof(cmd),
                 "cat /sys/class/net/%s/address", ifname);
        get_cmd_output(cmd, mac, sizeof(mac));

        snprintf(cmd, sizeof(cmd), SCRIPT_PORT_STATUS " %d", (i+1));
        get_cmd_output(cmd, lanStatus, sizeof(lanStatus));

        trim(rx);
        trim(tx);
        trim(mac);
        trim(lanStatus);
        
        cJSON *lan = cJSON_CreateObject();
        cJSON_AddStringToObject(lan, "a", get_lan_ip());
        cJSON_AddStringToObject(lan, "b", lanStatus);
        cJSON_AddStringToObject(lan, "c", s.rx_str);
        cJSON_AddStringToObject(lan, "d", s.tx_str);    
        cJSON_AddStringToObject(lan, "e", mac);
        cJSON_AddStringToObject(lan, "f", "LAN");
 	char buf[16];
	sprintf(buf, "%d", i);        // convert int i to string
	cJSON_AddStringToObject(lan, "g", buf);          

        cJSON_AddItemToArray(arr, lan);
    }

    /* -------- Publish JSON -------- */
    char *jsonStr = cJSON_PrintUnformatted(root);

    if (jsonStr)
    {
        log_message("INFO", "Published Q JSON: %s", jsonStr);
        publishToTopicQOS(pMqttContext, topic, jsonStr, MQTTQoS1);
        free(jsonStr);
    }

    cJSON_Delete(root);
}

unsigned int pub_ObjectM(const char *SrcIMEI, MQTTContext_t *pMqttContext, const char *topic)
{
    char reboot_Fg[LOG_BUF_SZ] = {0};

    execute_system_command("uci -q get system.@system[0].rebootFg", reboot_Fg, sizeof(reboot_Fg));

    // Trim whitespace/newlines
    reboot_Fg[strcspn(reboot_Fg, "\r\n '\"")] = 0;

    // If no reboot flag, exit
    if (reboot_Fg[0] == '\0' || strcmp(reboot_Fg, "0") == 0)
        return 1;

    // Build JSON
    cJSON *root = cJSON_CreateObject();
    cJSON *M = cJSON_CreateObject();

    cJSON_AddStringToObject(M, "a", SrcIMEI);
    cJSON_AddItemToObject(M, "b", cJSON_CreateArray());
    cJSON_AddStringToObject(M, "c", reboot_Fg);

    cJSON_AddItemToObject(root, "M", M);

    // Convert JSON to string
    char *json_str = cJSON_PrintUnformatted(root);
    if (!json_str) {
        cJSON_Delete(root);
        return 2;
    }

    // Publish
    publishToTopicQOS(pMqttContext, topic, json_str, MQTTQoS0);

    // Cleanup
    cJSON_free(json_str);
    cJSON_Delete(root);

    // Clear the reboot flag once published
    system("uci -q delete system.@system[0].rebootFg");
    system("uci commit system");

    return 0;
}

/* Build S object */
unsigned int pub_ObjectF(const char *SrcIMEI, MQTTContext_t *pMqttContext, const char *topic)
{
    char fwVer[64] = {0};
    char iccid[32] = {0};
    char apn[64] = {0};
    char oper[64] = {0};
    char phone[32] = {0};
    char modemVer[64] = {0};
    char modemType[64] = {0};

    char simIntf1[8] = {0}, simIntf2[8] = {0};
    char simSlot[8] = {0};

    /* Fetch global details (slot-independent) */
    get_firmware_version(fwVer);
    get_iccid(iccid);
    get_apn(apn);
    get_operator(oper);
    get_phoneNumber(phone);
    get_modem_firmware_version(modemVer);
    get_modem_module(modemType);

    trim(fwVer);
    trim(iccid);
    trim(apn);
    trim(oper);
    trim(phone);
    trim(modemVer);
    trim(modemType);

    if (!strlen(fwVer)) strcpy(fwVer, "-");
    if (!strlen(iccid)) strcpy(iccid, "-");
    if (!strlen(apn)) strcpy(apn, "-");
    if (!strlen(oper)) strcpy(oper, "-");
    if (!strlen(phone)) strcpy(phone, "-");
    if (!strlen(modemVer)) strcpy(modemVer, "-");
    if (!strlen(modemType)) strcpy(modemType, "-");

    /* Determine active SIM slot */
    execute_system_command(
        "ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",
        simIntf1, sizeof(simIntf1)
    );
    execute_system_command(
        "ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",
        simIntf2, sizeof(simIntf2)
    );

    trim(simIntf1);
    trim(simIntf2);

    if (strstr(simIntf1, "true"))
        strcpy(simSlot, "1");
    else if (strstr(simIntf2, "true"))
        strcpy(simSlot, "2");
    else
        strcpy(simSlot, "-");

    /* Active SIM status (0 / 1 / 2) */
    int active_status = get_interface_status(WWAN);
    char activeStr[8];
    snprintf(activeStr, sizeof(activeStr), "%d", active_status);

    /* =====================================================
                 BUILD JSON "S" AS REQUIRED
       ===================================================== */

    cJSON *root = cJSON_CreateObject();
    cJSON *S = cJSON_CreateObject();
    cJSON_AddItemToObject(root, "S", S);

    /* Basic details */
    cJSON_AddStringToObject(S, "a", SrcIMEI);
    cJSON_AddStringToObject(S, "b", fwVer);
    cJSON_AddStringToObject(S, "c", modemVer);
    cJSON_AddStringToObject(S, "d", modemType);

    /* Array "e" */
    cJSON *arr = cJSON_CreateArray();

    cJSON *slotObj = cJSON_CreateObject();
    cJSON_AddStringToObject(slotObj, "a", apn);
    cJSON_AddStringToObject(slotObj, "b", oper);
    cJSON_AddStringToObject(slotObj, "c", phone);
    cJSON_AddStringToObject(slotObj, "d", iccid);
    cJSON_AddStringToObject(slotObj, "e", activeStr);
    cJSON_AddStringToObject(slotObj, "f", simSlot);

    cJSON_AddItemToArray(arr, slotObj);

    cJSON_AddItemToObject(S, "e", arr);

    /* Serialize + Publish */
    char *jsonStr = cJSON_PrintUnformatted(root);

    if (!jsonStr)
    {
        log_message("ERROR", "Failed to serialize S JSON");
        cJSON_Delete(root);
        return 1;
    }

    log_message("INFO", "Published S JSON: %s", jsonStr);

    publishToTopicQOS(pMqttContext, topic, jsonStr, MQTTQoS0);

    cJSON_free(jsonStr);
    cJSON_Delete(root);

    return 0;
}


void publishInitJsons(MQTTContext_t *pMqttContext, const char *imei, const char *topic)
{
	char *jsonOut;
	size_t jsonOutLen;
	const char *lan_ip = get_lan_ip();
	/*Build JSON after connection - Objects M,F ,C, T and R- respectively*/
	pub_ObjectM(imei, pMqttContext, topic);
	pub_ObjectF(imei, pMqttContext, topic);
	buildStatusJson(pMqttContext, imei, topic);
	buildEthernetHostsJson(pMqttContext, imei, topic); 
	buildWifiHostsJson(pMqttContext, imei, topic);	
}

