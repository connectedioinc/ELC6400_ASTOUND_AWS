/*JSON publish utilities*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
/*Config settings*/
#include "cioClient_config.h"
/* MQTT API headers. */
#include "core_mqtt.h"
#include "core_mqtt_state.h"
/* OpenSSL sockets transport implementation. */
#include "openssl_posix.h"
/*Include backoff algorithm header for retry logic.*/
#include "backoff_algorithm.h"
/* Clock for timer. */
#include "clock.h"
/* MQTT Client constants/Markers */
#include "cio_defaults.h"
#include "utilities.h"
#include "cjson/cJSON.h"
#include "mqtt_sync.h"

#include "publish_utils.h"
#include "command_response.h"

//Creates Data Usage JSON
void buildDataUsageJson(MQTTContext_t *pMqttContext, const char *imei, const char *topic)
{
    /* Create root object */
    cJSON *root = cJSON_CreateObject();
    if (!root)
    {
        log_message("ERROR", "Failed to create JSON root object");
        return;
    }

    /* Create I object and add "a" FIRST */
    cJSON *I = cJSON_CreateObject();
    if (!I)
    {
        log_message("ERROR", "Failed to create JSON inner object");
        cJSON_Delete(root);
        return;
    }

    /* a must be FIRST */
    cJSON_AddStringToObject(I, "a", imei);

    /* Now build the existing usage JSON ("b","c","d",...) */
    cJSON *usage = buildDataUsageJsonResp();
    if (!usage)
    {
        log_message("ERROR", "Failed to build data usage JSON response");
        cJSON_Delete(I);
        cJSON_Delete(root);
        return;
    }

    /* Merge all children from usage → I (after "a") */
    cJSON *child = usage->child;
    while (child)
    {
        /* Detach each item from usage and add to I */
        cJSON *detached = cJSON_DetachItemFromObject(usage, child->string);
        cJSON_AddItemToObject(I, detached->string, detached);

        /* Restart at new first child every time */
        child = usage->child;
    }

    cJSON_Delete(usage);

    /* Wrap as { "I": {...} } */
    cJSON_AddItemToObject(root, "I", I);

    /* Print and publish */
    char *jsonStr = cJSON_PrintUnformatted(root);
    if (jsonStr)
    {
        publishToTopicQOS(pMqttContext, topic, jsonStr, MQTTQoS1);
        free(jsonStr);
    }
    else
    {
        log_message("ERROR", "Failed to print JSON");
    }

    cJSON_Delete(root);
}
//Creates Ethernet host JSON
/*void buildEthernetHostsJson(MQTTContext_t *pMqttContext, const char *imei, const char *topic)
{
    FILE *fp = fopen("/proc/net/arp", "r");
    if (!fp)
    {
        log_message("ERROR", "Cannot open /proc/net/arp");
        return;
    }

    
    cJSON *root = cJSON_CreateObject();
    cJSON *U = cJSON_CreateObject();
    cJSON_AddItemToObject(root, "T", U);

    //Add IMEI 
    cJSON_AddStringToObject(U, "a", imei ? imei : "-");

    //Ethernet hosts array 
    cJSON *arr = cJSON_CreateArray();
    cJSON_AddItemToObject(U, "b", arr);

    typedef struct HostEntry {
        char iface[32];
        char host[64], ip[64], mac[64], rx[32], tx[32], port[16];
    } HostEntry;

    HostEntry hosts[128];
    int host_count = 0;

    char line[256];
    fgets(line, sizeof(line), fp); // skip header

    // ---- Parse ARP table ----
    while (fgets(line, sizeof(line), fp))
    {
        char ip[64] = {0}, mac[64] = {0}, device[32] = {0};

        if (sscanf(line, "%63s %*s %*s %63s %*s %31s",
                   ip, mac, device) != 3)
            continue;

        if (!(strncmp(device, "lan", 3) == 0 || strcmp(device, "br-lan") == 0))
            continue;

        HostEntry *h = &hosts[host_count++];
        strncpy(h->ip, ip, sizeof(h->ip) - 1);
        strncpy(h->mac, mac, sizeof(h->mac) - 1);
        strncpy(h->iface, device, sizeof(h->iface) - 1);

        // Hostname 
        char cmd[256];
        snprintf(cmd, sizeof(cmd), "grep %s /tmp/dhcp.leases | awk '{print $4}'", mac);
        get_cmd_output(cmd, h->host, sizeof(h->host));
        trim(h->host);
        if (strlen(h->host) == 0)
            strcpy(h->host, "unknown");

        // RX / TX
        snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/rx_bytes", device);
        get_cmd_output(cmd, h->rx, sizeof(h->rx));
        trim(h->rx);

        snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/tx_bytes", device);
        get_cmd_output(cmd, h->tx, sizeof(h->tx));
        trim(h->tx);

        strcpy(h->port, "-");   // filled later
    }
    fclose(fp);

    // ---- Map MAC → LAN port ---- 
    FILE *bf = popen("bridge fdb show br br-lan | grep -v permanent", "r");
    if (bf) {
    	char line[256];
    	while (fgets(line, sizeof(line), bf)) {
        	char mac[64] = {0}, dev[32] = {0};
        
        	if (sscanf(line, "%63s dev %31s", mac, dev) == 2) {
            		int portNum = -1;

            		// On these models, 'dev' is often a virtual VLAN interface (e.g., eth0.1)
            		// To get the PHYSICAL port, we check the bridge port index
            		char path[128];
            		snprintf(path, sizeof(path), "/sys/class/net/%s/brport/port_no", dev);
            
            		FILE *pf = fopen(path, "r");
            		if (pf) {
                		fscanf(pf, "%d", &portNum);
                		fclose(pf);
            		}

            		// Map the internal port_no to your JSON port number
            		// Usually: Port 1 = LAN1, Port 2 = LAN2...
            		for (int i = 0; i < host_count; i++) {
                		if (strcasecmp(hosts[i].mac, mac) == 0) {
                    			snprintf(hosts[i].port, sizeof(hosts[i].port), "%d", portNum);
                   		 	break;
                		}
            		}
        	}
    	}
    	pclose(bf);
     }
    // ---- Build JSON array ---- 
    for (int i = 0; i < host_count; i++)
    {
        HostEntry *h = &hosts[i];

        trim(h->host);
        trim(h->ip);
        trim(h->mac);
        trim(h->rx);
        trim(h->tx);
        trim(h->port);
        trim(h->iface);

        cJSON *entry = cJSON_CreateObject();
        cJSON_AddStringToObject(entry, "a", h->host);
        cJSON_AddStringToObject(entry, "b", h->ip);
        cJSON_AddStringToObject(entry, "c", h->mac);
        cJSON_AddStringToObject(entry, "d", h->rx);
        cJSON_AddStringToObject(entry, "e", h->tx);
        cJSON_AddStringToObject(entry, "f", h->port);
        cJSON_AddStringToObject(entry, "g", h->iface);

        cJSON_AddItemToArray(arr, entry);
    }

    // ---- Publish JSON ---- 
    char *jsonStr = cJSON_PrintUnformatted(root);

    log_message("INFO", "Ethernet hosts JSON: %s", jsonStr);

    publishToTopicQOS(pMqttContext, topic, jsonStr, MQTTQoS1);

    free(jsonStr);
    cJSON_Delete(root);
}*/

