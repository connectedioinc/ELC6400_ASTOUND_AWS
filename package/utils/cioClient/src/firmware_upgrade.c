#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <unistd.h>
#include <stdbool.h>
#include <sys/stat.h>
#include <errno.h>

#include "firmware_upgrade.h"
#include "cioclient_log.h"     /*  log_message wrapper */
#include "publish_utils.h"     /* publishToTopicQOS() or equivalent wrapper */
#include "utilities.h"         /* trim(), execute_system_command(), etc. */
#include "command_handler.h"
#include "cjson/cJSON.h"             

extern pthread_mutex_t mqtt_mutex; /* declared in cioClient.c */

#define MQTT_CONFIG "/etc/config/mqtt"
#define LOG_CERTS_DIR "/log/certs"

typedef struct {
    MQTTContext_t *mqttContext;
    FirmwareUpgradeInfo info;
    char notificationId[128];
    char statusTopic[256];
} FirmwareUpgradeArgs;

/* Manager state */
static pthread_t fw_thread;
static pthread_mutex_t fw_state_mutex = PTHREAD_MUTEX_INITIALIZER;
static bool fw_running = false;

/* Helper: publish a structured progress message */
void publish_progress(MQTTContext_t *mqttContext,
                             const char *statusTopic,
                             const char *notificationId,
                             const char *percent,
                             const char *statusText)
{
    if (!mqttContext || !statusTopic || !notificationId || !statusText) return;

    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "a", notificationId);
    cJSON_AddStringToObject(root, "b", percent);
    cJSON_AddStringToObject(root, "c", statusText);

    char *payload = cJSON_PrintUnformatted(root);
    if (payload)
    {
        publishToTopicQOS(mqttContext, statusTopic, payload, MQTTQoS1);
        free(payload);
    }
    cJSON_Delete(root);
}

// Main API: checks for mqtt config and deletes log certs
int delete_log_certs_if_beta(void)
{
    struct stat st;

    // Check if /etc/config/mqtt exists
    if (stat(MQTT_CONFIG, &st) != 0) {
        log_message("INFO", "MQTT config not present. No deletion needed");
        return 0;
    }

    printf("MQTT config found → device is beta. Deleting %s\n", LOG_CERTS_DIR);

    // Check if /log/certs exists
    if (stat(LOG_CERTS_DIR, &st) != 0) {
        log_message("INFO", "%s does not exist — nothing to delete", LOG_CERTS_DIR);
        return 0;
    }

    if (!S_ISDIR(st.st_mode)) {
        log_message("INFO", "%s exists but is not a directory", LOG_CERTS_DIR);
        return -1;
    }

    if (delete_directory_recursive(LOG_CERTS_DIR) == 0) {
        log_message("INFO", "Successfully deleted %s", LOG_CERTS_DIR);
        return 0;
    } else {
        log_message("INFO", "Failed to delete %s: %s", LOG_CERTS_DIR, strerror(errno));
        return -1;
    }
}

/* Compute sha256 of a file using sha256sum; result stored in out (must be big enough, 128). */
static int compute_sha256_file(const char *path, char *out, size_t out_len)
{
    if (!path || !out) return -1;
    char cmd[512];
    snprintf(cmd, sizeof(cmd), "md5sum '%s' 2>/dev/null | awk '{print $1}'", path);

    FILE *fp = popen(cmd, "r");
    if (!fp) return -2;
    if (!fgets(out, out_len, fp)) {
        pclose(fp);
        return -3;
    }
    pclose(fp);
    trim(out);
    return 0;
}

