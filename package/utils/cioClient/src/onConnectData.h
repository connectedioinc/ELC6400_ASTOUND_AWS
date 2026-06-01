#ifndef ONCONNECTDATA_H_
#define ONCONNECTDATA_H_
#ifdef __cplusplus
extern "C" {
#endif
void publishInitJsons(MQTTContext_t *pMqttContext, const char *imei, const char *topic);
void publishPeriodicStatus(MQTTContext_t *pMqttContext);
#ifdef __cplusplus
}      /* extern "C" */
#endif

#endif /* ONCONNECTDATA_H_ */
