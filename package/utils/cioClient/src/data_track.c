#include "data_track.h"
#include "cioclient_log.h"
#include "utilities.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/stat.h>
#include <signal.h>

DataTrackContext g_dataTrackCtx = {0};
char g_dataTrackNotifId[64] = {0};

static void upload_chunk(const char *filename, const char *url, const char *header)
{
    char cmd[1024];
    if (strlen(header) > 0)
        snprintf(cmd, sizeof(cmd), "curl -X POST -H \"%s\" -F 'file=@%s' '%s'", header, filename, url);
    else
        snprintf(cmd, sizeof(cmd), "curl -X POST -F 'file=@%s' '%s'", filename, url);
    system(cmd);
}

void *data_track_thread(void *arg)
{
    DataTrackContext *ctx = (DataTrackContext *)arg;

    system("mkdir -p /tmp/data_track");
    system("rm -f /tmp/data_track/*");

    // --- Generate MAC and timestamp for naming ---
    char mac[32] = {0};
    char timestamp[32] = {0};
    char pcap_path[128] = {0};

    // Get eth0 MAC (last part, uppercase, no colons)
    get_cmd_output("cat /sys/class/net/eth0/address | cut -d: -f4- | sed 's/[:^]//g' | tr 'a-z' 'A-Z'",
                   mac, sizeof(mac));
    trim(mac);

    // Get timestamp: YYYY-MM-DD_HH-MM-SS
    time_t now = time(NULL);
    struct tm *tm_info = localtime(&now);
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d_%H-%M-%S", tm_info);

    // PCAP capture file path
    snprintf(pcap_path, sizeof(pcap_path),
             "/tmp/data_track/Capture_%s_%s.pcap", mac, timestamp);

    log_message("INFO", "Starting tcpdump: %s (duration=%d seconds)", pcap_path, ctx->duration);

    // Start tcpdump in background and save PID
    char cmd[256];
    snprintf(cmd, sizeof(cmd),
             "tcpdump -i any -w %s & echo $! > /tmp/data_track/pid", pcap_path);
    system(cmd);

    int elapsed = 0;
    const int chunk_interval = 30;  // compress/upload every 30 seconds

    while (elapsed < ctx->duration && ctx->active)
    {
        sleep(chunk_interval);
        elapsed += chunk_interval;

        log_message("INFO", "Compressing and splitting capture (elapsed=%d sec)", elapsed);

        // --- Compress capture file and split into 5MB chunks ---
	snprintf(cmd, sizeof(cmd),
         "cd /tmp/data_track && "
         "tar -czf Capture_%s_%s.tar.gz Capture_%s_%s.pcap && "
         "size=$(stat -c%%s Capture_%s_%s.tar.gz); "
         "i=0; "
         "while [ $((i*5242880)) -lt $size ]; do "
         "suffix=$(printf '%%02d' $i); "
         "dd if=Capture_%s_%s.tar.gz bs=5M skip=$i count=1 "
         "of=Capture_%s_%s_$suffix 2>/dev/null; "
         "i=$((i+1)); "
         "done",
         mac, timestamp, mac, timestamp, mac, timestamp,
         mac, timestamp, mac, timestamp);
	system(cmd);

        // --- Upload each chunk ---
        snprintf(cmd, sizeof(cmd),
                 "cd /tmp/data_track && for f in Capture_%s_%s_*; do "
                 "[ -f \"$f\" ] && "
                 "log_file=$(basename \"$f\"); "
                 "curl -s -w '%%{http_code}' -F backup=@\"$f\" '%s' "
                 "--max-time 60 --silent --output /dev/null --show-error; "
                 "log_message=\"Uploaded $log_file to %s\"; "
                 "logger \"$log_message\"; "
                 "done",
                 mac, timestamp, ctx->url, ctx->url);
        system(cmd);

        // --- Clean temporary chunks to avoid duplicates ---
        system("rm -f /tmp/data_track/Capture_*_*.tar.gz /tmp/data_track/Capture_*_*_aa* /tmp/data_track/Capture_*_*_ab*");
    }

    // Stop tcpdump safely
    system("kill $(cat /tmp/data_track/pid) 2>/dev/null");
    system("rm -f /tmp/data_track/pid");

    ctx->active = false;
    log_message("INFO", "Data tracking completed and stopped successfully");

    return NULL;
}


char *start_data_track(const char *url, int duration, const char *header, const char *notifID)
{
    if (g_dataTrackCtx.active)
        return strdup("Data tracking already running");

    memset(&g_dataTrackCtx, 0, sizeof(g_dataTrackCtx));
    g_dataTrackCtx.active = true;
    g_dataTrackCtx.start_time = time(NULL);
    g_dataTrackCtx.duration = duration;
    strncpy(g_dataTrackCtx.url, url, sizeof(g_dataTrackCtx.url) - 1);
    strncpy(g_dataTrackCtx.header, header, sizeof(g_dataTrackCtx.header) - 1);
    
    // store the original notification ID for reference
    strncpy(g_dataTrackNotifId, notifID, sizeof(g_dataTrackNotifId) - 1);
            
    char cmd[200] = {0};
    char respCmd[8] = {0};     
    snprintf(cmd, sizeof(cmd), "uci set system.@system[0].data_tracking_upload_url=%s", url);
    execute_system_command(cmd,  respCmd, sizeof(respCmd));
    execute_system_command("uci set system.@system[0].enable_data_traffic=1",  respCmd, sizeof(respCmd));
    
    execute_system_command("uci commit system",  respCmd, sizeof(respCmd));		   
    if (pthread_create(&g_dataTrackCtx.thread, NULL, data_track_thread, &g_dataTrackCtx) != 0)
        return strdup("Failed to start data tracking thread");

    return strdup("Data tracking started successfully");
}

char *get_data_track_status(void)
{
    if (!g_dataTrackCtx.active)
        return strdup("No active data tracking session");

    time_t now = time(NULL);
    int remaining = g_dataTrackCtx.duration - (int)(now - g_dataTrackCtx.start_time);
    if (remaining < 0) remaining = 0;

    char *resp;
    asprintf(&resp, "Data tracking active, remaining time: %d seconds", remaining);
    return resp;
}

char *stop_data_track(void)
{
    if (!g_dataTrackCtx.active)
        return strdup("No active data tracking to stop");

    g_dataTrackCtx.active = false;
    system("kill $(cat /tmp/data_track/pid) 2>/dev/null");
    pthread_join(g_dataTrackCtx.thread, NULL);
    return strdup("Data tracking stopped successfully");
}

