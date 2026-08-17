/*cioClient - AWS MQTT Client*/

/* Standard includes. */
#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <sys/socket.h>
#include <linux/netlink.h>
#include <linux/rtnetlink.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <libubus.h>
#include <libubox/blobmsg_json.h>
#include <libubox/ustream.h>
#include <pthread.h>
#include <signal.h>
#include <net/if.h>
#include <sys/time.h>
#include <poll.h>

#include <netinet/in.h>
#include <arpa/inet.h>
#include <net/if.h>

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

pthread_mutex_t checkin_mutex = PTHREAD_MUTEX_INITIALIZER;

/*CIO Constants*/
#include "cio_defaults.h"

#include "utilities.h"
#include "provision.h"
#include "cjson/cJSON.h"
#include "mqtt_sync.h"
#include "ubus_json_compat.h"
#include "publish_utils.h"
#include "command_handler.h"

#ifndef BROKER_ENDPOINT
    #error "Please define an MQTT broker endpoint, BROKER_ENDPOINT, in cioClient_config.h."
#endif
#ifndef ROOT_CA_CERT_PATH
    #error "Please define path to Root CA certificate of the MQTT broker, ROOT_CA_CERT_PATH, in cioClient_config.h."
#endif
#ifndef CLIENT_IDENTIFIER
    #error "Please define a unique CLIENT_IDENTIFIER."
#endif

#ifndef BROKER_PORT
    #define BROKER_PORT    ( 8883 )
#endif

#ifndef NETWORK_BUFFER_SIZE
    #define NETWORK_BUFFER_SIZE    ( 1024U )
#endif

#define BROKER_ENDPOINT_LENGTH                   ( ( uint16_t ) ( sizeof( BROKER_ENDPOINT ) - 1 ) )
#define CLIENT_IDENTIFIER_LENGTH                 ( ( uint16_t ) ( sizeof( CLIENT_IDENTIFIER ) - 1 ) )
#define CONNECTION_RETRY_MAX_ATTEMPTS            ( 5U )
#define CONNECTION_RETRY_MAX_BACKOFF_DELAY_MS    ( 5000U )
#define CONNECTION_RETRY_BACKOFF_BASE_MS         ( 500U )
#define CONNACK_RECV_TIMEOUT_MS                  ( 3000U )
#define SUBSCRIBE_TOPIC_BASE                     "cio/device/DR/"
#define SUBSCRIBE_TOPIC_BASE_LENGTH              ( ( uint16_t ) ( sizeof( SUBSCRIBE_TOPIC_BASE ) - 1 ) )
#define PUBLISH_TOPIC_BASE                     	 "cio/device/DS/"
#define PUBLISH_TOPIC                       	 "cio/device/status"
#define PUBLISH_TOPIC_LENGTH                	( ( uint16_t ) ( sizeof( PUBLISH_TOPIC ) - 1 ) )
#define MQTT_EXAMPLE_MESSAGE                     "Hello World!"
#define MQTT_EXAMPLE_MESSAGE_LENGTH              ( ( uint16_t ) ( sizeof( MQTT_EXAMPLE_MESSAGE ) - 1 ) )
#define MAX_OUTGOING_PUBLISHES                   ( 5U )
#define MQTT_PACKET_ID_INVALID                   ( ( uint16_t ) 0U )
#define MQTT_PROCESS_LOOP_TIMEOUT_MS             ( 500U )
#define MQTT_KEEP_ALIVE_INTERVAL_SECONDS         ( 60U )
#define DEFAULT_CHECKIN         		 1800
#define DELAY_BETWEEN_PUBLISHES_SECONDS          ( 1U )
#define MQTT_PUBLISH_COUNT_PER_LOOP              ( 5U )
#define MQTT_SUBPUB_LOOP_DELAY_SECONDS           ( 5U )
#define TRANSPORT_SEND_RECV_TIMEOUT_MS           ( 8000 )
#define OUTGOING_PUBLISH_RECORD_LEN              ( 25U )
#define INCOMING_PUBLISH_RECORD_LEN              ( 25U )

#define LOG_LEVEL    LOG_DEBUG
#define ENABLE_MQTT_DEBUG_LOG 1
//For transient state wait
#define LOOP_FAIL_LIMIT   6000   // ~30 minutes
#define LOOP_SLEEP_US     (300 * 1000)  // 300 ms

#include "logging_levels.h"
#include "logging_stack.h"

//Buffer for subscribe Topic
char g_subscribeTopic[TOPIC_MAX_LEN] = {0};
uint16_t g_subscribeTopic_length = 0;

char g_publishTopic[TOPIC_MAX_LEN] = {0};
uint16_t g_publishTopic_length = 0;

#define MQTT_RX_BUFFER_SIZE  16384
#define MQTT_TX_BUFFER_SIZE  16384
/* Static buffers for MQTT library */
static uint8_t mqttRxBuffer[MQTT_RX_BUFFER_SIZE];
static uint8_t mqttTxBuffer[MQTT_TX_BUFFER_SIZE];
/*Thread for monitors*/
pthread_t checkin_thread, thread_iface, thread_wifi, thread_eth, astd_thread;
pthread_mutex_t mqtt_mutex = PTHREAD_MUTEX_INITIALIZER;
volatile bool mqtt_connected = false;
/*Wifi Monitor Struct*/
static struct ubus_context *ctx_wifi = NULL;
//Keep-alive time
int g_mqtt_keepalive = MQTT_KEEP_ALIVE_INTERVAL_SECONDS; // default: 60 sec
//Check-in interval
int g_checkin_interval = DEFAULT_CHECKIN;              // default: 30 minutes
pthread_mutex_t mqtt_keepalive_mutex = PTHREAD_MUTEX_INITIALIZER;
// Optional flag to trigger reconnect
volatile int g_force_mqtt_reconnect = 0;
//For hard restart of MQTT
volatile bool g_mqtt_hard_restart = false;
char g_aws_server[256] = BROKER_ENDPOINT;
char g_aws_template[64] = PROVISION_TEMPLATE_NAME;
//For knowing whether sysupgrade started
volatile bool g_upgrade_started = false;
static int recv_fail_count = 0;
static time_t recv_fail_start = 0;
static time_t last_reconnect = 0;
//Time for ethernet port change to sustain
#define STABLE_TIME 30
#define DEBOUNCE_MS 3000

#define MAX_STATIONS 32
#define ENTRY_LEN 64
#define FINGERPRINT_SIZE (MAX_STATIONS * ENTRY_LEN)

// Global variable to store the last known state
char last_mac_fingerprint[FINGERPRINT_SIZE] = "";
/*-----------------------------------------------------------*/
/* Trigger flags used by the monitor */
typedef struct {
    bool status;
    bool ethernet;
    bool wifi;
} TriggerFlags_t;

static TriggerFlags_t g_triggers = {0};

typedef struct PublishPackets
{
    /**
     * @brief Packet identifier of the publish packet.
     */
    uint16_t packetId;

    /**
     * @brief Publish info of the publish packet.
     */
    MQTTPublishInfo_t pubInfo;
} PublishPackets_t;

/*-----------------------------------------------------------*/

static uint16_t globalAckPacketIdentifier = 0U;
static uint16_t globalSubscribePacketIdentifier = 0U;
static uint16_t globalUnsubscribePacketIdentifier = 0U;
static PublishPackets_t outgoingPublishPackets[ MAX_OUTGOING_PUBLISHES ] = { 0 };
static MQTTSubscribeInfo_t pGlobalSubscriptionList[ 1 ];
static uint8_t buffer[ NETWORK_BUFFER_SIZE ];
static MQTTSubAckStatus_t globalSubAckStatus = MQTTSubAckFailure;
static MQTTPubAckInfo_t pOutgoingPublishRecords[ OUTGOING_PUBLISH_RECORD_LEN ];
static MQTTPubAckInfo_t pIncomingPublishRecords[ INCOMING_PUBLISH_RECORD_LEN ];

/*-----------------------------------------------------------*/

/* Each compilation unit must define the NetworkContext struct. */
struct NetworkContext
{
    OpensslParams_t * pParams;
};

typedef struct {
    struct ubus_event_handler handler;   // must be first
    MQTTContext_t *mqttContext;
    const char *imei;
    const char *topic;
} WifiHandlerCtx;


typedef struct {
    MQTTContext_t *mqttContext;
    const char *imei;
    const char *topic;
} ThreadArgs;
//Wifi event handler data holder
typedef struct {
    MQTTContext_t *mqttContext;
    const char *imei;
    const char *topic;
} WifiEventArgs;

// Structure to track the specific state of each interface
typedef struct {
    char name[IF_NAMESIZE];
    unsigned int last_flags;
    char last_ip[INET6_ADDRSTRLEN];
    long long last_event_time; // Track time per interface
} InterfaceState;

static InterfaceState tracked_ifs[] = {
    {"eth0", 0, "", 0},
    {"wan", 0, "", 0},
    {"br-lan", 0, "", 0},
    {"wwan0", 0, "", 0}
};

#define TRACKED_COUNT (sizeof(tracked_ifs) / sizeof(InterfaceState))

static uint32_t generateRandomNumber();

static int connectToServerWithBackoffRetries( NetworkContext_t * pNetworkContext,
                                              MQTTContext_t * pMqttContext,
                                              bool * pClientSessionPresent,
                                              bool * pBrokerSessionPresent, const char *imei );
static int subscribePublishLoop( MQTTContext_t * pMqttContext );
static void handleIncomingPublish( MQTTContext_t * pMqttContext, MQTTPublishInfo_t * pPublishInfo,
                                   uint16_t packetIdentifier );
static void eventCallback( MQTTContext_t * pMqttContext,
                           MQTTPacketInfo_t * pPacketInfo,
                           MQTTDeserializedInfo_t * pDeserializedInfo );
static int initializeMqtt( MQTTContext_t * pMqttContext,
                           NetworkContext_t * pNetworkContext );

static int establishMqttSession( MQTTContext_t * pMqttContext, NetworkContext_t * pNetworkContext,
                                 bool createCleanSession,
                                 bool * pSessionPresent, const char *imei );

static int disconnectMqttSession( MQTTContext_t * pMqttContext );
static int subscribeToTopic( MQTTContext_t * pMqttContext );
static int unsubscribeFromTopic( MQTTContext_t * pMqttContext );
static int publishToTopic( MQTTContext_t * pMqttContext );
static int getNextFreeIndexForOutgoingPublishes( uint8_t * pIndex );
static void cleanupOutgoingPublishAt( uint8_t index );
static void cleanupOutgoingPublishes( void );
static void cleanupOutgoingPublishWithPacketID( uint16_t packetId );
static int handlePublishResend( MQTTContext_t * pMqttContext );
static void updateSubAckStatus( MQTTPacketInfo_t * pPacketInfo );
static int handleResubscribe( MQTTContext_t * pMqttContext );
static int waitForPacketAck( MQTTContext_t * pMqttContext,
                             uint16_t usPacketIdentifier,
                             uint32_t ulTimeout );
static MQTTStatus_t processLoopWithTimeout( MQTTContext_t * pMqttContext,
                                            uint32_t ulTimeoutMs );

/*-----------------------------------------------------------*/

static uint32_t generateRandomNumber()
{
    return( rand() );
}