/* --- Helper: Convert Portmap Hex Mask to Port Number --- */
static int get_port_from_mask(int mask) {
    if (mask <= 0) return -1;
    int port = 0;
    while (!(mask & 1)) {
        mask >>= 1;
        port++;
    }
    return port;
}

/* --- Helper: Check if Physical Port is electrically UP --- */
static int check_physical_link(int port_num) {
    char cmd[128], result[256] = {0};
    snprintf(cmd, sizeof(cmd), "swconfig dev switch0 port %d get link", port_num);
    
    FILE *pp = popen(cmd, "r");
    if (!pp) return 0;
    
    int is_up = 0;
    if (fgets(result, sizeof(result), pp)) {
        // Only return 1 if the hardware confirms "link:up"
        if (strstr(result, "link:up")) is_up = 1;
    }
    pclose(pp);
    return is_up;
}

void buildEthernetHostsJson(MQTTContext_t *pMqttContext, const char *imei, const char *topic)
{
    FILE *fp = fopen("/proc/net/arp", "r");
    if (!fp) return;

    /* --- 1. Initialize JSON Root --- */
    cJSON *root = cJSON_CreateObject();
    cJSON *U = cJSON_CreateObject();
    cJSON_AddItemToObject(root, "T", U);
    cJSON_AddStringToObject(U, "a", imei ? imei : "-");

    // Array initialized as empty []
    cJSON *arr = cJSON_CreateArray();
    cJSON_AddItemToObject(U, "b", arr);

    typedef struct {
        char host[64], ip[64], mac[64], port_label[16];
        char rx_stat[32]; 
        char tx_stat[32];
        int is_verified_lan;
    } LanCandidate;

    LanCandidate candidates[64];
    int count = 0;
    char line[256];

    fgets(line, sizeof(line), fp); // skip header

    /* --- 2. Collect Candidates from ARP (Filter by Bridge) --- */
    while (fgets(line, sizeof(line), fp) && count < 64) {
        char ip[64], mac[64], dev[32];
        int flags;

        if (sscanf(line, "%63s %*s 0x%x %63s %*s %31s", ip, &flags, mac, dev) != 4) continue;

        //  Must be on br-lan and have a resolved MAC
        if (flags == 0x0 || strcmp(dev, "br-lan") != 0) continue;

        memset(&candidates[count], 0, sizeof(LanCandidate));
        strcpy(candidates[count].ip, ip);
        strcpy(candidates[count].mac, mac);
        candidates[count].is_verified_lan = 0;
        
	strcpy(candidates[count].rx_stat, "0");
        strcpy(candidates[count].tx_stat, "0");
        
        // Fetch Hostname
        char cmd[256];
        snprintf(cmd, sizeof(cmd), "grep -i %s /tmp/dhcp.leases | awk '{print $4}'", mac);
        get_cmd_output(cmd, candidates[count].host, sizeof(candidates[count].host));
        trim(candidates[count].host);
        if (strlen(candidates[count].host) == 0) strcpy(candidates[count].host, "unknown");

        count++;
    }
    fclose(fp);

    /* --- 3. Physical Validation via Switch ARL & Link Status --- */
    FILE *sf = popen("swconfig dev switch0 get dump_arl", "r");
    if (sf) {
        char sw_line[512];
        while (fgets(sw_line, sizeof(sw_line), sf)) {
            char s_mac[64] = {0};
            int s_mask = 0;

            if (sscanf(sw_line, "MAC: %63s PORTMAP: 0x%x", s_mac, &s_mask) == 2) {
                int port_id = get_port_from_mask(s_mask);

                for (int i = 0; i < count; i++) {
                    if (strcasecmp(candidates[i].mac, s_mac) == 0) {
                        // Check: Is it a physical LAN port (2, 3, or 4)?
                        if (port_id >= 2 && port_id <= 4) {
                            // Final Check: Is the cable actually plugged in?
                            if (check_physical_link(port_id)) {
                                candidates[i].is_verified_lan = 1;
                                snprintf(candidates[i].port_label, 16, "%d", port_id - 1);
                                get_port_stats(port_id, candidates[i].rx_stat, candidates[i].tx_stat, sizeof(candidates[i].rx_stat));
                            }
                        }
                        break; 
                    }
                }
            }
        }
        pclose(sf);
    }

    /* --- 4. Final Assembly --- */
    for (int i = 0; i < count; i++) {
        if (candidates[i].is_verified_lan) {
            cJSON *entry = cJSON_CreateObject();
            cJSON_AddStringToObject(entry, "a", candidates[i].host);
            cJSON_AddStringToObject(entry, "b", candidates[i].ip);
            cJSON_AddStringToObject(entry, "c", candidates[i].mac);
            
            cJSON_AddStringToObject(entry, "d", candidates[i].rx_stat); // Actual RX (RxGoodByte)
            cJSON_AddStringToObject(entry, "e", candidates[i].tx_stat); // Actual TX (TxByte)
            
            cJSON_AddStringToObject(entry, "f", candidates[i].port_label);
            cJSON_AddStringToObject(entry, "g", "br-lan");
            cJSON_AddItemToArray(arr, entry);
        }
    }

    /* --- 5. Publish --- */
    char *jsonStr = cJSON_PrintUnformatted(root);
    if (jsonStr) {
        log_message("INFO", "Publishing LAN-only JSON: %s", jsonStr);
        publishToTopicQOS(pMqttContext, topic, jsonStr, MQTTQoS1);
        free(jsonStr);
    }

    cJSON_Delete(root);
}
// WiFi host JSON builder (handles both wlan0-1 and wlan1-2)
void buildWifiHostsJson(MQTTContext_t *pMqttContext, const char *imei, const char *topic)
{
    char interfaces[16][32];
    int ifaceCount = get_wifi_interfaces(interfaces, 16);
    //const char *interfaces[] = {"wlan0-1", "wlan1-2"};
    //const int ifaceCount = sizeof(interfaces) / sizeof(interfaces[0]);

    /* Root object -> contains "R" */
    cJSON *root = cJSON_CreateObject();

    /* R object */
    cJSON *R = cJSON_CreateObject();
    cJSON_AddItemToObject(root, "R", R);

    /* R["a"] = IMEI */
    cJSON_AddStringToObject(R, "a", (imei ? imei : "-"));

    /* R["b"] = array */
    cJSON *arr = cJSON_CreateArray();
    cJSON_AddItemToObject(R, "b", arr);

    for (int i = 0; i < ifaceCount; i++)
    {
        const char *iface = interfaces[i];
        char cmdList[128];

        snprintf(cmdList, sizeof(cmdList),
                 "iw dev %s station dump | grep Station | awk '{print $2}'", iface);

        FILE *fp = popen(cmdList, "r");
        if (!fp)
        {
            log_message("WARN", "Failed to list stations on %s", iface);
            continue;
        }

        char mac[64];

        while (fgets(mac, sizeof(mac), fp))
        {
            trim(mac);
            if (strlen(mac) == 0)
                continue;

            /* --- IP --- */
            char ip[64] = {0};
            char cmd[256];

            snprintf(cmd, sizeof(cmd),
                     "grep -i %s /proc/net/arp | awk '{print $1}'", mac);
            get_cmd_output(cmd, ip, sizeof(ip));
            trim(ip);

            /* --- RX/TX --- */
            char rx[32] = {0}, tx[32] = {0};

            snprintf(cmd, sizeof(cmd),
                     "iw dev %s station get %s | grep 'rx bytes' | awk '{print $3}'",
                     iface, mac);
            get_cmd_output(cmd, rx, sizeof(rx));

            snprintf(cmd, sizeof(cmd),
                     "iw dev %s station get %s | grep 'tx bytes' | awk '{print $3}'",
                     iface, mac);
            get_cmd_output(cmd, tx, sizeof(tx));

            trim(rx);
            trim(tx);

            /* --- SSID --- */
            char ssid[64] = {0};
            snprintf(cmd, sizeof(cmd),
                     "iwinfo %s info | awk -F'\"' '/ESSID:/ {print $2}'",
                     iface);
            get_cmd_output(cmd, ssid, sizeof(ssid));
            trim(ssid);

            /* --- Hostname --- */
            char host[64] = {0};
            snprintf(cmd, sizeof(cmd),
                     "grep %s /tmp/dhcp.leases | awk '{print $4}'", mac);
            get_cmd_output(cmd, host, sizeof(host));
            trim(host);

            /* Defaults */
            if (!strlen(host)) strcpy(host, "-");
            if (!strlen(ip))   strcpy(ip, "-");
            if (!strlen(ssid)) strcpy(ssid, "-");
            if (!strlen(rx))   strcpy(rx, "0");
            if (!strlen(tx))   strcpy(tx, "0");

            /* --- Build host object --- */
            cJSON *dev = cJSON_CreateObject();
            cJSON_AddStringToObject(dev, "a", host);
            cJSON_AddStringToObject(dev, "b", ip);
            cJSON_AddStringToObject(dev, "c", mac);
            cJSON_AddStringToObject(dev, "d", ssid);
            cJSON_AddStringToObject(dev, "e", rx);
            cJSON_AddStringToObject(dev, "f", tx);

            /* Add to array */
            cJSON_AddItemToArray(arr, dev);
        }

        pclose(fp);
    }

    /* Convert to string & publish */
    char *json = cJSON_PrintUnformatted(root);
    log_message("INFO", "Wi-Fi hosts JSON: %s", json);

    MQTTStatus_t status = publishToTopicQOS(pMqttContext, topic, json, MQTTQoS1);
    if (status != MQTTSuccess)
        log_message("ERROR", "Failed to publish Wi-Fi hosts JSON (%d)", status);

    free(json);
    cJSON_Delete(root);
}


