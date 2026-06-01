#ifndef LOG_UPLOAD_H
#define LOG_UPLOAD_H

#include "core_mqtt.h"
#include <stdbool.h>

typedef enum {
    LOG_TYPE_SYSLOG,
    LOG_TYPE_KERNEL,
    CONFIG_BACKUP
} LogType;

typedef struct {
    char url[512];
    LogType type;
} LogUploadInfo;

int performSingleLogUpload(MQTTContext_t *mqttContext,
                           const LogUploadInfo *info,
                           const char *notificationID,
                           const char *topic);

int start_single_log_upload_async(MQTTContext_t *mqttContext,
                                  const LogUploadInfo *info,
                                  const char *notificationID,
                                  const char *topic);

#endif /* LOG_UPLOAD_H */

