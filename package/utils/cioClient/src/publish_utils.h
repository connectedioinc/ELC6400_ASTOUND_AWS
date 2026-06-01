#ifndef PUBLISH_UTILS_H
#define PUBLISH_UTILS_H

#include <stddef.h>  /* for size_t */
#include "core_mqtt.h"
#define CLIENT_ID_MAX_LEN 64
extern char clientIdentifier[CLIENT_ID_MAX_LEN];  // globally accessible client ID
extern uint16_t clientIdentifierLength;
void buildWifiHostsJson(MQTTContext_t *pMqttContext, const char *imei, const char *topic);
void buildEthernetHostsJson(MQTTContext_t *pMqttContext, const char *imei, const char *topic);
void buildGJson(MQTTContext_t *mqttContext, const char *imei, const char *topic);
void buildNJson(MQTTContext_t *mqttContext, const char *imei, const char *topic);
void buildOJson(MQTTContext_t *mqttContext, const char *imei, const char *topic);
void buildPJson(MQTTContext_t *mqttContext, const char *imei, const char *topic);

#endif /* PUBLISH_UTILS_H */