/*-----------------------------------------------------------*/
static int connectToServerWithBackoffRetries( NetworkContext_t * pNetworkContext,
                                              MQTTContext_t * pMqttContext,
                                              bool * pClientSessionPresent,
                                              bool * pBrokerSessionPresent, const char *imei )
{
    int returnStatus = EXIT_FAILURE;
    BackoffAlgorithmStatus_t backoffAlgStatus = BackoffAlgorithmSuccess;
    OpensslStatus_t opensslStatus = OPENSSL_SUCCESS;
    BackoffAlgorithmContext_t reconnectParams;
    ServerInfo_t serverInfo;
    OpensslCredentials_t opensslCredentials;
    uint16_t nextRetryBackOff;
    bool createCleanSession;

    /* Initialize information to connect to the MQTT broker. */
    serverInfo.pHostName = g_aws_server;
    serverInfo.hostNameLength = get_broker_endpoint_length();
    serverInfo.port = BROKER_PORT;

    /* Initialize credentials for establishing TLS session. */
    memset( &opensslCredentials, 0, sizeof( OpensslCredentials_t ) );
    opensslCredentials.pRootCaPath = ROOT_CA_CERT_PATH;
	opensslCredentials.pClientCertPath = DEVICE_CERT_PATH;
	opensslCredentials.pPrivateKeyPath = DEVICE_KEY_PATH;    
    opensslCredentials.sniHostName = g_aws_server;

    /* Initialize reconnect attempts and interval */
    BackoffAlgorithm_InitializeParams( &reconnectParams,
                                       CONNECTION_RETRY_BACKOFF_BASE_MS,
                                       CONNECTION_RETRY_MAX_BACKOFF_DELAY_MS,
                                       CONNECTION_RETRY_MAX_ATTEMPTS );

    /* Attempt to connect to MQTT broker. If connection fails, retry after
     * a timeout. Timeout value will exponentially increase till maximum
     * attempts are reached.
     */
    do
    {
        /* Establish a TLS session with the MQTT broker. This example connects
         * to the MQTT broker as specified in BROKER_ENDPOINT and BROKER_PORT at
         * the top of this file. */
        log_message( "INFO", "Establishing a TLS session to %.*s:%d.",
                   get_broker_endpoint_length(),
                   g_aws_server,
                   BROKER_PORT  );
        opensslStatus = Openssl_Connect( pNetworkContext,
                                         &serverInfo,
                                         &opensslCredentials,
                                         TRANSPORT_SEND_RECV_TIMEOUT_MS,
                                         TRANSPORT_SEND_RECV_TIMEOUT_MS );

        if( opensslStatus == OPENSSL_SUCCESS )
        {
            /* A clean MQTT session needs to be created, if there is no session saved
             * in this MQTT client. */
            //createCleanSession = ( *pClientSessionPresent == true ) ? false : true;
            createCleanSession = !( *pClientSessionPresent );

            /* Sends an MQTT Connect packet using the established TLS session,
             * then waits for connection acknowledgment (CONNACK) packet. */
            //returnStatus = establishMqttSession( pMqttContext, createCleanSession, pBrokerSessionPresent, imei );
            returnStatus = establishMqttSession( pMqttContext, pNetworkContext, createCleanSession, pBrokerSessionPresent, imei );
            
            if( returnStatus == EXIT_FAILURE )
            {
                /* End TLS session, then close TCP connection. */
                ( void ) Openssl_Disconnect( pNetworkContext );
            }
        }
        else 
        {
            log_message("ERROR", "TLS Connect failed (OpensslStatus %d). Check WiFi/Certs.", opensslStatus);
            returnStatus = EXIT_FAILURE;
        }
        if( returnStatus == EXIT_FAILURE )
        {
            /* Generate a random number and get back-off value (in milliseconds) for the next connection retry. */
            backoffAlgStatus = BackoffAlgorithm_GetNextBackoff( &reconnectParams, generateRandomNumber(), &nextRetryBackOff );

            if( backoffAlgStatus == BackoffAlgorithmRetriesExhausted )
            {
                log_message( "ERROR", "Connection to the broker failed, all attempts exhausted" );
                log_message("ERROR", "Exiting process to trigger procd restart");
                returnStatus = EXIT_FAILURE;
                exit(EXIT_FAILURE);
            }
            else if( backoffAlgStatus == BackoffAlgorithmSuccess )
            {
               log_message( "DEBUG", "Connection to the broker failed. Retrying connection "
                           "after %hu ms backoff.",
                           ( unsigned short ) nextRetryBackOff  );
                Clock_SleepMs( nextRetryBackOff );
            }
        }
    } while( ( returnStatus == EXIT_FAILURE ) && ( backoffAlgStatus == BackoffAlgorithmSuccess ) );

    return returnStatus;
}

/*-----------------------------------------------------------*/

static int getNextFreeIndexForOutgoingPublishes( uint8_t * pIndex )
{
    int returnStatus = EXIT_FAILURE;
    uint8_t index = 0;

    assert( outgoingPublishPackets != NULL );
    assert( pIndex != NULL );

    for( index = 0; index < MAX_OUTGOING_PUBLISHES; index++ )
    {
        /* A free index is marked by invalid packet id.
         * Check if the the index has a free slot. */
        if( outgoingPublishPackets[ index ].packetId == MQTT_PACKET_ID_INVALID )
        {
            returnStatus = EXIT_SUCCESS;

            /* Copy the available index into the output param. */
            *pIndex = index;

            break;
        }
    }

    /* Copy the available index into the output param. */
    *pIndex = index;

    return returnStatus;
}
/*-----------------------------------------------------------*/

static void cleanupOutgoingPublishAt( uint8_t index )
{
    assert( outgoingPublishPackets != NULL );
    assert( index < MAX_OUTGOING_PUBLISHES );

    /* Clear the outgoing publish packet. */
    ( void ) memset( &( outgoingPublishPackets[ index ] ),
                     0x00,
                     sizeof( outgoingPublishPackets[ index ] ) );
}

/*-----------------------------------------------------------*/

static void cleanupOutgoingPublishes( void )
{
    assert( outgoingPublishPackets != NULL );

    /* Clean up all the outgoing publish packets. */
    ( void ) memset( outgoingPublishPackets, 0x00, sizeof( outgoingPublishPackets ) );
}

/*-----------------------------------------------------------*/

static void cleanupOutgoingPublishWithPacketID( uint16_t packetId )
{
    uint8_t index = 0;

    assert( outgoingPublishPackets != NULL );
    assert( packetId != MQTT_PACKET_ID_INVALID );

    /* Clean up all the saved outgoing publishes. */
    for( ; index < MAX_OUTGOING_PUBLISHES; index++ )
    {
        if( outgoingPublishPackets[ index ].packetId == packetId )
        {
            cleanupOutgoingPublishAt( index );
            log_message("INFO",  "Cleaned up outgoing publish packet with packet id %u",
                       packetId  );
            break;
        }
    }
}

/*-----------------------------------------------------------*/

static int handlePublishResend( MQTTContext_t * pMqttContext )
{
    int returnStatus = EXIT_SUCCESS;
    MQTTStatus_t mqttStatus = MQTTSuccess;
    uint8_t index = 0U;
    MQTTStateCursor_t cursor = MQTT_STATE_CURSOR_INITIALIZER;
    uint16_t packetIdToResend = MQTT_PACKET_ID_INVALID;
    bool foundPacketId = false;

    assert( pMqttContext != NULL );
    assert( outgoingPublishPackets != NULL );

    /* MQTT_PublishToResend() provides a packet ID of the next PUBLISH packet
     * that should be resent. In accordance with the MQTT v3.1.1 spec,
     * MQTT_PublishToResend() preserves the ordering of when the original
     * PUBLISH packets were sent. The outgoingPublishPackets array is searched
     * through for the associated packet ID. If the application requires
     * increased efficiency in the look up of the packet ID, then a hashmap of
     * packetId key and PublishPacket_t values may be used instead. */
    packetIdToResend = MQTT_PublishToResend( pMqttContext, &cursor );

    while( packetIdToResend != MQTT_PACKET_ID_INVALID )
    {
        foundPacketId = false;

        for( index = 0U; index < MAX_OUTGOING_PUBLISHES; index++ )
        {
            if( outgoingPublishPackets[ index ].packetId == packetIdToResend )
            {
                foundPacketId = true;
                outgoingPublishPackets[ index ].pubInfo.dup = true;

                log_message("INFO",  "Sending duplicate PUBLISH with packet id %u",
                           outgoingPublishPackets[ index ].packetId  );
                mqttStatus = MQTT_Publish( pMqttContext,
                                           &outgoingPublishPackets[ index ].pubInfo,
                                           outgoingPublishPackets[ index ].packetId );

                if( mqttStatus != MQTTSuccess )
                {
                    log_message( "ERROR", "Sending duplicate PUBLISH for packet id %u "
                                " failed with status %s",
                                outgoingPublishPackets[ index ].packetId,
                                MQTT_Status_strerror( mqttStatus )  );
                    returnStatus = EXIT_FAILURE;
                    break;
                }
                else
                {
                    log_message( "INFO", "Sent duplicate PUBLISH successfully for packet id %u",
                               outgoingPublishPackets[ index ].packetId  );
                }
            }
        }

        if( foundPacketId == false )
        {
           log_message( "ERROR", "Packet id %u requires resend, but was not found in "
                        "outgoingPublishPackets",
                        packetIdToResend  );
            returnStatus = EXIT_FAILURE;
            break;
        }
        else
        {
            /* Get the next packetID to be resent. */
            packetIdToResend = MQTT_PublishToResend( pMqttContext, &cursor );
        }
    }

    return returnStatus;
}

/*-----------------------------------------------------------*/

static void handleIncomingPublish( MQTTContext_t * pMqttContext, MQTTPublishInfo_t * pPublishInfo,
                                   uint16_t packetIdentifier )
{
    assert( pPublishInfo != NULL );

    ( void ) packetIdentifier;

    /* Process incoming Publish. */
    log_message( "INFO", "Incoming QOS : %d", pPublishInfo->qos );

    /* Verify the received publish is for the topic we have subscribed to. */
    if( ( pPublishInfo->topicNameLength == g_subscribeTopic_length ) &&
        ( 0 == strncmp( g_subscribeTopic,
                        pPublishInfo->pTopicName,
                        pPublishInfo->topicNameLength ) ) )
    {
        /*log_message( "INFO", "Incoming Publish Topic Name: %.*s matches subscribed topic.\n"
                   "Incoming Publish message Packet Id is %u.\n"
                   "Incoming Publish Message : %.*s",
                   pPublishInfo->topicNameLength,
                   pPublishInfo->pTopicName,
                   packetIdentifier,
                   ( int ) pPublishInfo->payloadLength,
                   ( const char * ) pPublishInfo->pPayload  );
                   
		const char *topic = pPublishInfo->pTopicName;
		size_t topicLen = pPublishInfo->topicNameLength;
		char topicBuf[256];
		if (topicLen >= sizeof(topicBuf)) topicLen = sizeof(topicBuf)-1;
		memcpy(topicBuf, topic, topicLen); topicBuf[topicLen] = '\0';

		const char *payload = (const char*)pPublishInfo->pPayload;
		size_t payloadLen = pPublishInfo->payloadLength;

		char *payloadCopy = malloc(payloadLen+1);
		memcpy(payloadCopy, payload, payloadLen);
		payloadCopy[payloadLen] = '\0';

		if (strcmp(topicBuf, CREATE_CERT_ACCEPTED) == 0) {
			log_message("INFO", "Received CreateKeysAndCertificate: %s", payloadCopy);

			cJSON *root = cJSON_Parse(payloadCopy);
		if (root) {
	    		cJSON *cert = cJSON_GetObjectItem(root, "certificatePem");
	    		cJSON *keyPair = cJSON_GetObjectItem(root, "keyPair");
	    		cJSON *priv = keyPair ? cJSON_GetObjectItem(keyPair, "PrivateKey") : NULL;
	    		cJSON *ownership = cJSON_GetObjectItem(root, "certificateOwnershipToken");

	    		if (cert && priv && ownership) {
				save_file_secure("/tmp/new_cert.pem", cert->valuestring);
				save_file_secure("/tmp/new_key.key", priv->valuestring);
				save_file_secure("/tmp/ownership_token.txt", ownership->valuestring);
	    		}
	    		cJSON_Delete(root);
		}
		}
	else if (strstr(topicBuf, "provision/json/accepted")) {
		log_message("INFO", "Provisioning accepted: %s", payloadCopy);
		cJSON *root = cJSON_Parse(payloadCopy);
		if (root) {
	    	cJSON *cert = cJSON_GetObjectItem(root, "certificatePem");
	    	cJSON *priv = cJSON_GetObjectItem(root, "privateKey");
	    	if (cert && priv) {
			save_file_secure(DEVICE_CERT_PATH, cert->valuestring);
			save_file_secure(DEVICE_KEY_PATH, priv->valuestring);
	    	} else {
			char *tmpCert = read_file("/tmp/new_cert.pem");
			char *tmpKey = read_file("/tmp/new_key.key");
			if (tmpCert && tmpKey) {
		    		save_file_secure(DEVICE_CERT_PATH, tmpCert);
		    		save_file_secure(DEVICE_KEY_PATH, tmpKey);
			}
			free(tmpCert); 
			free(tmpKey);
	    	}
	    	cJSON_Delete(root);
		}
	}
	else if (strstr(topicBuf, "provision/json/rejected")) {
		log_message("ERROR", "Provisioning rejected: %s", payloadCopy);
	}
	free(payloadCopy);*/
	// --- inside your MQTT message callback ---
	const MQTTPublishInfo_t *pub = pPublishInfo;
	if (!pub || !pub->pPayload) return;

	char topic[256];
	snprintf(topic, sizeof(topic), "%.*s",
		 (int)pub->topicNameLength, pub->pTopicName);

	char rawMsg[2048];
	snprintf(rawMsg, sizeof(rawMsg), "%.*s",
		 (int)pub->payloadLength, (const char *)pub->pPayload);
	trim(rawMsg);

	log_message("INFO", "Received message topic=%s payload=%s", topic, rawMsg);

	/* ---- Step 1: Parse JSON from AWS IoT ---- */
	cJSON *root = cJSON_Parse(rawMsg);
	if (!root)
	{
	    log_message("ERROR", "Invalid JSON received: %s", rawMsg);
	    return;
	}

	cJSON *payloadItem = cJSON_GetObjectItemCaseSensitive(root, "payload");
	if (!cJSON_IsString(payloadItem) || payloadItem->valuestring == NULL)
	{
	    log_message("ERROR", "Missing or invalid 'payload' field");
	    cJSON_Delete(root);
	    return;
	}

	/* ---- Step 2: Extract the actual command payload ---- */
	const char *payloadStr = payloadItem->valuestring;
	log_message("INFO", "Inner command payload: %s", payloadStr);

	/* ---- Step 3: Tokenize CSV-style command ---- */
	ServerCommand cmd = {0};
	char payloadCopy[1024];
	strncpy(payloadCopy, payloadStr, sizeof(payloadCopy) - 1);

	char *saveptr = NULL;
	char *token = strtok_r(payloadCopy, ",", &saveptr);
	int index = 0;
	while (token && index < (2 + MAX_CMD_PARAMS))
	{
	    trim(token);
	    if (strcmp(token, "NA") != 0 && strlen(token) > 0)
	    {
		if (index == 0)
		    strncpy(cmd.notificationID, token, sizeof(cmd.notificationID) - 1);
		else if (index == 1)
		    strncpy(cmd.commandType, token, sizeof(cmd.commandType) - 1);
		else if (index >= 2)
		    strncpy(cmd.params[index - 2], token, sizeof(cmd.params[0]) - 1);
	    }
	    token = strtok_r(NULL, ",", &saveptr);
	    index++;
	}
	cmd.paramCount = (index > 2) ? (index - 2) : 0;

	log_message("INFO", "Parsed commandType=%s notificationID=%s paramCount=%d",
		    cmd.commandType, cmd.notificationID, cmd.paramCount);

	cJSON_Delete(root);

	/* ---- Step 4: Dispatch to handler ---- */
	handle_server_command(pMqttContext, &cmd);
    }
    else
    {
        log_message( "INFO", "Incoming Publish Topic Name: %.*s does not match subscribed topic",
                   pPublishInfo->topicNameLength,
                   pPublishInfo->pTopicName  );
    }
}

