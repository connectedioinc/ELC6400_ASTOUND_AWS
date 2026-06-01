/*
 * Defaults
 */

/**
 * @file cio defaults
 * @brief Default defines and macros
 *
 * Supplies Defaults
 */

#ifndef CIO_DEFAULTS_H_
#define CIO_DEFAULTS_H_

#define DEBUG (1)


#define SUCCESS     (0)
#define FAILED      (1)
#define ENABLE_CRITICAL_COMMANDS (1)
/*
 * Strategy-specific configuration parameters used by Kaa log collection feature.
 */
#define LOG_UPLOAD_THRESHOLD                 1 /* Count of collected logs needed to initiate log upload */
#define LOG_GENERATION_FREQUENCY             5 /* In seconds */
#define LOG_STORAGE_SIZE                     10000 /* The amount of space allocated for a log storage, in bytes */
#define NUM_LOGS_TO_KEEP                     50    /* The minimum amount of logs to be present in a log storage, in percents */
#define LOG_BUF_SZ                           128 //128    /* Log buffer size in bytes */

#define EVENT_RESPONSE_SIZE                  2000 //500 //256
#define SYSTEM_UPTIME_SIZE                   15
#define URL_SIZE_IN_BYTES                    1024  /* Size of the url for firmware download */
#define CHEKSUM_SIZE_IN_BYTES                32 /*No of bytes of checksum to be verified */
#define BIN_DESTINATION_PATH_SIZE            128
#define CONFIG_DESTINATION_PATH_SIZE         64

#define IMEI_LENGTH                          15
#define AT_RESPONSE_LENGTH                   500 /* WARNING: Must be less than EVENT_RESPONSE_SIZE */
#define SAFE_SLEEP_TIME_SEC                  15
#define MAX_LENGTH_OF_SYSTEM_CMD_RESPONSE    256
#define DEVICE_TYPE_LEN                      16 
#define MIN_MEM_BLOCK_SIZE					 32

#define JSON_MEM_LENGTH				4096
#define MQTT_TLS_FILE			"/etc/cioRootCA.crt"
#define MQTT_CONFIG_FILE		"/etc/config/mqtt"
#define MQTT_SEND_TOPIC			"cio/device/status"
#define CLIENT_KILL_CMD			"killall -9 cioClient"
#define PARAM_SIZE_MESG 		1024
#define STATUS_SIZE 			15360
#define RESPONSE_SIZE 			14336

#define LOCAL_DIRECTORY     		"/etc/dataTrack"
#define FIRMWARE_FILE_PATH     		"/tmp/kaa"
#define FW_BIN_PATH         		"/tmp/kaa/Firmware.bin"
#define CONFIG_FILE_PATH    		"/tmp/kaa/CONFIG.tar.gz"
#define MD5SUM_FILE_PATH    		"/tmp/kaa/md5.txt"
#define IMEI_FILE_PATH      		"/tmp/kaa/imei.txt"
#define PYTHON_SCRIPT_PATH  		"/etc/python/script_python.tar.gz"
#define DIAG_LOG_DIRECTORY     		"/tmp/log/diag"
#define DATATRACK_PATH			"/etc/dataTrack/"
#define RECONNECT_BACKOFF_MAX 		30 //MQTT Reconnect delay set

#define CLIENTID_DIRECTORY     "/etc/clientID"
#define CLIENTID_FILE_PATH      "/etc/clientID/imei.txt"

#define MAX_IP_LEN 16

#define CURL_ERROR_MESSAGE_SIZE                 1280

#define FIRMWARE_UPDATE     	7010
#define CONFIG_UPDATE       	7011

#define CONFIG_UPLOAD       	7012
#define SYSTEM_LOG_UPLOAD   	7013
#define KERNAL_LOG_UPLOAD   	7014

#define READ_DATA           7000
#define CHECK_FOR_FILE      7001

/******FIREWALL SETTING MACROS******************/
#define DHCP_RENEW           0x0001
#define ALLOW_PING           0x0002
#define ALLOW_IGMP           0x0004
#define ALLOW_DHCPv6         0x0008
#define ALLOW_MLD            0x0010
#define ALLOW_ICMPv6_INPUT   0x0020
#define ALLOW_ICMPv6_FWD     0x0040
#define ALLOW_PING_SSH       0x0080
#define ALLOW_SSH_WAN        0x0100

#define RULE_DHCP_RENEW     	0
#define RULE_ALLOW_PING     	1
#define RULE_ALLOW_IGMP     	2
#define RULE_ALLOW_DHCPv6   	3
#define RULE_ALLOW_MLD      	4
#define RULE_ALLOW_ICMPv6_INPUT  5
#define RULE_ALLOW_ICMPv6_FWD    6
#define RULE_ALLOW_PING_SSH 	9
#define RULE_ALLOW_SSH_WAN  	9
#define MAX_HOSTNAME_LEN 	64
 /*********************************************/


 /***********CIO Monitoring****************/

