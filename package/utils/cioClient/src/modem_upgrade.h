#ifndef MODEM_UPGRADE_H
#define MODEM_UPGRADE_H

#include "core_mqtt.h"
#include <stddef.h>

/**
 * Perform modem firmware upgrade (Quectel RG520N-NA).
 * Params come from server via JSON: URL, checksum, keepConfig, notifID.
 */
int perform_modem_upgrade(MQTTContext_t *mqttContext,
                          const char *topic,
                          const char *notifID,
                          const char *url,
                          const char *checksum,
                          int keepConfig);

/**
 * Calculate and verify firmware checksum (SHA256).
 * Returns 0 on match, -1 on mismatch or error.
 */
int verify_file_checksum(const char *filepath, const char *expected_sha256);

#endif /* MODEM_UPGRADE_H */