//U Object - SNR,NETMODE..
void buildGJson(MQTTContext_t *mqttContext, const char *imei, const char *topic)
{
    char snr[32]= {0};
    char netmode[64]= {0};
    char signal[32]= {0};
    char uptime[64]= {0};
    char simslot[8]= {0};
    char iccid[64] = {0};

    char simIntf1[8] = {0};
    char simIntf2[8] = {0};

    /* --- Detect active SIM slot --- */
    execute_system_command(
        "ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",
        simIntf1, sizeof(simIntf1)
    );
    execute_system_command(
        "ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",
        simIntf2, sizeof(simIntf2)
    );

    if (strstr(simIntf1, "true"))
        strcpy(simslot, "1");
    else if (strstr(simIntf2, "true"))
        strcpy(simslot, "2");
    else
        strcpy(simslot, "-");

    /* --- Modem values (same for all slots) --- */
    if (get_snr(snr) != 0)              strcpy(snr, "ERROR");
    if (get_mode(netmode) != 0)         strcpy(netmode, "ERROR");
    if (get_signal_strength(signal) != 0) strcpy(signal, "ERROR");
    if (get_system_uptime(uptime) != 0) strcpy(uptime, "ERROR");
    if (get_iccid(iccid) != 0) strcpy(iccid, "ERROR");
    if (!strlen(iccid)) strcpy(iccid, "-");
    if (!strlen(simslot)) strcpy(simslot, "-");
            
    trim(snr);
    trim(netmode);
    trim(signal);
    trim(uptime);
    trim(simslot);
    trim(iccid);

    /* --- Active status (0/1/2) --- */
    int active_status = get_interface_status(WWAN);
    char actStr[8];
    snprintf(actStr, sizeof(actStr), "%d", active_status);

    /* ===========================================================
       ===============  JSON BUILD (REQUIRED FORMAT) =============
       =========================================================== */

    cJSON *root = cJSON_CreateObject();
    cJSON *U = cJSON_CreateObject();

    /* "a": IMEI */
    cJSON_AddStringToObject(U, "a", imei);

    /* "b": SYSTEM UPTIME */
    cJSON_AddStringToObject(U, "b", uptime);

    /* "c": ARRAY with ONE entry */
    cJSON *arr = cJSON_CreateArray();

    cJSON *entry = cJSON_CreateObject();
    cJSON_AddStringToObject(entry, "a", snr);
    cJSON_AddStringToObject(entry, "b", netmode);
    cJSON_AddStringToObject(entry, "c", signal);
    cJSON_AddStringToObject(entry, "d", iccid);
    cJSON_AddStringToObject(entry, "e", actStr);
    cJSON_AddStringToObject(entry, "f", simslot);

    cJSON_AddItemToArray(arr, entry);

    cJSON_AddItemToObject(U, "c", arr);

    cJSON_AddItemToObject(root, "U", U);

    /* publish */
    char *jsonStr = cJSON_PrintUnformatted(root);
    publishToTopicQOS(mqttContext, topic, jsonStr, MQTTQoS1);

    log_message("INFO", "Published U JSON: %s", jsonStr);

    free(jsonStr);
    cJSON_Delete(root);
}