#define MONITORING_CMD_LENGTH            256
#define MONITORING_POWER_ON             0700
#define MONITORING_CONTUNIOUS_RUN       0701



 /*********************************************/
//MQTT client supporting scripts
#define SCRIPT_RESET_IP			"/usr/bin/cio/resetIPTables.sh"
#define SCRIPT_MAC_FILTER		"/usr/bin/cio/createMacFilter.sh"
#define SCRIPT_MAC_FILTER_DELETE	"/usr/bin/cio/deleteMacFilter.sh"
#define SCRIPT_NETWOK_STAT		"/etc/networkStatus.sh"
#define SCRIPT_ASSOC_LIST		"/etc/assocList.sh"
#define SCRIPT_MEM_INFO			"/usr/bin/cio/memInfo.sh"
#define SCRIPT_DF_OUTPUT		"/usr/bin/cio/dfOutput.sh"
#define SCRIPT_WIFI_PARAMS		"/etc/wifiParams.sh"
#define SCRIPT_PORT_STATUS		"/etc/portstatus.sh"
#define SCRIPT_WEB_ACCESS		"/usr/bin/cio/webAccessMgmt.sh"
#define SCRIPT_TCP_DUMP			"/usr/bin/cio/tcpDump.sh"
#define SCRIPT_STATION_CONN		"/usr/bin/cio/stationConnStatus.sh"
#define SCRIPT_STATION_LIST		"/etc/getStationLists.sh"
#define SCRIPT_LOAD_AVG			"/usr/bin/cio/loadAvg.sh"
#define SCRIPT_SIM_SLOT			"/usr/bin/cio/getsimSlot.sh"


/***********CIO Alert****************/
 #define DVC_STATE_CHANGE		"DVC_STATE_CHANGE"
 #define INT_STATE_CHANGE		"INT_STATE_CHANGE"
 #define CFG_BACKUP				"CFG_BACKUP"
 #define CFG_RESTORE			"CFG_RESTORE"
 #define FW_UPGRADE				"FW_UPGRADE"
 #define DATA_THESHOLD_BREACH	"DATA_THESHOLD_BREACH"

 /*********************************************/
#define GERAN_ONLY_COPS		0 //GSM Digital Cellular Systems (GERAN only)
#define UTRAN_ONLY_COPS 	2 //UTRAN only
#define NW_3GPP_COPS   		3 //3GPP Systems (GERAN and UTRAN and E-UTRAN) (factory default)
#define EUTRAN_ONLY_COPS 	4 //E-UTRAN only
#define GERAN_UTRAN_COPS	5 //GERAN and UTRAN
#define GERAN_EUTRAN_COPS 	6 //GERAN and E-UTRAN
#define UTRAN_EUTRAN_COPS	7 //UTRAN and E-UTRAN
#define LTE_CAT_M1_COPS		9 //LTE CATM1
#define NB_IOT_COPS		10 //NB IOT
#define NR5G_COPS		13 //5G NR

/*********************AT.C********************/

#define GERAN_ONLY 		12 //GSM Digital Cellular Systems (GERAN only)
#define UTRAN_ONLY 		22 //UTRAN only
#define NW_3GPP   		25 //3GPP Systems (GERAN and UTRAN and E-UTRAN) (factory default)
#define EUTRAN_ONLY 	28 //E-UTRAN only
#define GERAN_UTRAN		29 //GERAN and UTRAN
#define GERAN_EUTRAN 	30 //GERAN and E-UTRAN
#define UTRAN_EUTRAN	31 //UTRAN and E-UTRAN
#define SIGNAL_STRENGTH_CUTOFF_COEFFICIENT	(-113) 
#define MAX_AT_CMD_LENGTH	160

 /*********************************************/
/*
 * CIO Portal Command Identifiers.
*/

#define UPDATE_FW           "1100"
#define PERFORM_RESET       "1101"
#define RESTORE_CFG         "1102"
#define BACKUP_CFG          "1103"
#define GET_SYS_LOG         "1104"
#define GET_KERNEL_LOG      "1105"
#define EXECUTE_AT_CMD      "1106"
#define GET_FIREWALL        "1107"
#define SET_FIREWALL        "1108"
#define CUSTOM_COMMAND      "1109"

#define MODEM_FW_UPDATE     "1110"
#define DATA_TRACKING_STATUS "1111"