/*-----------------------------------------------------------*/

static void updateSubAckStatus( MQTTPacketInfo_t * pPacketInfo )
{
    uint8_t * pPayload = NULL;
    size_t pSize = 0;

    MQTTStatus_t mqttStatus = MQTT_GetSubAckStatusCodes( pPacketInfo, &pPayload, &pSize );

    /* MQTT_GetSubAckStatusCodes always returns success if called with packet info
     * from the event callback and non-NULL parameters. */
    assert( mqttStatus == MQTTSuccess );

    /* Suppress unused variable warning when asserts are disabled in build. */
    ( void ) mqttStatus;

    /* Demo only subscribes to one topic, so only one status code is returned. */
    globalSubAckStatus = ( MQTTSubAckStatus_t ) pPayload[ 0 ];
}

/*-----------------------------------------------------------*/

static int handleResubscribe( MQTTContext_t * pMqttContext )
{
    int returnStatus = EXIT_SUCCESS;
    MQTTStatus_t mqttStatus = MQTTSuccess;
    BackoffAlgorithmStatus_t backoffAlgStatus = BackoffAlgorithmSuccess;
    BackoffAlgorithmContext_t retryParams;
    uint16_t nextRetryBackOff = 0U;

    assert( pMqttContext != NULL );

    /* Initialize retry attempts and interval. */
    BackoffAlgorithm_InitializeParams( &retryParams,
                                       CONNECTION_RETRY_BACKOFF_BASE_MS,
                                       CONNECTION_RETRY_MAX_BACKOFF_DELAY_MS,
                                       CONNECTION_RETRY_MAX_ATTEMPTS );

    do
    {
        /* Send SUBSCRIBE packet.
         * Note: reusing the value specified in globalSubscribePacketIdentifier is acceptable here
         * because this function is entered only after the receipt of a SUBACK, at which point
         * its associated packet id is free to use. */
        mqttStatus = MQTT_Subscribe( pMqttContext,
                                     pGlobalSubscriptionList,
                                     sizeof( pGlobalSubscriptionList ) / sizeof( MQTTSubscribeInfo_t ),
                                     globalSubscribePacketIdentifier );

        if( mqttStatus != MQTTSuccess )
        {
            log_message( "ERROR", "Failed to send SUBSCRIBE packet to broker with error = %s",
                        MQTT_Status_strerror( mqttStatus )  );
            returnStatus = EXIT_FAILURE;
            break;
        }

        log_message( "INFO", "SUBSCRIBE sent for topic %.*s to broker",
                   g_subscribeTopic_length,
                   g_subscribeTopic  );

        /* Process incoming packet. */
        returnStatus = waitForPacketAck( pMqttContext,
                                         globalSubscribePacketIdentifier,
                                         MQTT_PROCESS_LOOP_TIMEOUT_MS );

        if( returnStatus == EXIT_FAILURE )
        {
            break;
        }

        /* Check if recent subscription request has been rejected. globalSubAckStatus is updated
         * in eventCallback to reflect the status of the SUBACK sent by the broker. It represents
         * either the QoS level granted by the server upon subscription, or acknowledgement of
         * server rejection of the subscription request. */
        if( globalSubAckStatus == MQTTSubAckFailure )
        {
            /* Generate a random number and get back-off value (in milliseconds) for the next re-subscribe attempt. */
            backoffAlgStatus = BackoffAlgorithm_GetNextBackoff( &retryParams, generateRandomNumber(), &nextRetryBackOff );

            if( backoffAlgStatus == BackoffAlgorithmRetriesExhausted )
            {
                log_message( "ERROR", "Server rejected subscription request, all attempts exhausted"  );
                returnStatus = EXIT_FAILURE;
            }
            else if( backoffAlgStatus == BackoffAlgorithmSuccess )
            {
                log_message( "DEBUG","Server rejected subscription request. Retrying "
                           "connection after %hu ms backoff",
                           ( unsigned short ) nextRetryBackOff  );
                Clock_SleepMs( nextRetryBackOff );
            }
        }
    } while( ( globalSubAckStatus == MQTTSubAckFailure ) && ( backoffAlgStatus == BackoffAlgorithmSuccess ) );

    return returnStatus;
}

/*-----------------------------------------------------------*/

static void eventCallback( MQTTContext_t * pMqttContext,
                           MQTTPacketInfo_t * pPacketInfo,
                           MQTTDeserializedInfo_t * pDeserializedInfo )
{
    uint16_t packetIdentifier;

    assert( pMqttContext != NULL );
    assert( pPacketInfo != NULL );
    assert( pDeserializedInfo != NULL );

    /* Suppress unused parameter warning when asserts are disabled in build. */
    ( void ) pMqttContext;

    packetIdentifier = pDeserializedInfo->packetIdentifier;

    /* Handle incoming publish. The lower 4 bits of the publish packet
     * type is used for the dup, QoS, and retain flags. Hence masking
     * out the lower bits to check if the packet is publish. */
    if( ( pPacketInfo->type & 0xF0U ) == MQTT_PACKET_TYPE_PUBLISH )
    {
        assert( pDeserializedInfo->pPublishInfo != NULL );
        /* Handle incoming publish. */
        handleIncomingPublish( pMqttContext, pDeserializedInfo->pPublishInfo, packetIdentifier );
    }
    else
    {
        /* Handle other packets. */
        switch( pPacketInfo->type )
        {
            case MQTT_PACKET_TYPE_SUBACK:

                /* A SUBACK from the broker, containing the server response to our subscription request, has been received.
                 * It contains the status code indicating server approval/rejection for the subscription to the single topic
                 * requested. The SUBACK will be parsed to obtain the status code, and this status code will be stored in global
                 * variable globalSubAckStatus. */
                updateSubAckStatus( pPacketInfo );

                /* Check status of the subscription request. If globalSubAckStatus does not indicate
                 * server refusal of the request (MQTTSubAckFailure), it contains the QoS level granted
                 * by the server, indicating a successful subscription attempt. */
                if( globalSubAckStatus != MQTTSubAckFailure )
                {
                    log_message("INFO",  "Subscribed to the topic %.*s. with maximum QoS %u",
                               g_subscribeTopic_length,
                               g_subscribeTopic,
                               globalSubAckStatus  );
                }

                /* Make sure ACK packet identifier matches with Request packet identifier. */
                assert( globalSubscribePacketIdentifier == packetIdentifier );

                /* Update the global ACK packet identifier. */
                globalAckPacketIdentifier = packetIdentifier;
                break;

            case MQTT_PACKET_TYPE_UNSUBACK:
                log_message( "INFO", "Unsubscribed from the topic %.*s",
                           g_subscribeTopic_length,
                           g_subscribeTopic  );
                /* Make sure ACK packet identifier matches with Request packet identifier. */
                assert( globalUnsubscribePacketIdentifier == packetIdentifier );

                /* Update the global ACK packet identifier. */
                globalAckPacketIdentifier = packetIdentifier;
                break;

            case MQTT_PACKET_TYPE_PINGRESP:

                /* Nothing to be done from application as library handles
                 * PINGRESP. */
                log_message( "DEBUG", "PINGRESP should not be handled by the application "
                           "callback when using MQTT_ProcessLoop"  );
                break;

            case MQTT_PACKET_TYPE_PUBREC:
                log_message( "INFO", "PUBREC received for packet id %u",
                           packetIdentifier  );
                /* Cleanup publish packet when a PUBREC is received. */
                cleanupOutgoingPublishWithPacketID( packetIdentifier );
                break;

            case MQTT_PACKET_TYPE_PUBREL:

                /* Nothing to be done from application as library handles
                 * PUBREL. */
                log_message( "INFO", "PUBREL received for packet id %u",
                           packetIdentifier  );
                break;

            case MQTT_PACKET_TYPE_PUBCOMP:

                /* Nothing to be done from application as library handles
                 * PUBCOMP. */
                log_message( "INFO", "PUBCOMP received for packet id %u",
                           packetIdentifier  );
                break;

	    case MQTT_PACKET_TYPE_PUBACK:
    		log_message("INFO", "PUBACK received (QoS1 acknowledgment).");
    		break;

    	case MQTT_PACKET_TYPE_DISCONNECT:
            log_message("INFO", "MQTT DISCONNECT from broker received. Forcing reconnect...");
            g_force_mqtt_reconnect = 1;
            break;

        /* Any other packet type is invalid. */
        default:
                log_message( "ERROR","Unknown packet type received:(%02x)",
                            pPacketInfo->type  );
        }

    }
}

/*-----------------------------------------------------------*/

//static int establishMqttSession( MQTTContext_t * pMqttContext,
//                                 bool createCleanSession,
//                                 bool * pSessionPresent, const char *imei )
//{
//    int returnStatus = EXIT_SUCCESS;
//    MQTTStatus_t mqttStatus;
//    MQTTConnectInfo_t connectInfo;
//    MQTTPublishInfo_t willInfo = { 0 };
    /* Establish MQTT session by sending a CONNECT packet. */

    /* If #createCleanSession is true, start with a clean session
     * i.e. direct the MQTT broker to discard any previous session data.
     * If #createCleanSession is false, directs the broker to attempt to
     * reestablish a session which was already present. */
//    connectInfo.cleanSession = createCleanSession;

    /* The client identifier is used to uniquely identify this MQTT client to
     * the MQTT broker. In a production device the identifier can be something
     * unique, such as a device serial number. */
//    connectInfo.pClientIdentifier = clientIdentifier;
//    connectInfo.clientIdentifierLength = (uint16_t)clientIdentifierLength;

    /* The maximum time interval in seconds which is allowed to elapse
     * between two Control Packets.
     * It is the responsibility of the Client to ensure that the interval between
     * Control Packets being sent does not exceed the this Keep Alive value. In the
     * absence of sending any other Control Packets, the Client MUST send a
     * PINGREQ Packet. */
