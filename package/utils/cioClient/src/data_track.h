#ifndef DATA_TRACK_H
#define DATA_TRACK_H

#include "core_mqtt.h"
#include <pthread.h>
#include <stdbool.h>
#include <time.h>

typedef struct {
    bool active;
    time_t start_time;
    int duration;
    char url[256];
    char header[256];
    pthread_t thread;
} DataTrackContext;

extern DataTrackContext g_dataTrackCtx;
extern char g_dataTrackNotifId[64];
void *data_track_thread(void *arg);
char *start_data_track(const char *url, int duration, const char *header, const char *notifID);
char *get_data_track_status(void);
char *stop_data_track(void);

#endif

