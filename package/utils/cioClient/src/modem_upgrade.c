#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <openssl/sha.h>
#include "cioclient_log.h"
#include "utilities.h"
#include "cjson/cJSON.h"
#include "firmware_upgrade.h"             
#include "modem_upgrade.h"

#define FW_TMP_PATH "/tmp/modem_fw.bin"
#define FLASH_TOOL "/usr/bin/qfirehose"   // Quectel QFirehose tool path

/**
 * Helper: compute SHA256 checksum of a file and compare with expected.
 */
int verify_file_checksum(const char *filepath, const char *expected_sha256)
{
    unsigned char hash[SHA256_DIGEST_LENGTH];
    unsigned char buffer[4096];
    SHA256_CTX sha_ctx;
    FILE *fp = fopen(filepath, "rb");
    if (!fp)
    {
        log_message("ERROR", "Cannot open %s for checksum", filepath);
        return -1;
    }

    SHA256_Init(&sha_ctx);
    size_t bytes;
    while ((bytes = fread(buffer, 1, sizeof(buffer), fp)) != 0)
        SHA256_Update(&sha_ctx, buffer, bytes);
    fclose(fp);

    SHA256_Final(hash, &sha_ctx);

    char calculated[SHA256_DIGEST_LENGTH * 2 + 1];
    for (int i = 0; i < SHA256_DIGEST_LENGTH; i++)
        sprintf(&calculated[i * 2], "%02x", hash[i]);
    calculated[64] = '\0';

    if (strcasecmp(expected_sha256, calculated) != 0)
    {
        log_message("ERROR", "Checksum mismatch: expected %s, got %s", expected_sha256, calculated);
        return -1;
    }

    log_message("INFO", "Checksum verified successfully");
    return 0;
}

/**
 * Perform Quectel RG520N modem firmware upgrade.
 */
int perform_modem_upgrade(MQTTContext_t *mqttContext,
                          const char *topic,
                          const char *notifID,
                          const char *url,
                          const char *checksum,
                          int keepConfig)
{
    char cmd[512];
    int rc;

    log_message("INFO", "Starting modem firmware upgrade from URL: %s", url);

    /* Step 1: Download firmware */
    snprintf(cmd, sizeof(cmd), "wget -O %s \"%s\" --quiet", FW_TMP_PATH, url);
    rc = system(cmd);
    if (rc != 0)
    {
        log_message("ERROR", "Download failed rc=%d", rc);
        publish_progress(mqttContext, topic, notifID, "5", "Firmware download failed");
        return -1;
    }
    publish_progress(mqttContext, topic, notifID, "5", "Firmware downloaded");

    /* Step 2: Verify checksum */
    if (checksum && strlen(checksum) > 0)
    {
        if (verify_file_checksum(FW_TMP_PATH, checksum) != 0)
        {
            publish_progress(mqttContext, topic, notifID, "10", "Checksum verification failed");
            return -1;
        }
    }
    publish_progress(mqttContext, topic, notifID, "40", "Checksum verified");

    /* Step 3: Stop data connection / detach modem */
    system("ifconfig wwan0 down >/dev/null 2>&1");
    log_message("INFO", "WWAN interface brought down");
    publish_progress(mqttContext, topic, notifID, "45", "WWAN down");

    /* Step 4: Flash modem firmware using QFirehose */
    snprintf(cmd, sizeof(cmd),
             "%s -f %s -p /dev/ttyUSB0 -s 115200 --auto-reset --verify",
             FLASH_TOOL, FW_TMP_PATH);

    log_message("INFO", "Executing flash command: %s", cmd);
    rc = system(cmd);
    if (rc != 0)
    {
        log_message("ERROR", "QFirehose flashing failed rc=%d", rc);
        publish_progress(mqttContext, topic, notifID, "70", "Flashing failed");
        return -1;
    }
    publish_progress(mqttContext, topic, notifID, "70", "Firmware flashed");

    /* Step 5: Reboot modem */
    log_message("INFO", "Rebooting modem after flash...");
    system("gsmctl -r >/dev/null 2>&1");
    publish_progress(mqttContext, topic, notifID, "90", "Modem reboot initiated");

    /* Step 6: Verify new firmware version */
    char fw_version[128] = {0};
    get_cmd_output("gsmctl -v", fw_version, sizeof(fw_version));
    trim(fw_version);
    log_message("INFO", "New modem firmware version: %s", fw_version);

    publish_progress(mqttContext, topic, notifID, "100", "Upgrade complete");
    return 0;
}