//N Object - O/p of cat /proc/loadavg
void buildNJson(MQTTContext_t *mqttContext, const char *imei, const char *topic)
{
    char loadavg[256];
    get_cmd_output("cat /proc/loadavg", loadavg, sizeof(loadavg));
    trim(loadavg);

    char load1[32], load5[32], load15[32], threads[64], lastpid[32], temp[32];
    sscanf(loadavg, "%31s %31s %31s %63s %31s", load1, load5, load15, threads, lastpid);
    get_cmd_output("gsmctl -c | awk '{printf \"%.1f\", $1/10}'", temp, sizeof(temp));

    cJSON *root = cJSON_CreateObject();
    cJSON *N = cJSON_CreateObject();
    cJSON_AddStringToObject(N, "a", imei);

    cJSON *b = cJSON_CreateObject();
    cJSON_AddStringToObject(b, "a", load1);
    cJSON_AddStringToObject(b, "b", load5);
    cJSON_AddStringToObject(b, "c", load15);
    cJSON_AddStringToObject(b, "d", threads);
    cJSON_AddStringToObject(b, "e", lastpid);
    cJSON_AddStringToObject(b, "f", temp);

    cJSON_AddItemToObject(N, "b", b);
    cJSON_AddItemToObject(root, "N", N);

    char *jsonStr = cJSON_PrintUnformatted(root);
    publishToTopicQOS(mqttContext, topic, jsonStr, MQTTQoS1);

    log_message("INFO", "Published N JSON: %s", jsonStr);
    free(jsonStr);
    cJSON_Delete(root);
}
//O Object - O/p of /proc/meminfo
void buildOJson(MQTTContext_t *mqttContext, const char *imei, const char *topic)
{
    FILE *fp = fopen("/proc/meminfo", "r");
    if (!fp) return;

    cJSON *root = cJSON_CreateObject();
    cJSON *O = cJSON_CreateObject();
    cJSON_AddStringToObject(O, "a", imei);
    cJSON *b = cJSON_CreateObject();

    char line[128], key[64], value[64];
    int idx = 0;
    while (fgets(line, sizeof(line), fp) && idx < 17) {
        if (sscanf(line, "%63[^:]: %63s", key, value) == 2) {
            char keybuf[64];
            snprintf(keybuf, sizeof(keybuf), "%c", 'a' + idx);
            cJSON_AddStringToObject(b, keybuf, value);
            idx++;
        }
    }
    fclose(fp);

    cJSON_AddItemToObject(O, "b", b);
    cJSON_AddItemToObject(root, "O", O);

    char *jsonStr = cJSON_PrintUnformatted(root);
    publishToTopicQOS(mqttContext, topic, jsonStr, MQTTQoS1);

    log_message("INFO", "Published O JSON: %s", jsonStr);
    free(jsonStr);
    cJSON_Delete(root);
}
//P Object - O/p of df | tail -n +2
void buildPJson(MQTTContext_t *mqttContext, const char *imei, const char *topic)
{
    FILE *fp = popen("df | tail -n +2", "r");
    if (!fp) return;

    cJSON *root = cJSON_CreateObject();
    cJSON *P = cJSON_CreateObject();
    cJSON_AddStringToObject(P, "a", imei);

    cJSON *bArray = cJSON_CreateArray();
    char line[256], part[64], size[32], used[32], avail[32], usep[32], mount[64];

    while (fgets(line, sizeof(line), fp))
    {
        if (sscanf(line, "%63s %31s %31s %31s %31s %63s",
                   part, size, used, avail, usep, mount) == 6)
        {
            cJSON *entry = cJSON_CreateObject();
            cJSON_AddStringToObject(entry, "a", part);
            cJSON_AddStringToObject(entry, "b", size);
            cJSON_AddStringToObject(entry, "c", used);
            cJSON_AddStringToObject(entry, "d", avail);
            cJSON_AddStringToObject(entry, "e", usep);
            cJSON_AddStringToObject(entry, "f", mount);
            cJSON_AddItemToArray(bArray, entry);
        }
    }
    pclose(fp);

    cJSON_AddItemToObject(P, "b", bArray);
    cJSON_AddItemToObject(root, "P", P);

    char *jsonStr = cJSON_PrintUnformatted(root);
    publishToTopicQOS(mqttContext, topic, jsonStr, MQTTQoS1);

    log_message("INFO", "Published P JSON: %s", jsonStr);
    free(jsonStr);
    cJSON_Delete(root);
}