//    pthread_mutex_lock(&mqtt_keepalive_mutex);     
//    connectInfo.keepAliveSeconds = g_mqtt_keepalive;
//    pthread_mutex_unlock(&mqtt_keepalive_mutex);

    /* Username and password for authentication. Not used in this demo. */
//    connectInfo.pUserName = NULL;
//    connectInfo.userNameLength = 0U;
//    connectInfo.pPassword = NULL;
//    connectInfo.passwordLength = 0U;

//    char strWillPayload[128];
//    snprintf(strWillPayload, sizeof(strWillPayload), "{\"A\":{\"a\":\"%s\",\"b\":\"0\"}}", imei);       
    /* Fill in Will structure */
//    willInfo.pTopicName = PUBLISH_TOPIC;
//    willInfo.topicNameLength = (uint16_t)strlen(PUBLISH_TOPIC);
//    willInfo.pPayload = strWillPayload;
//    willInfo.payloadLength = (uint16_t)strlen(strWillPayload);
//    willInfo.qos = MQTTQoS1;
    
    /* Send MQTT CONNECT packet to broker. */
//    mqttStatus = MQTT_Connect( pMqttContext, &connectInfo, &willInfo, CONNACK_RECV_TIMEOUT_MS, pSessionPresent );

//    if( mqttStatus != MQTTSuccess )
//    {
//        returnStatus = EXIT_FAILURE;
//       log_message( "ERROR", "Connection with MQTT broker failed with status %s",
//                    MQTT_Status_strerror( mqttStatus ) );
//    }
//    else
//    {
//        log_message(  "INFO","MQTT connection successfully established with broker"  );
//    }

//    return returnStatus;
//}

static int establishMqttSession( MQTTContext_t * pMqttContext,
                                 NetworkContext_t * pNetworkContext,
                                 bool createCleanSession,
                                 bool * pSessionPresent,
                                 const char * imei )
{
    int returnStatus = EXIT_SUCCESS;
    MQTTStatus_t mqttStatus;
    MQTTConnectInfo_t connectInfo = { 0 };
    MQTTPublishInfo_t willInfo = { 0 };
    char strWillPayload[256];

    /* --- 0. Basic sanity logs --- */
    log_message("INFO", "establishMqttSession() enter");
    log_message("INFO", "IMEI: %s", imei ? imei : "(null)");
    log_message("INFO", "Broker: %.*s:%d", get_broker_endpoint_length(), g_aws_server, BROKER_PORT);

    /* --- 1. Ensure previous disconnect or state cleanup --- */
    if( pMqttContext != NULL )
    {
        log_message("DEBUG", "pMqttContext->connectStatus = %d", pMqttContext->connectStatus);

        if( pMqttContext->connectStatus != MQTTNotConnected )
        {
            log_message("WARN", "Previous MQTT state not fully closed. Forcing disconnect before new connect.");
            ( void ) MQTT_Disconnect( pMqttContext );
            /* Close TLS connection */
            ( void ) Openssl_Disconnect( pNetworkContext );
            usleep( 500 * 1000 );  /* 500 ms delay */
        }
    }
    else
    {
        log_message("ERROR", "pMqttContext is NULL!");
        return EXIT_FAILURE;
    }

    /* --- 2. Prepare connection info --- */
    connectInfo.cleanSession = createCleanSession;

    /* defensive checks for clientIdentifier globals */
    if( clientIdentifier == NULL || clientIdentifierLength == 0 )
    {
        log_message("ERROR", "clientIdentifier not set (NULL or length 0).");
        return EXIT_FAILURE;
    }

    connectInfo.pClientIdentifier = clientIdentifier;
    connectInfo.clientIdentifierLength = (uint16_t) clientIdentifierLength;

    pthread_mutex_lock( &mqtt_keepalive_mutex );
    connectInfo.keepAliveSeconds = g_mqtt_keepalive;
    pthread_mutex_unlock( &mqtt_keepalive_mutex );

    connectInfo.pUserName = NULL;
    connectInfo.userNameLength = 0U;
    connectInfo.pPassword = NULL;
    connectInfo.passwordLength = 0U;

    log_message("INFO", "MQTT Connect parameters: ClientId='%.*s' (len=%u) CleanSession=%d KeepAlive=%u",
                (int)connectInfo.clientIdentifierLength,
                connectInfo.pClientIdentifier,
                connectInfo.clientIdentifierLength,
                connectInfo.cleanSession,
                connectInfo.keepAliveSeconds );

    /* --- 3. Build the Will payload --- */
    snprintf( strWillPayload, sizeof( strWillPayload ),
              "{\"A\":{\"a\":\"%s\",\"b\":\"0\"}}", imei ? imei : "" );

    willInfo.pTopicName = PUBLISH_TOPIC;
    willInfo.topicNameLength = (uint16_t) strlen( PUBLISH_TOPIC );
    willInfo.pPayload = strWillPayload;
    willInfo.payloadLength = (uint16_t) strlen( strWillPayload );
    willInfo.qos = MQTTQoS1;

    log_message("DEBUG", "Will topic='%.*s' len=%u Will payload='%s' len=%u QoS=%d",
                (int)willInfo.topicNameLength,
                willInfo.pTopicName,
                willInfo.topicNameLength,
                (char *)willInfo.pPayload,
                (unsigned) willInfo.payloadLength,
                (int) willInfo.qos );

    /* --- 4. Attempt connection --- */
    log_message( "INFO", "Calling MQTT_Connect() with CONNACK timeout=%u ms.",
                 CONNACK_RECV_TIMEOUT_MS );
pMqttContext->connectStatus = MQTTNotConnected;
    mqttStatus = MQTT_Connect( pMqttContext,
                               &connectInfo,
                               &willInfo,
                               CONNACK_RECV_TIMEOUT_MS,
                               pSessionPresent );

    /* --- 5. Very detailed logging on result --- */
    if( mqttStatus != MQTTSuccess )
    {
        log_message( "ERROR", "MQTT_Connect() returned status=%d (%s)",
                     (int) mqttStatus,
                     MQTT_Status_strerror( mqttStatus ) ? MQTT_Status_strerror( mqttStatus ) : "unknown" );

        /* If the pSessionPresent pointer was touched, log it (some stacks update it even on failure) */
        if( pSessionPresent != NULL )
        {
            log_message( "DEBUG", "pSessionPresent (after connect attempt) = %d", *pSessionPresent );
        }

        /* --- Best-effort: attempt to surface CONNACK reason code if your stack exposes it.
         * If your MQTT implementation provides a function to read the CONNACK return code
         * (for example: MQTT_GetConnackReturnCode or similar), enable USE_MQTT_CONNACK_API
         * and implement the wrapper below.
         */
#ifdef USE_MQTT_CONNACK_API
        {
            uint8_t connackCode = 0xFF;
            if( MQTT_GetConnackReturnCode( pMqttContext, &connackCode ) == 0 )
            {
                const char *reason = "Unknown";
                switch( connackCode )
                {
                    case 0: reason = "Connection Accepted"; break;
                    case 1: reason = "Connection Refused: unacceptable protocol version"; break;
                    case 2: reason = "Connection Refused: identifier rejected"; break;
                    case 3: reason = "Connection Refused: server unavailable"; break;
                    case 4: reason = "Connection Refused: bad user name or password"; break;
                    case 5: reason = "Connection Refused: not authorised"; break;
                }
                log_message("ERROR", "Broker CONNACK return code = %u (%s)", connackCode, reason);
            }
            else
            {
                log_message("DEBUG", "MQTT_GetConnackReturnCode() not available or returned error.");
            }
        }
#endif /* USE_MQTT_CONNACK_API */

        /* --- 6. Cleanup after failure --- */
        ( void ) MQTT_Disconnect( pMqttContext );        /* defensive */
        ( void ) Openssl_Disconnect( pNetworkContext );
        usleep( 1000 * 1000 );  /* 1 second backoff */

        returnStatus = EXIT_FAILURE;
    }
    else
    {
        /* Success path */
        log_message( "INFO", "MQTT connection successfully established with broker." );

        /* Log sessionPresent */
        if( pSessionPresent != NULL )
        {
            log_message( "INFO", "Broker sessionPresent = %d", *pSessionPresent );
        }
        else
        {
            log_message( "DEBUG", "pSessionPresent pointer was NULL; cannot report broker session present flag." );
        }

        /* Optionally: log negotiated keepalive, or schedule ping tasks here */
        /* Example: schedule keepalive / ping thread start (if your stack requires it) */

        returnStatus = EXIT_SUCCESS;
    }

    log_message("DEBUG", "establishMqttSession() exit => %d", returnStatus);
    return returnStatus;
}



/*-----------------------------------------------------------*/

static int disconnectMqttSession( MQTTContext_t * pMqttContext )
{
    MQTTStatus_t mqttStatus = MQTTSuccess;
    int returnStatus = EXIT_SUCCESS;

    assert( pMqttContext != NULL );

    /* Send DISCONNECT. */
    mqttStatus = MQTT_Disconnect( pMqttContext );

    if( mqttStatus != MQTTSuccess )
    {
        log_message( "ERROR", "Sending MQTT DISCONNECT failed with status=%s",
                    MQTT_Status_strerror( mqttStatus )  );
        returnStatus = EXIT_FAILURE;
    }

    return returnStatus;
}

/*-----------------------------------------------------------*/

static int subscribeToTopic( MQTTContext_t * pMqttContext )
{
    int returnStatus = EXIT_SUCCESS;
    MQTTStatus_t mqttStatus;

    assert( pMqttContext != NULL );

    /* Start with everything at 0. */
    ( void ) memset( ( void * ) pGlobalSubscriptionList, 0x00, sizeof( pGlobalSubscriptionList ) );

    /* This example subscribes to only one topic and uses QOS0. */
    pGlobalSubscriptionList[ 0 ].qos = MQTTQoS1;
    pGlobalSubscriptionList[ 0 ].pTopicFilter = g_subscribeTopic;
    pGlobalSubscriptionList[ 0 ].topicFilterLength = g_subscribeTopic_length;

    /* Generate packet identifier for the SUBSCRIBE packet. */
    globalSubscribePacketIdentifier = MQTT_GetPacketId( pMqttContext );

    /* Send SUBSCRIBE packet. */
    mqttStatus = MQTT_Subscribe( pMqttContext,
                                 pGlobalSubscriptionList,
                                 sizeof( pGlobalSubscriptionList ) / sizeof( MQTTSubscribeInfo_t ),
                                 globalSubscribePacketIdentifier );

    if( mqttStatus != MQTTSuccess )
    {
        log_message( "ERROR", "Failed to send SUBSCRIBE packet to broker with error = %s",
                    MQTT_Status_strerror( mqttStatus )  );
        returnStatus = EXIT_FAILURE;
    }
    else
    {
        log_message( "INFO", "SUBSCRIBE sent for topic %.*s to broker",
                   g_subscribeTopic_length,
                   g_subscribeTopic  );
    }

    return returnStatus;
}

/*-----------------------------------------------------------*/

static int unsubscribeFromTopic( MQTTContext_t * pMqttContext )
{
    int returnStatus = EXIT_SUCCESS;
    MQTTStatus_t mqttStatus;

    assert( pMqttContext != NULL );

    /* Start with everything at 0. */
    ( void ) memset( ( void * ) pGlobalSubscriptionList, 0x00, sizeof( pGlobalSubscriptionList ) );

    /* This example subscribes to and unsubscribes from only one topic
     * and uses QOS0. */
    pGlobalSubscriptionList[ 0 ].qos = MQTTQoS0;
    pGlobalSubscriptionList[ 0 ].pTopicFilter = g_subscribeTopic;
    pGlobalSubscriptionList[ 0 ].topicFilterLength = g_subscribeTopic_length;

    /* Generate packet identifier for the UNSUBSCRIBE packet. */
    globalUnsubscribePacketIdentifier = MQTT_GetPacketId( pMqttContext );

    /* Send UNSUBSCRIBE packet. */
    mqttStatus = MQTT_Unsubscribe( pMqttContext,
                                   pGlobalSubscriptionList,
                                   sizeof( pGlobalSubscriptionList ) / sizeof( MQTTSubscribeInfo_t ),
                                   globalUnsubscribePacketIdentifier );

    if( mqttStatus != MQTTSuccess )
    {
        log_message( "ERROR", "Failed to send UNSUBSCRIBE packet to broker with error = %s",
                    MQTT_Status_strerror( mqttStatus )  );
        returnStatus = EXIT_FAILURE;
    }
    else
    {
        log_message( "INFO", "UNSUBSCRIBE sent for topic %.*s to broker",
                   g_subscribeTopic_length,
                   g_subscribeTopic  );
    }

    return returnStatus;
}

