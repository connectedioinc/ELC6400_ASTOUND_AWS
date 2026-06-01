#ifndef CONFIG_RESTORE_H
#define CONFIG_RESTORE_H

#include "core_mqtt.h"

/**
 * Perform configuration restore from server (blocking version)
 *
 * @param mqttContext    AWS IoT MQTT context
 * @param topic          MQTT topic to publish progress
 * @param notificationID Notification ID for progress updates
 * @param url            Download URL for config tarball
 * @param checksum       Expected checksum (MD5 or SHA256)
 *
 * @return 0 on success, negative on failure
 */
int perform_config_restore(MQTTContext_t *mqttContext,
                           const char *topic,
                           const char *notificationID,
                           const char *url,
                           const char *checksum);

/**
 * Start asynchronous configuration restore in background thread.
 *
 * @return 0 on success, negative on failure
 */
int start_config_restore_async(MQTTContext_t *mqttContext,
                               const char *topic,
                               const char *notificationID,
                               const char *url,
                               const char *checksum);

#endif /* CONFIG_RESTORE_H */