#define SOFT_REBOOT                 "1114"
#define GET_DEVICE_STATUS           "1115"
#define BASH_COMMAND	            "1116"
#define WIFI_SETTING	    	    "1117"
#define SUBCMD_DISABLE_WEB_ACCESS   "1118"
#define SUBCMD_ENABLE_WEB_ACCESS    "1119"
#define SUBCMD_SET_CHECKIN_INTERVAL "1120"
#define SUBCMD_GET_CONNECTED_IP_MAC_LIST_ON_LAN "1121"
#define SUBCMD_SET_ALLOW_ONLY_MAC_ADDRESSES "1122"
#define SUBCMD_ENABLE_DATA_TRACKING 	"1123"
#define SUBCMD_DISABLE_DATA_TRACKING 	"1124"
#define SUBCMD_GET_INTERFACE_STATUS 	"1125"
#define SUBCMD_SET_INTERFACE_STATUS 	"1126"
#define SUBCMD_GET_HOST_DETAILS 	"1127"
#define SUBCMD_SET_PYTHON_SCRIPT	"1128"
#define SUBCMD_SET_KEEPALIVE_INTERVAL 	"1129"
#define SUBCMD_GET_KEEPALIVE_INTERVAL 	"1130"
#define SUBCMD_GET_CHECKIN_INTERVAL 	"1131"
#define SUBCMD_FILE_UPLOAD	 	"1132"
#define SUBCMD_FILE_DOWNLOAD	 	"1133"
#define SCAN_BLUETOOTH_DEVICES	 	"1137"
#define SUBCMD_DIAGNOSIS_STATUS 	"1138"
#define SUBCMD_DIAGNOSIS	 	"1139"
#define SUBCMD_DIAG_LOG_STATUS	 	"1140"
#define SUBCMD_DIAG_LOG		 	"1141"

#define SUBCMD_SET_CIOCLIENT_LAUNCH_STATE "405"


/*
 * Interface types 
 */ 

#define WWAN                (0x0001)
#define WAN                 (0x0002)
#define LAN                 (0x0004) 
 
#define LAN1                (0x0001)
#define LAN2                (0x0002)
#define LAN3                (0x0004)
#define LAN4                (0x0008)

/*AWS Constants*/
/* --- Fleet Provisioning Topics --- */
#define CREATE_CERT_TOPIC        "$aws/certificates/create/json"
#define CREATE_CERT_ACCEPTED     "$aws/certificates/create/json/accepted"
#define CREATE_CERT_REJECTED     "$aws/certificates/create/json/rejected"

#define PROVISION_TOPIC_FMT      "$aws/provisioning-templates/%s/provision/json"
#define PROVISION_ACCEPTED_FMT   "$aws/provisioning-templates/%s/provision/json/accepted"
#define PROVISION_REJECTED_FMT   "$aws/provisioning-templates/%s/provision/json/rejected"

/*#define PROVISION_TEMPLATE_NAME  "ELCProvisionClaimTemplate"*/
#define PROVISION_TEMPLATE_NAME  "ELCProvisionProdTemplate2"   

/* Paths for certs/keys */
#define OVERLAY_CERT_DIR         "/overlay/certs"
#define DEVICE_CERT_PATH         "/overlay/certs/deviceCert.crt"
#define DEVICE_KEY_PATH          "/overlay/certs/privateKey.key"
#define ROOT_CA_PATH             "/etc/certs/AmazonRootCA1.pem"

#define CLAIM_CERT_PATH          "/etc/certs/claimCert.crt"
#define CLAIM_KEY_PATH           "/etc/certs/claimKey.key"
#define CLAIM_ROOT_CA_PATH       "/etc/certs/bootstrapRootCA.pem"

#define CIO_CHECKIN_TIMEOUT     					 1800 /* Device Checkin Timeout in Sec*/
#define CIO_INTERFACE_STATUS_CHECK_TIMEOUT     				120 /* Device Interface status Check Timeout in Sec*/

#define NUM_MODEM_FW_ITERATION	(5)    		/* Modem Firmware Update Try iteration*/
//#define BUFSIZ (64)
/*
 * Forward Functions 
 */  
 
#define dprint(TAG, ...) \
            do { if (DEBUG) fprintf(stdout, TAG, ##__VA_ARGS__); } while (0)
            
#define dprint_v2(fmt, ...) \
        do { if (DEBUG) fprintf(stdout, "%s:%d:%s(): " fmt, __FILE__, \
                                __LINE__, __func__, ##__VA_ARGS__); } while (0)

#define RETURN_IF_ERROR(error, message) \
    if ((error)) { \
        printf(message ", error code %d\n", (error)); \
        return (error); \
    }                                            
#endif /* CIO_DEFAULTS_H_ */            