/*-----------------------------------------------------------*/

static int publishToTopic( MQTTContext_t * pMqttContext )
{
    int returnStatus = EXIT_SUCCESS;
    MQTTStatus_t mqttStatus = MQTTSuccess;
    uint8_t publishIndex = MAX_OUTGOING_PUBLISHES;

    assert( pMqttContext != NULL );

    /* Get the next free index for the outgoing publish. All QoS0 outgoing
     * publishes are stored until a PUBREC is received. These messages are
     * stored for supporting a resend if a network connection is broken before
     * receiving a PUBREC. */
    returnStatus = getNextFreeIndexForOutgoingPublishes( &publishIndex );

    if( returnStatus == EXIT_FAILURE )
    {
        log_message( "ERROR", "Unable to find a free spot for outgoing PUBLISH message"  );
    }
    else
    {
        /* This example publishes to only one topic and uses QOS0. */
        outgoingPublishPackets[ publishIndex ].pubInfo.qos = MQTTQoS0;
        outgoingPublishPackets[ publishIndex ].pubInfo.pTopicName = PUBLISH_TOPIC;
        outgoingPublishPackets[ publishIndex ].pubInfo.topicNameLength = PUBLISH_TOPIC_LENGTH;
        outgoingPublishPackets[ publishIndex ].pubInfo.pPayload = MQTT_EXAMPLE_MESSAGE;
        outgoingPublishPackets[ publishIndex ].pubInfo.payloadLength = MQTT_EXAMPLE_MESSAGE_LENGTH;

        /* Get a new packet id. */
        outgoingPublishPackets[ publishIndex ].packetId = MQTT_GetPacketId( pMqttContext );

        /* Send PUBLISH packet. */
        mqttStatus = MQTT_Publish( pMqttContext,
                                   &outgoingPublishPackets[ publishIndex ].pubInfo,
                                   outgoingPublishPackets[ publishIndex ].packetId );

        if( mqttStatus != MQTTSuccess )
        {
           log_message( "ERROR", "Failed to send PUBLISH packet to broker with error = %s",
                        MQTT_Status_strerror( mqttStatus )  );
            cleanupOutgoingPublishAt( publishIndex );
            returnStatus = EXIT_FAILURE;
        }
        else
        {
            log_message( "INFO", "PUBLISH sent for topic %.*s to broker with packet ID %u",
                       PUBLISH_TOPIC_LENGTH,
                       PUBLISH_TOPIC,
                       outgoingPublishPackets[ publishIndex ].packetId  );
        }
    }

    return returnStatus;
}

/*-----------------------------------------------------------*/

static int initializeMqtt( MQTTContext_t * pMqttContext,
                           NetworkContext_t * pNetworkContext )
{
    int returnStatus = EXIT_SUCCESS;
    MQTTStatus_t mqttStatus;
    MQTTFixedBuffer_t networkBuffer;
    TransportInterface_t transport = { NULL };

    assert( pMqttContext != NULL );
    assert( pNetworkContext != NULL );

    /* Fill in TransportInterface send and receive function pointers.
     * For this demo, TCP sockets are used to send and receive data
     * from network. Network context is SSL context for OpenSSL.*/
    transport.pNetworkContext = pNetworkContext;
    transport.send = Openssl_Send;
    transport.recv = Openssl_Recv;
    transport.writev = NULL;

    /* Fill the values for network buffer. */
    networkBuffer.pBuffer = mqttRxBuffer;
    networkBuffer.size = sizeof(mqttRxBuffer);

    /* Initialize MQTT library. */
    mqttStatus = MQTT_Init( pMqttContext,
                            &transport,
                            Clock_GetTimeMs,
                            eventCallback,
                            &networkBuffer );

    if( mqttStatus != MQTTSuccess )
    {
        returnStatus = EXIT_FAILURE;
        log_message( "ERROR", "MQTT_Init failed: Status = %s", MQTT_Status_strerror( mqttStatus )  );
    }
    else
    {
        mqttStatus = MQTT_InitStatefulQoS( pMqttContext,
                                           pOutgoingPublishRecords,
                                           OUTGOING_PUBLISH_RECORD_LEN,
                                           pIncomingPublishRecords,
                                           INCOMING_PUBLISH_RECORD_LEN );

        if( mqttStatus != MQTTSuccess )
        {
            returnStatus = EXIT_FAILURE;
            log_message( "ERROR", "MQTT_InitStatefulQoS failed: Status = %s", MQTT_Status_strerror( mqttStatus )  );
        }
    }

    return returnStatus;
}

/*-----------------------------------------------------------*/

static int subscribePublishLoop( MQTTContext_t * pMqttContext )
{
	int returnStatus = EXIT_SUCCESS;
	MQTTStatus_t mqttStatus = MQTTSuccess;
	uint32_t publishCount = 0;
	const uint32_t maxPublishCount = MQTT_PUBLISH_COUNT_PER_LOOP;

	assert( pMqttContext != NULL );

	if( returnStatus == EXIT_SUCCESS )
	{
		log_message("INFO",  "Subscribing to the MQTT topic %s",g_subscribeTopic  );
		returnStatus = subscribeToTopic( pMqttContext );
	}

	if( returnStatus == EXIT_SUCCESS )
	{
		returnStatus = waitForPacketAck( pMqttContext,
		                         globalSubscribePacketIdentifier,
		                         MQTT_PROCESS_LOOP_TIMEOUT_MS );
	}
	if( ( returnStatus == EXIT_SUCCESS ) && ( globalSubAckStatus == MQTTSubAckFailure ) )
	{
		log_message("INFO",   "Server rejected initial subscription request. Attempting to re-subscribe to topic %.*s",
		   g_subscribeTopic_length,
		   g_subscribeTopic  );
		returnStatus = handleResubscribe( pMqttContext );
	}

	if( returnStatus == EXIT_SUCCESS )
	{
		for( publishCount = 0; publishCount < maxPublishCount; publishCount++ )
		{
	    		log_message("INFO",   "Sending Publish to the MQTT topic %.*s",
		       PUBLISH_TOPIC_LENGTH,
		       PUBLISH_TOPIC  );
	    		returnStatus = publishToTopic( pMqttContext );
	    		mqttStatus = processLoopWithTimeout( pMqttContext, MQTT_PROCESS_LOOP_TIMEOUT_MS );

	    		/* For any error in #MQTT_ProcessLoop, exit the loop and disconnect
	     		* from the broker. */
	    		if( ( mqttStatus != MQTTSuccess ) && ( mqttStatus != MQTTNeedMoreBytes ) )
	    		{
				log_message( "ERROR", "MQTT_ProcessLoop returned with status = %s",
		            		MQTT_Status_strerror( mqttStatus )  );
				returnStatus = EXIT_FAILURE;
				break;
	    		}

	    		log_message("INFO",   "Delay before continuing to next iteration"  );

	    		/* Leave connection idle for some time. */
	    		sleep( DELAY_BETWEEN_PUBLISHES_SECONDS );
		}
	}

	if( returnStatus == EXIT_SUCCESS )
	{
		/* Unsubscribe from the topic. */
		log_message("INFO",  "Unsubscribing from the MQTT topic %.*s",
		   g_subscribeTopic_length,
		   g_subscribeTopic  );
		returnStatus = unsubscribeFromTopic( pMqttContext );
	}

	if( returnStatus == EXIT_SUCCESS )
	{
		/* Process Incoming UNSUBACK packet from the broker. */
		returnStatus = waitForPacketAck( pMqttContext,
		                         globalUnsubscribePacketIdentifier,
		                         MQTT_PROCESS_LOOP_TIMEOUT_MS );
	}

	/* Send an MQTT Disconnect packet over the already connected TCP socket.
	* There is no corresponding response for the disconnect packet. After sending
	* disconnect, client must close the network connection. */
	log_message("INFO",   "Disconnecting the MQTT connection with %.*s",
	       get_broker_endpoint_length(),
	       g_aws_server  );

	if( returnStatus == EXIT_FAILURE )
	{
	/* Returned status is not used to update the local status as there
	 * were failures in demo execution. */
		( void ) disconnectMqttSession( pMqttContext );
	}
	else
	{
		returnStatus = disconnectMqttSession( pMqttContext );
	}

	/* Reset global SUBACK status variable after completion of subscription request cycle. */
	globalSubAckStatus = MQTTSubAckFailure;
	return returnStatus;
}

/*-----------------------------------------------------------*/

static int waitForPacketAck( MQTTContext_t * pMqttContext,
                             uint16_t usPacketIdentifier,
                             uint32_t ulTimeout )
{
	uint32_t ulMqttProcessLoopEntryTime;
	uint32_t ulMqttProcessLoopTimeoutTime;
	uint32_t ulCurrentTime;

	MQTTStatus_t eMqttStatus = MQTTSuccess;
	int returnStatus = EXIT_FAILURE;

	/* Reset the ACK packet identifier being received. */
	globalAckPacketIdentifier = 0U;

	ulCurrentTime = pMqttContext->getTime();
	ulMqttProcessLoopEntryTime = ulCurrentTime;
	ulMqttProcessLoopTimeoutTime = ulCurrentTime + ulTimeout;

	/* Call MQTT_ProcessLoop multiple times until the expected packet ACK
	* is received, a timeout happens, or MQTT_ProcessLoop fails. */
	while( ( globalAckPacketIdentifier != usPacketIdentifier ) &&
	   ( ulCurrentTime < ulMqttProcessLoopTimeoutTime ) &&
	   ( eMqttStatus == MQTTSuccess || eMqttStatus == MQTTNeedMoreBytes ) )
	{
		/* Event callback will set #globalAckPacketIdentifier when receiving
	 	* appropriate packet. */
		eMqttStatus = MQTT_ProcessLoop( pMqttContext );
		ulCurrentTime = pMqttContext->getTime();
	}

	if( ( ( eMqttStatus != MQTTSuccess ) && ( eMqttStatus != MQTTNeedMoreBytes ) ) ||
	( globalAckPacketIdentifier != usPacketIdentifier ) )
	{
		log_message( "ERROR", "MQTT_ProcessLoop failed to receive ACK packet: Expected ACK Packet ID=%02X, LoopDuration=%u, Status=%s",
		    usPacketIdentifier,
		    ( ulCurrentTime - ulMqttProcessLoopEntryTime ),
		    MQTT_Status_strerror( eMqttStatus )  );
	}
	else
	{
		returnStatus = EXIT_SUCCESS;
	}

	return returnStatus;
}

/*-----------------------------------------------------------*/

