/*provision.c - Functions for provision*/
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

#include "core_mqtt.h"
#include "openssl_posix.h"
#include "clock.h"
#include "backoff_algorithm.h"
/*Config settings*/
#include "cioClient_config.h"
#include "provision.h"
#include "cio_defaults.h"
#include "cjson/cJSON.h"
#include "utilities.h"

#include "certs/claim_cert.h"
#include "certs/claim_key.h"
#include "certs/root_ca.h"

#define TMP_CERT_PATH "/tmp/claim_cert.pem"
#define TMP_KEY_PATH  "/tmp/claim_key.pem"
#define TMP_CA_PATH   "/tmp/root_ca.pem"

extern char clientIdentifier[];
#define BROKER_ENDPOINT_LENGTH                   ( ( uint16_t ) ( sizeof( BROKER_ENDPOINT ) - 1 ) )
#define CLIENT_IDENTIFIER_LENGTH                 ( ( uint16_t ) ( sizeof( CLIENT_IDENTIFIER ) - 1 ) )
#define CONNECTION_RETRY_MAX_ATTEMPTS            ( 5U )
#define CONNECTION_RETRY_MAX_BACKOFF_DELAY_MS    ( 5000U )
#define CONNECTION_RETRY_BACKOFF_BASE_MS         ( 500U )
#define CONNACK_RECV_TIMEOUT_MS                  ( 1000U )
#define MQTT_KEEP_ALIVE_INTERVAL_SECONDS         ( 60U )
#define TRANSPORT_SEND_RECV_TIMEOUT_MS           ( 1000 )
#ifndef NETWORK_BUFFER_SIZE
    #define NETWORK_BUFFER_SIZE    ( 1024U )
#endif
#define OUTGOING_PUBLISH_RECORD_LEN              ( 10U )
#define INCOMING_PUBLISH_RECORD_LEN              ( 10U )

volatile bool g_ownership_token_received = false;
char g_ownership_token[1024] = {0};

static MQTTPubAckInfo_t pOutgoingPublishRecords[ OUTGOING_PUBLISH_RECORD_LEN ];
static MQTTPubAckInfo_t pIncomingPublishRecords[ INCOMING_PUBLISH_RECORD_LEN ];
static uint8_t buffer[ NETWORK_BUFFER_SIZE ];

#define MQTT_RX_BUFFER_SIZE  16384
#define MQTT_TX_BUFFER_SIZE  2048
/* Static buffers for MQTT library */
static uint8_t mqttRxBuffer[MQTT_RX_BUFFER_SIZE];
static uint8_t mqttTxBuffer[MQTT_TX_BUFFER_SIZE];

void waitForOwnershipToken(MQTTContext_t *pMqttContext)
{
    log_message("INFO", "Waiting up to 120s for ownership token...");

    uint32_t elapsedMs = 0;
    const uint32_t timeoutMs = 120000;  /* 2 minutes */
    const uint32_t pollIntervalMs = 100; /* Tight loop for better responsiveness */
    MQTTStatus_t mqttStatus = MQTTSuccess;

    while (elapsedMs < timeoutMs && !g_ownership_token_received)
    {
        /* Run process loop continuously — handle partial messages, ACKs, keep-alive */
        mqttStatus = MQTT_ProcessLoop(pMqttContext);

        if (mqttStatus == MQTTNeedMoreBytes)
        {
            /* Expected when no full packet is ready yet */
            log_message("DEBUG", "MQTT_ProcessLoop: Need more bytes (elapsed=%ums)", elapsedMs);
        }
        else if (mqttStatus == MQTTSuccess)
        {
            /* Successfully processed at least one MQTT packet */
            log_message("DEBUG", "MQTT_ProcessLoop: Message processed successfully (elapsed=%ums)", elapsedMs);
        }
        else
        {
            /* Any other status indicates an error */
            log_message("ERROR", "MQTT_ProcessLoop failed: %s", MQTT_Status_strerror(mqttStatus));
            break;
        }

        /* Check if ownership token was received */
        if (g_ownership_token_received)
        {
            log_message("INFO", "Ownership token received successfully: %s", g_ownership_token);
            break;
        }

        /* Sleep briefly to yield CPU but remain responsive */
        Clock_SleepMs(pollIntervalMs);
        elapsedMs += pollIntervalMs;

        /* Optionally log every 5 seconds to monitor progress */
        if (elapsedMs % 5000 == 0)
        {
            log_message("DEBUG", "Still waiting for ownership token... (%u ms elapsed)", elapsedMs);
        }
    }

    if (!g_ownership_token_received)
    {
        if (elapsedMs >= timeoutMs)
            log_message("ERROR", "Timeout (120s) waiting for ownership token — no response from AWS.");
        else
            log_message("WARN", "Exited wait loop early (reason: process loop error or disconnect).");
    }
}

