#ifndef PROVISION_H
#define PROVISION_H
#include "core_mqtt.h"
#include "openssl_posix.h"
#include "clock.h"
#include "backoff_algorithm.h"

#include <stddef.h>  /* for size_t */
extern volatile bool g_ownership_token_received;
extern char g_ownership_token[1024];
void waitForOwnershipToken(MQTTContext_t *pMqttContext);
int mqtt_connect_with_certs( MQTTContext_t * pMqttContext, NetworkContext_t * pNetworkContext, const char * endpoint, uint16_t port, const char * rootCaPath, const char * clientCertPath, const char * privateKeyPath, const char * clientId );
int mqtt_subscribe_topic( MQTTContext_t * pMqttContext, const char * topicFilter, MQTTQoS_t qos );
int publish_create_certificate_request( MQTTContext_t * pMqttContext );
int publish_register_thing( MQTTContext_t * pMqttContext, const char * templateName, const char * ownershipToken, const char * imei, const char * serialNo );
int connectToServerWithBackoffRetriesProvision( NetworkContext_t * pNetworkContext, MQTTContext_t * pMqttContext, bool * pClientSessionPresent, bool * pBrokerSessionPresent );
int initializeMqttProv( MQTTContext_t * pMqttContext, NetworkContext_t * pNetworkContext );
#endif /* PROVISION_H */