static MQTTStatus_t processLoopWithTimeout( MQTTContext_t * pMqttContext,
                                            uint32_t ulTimeoutMs )
{
	uint32_t ulMqttProcessLoopTimeoutTime;
	uint32_t ulCurrentTime;

	MQTTStatus_t eMqttStatus = MQTTSuccess;

	ulCurrentTime = pMqttContext->getTime();
	ulMqttProcessLoopTimeoutTime = ulCurrentTime + ulTimeoutMs;

	/* Call MQTT_ProcessLoop multiple times a timeout happens, or
	* MQTT_ProcessLoop fails. */
	while( ( ulCurrentTime < ulMqttProcessLoopTimeoutTime ) &&
	   ( eMqttStatus == MQTTSuccess || eMqttStatus == MQTTNeedMoreBytes ) )
	{
		eMqttStatus = MQTT_ProcessLoop( pMqttContext );
		ulCurrentTime = pMqttContext->getTime();
	}
	return eMqttStatus;
}
static long long now_ms()
{
    struct timeval tv;
    gettimeofday(&tv, NULL);
    return (long long)tv.tv_sec * 1000 + tv.tv_usec / 1000;
}
//Monitor for interface Changes
/*void *thread_interface_monitor(void *arg)
{
    ThreadArgs *args = (ThreadArgs *)arg;
    int sock = socket(AF_NETLINK, SOCK_RAW, NETLINK_ROUTE);
    if (sock < 0) return NULL;

    struct sockaddr_nl sa = {
        .nl_family = AF_NETLINK,
        .nl_groups = RTMGRP_LINK | RTMGRP_IPV4_IFADDR | RTMGRP_IPV6_IFADDR
    };
    bind(sock, (struct sockaddr *)&sa, sizeof(sa));

    char buf[8192];
    // We remove the global last_sent and use state->last_event_time instead

    while (1) {
        ssize_t len = recv(sock, buf, sizeof(buf), 0);
        if (len <= 0) continue;

        for (struct nlmsghdr *nh = (struct nlmsghdr *)buf; NLMSG_OK(nh, len); nh = NLMSG_NEXT(nh, len)) {
            if (nh->nlmsg_type == NLMSG_DONE) break;

            if (nh->nlmsg_type != RTM_NEWLINK && nh->nlmsg_type != RTM_DELLINK &&
                nh->nlmsg_type != RTM_NEWADDR && nh->nlmsg_type != RTM_DELADDR)
                continue;

            int if_index = (nh->nlmsg_type == RTM_NEWADDR || nh->nlmsg_type == RTM_DELADDR) ?
                           ((struct ifaddrmsg *)NLMSG_DATA(nh))->ifa_index :
                           ((struct ifinfomsg *)NLMSG_DATA(nh))->ifi_index;

            char ifname[IF_NAMESIZE];
            if_indextoname(if_index, ifname);

            InterfaceState *state = NULL;
            for (int i = 0; i < TRACKED_COUNT; i++) {
                if (strcmp(ifname, tracked_ifs[i].name) == 0) {
                    state = &tracked_ifs[i];
                    break;
                }
            }
            if (!state) continue;

            int should_fire = 0;
            long long now = now_ms();

            if (nh->nlmsg_type == RTM_NEWADDR || nh->nlmsg_type == RTM_DELADDR) {
                struct ifaddrmsg *ifa = (struct ifaddrmsg *)NLMSG_DATA(nh);
                struct rtattr *rta = (struct rtattr *)IFA_RTA(ifa);
                int rta_len = IFA_PAYLOAD(nh);
                char current_ip[INET6_ADDRSTRLEN];
                memset(current_ip, 0, INET6_ADDRSTRLEN);

                for (; RTA_OK(rta, rta_len); rta = RTA_NEXT(rta, rta_len)) {
                    if (rta->rta_type == IFA_LOCAL || rta->rta_type == IFA_ADDRESS) {
                        inet_ntop(ifa->ifa_family, RTA_DATA(rta), current_ip, INET6_ADDRSTRLEN);
                    }
                }

                if (nh->nlmsg_type == RTM_DELADDR) {
                    if (state->last_flags & IFF_RUNNING) {
                        should_fire = 1;
                        memset(state->last_ip, 0, sizeof(state->last_ip));
                    }
                } else { // NEWADDR
                    // If IP is different, we want to fire
                    if (strlen(current_ip) > 0 && strcmp(current_ip, state->last_ip) != 0) {
                        should_fire = 1;
                        strncpy(state->last_ip, current_ip, sizeof(state->last_ip) - 1);
                    }
                }
            } else {
                struct ifinfomsg *ifi = NLMSG_DATA(nh);
                unsigned int current_flags = ifi->ifi_flags & (IFF_UP | IFF_RUNNING | IFF_LOWER_UP);
                if (current_flags != state->last_flags) {
                    should_fire = 1;
                    state->last_flags = current_flags;
                }
            }

            // PER-INTERFACE DEBOUNCE
            // If this specific interface fired in the last 10 seconds, ignore follow-up noise
            if (should_fire) {
                if (now - state->last_event_time < 10000) {
                    should_fire = 0; 
                }
            }

            if (should_fire && mqtt_connected) {
                log_message("INFO", "Interface change detected on %s (Type: %d)", ifname, nh->nlmsg_type);
                state->last_event_time = now; // Update the timer for this specific interface
                buildStatusJson(args->mqttContext, args->imei, args->topic);
            }
        }
    }
    close(sock);
    return NULL;
}*/

bool is_tracked_interface(const char *ifname) {
    if (ifname == NULL) return false;

    // 1. Check for Physical WAN
    if (strcmp(ifname, "eth1") == 0) {
        return true;
    }

    // 2. Check for Cellular (Modem)
    if (strncmp(ifname, "qmimux", 6) == 0 || strncmp(ifname, "wwan", 4) == 0) {
        return true;
    }

    // 3. Track WAN aliases or VLANs if used
    if (strcmp(ifname, "wan") == 0 || strcmp(ifname, "mob1s1a1") == 0) {
        return true;
    }

    return false;
}

void *thread_interface_monitor(void *arg) {
    ThreadArgs *args = (ThreadArgs *)arg;
    
    /* --- 1. SETUP NETLINK (For WAN, Cellular, VPN) --- */
    int nl_sock = socket(AF_NETLINK, SOCK_RAW, NETLINK_ROUTE);
    if (nl_sock < 0) {
        log_message("ERROR", "Netlink socket failed");
        return NULL;
    }

    struct sockaddr_nl sa = { 
        .nl_family = AF_NETLINK, 
        .nl_groups = RTMGRP_LINK 
    };
    
    if (bind(nl_sock, (struct sockaddr *)&sa, sizeof(sa)) < 0) {
        log_message("ERROR", "Netlink bind failed");
        close(nl_sock);
        return NULL;
    }

    /* --- 2. SETUP UBUS (For Physical LAN Ports & WiFi) --- */
    // ubus listen catches Switch link events and WiFi associations instantly
    FILE *ubus_ptr = popen("ubus listen", "r");
    if (!ubus_ptr) {
        log_message("ERROR", "ubus listen failed");
        close(nl_sock);
        return NULL;
    }
    int ubus_fd = fileno(ubus_ptr);

    /* --- 3. POLL LOOP SETUP --- */
    struct pollfd fds[2];
    fds[0].fd = nl_sock;
    fds[0].events = POLLIN;
    fds[1].fd = ubus_fd;
    fds[1].events = POLLIN;

    long long last_fire_time = 0;
    char nl_buf[8192];

    log_message("INFO", "Master Monitor started (Netlink + ubus)");

    while (1) {
        // Block indefinitely until an event occurs
        int ret = poll(fds, 2, -1); 
        if (ret <= 0) continue;

        bool trigger_json = false;

        /* --- 4. HANDLE NETLINK EVENTS (WAN/CELL) --- */
        if (fds[0].revents & POLLIN) {
            ssize_t len = recv(nl_sock, nl_buf, sizeof(nl_buf), 0);
            for (struct nlmsghdr *nh = (struct nlmsghdr *)nl_buf; NLMSG_OK(nh, len); nh = NLMSG_NEXT(nh, len)) {
                if (nh->nlmsg_type == NLMSG_DONE) break;
                if (nh->nlmsg_type == NLMSG_ERROR) continue;

                if (nh->nlmsg_type == RTM_NEWLINK || nh->nlmsg_type == RTM_DELLINK) {
                    struct ifinfomsg *ifi = (struct ifinfomsg *)NLMSG_DATA(nh);
                    char ifname[IF_NAMESIZE] = {0};
                    
                    if (if_indextoname(ifi->ifi_index, ifname)) {
                        if (is_tracked_interface(ifname)) {
                            log_message("INFO", "Netlink Event: %s changed state", ifname);
                            trigger_json = true;
                        }
                    }
                }
            }
        }

        /* --- 5. HANDLE UBUS EVENTS (LAN/WIFI) --- */
        if (fds[1].revents & POLLIN) {
            char ubus_line[1024];
            if (fgets(ubus_line, sizeof(ubus_line), ubus_ptr)) {
                // Any line from 'ubus listen' indicates a subsystem event
                // specifically Switch link or hostapd (WiFi) on RUTX
                if (strstr(ubus_line, "link state") || strstr(ubus_line, "associated")) {
                    log_message("INFO", "ubus Event: Physical LAN/WiFi change detected");
                    trigger_json = true;
                }
            }
        }
        /* --- 6. RATE LIMIT & STABILIZE --- */
        long long now = now_ms();
        if (trigger_json && (now - last_fire_time > 5000)) {
            if (mqtt_connected) { 
                sleep(3);              
                log_message("INFO", "Rebuilding status JSON");
                buildStatusJson(args->mqttContext, args->imei, args->topic);               
                last_fire_time = now_ms(); 
            }
        }
    }

    pclose(ubus_ptr);
    close(nl_sock);
    return NULL;
}

void get_wifi_fingerprint(char *output, size_t size) {
    FILE *fp_iface, *fp_stat;
    char iface[32];
    char line[256];
    char station_list[MAX_STATIONS][ENTRY_LEN]; // Renamed for clarity
    int count = 0;

    memset(output, 0, size);

    // Get all active wireless interfaces
    fp_iface = popen("iw dev | awk '/Interface/ {print $2}'", "r");
    if (!fp_iface) return;

    while (fgets(iface, sizeof(iface), fp_iface) && count < MAX_STATIONS) {
        iface[strcspn(iface, "\n")] = 0; 

        char cmd[128];
        // We grab the MAC, but we will pair it with the interface name below
        snprintf(cmd, sizeof(cmd), "iw dev %s station dump | grep Station | awk '{print $2}'", iface);
        
        fp_stat = popen(cmd, "r");
        if (fp_stat) {
            while (fgets(line, sizeof(line), fp_stat) && count < MAX_STATIONS) {
                line[strcspn(line, "\n")] = 0;
                if (strlen(line) >= 17) {
                    //Include the interface name in the fingerprint entry
                    snprintf(station_list[count], ENTRY_LEN, "%s:%s", iface, line);
                    count++;
                }
            }
            pclose(fp_stat);
        }
    }
    pclose(fp_iface);

    // Sort the interface:MAC strings
    for (int i = 0; i < count - 1; i++) {
        for (int j = i + 1; j < count; j++) {
            if (strcmp(station_list[i], station_list[j]) > 0) {
                char temp[ENTRY_LEN];
                strcpy(temp, station_list[i]);
                strcpy(station_list[i], station_list[j]);
                strcpy(station_list[j], temp);
            }
        }
    }

    // Generate final fingerprint string
    for (int i = 0; i < count; i++) {
        strncat(output, station_list[i], size - strlen(output) - 1);
        strncat(output, "|", size - strlen(output) - 1); // Add a separator for safety
    }
}

void *thread_wifi_monitor(void *arg) {

    ThreadArgs *args = (ThreadArgs *)arg;
    MQTTContext_t *mqttContext = args->mqttContext;
    const char *imei = args->imei;
    const char *topic = args->topic;
    char current_fingerprint[FINGERPRINT_SIZE];

    while (1) {
        FILE *fp = popen("iw event -t", "r");
        if (!fp) {
            log_message("ERROR", "Failed to start iw event monitor");
            sleep(10);
            continue;
        }

        log_message("INFO", "Wi-Fi event monitor started using iw");

        int fd = fileno(fp);
        char line[512];

        while (1) {
            fd_set rfds;
            FD_ZERO(&rfds);
            FD_SET(fd, &rfds);

            struct timeval tv = {60, 0};  // 1-minute timeout
            int ret = select(fd + 1, &rfds, NULL, NULL, &tv);

            if (ret > 0 && FD_ISSET(fd, &rfds)) {
                if (!fgets(line, sizeof(line), fp)) break;

                if (strstr(line, "new station") || strstr(line, "del station")) {
                    
                    sleep(3); 

                    // Get current state signature
                    get_wifi_fingerprint(current_fingerprint, sizeof(current_fingerprint));

                    // Compare with last sent state
                    if (strcmp(current_fingerprint, last_mac_fingerprint) != 0) {
                        log_message("INFO", "Network state changed. Publishing update.");
                        
                        if (mqtt_connected) {
                            buildWifiHostsJson(mqttContext, imei, topic);
                            
                            // Update the saved state
                            strncpy(last_mac_fingerprint, current_fingerprint, FINGERPRINT_SIZE - 1);
                        }
                    } else {
                        log_message("INFO", "Duplicate event ignored (Fingerprint unchanged).");
                    }
                }
            }
	    else if (ret == 0) {
                // Timeout: 
                continue;
            } else {
                break;  // select() error, restart iw
            }            
        }
        pclose(fp);
        sleep(5);
    }
    return NULL;
}


//Ethernet host change event handler
void *thread_ethernet_monitor(void *arg)
{
    ThreadArgs *args = (ThreadArgs *)arg;
    char line[1024];
    
    // open a persistent pipe to ubus listen
    FILE *fp = popen("ubus listen", "r");
    if (!fp) {
        log_message("ERROR", "Failed to start ubus listener");
        return NULL;
    }

    log_message("INFO", "Ethernet monitor started (ubus mode)");

    while (fgets(line, sizeof(line), fp)) {
        //  "Port link state" in the event
        if (strstr(line, "Port link state") != NULL) {
            
            log_message("INFO", "Physical link change detected, waiting for network stability...");
            sleep(5);             
            buildEthernetHostsJson(args->mqttContext, args->imei, args->topic);
        }
    }

    pclose(fp);
    return NULL;
}

