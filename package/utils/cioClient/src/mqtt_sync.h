// mqtt_sync.h
#ifndef MQTT_SYNC_H
#define MQTT_SYNC_H

#include <pthread.h>

/* Global MQTT mutex for thread synchronization */
extern pthread_mutex_t mqtt_mutex;
/*Publish Topic*/
#define TOPIC_MAX_LEN 256
extern char g_publishTopic[TOPIC_MAX_LEN];
extern uint16_t g_publishTopic_length;
extern int g_mqtt_keepalive;
extern pthread_mutex_t mqtt_keepalive_mutex;
extern volatile int g_force_mqtt_reconnect;
extern volatile bool mqtt_connected;
extern volatile bool g_mqtt_hard_restart;
#endif

