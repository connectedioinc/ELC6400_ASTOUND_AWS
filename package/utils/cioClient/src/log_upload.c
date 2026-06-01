#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <time.h>
#include <unistd.h>
#include "log_upload.h"
#include "cioclient_log.h"
#include "publish_utils.h"
#include "utilities.h"
#include "cjson/cJSON.h"

extern pthread_mutex_t mqtt_mutex;

static void publish_upload_status(MQTTContext_t *mqttContext,
                                  const char *topic,
                                  const char *notifID,
                                  const char *status,
                                  const char *details)
{
    cJSON *root = cJSON_CreateObject();
    cJSON_AddStringToObject(root, "a", notifID);
    cJSON_AddStringToObject(root, "b", status);
    cJSON_AddStringToObject(root, "c", details);

    char *json = cJSON_PrintUnformatted(root);
    if (json)
    {
        publishToTopicQOS(mqttContext, topic, json, MQTTQoS1);
        free(json);
    }
    cJSON_Delete(root);
}

/* Core blocking upload */
int performSingleLogUpload(MQTTContext_t *mqttContext,
                           const LogUploadInfo *info,
                           const char *notificationID,
                           const char *topic)
{
    if (!info || !notificationID || !topic || strlen(info->url) == 0)
        return -1;

    time_t now = time(NULL);
    struct tm *timeinfo = localtime(&now);

    char *log_filename = NULL;
    char *tmp_path = NULL;
    if (info->type == LOG_TYPE_SYSLOG)
    {
        asprintf(&log_filename, "SYS-LOG-AP102B-%d-%d-%d.txt",
                 timeinfo->tm_year + 1900, timeinfo->tm_mon + 1, timeinfo->tm_mday);
        asprintf(&tmp_path, "/tmp/%s", log_filename);
        log_message("INFO", "Generating system log: %s", tmp_path);
        char cmd[256];
        snprintf(cmd, sizeof(cmd), "logread > %s", tmp_path);
        system(cmd);
    }
    else if(info->type == LOG_TYPE_KERNEL)
    {
        asprintf(&log_filename, "KERNAL-LOG-AP102B-%d-%d-%d.txt",
                 timeinfo->tm_year + 1900, timeinfo->tm_mon + 1, timeinfo->tm_mday);
        asprintf(&tmp_path, "/tmp/%s", log_filename);
        log_message("INFO", "Generating kernel log: %s", tmp_path);
        char cmd[256];
        snprintf(cmd, sizeof(cmd), "dmesg > %s", tmp_path);
        system(cmd);
    }
    else
    {
        asprintf(&log_filename, "backup-AP102B-%d-%d-%d.tar.gz",
                 timeinfo->tm_year + 1900, timeinfo->tm_mon + 1, timeinfo->tm_mday);
        asprintf(&tmp_path, "/tmp/%s", log_filename);
        log_message("INFO", "Generating config backup: %s", tmp_path);
        char cmd[256];
        snprintf(cmd, sizeof(cmd), "sysupgrade -b %s", tmp_path);
        system(cmd);    
    }

    /* Step 2: Upload file */
    char curl_cmd[1024];
    snprintf(curl_cmd, sizeof(curl_cmd),
         "curl -s -w '%%{http_code}' -o /tmp/upload_resp.txt "
         "-F 'backup=@%s' '%s' > /tmp/upload_status.txt 2>&1",
         tmp_path, info->url);

    log_message("INFO", "Uploading log using: %s", curl_cmd);
    int rc = system(curl_cmd);
    if (rc != 0)
    {
        log_message("ERROR", "curl upload failed (rc=%d)", rc);
    	char status[32] = {0};
    	sprintf(status,"Failed:File Upload (rc=%d)",rc);         
        publish_upload_status(mqttContext, topic, notificationID, "Failed", status);
        free(log_filename);
        free(tmp_path);
        return -2;
    }

    /* Step 3: Check response */
    char http_code[16] = {0};
    FILE *fp = fopen("/tmp/upload_status.txt", "r");
    if (fp)
    {
        fgets(http_code, sizeof(http_code), fp);
        fclose(fp);
    }

    trim(http_code);
    if (strcmp(http_code, "200") == 0 || strcmp(http_code, "201") == 0)
    {
    	char status[32] = {0};
    	sprintf(status,"Success:File Uploaded:%s",log_filename);
        publish_upload_status(mqttContext, topic, notificationID, "Success", status);
        log_message("INFO", "%s uploaded successfully (HTTP %s)", log_filename, http_code);
    }
    else
    {   
        publish_upload_status(mqttContext, topic, notificationID, "Failed:File Upload", http_code);
        log_message("ERROR", "Upload failed for %s, HTTP %s", log_filename, http_code);
    }

    /* Cleanup */
    unlink(tmp_path);
    free(log_filename);
    free(tmp_path);
    return 0;
}

/* ---- Async Wrapper ---- */
typedef struct {
    MQTTContext_t *mqttContext;
    LogUploadInfo info;
    char notifID[128];
    char topic[256];
} LogUploadArgs;

static void *log_upload_thread(void *arg)
{
    LogUploadArgs *args = (LogUploadArgs *)arg;
    performSingleLogUpload(args->mqttContext, &args->info, args->notifID, args->topic);
    free(args);
    return NULL;
}

int start_single_log_upload_async(MQTTContext_t *mqttContext,
                                  const LogUploadInfo *info,
                                  const char *notificationID,
                                  const char *topic)
{
    LogUploadArgs *args = calloc(1, sizeof(*args));
    if (!args)
        return -1;

    args->mqttContext = mqttContext;
    strncpy(args->notifID, notificationID, sizeof(args->notifID) - 1);
    strncpy(args->topic, topic, sizeof(args->topic) - 1);
    memcpy(&args->info, info, sizeof(*info));

    pthread_t tid;
    if (pthread_create(&tid, NULL, log_upload_thread, args) != 0)
    {
        free(args);
        return -2;
    }
    pthread_detach(tid);
    log_message("INFO", "Log upload (type=%d) started in background", info->type);
    return 0;
}