static void ubus_event_handler(struct ubus_context *ctx, struct ubus_event_handler *ev,
                              const char *type, struct blob_attr *msg) {
    char *json = blobmsg_format_json(msg, true);
    if (!json) return;

    // Matches: "Switch Events: Port link state..."
    if (strcasestr(json, "link state")) {
        log_message("DEBUG", "ubus: Ethernet Link event detected");
        g_triggers.status = true;
        g_triggers.ethernet = true;
    } 

    // Matches: "WiFi client connected" or "WiFi client disconnected"
    else if (strcasestr(json, "WiFi client") || strcasestr(json, "\"sender\":\"WiFi\"")) {
        log_message("DEBUG", "ubus: WiFi Client event detected");
        g_triggers.status = true;
        g_triggers.wifi = true;
    }

    free(json);
}

void *thread_universal_monitor(void *arg) {
    ThreadArgs *args = (ThreadArgs *)arg;
    char last_wifi_fingerprint[FINGERPRINT_SIZE] = {0};
    char current_wifi_fingerprint[FINGERPRINT_SIZE] = {0};

    /* --- SETUP NETLINK (WAN / CELLULAR) --- */
    int nl_sock = socket(AF_NETLINK, SOCK_RAW, NETLINK_ROUTE);
    struct sockaddr_nl sa = { .nl_family = AF_NETLINK, .nl_groups = RTMGRP_LINK };
    bind(nl_sock, (struct sockaddr *)&sa, sizeof(sa));

    /* --- SETUP NATIVE UBUS --- */
    struct ubus_context *u_ctx = ubus_connect(NULL);
    if (!u_ctx) {
        log_message("ERROR", "Failed to connect to ubus");
        close(nl_sock);
        return NULL;
    }

    // Register to listen for all events ("*")
    static struct ubus_event_handler ev_handler = { .cb = ubus_event_handler };
    ubus_register_event_handler(u_ctx, &ev_handler, "*");

    /* --- POLL LOOP --- */
    struct pollfd fds[2];
    fds[0].fd = nl_sock;
    fds[0].events = POLLIN;
    fds[1].fd = u_ctx->sock.fd; // Native ubus socket FD
    fds[1].events = POLLIN;

    long long last_fire_time = 0;

    log_message("INFO", "Universal Event Monitor started (libubus)");

    while (1) {
        int ret = poll(fds, 2, -1); // Block until event
        if (ret <= 0) continue;

        /* Check Netlink (Requirement: WAN/Cell -> Status) */
        if (fds[0].revents & POLLIN) {
            char nl_buf[4096];
            ssize_t len = recv(nl_sock, nl_buf, sizeof(nl_buf), 0);
            for (struct nlmsghdr *nh = (struct nlmsghdr *)nl_buf; NLMSG_OK(nh, len); nh = NLMSG_NEXT(nh, len)) {
                if (nh->nlmsg_type == RTM_NEWLINK || nh->nlmsg_type == RTM_DELLINK) {
                    struct ifinfomsg *ifi = (struct ifinfomsg *)NLMSG_DATA(nh);
                    char ifname[IF_NAMESIZE];
                    if (if_indextoname(ifi->ifi_index, ifname)) {
                        if (is_tracked_interface(ifname)) {
                            log_message("INFO", "Netlink: WAN/Cell interface %s changed", ifname);
                            g_triggers.status = true;
                        }
                    }
                }
            }
        }

        /* Check Native ubus */
        if (fds[1].revents & POLLIN) {
            // This invokes ubus_event_handler and sets g_triggers
            ubus_handle_event(u_ctx);
        }

        /* --- EXECUTION LOGIC --- */
        long long now = now_ms();
        bool any_trigger = (g_triggers.status || g_triggers.ethernet || g_triggers.wifi);

        if (any_trigger && (now - last_fire_time > 5000)) {
            
            // For WiFi, we use your fingerprint logic to filter out noise
            if (g_triggers.wifi) {
                get_wifi_fingerprint(current_wifi_fingerprint, sizeof(current_wifi_fingerprint));
                if (strcmp(current_wifi_fingerprint, last_wifi_fingerprint) == 0) {
                    // False alarm: fingerprint didn't actually change
                    g_triggers.wifi = false; 
                } else {
                    strncpy(last_wifi_fingerprint, current_wifi_fingerprint, FINGERPRINT_SIZE - 1);
                }
            }

            // If we still have triggers, send the data
            if (g_triggers.status || g_triggers.ethernet || g_triggers.wifi) {
                
                // Allow DHCP/ARP tables to settle
                sleep(5); 

                if (mqtt_connected) {
                    log_message("INFO", "Publishing event-based updates...");
                    
                    if (g_triggers.status)   buildStatusJson(args->mqttContext, args->imei, args->topic);
                    if (g_triggers.ethernet) {
                    	usleep(50000);
                    	buildEthernetHostsJson(args->mqttContext, args->imei, args->topic);
                    }
                    if (g_triggers.wifi){
                    	usleep(50000);     
                    	buildWifiHostsJson(args->mqttContext, args->imei, args->topic);
                    }
                    
                    last_fire_time = now_ms();
                }
            }
            
            // Reset flags for the next event
            memset(&g_triggers, 0, sizeof(TriggerFlags_t));
        }
    }

    ubus_free(u_ctx);
    close(nl_sock);
    return NULL;
}


//Periodic Checkin publisher
void *checkin_publisher(void *arg)
{
    ThreadArgs *args = (ThreadArgs *)arg;
    MQTTContext_t *mqttContext = args->mqttContext;
    const char *imei = args->imei;
    const char *topic = args->topic;

    time_t last_checkin = 0;

    while (1)
    {
        if (mqtt_connected)
        {
            time_t now = time(NULL);
            if (difftime(now, last_checkin) >= g_checkin_interval)
            {
                log_message("INFO", "Periodic check-in triggered.");
                buildDataUsageJson(mqttContext, imei, topic);//I Object
                buildGJson(mqttContext, imei, topic);
                buildWifiHostsJson(mqttContext, imei, topic);//D Object
                buildEthernetHostsJson(mqttContext, imei, topic);//T Object
                buildNJson(mqttContext, imei, topic);
                buildOJson(mqttContext, imei, topic);
                buildPJson(mqttContext, imei, topic);
                last_checkin = now;
            }
        }
        sleep(5); // check every few seconds instead of 30 min
    }
    return NULL;
}

//Periodic Data Usage Astound publisher
void *astd_publisher(void *arg)
{
    ThreadArgs *args = (ThreadArgs *)arg;
    MQTTContext_t *mqttContext = args->mqttContext;
    const char *imei = args->imei;
    const char *topic = args->topic;

    time_t nextAstoundDataSend = 0; 
    log_message("INFO", "astd_publisher thread successfully started.");

    while (1)
    {
        if (mqtt_connected)
        {
            time_t curTime = time(NULL);
            if (curTime >= nextAstoundDataSend)
            {
            	char wwanIntfCheckAst[10] = {0};                
                // Check current default interface routing
                execute_system_command("route | grep 'default' | cut -d: -f2 | awk '{ print $8}' | head -1", wwanIntfCheckAst, sizeof(wwanIntfCheckAst));                                
                wwanIntfCheckAst[strcspn(wwanIntfCheckAst, "\n")] = 0;
                
		if (strcmp(wwanIntfCheckAst, "wwan0") == 0 || strstr(wwanIntfCheckAst, "qmimu") != NULL)
                {
                	buildDataUsageJson(mqttContext, imei, topic);//I Object
                    	log_message("INFO", "Periodic Astound data usage payload published.");
                }
		// Compute the next dynamic dynamic interval from UCI config
                char astDataTrInt[LOG_BUF_SZ] = {0};
                execute_system_command("uci -q get system.astound.data_update_interval", astDataTrInt, sizeof(astDataTrInt));
                astDataTrInt[strcspn(astDataTrInt, "\n")] = 0;                
                int config_interval = atoi(astDataTrInt);
                if (config_interval <= 300 || strcmp(astDataTrInt, "") == 0) {
                    nextAstoundDataSend = curTime + 300;
                }
                else {		
                    nextAstoundDataSend = curTime + config_interval;
                }                                                
            }
        }
        sleep(5); // check every few seconds
    }
    return NULL;
}

void load_mqtt_config(void)
{
    if (!mqtt_config_exists())
    {
        log_message("INFO", "MQTT config file not found — using defaults.");

        pthread_mutex_lock(&mqtt_keepalive_mutex);
        g_mqtt_keepalive = MQTT_KEEP_ALIVE_INTERVAL_SECONDS;
        pthread_mutex_unlock(&mqtt_keepalive_mutex);

        pthread_mutex_lock(&checkin_mutex);
        g_checkin_interval = DEFAULT_CHECKIN;
        pthread_mutex_unlock(&checkin_mutex);

        strncpy(g_aws_server, BROKER_ENDPOINT, sizeof(g_aws_server) - 1);
        strncpy(g_aws_template, PROVISION_TEMPLATE_NAME, sizeof(g_aws_template) - 1);
        return;
    }

    int keepalive = uci_get_int("mqtt.@mqtt[0].keepalive", MQTT_KEEP_ALIVE_INTERVAL_SECONDS);
    int checkin   = uci_get_int("mqtt.@mqtt[0].checkininterval", DEFAULT_CHECKIN);

    pthread_mutex_lock(&mqtt_keepalive_mutex);
    g_mqtt_keepalive = keepalive;
    pthread_mutex_unlock(&mqtt_keepalive_mutex);

    pthread_mutex_lock(&checkin_mutex);
    g_checkin_interval = checkin;
    pthread_mutex_unlock(&checkin_mutex);

    uci_get_string("mqtt.@mqtt[0].serverip", g_aws_server, sizeof(g_aws_server), BROKER_ENDPOINT);
    uci_get_string("mqtt.@mqtt[0].template", g_aws_template, sizeof(g_aws_template), PROVISION_TEMPLATE_NAME);

    log_message("INFO", "Loaded MQTT config: keepalive=%d sec, checkin=%d sec", keepalive, checkin);
    log_message("INFO", "MQTT server: %s", g_aws_server);
    log_message("INFO", "Provision template: %s", g_aws_template);
}


/*-----------------------------------------------------------*/

