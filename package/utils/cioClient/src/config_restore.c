#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <unistd.h>
#include <sys/stat.h>
#include "cioclient_log.h"
#include "publish_utils.h"
#include "utilities.h"
#include "config_restore.h"
#include "cjson/cJSON.h"
#include "firmware_upgrade.h"

/* Helper: determine checksum command dynamically */
static const char *detect_checksum_tool(const char *checksum)
{
    if (!checksum) return "md5sum";
    size_t len = strlen(checksum);
    // SHA256 is 64 hex chars, MD5 is 32
    return (len > 40) ? "sha256sum" : "md5sum";
}

/* Helper: detect decompression type and build tar command */
static void build_tar_command(const char *filename, char *cmd, size_t cmdlen)
{
    if (strstr(filename, ".tar.gz") || strstr(filename, ".tgz"))
        snprintf(cmd, cmdlen, "tar xzvf %s -C /", filename);
    else if (strstr(filename, ".tar.bz2"))
        snprintf(cmd, cmdlen, "tar xjvf %s -C /", filename);
    else if (strstr(filename, ".tar.xz"))
        snprintf(cmd, cmdlen, "tar xJvf %s -C /", filename);
    else
        snprintf(cmd, cmdlen, "tar xvf %s -C /", filename);
}

/* Main restore logic */
int perform_config_restore(MQTTContext_t *mqttContext,
                           const char *topic,
                           const char *notificationID,
                           const char *url,
                           const char *checksum)
{
    if (!mqttContext || !topic || !notificationID || !url || !checksum)
        return -1;

    char localFile[128] = "/tmp/config_restore.tar.gz";
    char calcSum[128] = {0};
    char cmd[512];

    log_message("INFO", "Starting configuration restore from %s", url);
    publish_progress(mqttContext, topic, notificationID, "Inprogress,5", "Downloading config file...");

    /* --- Step 1: Download file --- */
    snprintf(cmd, sizeof(cmd), "curl -fsSL -o %s \"%s\"", localFile, url);
    int rc = system(cmd);
    if (rc != 0)
    {
        publish_progress(mqttContext, topic, notificationID, "Inprogress,-40", "Failed:Download Error");
        log_message("ERROR", "Download failed (rc=%d)", rc);
        return -2;
    }
    publish_progress(mqttContext, topic, notificationID, "Inprogress,40", "File downloaded successfully");

    /* --- Step 2: Verify checksum --- */
    const char *sumTool = detect_checksum_tool(checksum);
    snprintf(cmd, sizeof(cmd), "%s %s | awk '{print $1}'", sumTool, localFile);
    execute_system_command(cmd, calcSum, sizeof(calcSum));
    trim(calcSum);

    if (strlen(calcSum) == 0 || strcasecmp(calcSum, checksum) != 0)
    {
        log_message("ERROR", "Checksum mismatch (expected=%s, got=%s)", checksum, calcSum);
        publish_progress(mqttContext, topic, notificationID, "Inprogress,-50", "Checksum validation Failed");
        unlink(localFile);
        return -3;
    }
    publish_progress(mqttContext, topic, notificationID, "Inprogress,50", "Success:Checksum validation Success");

    /* --- Step 3: Extract configuration --- */
    char tarCmd[256];
    build_tar_command(localFile, tarCmd, sizeof(tarCmd));
    strncat(tarCmd, " 2>/tmp/config_restore_err.log", sizeof(tarCmd) - strlen(tarCmd) - 1);
    rc = system(tarCmd);
    if (rc != 0)
    {
        publish_progress(mqttContext, topic, notificationID, "Inprogress,-50", "Failed:Extraction Error");
        log_message("ERROR", "Extraction failed (rc=%d)", rc);
        unlink(localFile);
        return -4;
    }

    publish_progress(mqttContext, topic, notificationID, "Inprogress,60", "Success:Config_Update");

    /* --- Step 4: Apply restored configuration --- */
    log_message("INFO", "Applying configuration (uci commit + reload)");
    publish_progress(mqttContext, topic, notificationID, "Inprogress,70", "Updating config...");    
    system("uci commit >/dev/null 2>&1");
    system("/etc/init.d/network reload >/dev/null 2>&1");
    publish_progress(mqttContext, topic, notificationID, "Inprogress,100", "Rebooting the system...");
    log_message("INFO", "Configuration restore completed successfully.");
    unlink(localFile);
    system("reboot -f");
    return 0;
}

/* --- Asynchronous thread wrapper --- */
typedef struct {
    MQTTContext_t *mqttContext;
    char topic[256];
    char notificationID[128];
    char url[512];
    char checksum[128];
} ConfigRestoreArgs;

static void *config_restore_thread(void *arg)
{
    ConfigRestoreArgs *args = (ConfigRestoreArgs *)arg;
    perform_config_restore(args->mqttContext, args->topic,
                           args->notificationID, args->url, args->checksum);
    free(args);
    return NULL;
}

int start_config_restore_async(MQTTContext_t *mqttContext,
                               const char *topic,
                               const char *notificationID,
                               const char *url,
                               const char *checksum)
{
    ConfigRestoreArgs *args = calloc(1, sizeof(*args));
    if (!args)
        return -1;

    args->mqttContext = mqttContext;
    strncpy(args->topic, topic, sizeof(args->topic) - 1);
    strncpy(args->notificationID, notificationID, sizeof(args->notificationID) - 1);
    strncpy(args->url, url, sizeof(args->url) - 1);
    strncpy(args->checksum, checksum, sizeof(args->checksum) - 1);

    pthread_t tid;
    if (pthread_create(&tid, NULL, config_restore_thread, args) != 0)
    {
        free(args);
        return -2;
    }
    pthread_detach(tid);
    return 0;
}