static void handleIncomingPublishProvision( MQTTPublishInfo_t * pPublishInfo,
                                   uint16_t packetIdentifier )
{
    	( void ) packetIdentifier;
    	/* Process incoming Publish. */
    	log_message( "INFO", "Incoming QOS : %d", pPublishInfo->qos );

        log_message( "INFO", "Incoming Publish Topic Name: %.*s matches subscribed topic.\n"
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
		if (root)
		{
    			cJSON *cert = cJSON_GetObjectItem(root, "certificatePem");
    			cJSON *priv = cJSON_GetObjectItem(root, "privateKey");
    			cJSON *ownership = cJSON_GetObjectItem(root, "certificateOwnershipToken");
    			// Fallback if AWS uses nested keyPair.PrivateKey
    			if (!priv)
    			{
        			cJSON *keyPair = cJSON_GetObjectItem(root, "keyPair");
        			if (keyPair)
            				priv = cJSON_GetObjectItem(keyPair, "PrivateKey");
    			}

    			if (cert && priv && ownership)
    			{
        			log_message("INFO", "Saving received cert/key/token to /tmp");
        			save_file_secure("/tmp/new_cert.pem", cert->valuestring);
        			save_file_secure("/tmp/new_key.key", priv->valuestring);
        			save_file_secure("/tmp/ownership_token.txt", ownership->valuestring);
        			g_ownership_token_received = true;
        			strncpy(g_ownership_token, ownership->valuestring, sizeof(g_ownership_token) - 1);
        				g_ownership_token[sizeof(g_ownership_token) - 1] = '\0';
    			}
    			else
    			{
        			log_message("ERROR", "Missing expected fields in JSON (cert=%p, priv=%p, token=%p)", cert, priv, ownership);
    			}
    			cJSON_Delete(root);
		}
		else
		{
    			log_message("ERROR", "Failed to parse provisioning JSON");
		}
	}
	else if (strstr(topicBuf, "provision/json/accepted")) {
		log_message("INFO", "Provisioning accepted: %s", payloadCopy);
		// Ensure base cert directory exists first
    		ensure_dir_exists(OVERLAY_CERT_DIR);
		cJSON *root = cJSON_Parse(payloadCopy);
		if (root) {
	    		cJSON *cert = cJSON_GetObjectItem(root, "certificatePem");
	    		cJSON *priv = cJSON_GetObjectItem(root, "privateKey");
	    		if (cert && priv) {
				save_file_secure(DEVICE_CERT_PATH, cert->valuestring);
				save_file_secure(DEVICE_KEY_PATH, priv->valuestring);
	    		} else {
				/* fallback: move tmp certs */
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
	free(payloadCopy);
}


static void eventCallback_provision( MQTTContext_t * pMqttContext,
                                     MQTTPacketInfo_t * pPacketInfo,
                                     MQTTDeserializedInfo_t * pDeserializedInfo )
{
	uint8_t packetType = pPacketInfo->type & 0xF0U;
	uint16_t packetId  = pDeserializedInfo->packetIdentifier;
	(void)pMqttContext;

	log_message("DEBUG",
		"MQTT eventCallback_provision(): packetType=0x%02X flags=0x%02X packetId=%u",
		pPacketInfo->type, (pPacketInfo->type & 0x0F), packetId);

	switch (packetType)
	{
		/* -------- PUBLISH -------- */
		case MQTT_PACKET_TYPE_PUBLISH:
		{
			const MQTTPublishInfo_t *pub = pDeserializedInfo->pPublishInfo;
			if (pub == NULL)
			{
	    			log_message("WARN", "Received PUBLISH with NULL PublishInfo");
	    			break;
			}

			log_message("INFO", "Incoming PUBLISH topic=%.*s payloadLen=%u",
		    		(int)pub->topicNameLength, pub->pTopicName,
		    		(unsigned)pub->payloadLength);
				handleIncomingPublishProvision(pDeserializedInfo->pPublishInfo, packetId);
			break;
		}

		/* -------- SUBACK -------- */
		case MQTT_PACKET_TYPE_SUBACK:
		{
			log_message("INFO", "Received SUBACK (packetId=%u)", packetId);

			#ifdef MQTT_GetSubAckStatusCodes
			uint8_t codes[8];
			size_t codeCount = MQTT_GetSubAckStatusCodes(pDeserializedInfo, codes, sizeof(codes));
			for (size_t i = 0; i < codeCount; i++)
			{
	    			if (codes[i] == 0x80)
					log_message("ERROR", "SUBACK[%zu] = 0x80 (Subscription failed)", i);
	    			else
					log_message("DEBUG", "SUBACK[%zu] granted QoS %u", i, codes[i]);
			}
			#else
			log_message("DEBUG", "SUBACK codes not parsed (no helper function)");
			#endif
			break;
		}

		/* -------- PUBACK -------- */
		case MQTT_PACKET_TYPE_PUBACK:
			log_message("INFO", "Received PUBACK (packetId=%u)", packetId);
			break;

		/* -------- Default -------- */
		default:
			log_message("DEBUG", "Unhandled packet type=0x%02X", packetType);
			break;
	}
}


int initializeMqttProv( MQTTContext_t * pMqttContext,
                           NetworkContext_t * pNetworkContext )
{
    int returnStatus = EXIT_SUCCESS;
    MQTTStatus_t mqttStatus;
    MQTTFixedBuffer_t networkBuffer;
    TransportInterface_t transport = { NULL };

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
                            eventCallback_provision,
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

int mqtt_connect_with_certs( MQTTContext_t * pMqttContext,
                             NetworkContext_t * pNetworkContext,
                             const char * endpoint,
                             uint16_t port,
                             const char * rootCaPath,
                             const char * clientCertPath,
                             const char * privateKeyPath,
                             const char * clientId )
{
    	ServerInfo_t serverInfo = { 0 };
    	OpensslCredentials_t opensslCredentials = { 0 };
    	OpensslStatus_t opensslStatus;

    	/* Prepare server info */
    	serverInfo.pHostName = endpoint;
    	serverInfo.hostNameLength = strlen( endpoint );
    	serverInfo.port = port;

    	/* TLS credentials */
    	memset( &opensslCredentials, 0, sizeof( opensslCredentials ) );
    	opensslCredentials.pRootCaPath = rootCaPath;
    	opensslCredentials.pClientCertPath = clientCertPath;
    	opensslCredentials.pPrivateKeyPath = privateKeyPath;
    	opensslCredentials.sniHostName = endpoint;

    	/* Connect TLS */
    	opensslStatus = Openssl_Connect( pNetworkContext,
                                     &serverInfo,
                                     &opensslCredentials,
                                     5000, 5000 );
    	if( opensslStatus != OPENSSL_SUCCESS )
    	{
        	log_message( "ERROR", "Openssl_Connect failed: %d", opensslStatus );
        	return EXIT_FAILURE;
    	}

    	/* Setup transport */
    	TransportInterface_t transport = {
        .pNetworkContext = pNetworkContext,
        .send = Openssl_Send,
        .recv = Openssl_Recv
    	};

    	/* MQTT buffer */
    	static uint8_t buffer[ 2048 ];
    	MQTTFixedBuffer_t networkBuffer = { buffer, sizeof( buffer ) };

    	/* Initialize MQTT */
    	MQTTStatus_t mqttStatus = MQTT_Init( pMqttContext,
                                         &transport,
                                         Clock_GetTimeMs,
                                         eventCallback_provision,
                                         &networkBuffer );
    	if( mqttStatus != MQTTSuccess )
    	{
        	log_message( "ERROR", "MQTT_Init failed: %d", mqttStatus );
        	return EXIT_FAILURE;
    	}

    	/* Prepare CONNECT */
    	MQTTConnectInfo_t connectInfo = { 0 };
    	connectInfo.cleanSession = true;
    	connectInfo.keepAliveSeconds = 120;
    	connectInfo.pClientIdentifier = clientId;
    	connectInfo.clientIdentifierLength = ( uint16_t ) strlen( clientId );

    	bool sessionPresent = false;
    	mqttStatus = MQTT_Connect( pMqttContext,
                               &connectInfo,
                               NULL,
                               5000,
                               &sessionPresent );
    	if( mqttStatus != MQTTSuccess )
    	{
        	log_message( "ERROR", "MQTT_Connect failed: %d", mqttStatus );
        	Openssl_Disconnect( pNetworkContext );
        	return EXIT_FAILURE;
    	}

    	log_message( "INFO", "Connected to AWS IoT Core as clientId=%s", clientId );
    	return EXIT_SUCCESS;
}

int mqtt_subscribe_topic( MQTTContext_t * pMqttContext,
                          const char * topicFilter,
                          MQTTQoS_t qos )
{
    	MQTTSubscribeInfo_t subInfo = { 0 };
    	subInfo.qos = qos;
    	subInfo.pTopicFilter = topicFilter;
    	subInfo.topicFilterLength = strlen( topicFilter );

    	uint16_t packetId = MQTT_GetPacketId( pMqttContext );
    	MQTTStatus_t mqttStatus = MQTT_Subscribe( pMqttContext, &subInfo, 1, packetId );

    	if( mqttStatus != MQTTSuccess )
    	{
        	log_message( "ERROR", "Failed to SUBSCRIBE %s: %d", topicFilter, mqttStatus );
        	return EXIT_FAILURE;
    	}

    	log_message( "INFO", "SUBSCRIBE sent to topic %s", topicFilter );
    	return EXIT_SUCCESS;
}

int publish_create_certificate_request( MQTTContext_t * pMqttContext )
{
    	MQTTPublishInfo_t pubInfo = { 0 };
    	pubInfo.qos = MQTTQoS1;
    	pubInfo.pTopicName = "$aws/certificates/create/json";
    	pubInfo.topicNameLength = strlen( pubInfo.pTopicName );
    	pubInfo.pPayload = "{}";
    	pubInfo.payloadLength = 2;

    	uint16_t packetId = MQTT_GetPacketId( pMqttContext );
    	MQTTStatus_t status = MQTT_Publish( pMqttContext, &pubInfo, packetId );

    	if( status != MQTTSuccess )
    	{
        	log_message( "ERROR", "Publish CreateKeysAndCertificate failed: %d", status );
        	return EXIT_FAILURE;
    	}

    	log_message( "INFO", "Published to %s", pubInfo.pTopicName );
    	return EXIT_SUCCESS;
}

int publish_register_thing( MQTTContext_t * pMqttContext,
                            const char * templateName,
                            const char * ownershipToken,
                            const char * imei,
                            const char * serialNo )
{
    	char topic[256];
    	snprintf( topic, sizeof(topic),
              "$aws/provisioning-templates/%s/provision/json",
              templateName );

    	/* Build payload */
    	char payload[1024];
    	snprintf( payload, sizeof(payload),
              "{ \"certificateOwnershipToken\": \"%s\","
              "  \"parameters\": { \"IMEI\": \"%s\", \"SerialNumber\": \"%s\" } }",
              ownershipToken, imei, serialNo );

    	MQTTPublishInfo_t pubInfo = { 0 };
    	pubInfo.qos = MQTTQoS1;
    	pubInfo.pTopicName = topic;
    	pubInfo.topicNameLength = strlen( topic );
    	pubInfo.pPayload = payload;
    	pubInfo.payloadLength = strlen( payload );

    	uint16_t packetId = MQTT_GetPacketId( pMqttContext );
    	MQTTStatus_t status = MQTT_Publish( pMqttContext, &pubInfo, packetId );

    	if( status != MQTTSuccess )
    	{
        	log_message( "ERROR", "Publish RegisterThing failed: %d", status );
        	return EXIT_FAILURE;
    	}

    	log_message( "INFO", "Published RegisterThing request to %s", topic );
    	return EXIT_SUCCESS;
}

static uint32_t generateRandomNumber()
{
    return( rand() );
}

static int establishMqttSessionProvision( MQTTContext_t * pMqttContext,
                                 bool createCleanSession,
                                 bool * pSessionPresent )
{
	int returnStatus = EXIT_SUCCESS;
	MQTTStatus_t mqttStatus;
	MQTTConnectInfo_t connectInfo;
	connectInfo.cleanSession = createCleanSession;
	connectInfo.pClientIdentifier = clientIdentifier;
	connectInfo.clientIdentifierLength = (uint16_t)clientIdentifierLength;
	connectInfo.keepAliveSeconds = MQTT_KEEP_ALIVE_INTERVAL_SECONDS;
	connectInfo.pUserName = NULL;
	connectInfo.userNameLength = 0U;
	connectInfo.pPassword = NULL;
	connectInfo.passwordLength = 0U;
	/* Send MQTT CONNECT packet to broker. */
	mqttStatus = MQTT_Connect( pMqttContext, &connectInfo, NULL, CONNACK_RECV_TIMEOUT_MS, pSessionPresent );
	if( mqttStatus != MQTTSuccess )
	{
		returnStatus = EXIT_FAILURE;
		log_message( "ERROR", "Connection with MQTT broker failed with status %s",
		    MQTT_Status_strerror( mqttStatus ) );
	}
	else
	{
		log_message(  "INFO","MQTT connection successfully established with broker"  );
	}
	return returnStatus;
}


void write_embedded_certs_to_tmp()
{
    FILE *fp;

    fp = fopen(TMP_CERT_PATH, "w");
    if (fp) { fputs(claim_cert_data, fp); fclose(fp); }

    fp = fopen(TMP_KEY_PATH, "w");
    if (fp) { fputs(claim_key_data, fp); fclose(fp); }

    fp = fopen(TMP_CA_PATH, "w");
    if (fp) { fputs(root_ca_data, fp); fclose(fp); }
}

int connectToServerWithBackoffRetriesProvision( NetworkContext_t * pNetworkContext,
                                              MQTTContext_t * pMqttContext,
                                              bool * pClientSessionPresent,
                                              bool * pBrokerSessionPresent )
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
 	if (access(CLAIM_CERT_PATH, R_OK) != 0 || access(CLAIM_KEY_PATH, R_OK) != 0) {
 		write_embedded_certs_to_tmp();	
		opensslCredentials.pRootCaPath      = TMP_CA_PATH;
		opensslCredentials.pClientCertPath  = TMP_CERT_PATH;
		opensslCredentials.pPrivateKeyPath  = TMP_KEY_PATH;
	}
	else
	{      	
    		opensslCredentials.pRootCaPath = CLAIM_ROOT_CA_PATH;
		opensslCredentials.pClientCertPath = CLAIM_CERT_PATH;
		opensslCredentials.pPrivateKeyPath = CLAIM_KEY_PATH;
	}
 
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
    	//do
    	//{
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
            		createCleanSession = ( *pClientSessionPresent == true ) ? false : true;

            		/* Sends an MQTT Connect packet using the established TLS session,
             		* then waits for connection acknowledgment (CONNACK) packet. */
            		returnStatus = establishMqttSessionProvision( pMqttContext, createCleanSession, pBrokerSessionPresent );

            		//if( returnStatus == EXIT_FAILURE )
            		//{
                		/* End TLS session, then close TCP connection. */
                		//( void ) Openssl_Disconnect( pNetworkContext );
            		//}
        	}

        	//if( returnStatus == EXIT_FAILURE )
        	//{
            		/* Generate a random number and get back-off value (in milliseconds) for the next connection retry. */
            		//backoffAlgStatus = BackoffAlgorithm_GetNextBackoff( &reconnectParams, generateRandomNumber(), &nextRetryBackOff );

            		//if( backoffAlgStatus == BackoffAlgorithmRetriesExhausted )
            		//{
                		//log_message( "ERROR", "Connection to the broker failed, all attempts exhausted" );
                		//returnStatus = EXIT_FAILURE;
            		//}
            		//else if( backoffAlgStatus == BackoffAlgorithmSuccess )
            		//{
               			//log_message( "DEBUG", "Connection to the broker failed. Retrying connection "
                           	//	"after %hu ms backoff.",
                           	//( unsigned short ) nextRetryBackOff  );
                		//Clock_SleepMs( nextRetryBackOff );
            		//}
        	//}
    //} while( ( returnStatus == EXIT_FAILURE ) && ( backoffAlgStatus == BackoffAlgorithmSuccess ) );

    return returnStatus;
}