int main(int argc, char **argv)
{
    	char imei[64] = { 0 };
    	get_device_imei(imei, sizeof(imei));
    	log_message("INFO", "IMEI:%s", imei);

    	if (strlen(imei) > 10)
    	{
        	snprintf(g_publishTopic, sizeof(g_publishTopic), "%s%s", PUBLISH_TOPIC_BASE, imei);
        	g_publishTopic_length = (uint16_t)strlen(g_publishTopic);
        	log_message("INFO", "Publish topic (Command-Response) = %s", g_publishTopic);
        	snprintf(g_subscribeTopic, sizeof(g_subscribeTopic), "%s%s", SUBSCRIBE_TOPIC_BASE, imei);
        	g_subscribeTopic_length = (uint16_t)strlen(g_subscribeTopic);
        	log_message("INFO", "Subscribe topic = %s", g_subscribeTopic);        	
    	}
    	else
    	{
        	log_message("ERROR", "Failed to get IMEI. Exiting.");
        	return EXIT_FAILURE;
    	}
    	// Build and log client ID
    	buildClientIdentifier();
    	log_message("INFO", "MQTT Client ID = %s", clientIdentifier);
    
    	int returnStatus = EXIT_SUCCESS;
    	MQTTContext_t mqttContext = { 0 };
    	NetworkContext_t networkContext = { 0 };
    	OpensslParams_t opensslParams = { 0 };
    	bool clientSessionPresent = false, brokerSessionPresent = false;

    	networkContext.pParams = &opensslParams;

    	struct timespec tp;
    	(void)clock_gettime(CLOCK_REALTIME, &tp);
    	srand(tp.tv_nsec);

    	char serial[64] = {0};
    	get_device_serial(serial, sizeof(serial));
    	log_message("INFO",  "Device Serial=%s", serial);

	//Load /etc/config/mqtt if exists
	load_mqtt_config();
	//Restore certs from /log if not present in /overlay
	restore_certs_from_log();
	/* Check if device cert already exists */
	if (access(DEVICE_CERT_PATH, R_OK) != 0 || access(DEVICE_KEY_PATH, R_OK) != 0) {
		int returnStatusProv = EXIT_SUCCESS;
		MQTTContext_t mqttContextProv = { 0 };
    		NetworkContext_t networkContextProv = { 0 };
    		OpensslParams_t opensslParamsProv = { 0 };
    		bool clientSessionPresentProv = false, brokerSessionPresentProv = false;
    		networkContextProv.pParams = &opensslParamsProv;
    		/* Initialize MQTT library for usual communication*/
    		returnStatusProv = initializeMqttProv(&mqttContextProv, &networkContextProv);
    		if (returnStatusProv != EXIT_SUCCESS)
    		{
        		log_message("ERROR", "MQTT init failed.");
        		return returnStatusProv;
    		}
    		log_message("INFO", "No device cert/key found, starting provisioning with claim cert...");
        	/* Connect (with retries) */
        	returnStatusProv = connectToServerWithBackoffRetriesProvision(&networkContextProv, &mqttContextProv, &clientSessionPresentProv, &brokerSessionPresentProv);
        	if (returnStatusProv == EXIT_FAILURE)
        	{
            		log_message("ERROR", "Failed to connect with claim certs");
        		return EXIT_FAILURE;
        	}
    		/* Subscribe to cert + provision topics */
    		mqtt_subscribe_topic(&mqttContextProv,CREATE_CERT_ACCEPTED, MQTTQoS1);    		
    		mqtt_subscribe_topic(&mqttContextProv,CREATE_CERT_REJECTED, MQTTQoS1);
		Clock_SleepMs(100); 
    		/* Publish CreateKeysAndCertificate */
    		publish_create_certificate_request(&mqttContextProv);
    		
    		/* Wait for ownership_token.txt to appear, then publish RegisterThing */
    		char *token = NULL;
    		const uint32_t timeoutMs = 200;  //200 ms   		
    		for (int i=0; i<10; i++) {
        		MQTTStatus_t mqttStatus = processLoopWithTimeout(&mqttContextProv, timeoutMs);
        		if (mqttStatus != MQTTSuccess && mqttStatus != MQTTNeedMoreBytes)
			{
    				log_message("ERROR", "MQTT_ProcessLoop returned error=%d (%s)", mqttStatus, MQTT_Status_strerror(mqttStatus));
			}
        		token = read_file("/tmp/ownership_token.txt");
        		if (token) break;
        		usleep(100 * 1000); // 100 ms
    		}

		//waitForOwnershipToken(&mqttContextProv);
        	//token = read_file("/tmp/ownership_token.txt");		
    		    		
    		char provAccepted[256], provRejected[256];
    		snprintf(provAccepted, sizeof(provAccepted), PROVISION_ACCEPTED_FMT, g_aws_template);
    		snprintf(provRejected, sizeof(provRejected), PROVISION_REJECTED_FMT, g_aws_template);
    		mqtt_subscribe_topic(&mqttContextProv, provAccepted, MQTTQoS1);
    		mqtt_subscribe_topic(&mqttContextProv, provRejected, MQTTQoS1);

    		if (token) {
        		log_message("INFO", "Got ownership token, publishing RegisterThing");
        		publish_register_thing(&mqttContextProv, g_aws_template, token, imei, serial);
        		free(token);
    		}

    		/* Run loop until provisioning accepted */
    		for (int i=0; i<20; i++) {
        		MQTTStatus_t mqttStatus = processLoopWithTimeout(&mqttContextProv, timeoutMs);
        		if (mqttStatus != MQTTSuccess && mqttStatus != MQTTNeedMoreBytes)
			{
    				log_message("ERROR", "MQTT_ProcessLoop returned error=%d (%s)", mqttStatus, MQTT_Status_strerror(mqttStatus));
			}       		
        		if (access(DEVICE_CERT_PATH, R_OK)==0 && access(DEVICE_KEY_PATH, R_OK)==0) {
            			log_message("INFO", "Device cert/key saved, provisioning complete");
            			break;
        		}
        		usleep(100 * 1000);
    		}
    		Openssl_Disconnect(&networkContextProv);
	}
	// Perform backup to /log (first time)
	backup_certs_to_log();
	
	//Struct for passing to event handler
	ThreadArgs *args = malloc(sizeof(ThreadArgs));
	args->mqttContext = &mqttContext;
	args->imei = imei;
	args->topic = PUBLISH_TOPIC;
		
    	/* Initialize MQTT library for usual communication*/
    	returnStatus = initializeMqtt(&mqttContext, &networkContext);
    	if (returnStatus != EXIT_SUCCESS)
    	{
        	log_message("ERROR", "MQTT init failed.");
        	return returnStatus;
    	}
	/* Start all three monitoring threads */
	pthread_create(&checkin_thread, NULL, checkin_publisher, args);
	pthread_create(&astd_thread, NULL, astd_publisher, args);	
	//pthread_create(&thread_iface, NULL, thread_interface_monitor, args);
	//pthread_create(&thread_wifi, NULL, thread_wifi_monitor, args);
	//pthread_create(&thread_eth, NULL, thread_ethernet_monitor, args);
	
	
	pthread_create(&thread_iface, NULL, thread_universal_monitor, args);	
while (1)
{
    	if (g_upgrade_started)
    	{
        	log_message("INFO", "Firmware upgrade in progress — MQTT suspended");
        	if (mqtt_connected)
        	{
            		MQTT_Disconnect(&mqttContext);
            		Openssl_Disconnect(&networkContext);
            		mqtt_connected = false;
        	}
        	sleep(3);
        	exit(0);
    	}


        if (g_mqtt_hard_restart)
        {
            log_message("WARN", "Performing HARD MQTT restart");
            
            pthread_mutex_lock(&mqtt_mutex);
            
            mqtt_connected = false;
            //Openssl_Disconnect(&networkContext);
            
	    clientSessionPresent = false; 
            brokerSessionPresent = false;
            
            //MQTT_Disconnect(&mqttContext);
            //MQTT_ProcessLoop(&mqttContext);
            memset(&mqttContext, 0, sizeof(MQTTContext_t));
	    memset(pOutgoingPublishRecords, 0, sizeof(MQTTPubAckInfo_t) * OUTGOING_PUBLISH_RECORD_LEN);
    	    memset(pIncomingPublishRecords, 0, sizeof(MQTTPubAckInfo_t) * INCOMING_PUBLISH_RECORD_LEN);
    	                
            returnStatus = initializeMqtt(&mqttContext, &networkContext);
            
            pthread_mutex_unlock(&mqtt_mutex);
            
            if (returnStatus != EXIT_SUCCESS)
            {
              	log_message("ERROR", "MQTT init failed");
            	sleep(2);
            	continue;
            }
            g_mqtt_hard_restart = false;
            log_message("INFO", "Hard restart complete. Ready to reconnect.");
        }
    /* Connect (with retries) */
    returnStatus = connectToServerWithBackoffRetries(
        &networkContext, &mqttContext,
        &clientSessionPresent, &brokerSessionPresent, imei);

    if (returnStatus == EXIT_FAILURE)
    {
        log_message("ERROR", "Failed to connect to broker %s", g_aws_server);
        mqtt_connected = false;
        sleep(5);
        continue;
    }

    //mqtt_connected = true; // Threads can publish now -- Putting before persistent While loop
    //clientSessionPresent = true;

    if (brokerSessionPresent)
    {
        log_message("INFO", "Resuming existing MQTT session.");
        returnStatus = handlePublishResend(&mqttContext);
    }
    else
    {
        log_message("INFO", "Clean MQTT session. Resetting pending publishes.");
        cleanupOutgoingPublishes();
    }
    returnStatus = subscribeToTopic(&mqttContext);
    if (returnStatus != EXIT_SUCCESS)
    {
        log_message("ERROR", "Subscription failed, disconnecting...");
        Openssl_Disconnect(&networkContext);
        mqtt_connected = false; // Ensure publishes are still blocked
        sleep(3);
        continue;
    }
    /* --- Subscribe once --- */
    /*returnStatus = subscribeToTopic(&mqttContext);
    if (returnStatus != EXIT_SUCCESS)
    {
        log_message("ERROR", "Subscription failed, disconnecting...");
        Openssl_Disconnect(&networkContext);
        sleep(5);
        continue;
    }*/

    log_message("INFO", "Subscribed to topic: %s", g_subscribeTopic);
    log_message("INFO", "Connected to AWS IoT Core, sending init data...");

    /* One-time messages */
    //publishInitJsons(&mqttContext, imei, PUBLISH_TOPIC);

    /* Periodic timer setup */
    time_t lastPeriodic = time(NULL);
    time_t lastPing = time(NULL);
    int loop_fail_count = 0;
    clientSessionPresent = true;
    
    // Now it is safe for other threads to publish
    log_message("INFO", "MQTT Ready. Setting mqtt_connected = true");
    mqtt_connected = true;
    /* One-time messages */
    publishInitJsons(&mqttContext, imei, PUBLISH_TOPIC);        
    /* --- Persistent MQTT Loop --- */
    while (1)
    {
        MQTTStatus_t mqttStatus = processLoopWithTimeout(&mqttContext, MQTT_PROCESS_LOOP_TIMEOUT_MS);

        if (mqttStatus == MQTTSuccess || mqttStatus == MQTTNeedMoreBytes || mqttStatus == MQTTPublishDone)
        {
            loop_fail_count = 0; // OK — reset failure counter
        }
        else if (mqttStatus == MQTTNoMemory)
        {
             log_message("ERROR", "MQTTNoMemory — hard restart");
             g_mqtt_hard_restart = true;
             mqtt_connected = false;
             break;
        }        
        else if (mqttStatus == MQTTBadParameter || mqttStatus == MQTTIllegalState)
        {
            // Serious client logic/state issue
            log_message("ERROR", "MQTT_ProcessLoop state error (%d). Reconnecting...", mqttStatus);
            Openssl_Disconnect(&networkContext);
            mqtt_connected = false;
            break; // Force reconnect
        }
 	else if (mqttStatus == MQTTRecvFailed)
	{
    		//loop_fail_count = 0;
    		//continue;
    		/*time_t now = time(NULL);
    		if (g_upgrade_started)
    		{
        		log_message("INFO", "MQTT recv failed due to firmware upgrade — stopping client");
        		mqtt_connected = false;
        		Openssl_Disconnect(&networkContext);
        		break;
    		}
    		if (recv_fail_count == 0)
        		recv_fail_start = now;

    		recv_fail_count++;
    		if ((now - recv_fail_start) > 10)
    		{
        		recv_fail_count = 0;
        		recv_fail_start = now;
        		continue;
    		}
    		if (recv_fail_count >= 5)
    		{
        		if ((now - last_reconnect) < 30)
        		{
            			log_message("WARN", "MQTT recv failed — suppressing reconnect");
            			usleep(500 * 1000);
            			continue;
        		}

        		log_message("ERROR", "MQTT recv failed persistently — reconnecting");
        		last_reconnect = now;
        		recv_fail_count = 0;
        		mqtt_connected = false;
        		Openssl_Disconnect(&networkContext);
        		break;
    		}
    		usleep(200 * 1000);
    		continue;*/
    		log_message("WARN", "Network receive failed.");
            	Openssl_Disconnect(&networkContext);
            	mqtt_connected = false;
            	break;
	}       
        else
        {
            // Transient network timeout or socket delay
            loop_fail_count++;
            if (loop_fail_count > LOOP_FAIL_LIMIT) 
            {
                log_message("ERROR", "Too many MQTT loop failures, reconnecting...");
                Openssl_Disconnect(&networkContext);
                mqtt_connected = false;
                break; // reconnect
            }
            usleep(LOOP_SLEEP_US);            
            continue;
        }

        /* Check if a command requested reconnect (e.g., keepalive change) */
        if (g_force_mqtt_reconnect)
        {
            log_message("INFO", "Forced MQTT reconnect requested...");
            g_force_mqtt_reconnect = 0;
            Openssl_Disconnect(&networkContext);
            mqtt_connected = false;
            break;
        }
	if (g_mqtt_hard_restart)
    	{
        	log_message("INFO", "Hard restart flag detected, exiting persistent loop.");
        	Openssl_Disconnect(&networkContext);
        	mqtt_connected = false;
        	g_mqtt_hard_restart = true;
        	break; 
    	}
        usleep(100 * 1000); /* small sleep to yield CPU */
    }
}
    	return returnStatus;
}

