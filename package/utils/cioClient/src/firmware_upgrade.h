#ifndef FIRMWARE_UPGRADE_H
#define FIRMWARE_UPGRADE_H

#include <stdbool.h>
#include "core_mqtt.h"

#define FW_DOWNLOAD_PATH "/tmp/firmware.bin"
#define FW_DL_LOG        "/tmp/fw_dl.log"

typedef struct {
    char url[512];       /* URL to download firmware */
    char checksum[128];  /* expected sha256 hex */
    bool keepConfig;     /* whether to keep config (sysupgrade -n = no keep) */
} FirmwareUpgradeInfo;

/* Start async upgrade: returns 0 if started, -1 if another upgrade is running, < -1 on invalid args. */
int start_firmware_upgrade_async(MQTTContext_t *mqttContext,
                                 const FirmwareUpgradeInfo *info,
                                 const char *notificationId,    /* short string id returned in status messages */
                                 const char *statusTopic);      /* full topic to publish progress */

/* If you prefer synchronous (blocking) upgrade, call this (returns error codes described in impl). */
int performFirmwareUpgradeSync(MQTTContext_t *mqttContext,
                               const FirmwareUpgradeInfo *info,
                               const char *notificationId,
                               const char *statusTopic);
void publish_progress(MQTTContext_t *mqttContext, const char *statusTopic, const char *notificationId, const char *percent, const char *statusText);
int delete_log_certs_if_beta(void);
#endif /* FIRMWARE_UPGRADE_H */