/* The core synchronous upgrade function (returns 0 on success, negative on error). */
int performFirmwareUpgradeSync(MQTTContext_t *mqttContext,
                               const FirmwareUpgradeInfo *info,
                               const char *notificationId,
                               const char *statusTopic)
{
    if (!info || !notificationId || !statusTopic) return -1;
    if (strlen(info->url) == 0) return -2;

    log_message("INFO", "FW upgrade requested: url=%s keepConfig=%d", info->url, info->keepConfig ? 1 : 0);

    /* 1) Publish 5%: starting download */
    publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,5", "Downloading Firmware");

    /* remove previous file if exists */
    unlink(FW_DOWNLOAD_PATH);

    /* Use wget to download; write output to log so later debugging possible. */
    char cmd[1024];
    snprintf(cmd, sizeof(cmd),
             "wget -T 60 -O '%s' '%s' >" FW_DL_LOG " 2>&1",
             FW_DOWNLOAD_PATH, info->url);

    int rc = system(cmd);
    if (rc != 0)
    {
        log_message("ERROR", "Firmware download command failed (rc=%d). Check " FW_DL_LOG, rc);
        publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,-43", "Failed: File Format Error");
        return -10;
    }

    /* ensure file exists and non-zero */
    struct stat st;
    if (stat(FW_DOWNLOAD_PATH, &st) != 0 || st.st_size == 0)
    {
        log_message("ERROR", "Downloaded file missing or empty");
        publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,-40", "Failed: Download Error");
        return -11;
    }

    /* 2) Publish 40%: verifying */
    publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,40", "File downloaded successfully");

    /* compute sha256 and compare if checksum provided */
    if (strlen(info->checksum) > 0)
    {
        char computed[128] = {0};
        if (compute_sha256_file(FW_DOWNLOAD_PATH, computed, sizeof(computed)) != 0)
        {
            log_message("ERROR", "Failed to compute SHA256");
            publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,-50", "Failed: Checksum Error");
            return -12;
        }
        if (strcasecmp(computed, info->checksum) != 0)
        {
            log_message("ERROR", "Checksum mismatch (expected=%s, computed=%s)", info->checksum, computed);
            publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,-50", "Failed: Checksum Error");
            return -13;
        }
    }

    /* 3) Publish 50%: verified */
    publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,50", "Success: Checksum validation Success");

    char upgrade_cmd[1024];
    if (info->keepConfig){
        //Make persistent storage for keep config
        system("mkdir -p /log/keepconfig");
        system("uci export > /log/keepconfig/uci_backup.conf");
        system("sync");
        snprintf(upgrade_cmd, sizeof(upgrade_cmd), "sysupgrade -c '%s' >/tmp/fw_upgrade.log 2>&1", FW_DOWNLOAD_PATH);
    }
    else
        snprintf(upgrade_cmd, sizeof(upgrade_cmd), "sysupgrade -n '%s' >/tmp/fw_upgrade.log 2>&1", FW_DOWNLOAD_PATH);

    log_message("INFO", "Executing: %s", upgrade_cmd);

    /* 5) Prepare sysupgrade command and publish 60% */
    publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,60", "Success: Firmware Update");
    
    /* 6) Prepare sysupgrade command and publish 70% */
    publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,70", "Upgrading FW...");
    
    /* attempt to run sysupgrade. This will typically reboot the device.
       We still publish the final progress before returning. */
    rc = system(upgrade_cmd);
    if (rc != 0)
    {
        log_message("ERROR", "sysupgrade failed (rc=%d) - see /tmp/fw_upgrade.log", rc);
        publish_progress(&mqttContext, statusTopic, notificationId, "Inprogress,-70", "Failed: upgrade_failed");
        return -20;
    }

    /* If sysupgrade returns (some devices might reboot immediately), publish 100% */
    publish_progress(mqttContext, statusTopic, notificationId, "Inprogress,100", "Rebooting");

    /* success - device should reboot */
    return 0;
}

/* Thread entry: calls performFirmwareUpgradeSync */
static void *firmware_thread_main(void *vargs)
{
    FirmwareUpgradeArgs *args = (FirmwareUpgradeArgs *)vargs;
    int rc = performFirmwareUpgradeSync(args->mqttContext, &args->info, args->notificationId, args->statusTopic);
    if (rc == 0)
        log_message("INFO", "Firmware upgrade thread finished successfully (likely rebooting).");
    else
        log_message("ERROR", "Firmware upgrade thread finished with error %d", rc);

    /* clear running flag */
    pthread_mutex_lock(&fw_state_mutex);
    fw_running = false;
    pthread_mutex_unlock(&fw_state_mutex);

    free(args);
    return NULL;
}

/* Public: start async upgrade. Returns 0 if started, -1 if already running. */
int start_firmware_upgrade_async(MQTTContext_t *mqttContext,
                                 const FirmwareUpgradeInfo *info,
                                 const char *notificationId,
                                 const char *statusTopic)
{
    if (!mqttContext || !info || !notificationId || !statusTopic) return -2;
    delete_log_certs_if_beta(); //Delete backup creds if existing connection is with beta
    pthread_mutex_lock(&fw_state_mutex);
    if (fw_running)
    {
        pthread_mutex_unlock(&fw_state_mutex);
        log_message("WARN", "Firmware upgrade already in progress, rejecting new request");
        return -1;
    }
    fw_running = true;
    pthread_mutex_unlock(&fw_state_mutex);

    FirmwareUpgradeArgs *args = calloc(1, sizeof(*args));
    if (!args)
    {
        log_message("ERROR", "Memory allocation failure");
        pthread_mutex_lock(&fw_state_mutex);
        fw_running = false;
        pthread_mutex_unlock(&fw_state_mutex);
        return -3;
    }

    args->mqttContext = mqttContext;
    strncpy(args->info.url, info->url, sizeof(args->info.url) - 1);
    strncpy(args->info.checksum, info->checksum, sizeof(args->info.checksum) - 1);
    args->info.keepConfig = info->keepConfig;
    strncpy(args->notificationId, notificationId, sizeof(args->notificationId) - 1);
    strncpy(args->statusTopic, statusTopic, sizeof(args->statusTopic) - 1);

    int rc = pthread_create(&fw_thread, NULL, firmware_thread_main, args);
    if (rc != 0)
    {
        log_message("ERROR", "Failed to create firmware thread (errno=%d)", rc);
        free(args);
        pthread_mutex_lock(&fw_state_mutex);
        fw_running = false;
        pthread_mutex_unlock(&fw_state_mutex);
        return -4;
    }

    pthread_detach(fw_thread); /* no join needed */
    log_message("INFO", "Firmware upgrade thread started");
    return 0;
}

