
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <errno.h>

#include "core_mqtt.h"        // defines MQTTContext_t
#include "cjson/cJSON.h"
#include "mqtt_sync.h"
#include "utilities.h"
#include "command_response.h"
#include "cioclient_log.h"
#include "cio_defaults.h"
#include "scripts/get_wifi_hosts_script.h"
#include "scripts/station_conn_status.h"

//Check-in interval variables
extern int g_checkin_interval;
extern pthread_mutex_t checkin_mutex;
//Keep-alive time
extern int g_mqtt_keepalive;
extern pthread_mutex_t mqtt_keepalive_mutex;
/* Build SIM/WAN Usage JSON block ("I") and return it */
cJSON *buildDataUsageJsonResp()
{
    char sim1Up[8] = {0}, sim2Up[8] = {0};
    char rxSim1[32] = "0", txSim1[32] = "0";
    char rxSim2[32] = "0", txSim2[32] = "0";
    char wanRx[64] = "0", wanTx[64] = "0";
    char bootSt[8] = {0};
    int fCheckin = 0;

    /* Detect active SIMs */
    get_cmd_output("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'", sim1Up, sizeof(sim1Up));
    get_cmd_output("ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'", sim2Up, sizeof(sim2Up));

    /* SIM1 usage */
    if (strstr(sim1Up, "true")) {
        get_cmd_output("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 rx", rxSim1, sizeof(rxSim1));
        get_cmd_output("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 tx", txSim1, sizeof(txSim1));
        trim(rxSim1);
        trim(txSim1);        
    }
    
    /* SIM2 usage */
    if (strstr(sim2Up, "true")) {
        get_cmd_output("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 rx", rxSim2, sizeof(rxSim2));
        get_cmd_output("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 tx", txSim2, sizeof(txSim2));
        trim(rxSim2);
        trim(txSim2);        
    }

    /* WAN RX/TX */
    get_cmd_output("cat /sys/class/net/eth1/statistics/rx_bytes", wanRx, sizeof(wanRx));
    get_cmd_output("cat /sys/class/net/eth1/statistics/tx_bytes", wanTx, sizeof(wanTx));
    trim(wanRx);
    trim(wanTx);
    /* Boot flag check */
    get_cmd_output("uci get system.@system[0].booted", bootSt, sizeof(bootSt));
    if (bootSt[0] == '1') {
        fCheckin = 1;
        system("uci set system.@system[0].booted=0 && uci commit system");
    }

    /* Epoch time (unsigned long long) */
    unsigned long long epoch_time = (unsigned long long)time(NULL);

    /* JSON block "B" */
    cJSON *B = cJSON_CreateObject();
    cJSON_AddStringToObject(B, "b", wanRx);
    cJSON_AddStringToObject(B, "c", wanTx);
    cJSON_AddStringToObject(B, "d", rxSim1);
    cJSON_AddStringToObject(B, "e", txSim1);
    
    /* Add epoch as number (not string) */
    cJSON_AddNumberToObject(B, "f", (double)epoch_time);

    char checkinStr[4];
    snprintf(checkinStr, sizeof(checkinStr), "%d", fCheckin);
    cJSON_AddStringToObject(B, "g", checkinStr);
    cJSON_AddStringToObject(B, "h", rxSim2);
    cJSON_AddStringToObject(B, "i", txSim2);

    return B;
}

cJSON *buildInterfaceStatusJsonResp(const char *imei)
{
    char rx[64], tx[64], status[64], mac[64], cmd[128];
    char simIntf1[8] = {0}, simIntf2[8] = {0};
    char simSlot[8] = {0};

    /* -------- Detect active SIM slot ---------- */
    get_cmd_output("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",
                   simIntf1, sizeof(simIntf1));
    get_cmd_output("ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",
                   simIntf2, sizeof(simIntf2));

    trim(simIntf1);
    trim(simIntf2);

    if (strstr(simIntf1, "true"))
        strcpy(simSlot, "1");
    else if (strstr(simIntf2, "true"))
        strcpy(simSlot, "2");
    else
        strcpy(simSlot, "-");

    /* -------- Create Parent JSON ---------- */
    cJSON *Q = cJSON_CreateObject();
    //cJSON_AddStringToObject(Q, "a", imei); //Avoided IMEI from JSON

    /* Array "b" holds ALL interfaces */
    cJSON *arr = cJSON_CreateArray();
    cJSON_AddItemToObject(Q, "b", arr);

    /* ============================================================
                       WAN INTERFACE ENTRY
       ============================================================ */
    {
        get_cmd_output("ifconfig eth1 | grep 'RX bytes:' | cut -d: -f2 | awk '{print $1}'", rx, sizeof(rx));
        get_cmd_output("ifconfig eth1 | grep 'TX bytes:' | cut -d: -f3 | awk '{print $1}'", tx, sizeof(tx));
        get_cmd_output("cat /sys/class/net/eth1/address", mac, sizeof(mac));

        int wanStatus = get_interface_status(WAN);

        trim(rx); trim(tx); trim(mac);

        cJSON *wan = cJSON_CreateObject();
        cJSON_AddStringToObject(wan, "a", get_wan_ip());        
 	char buf0[16];
	sprintf(buf0, "%d", wanStatus); 
	cJSON_AddStringToObject(wan, "b", buf0);                 
        cJSON_AddStringToObject(wan, "c", rx);
        cJSON_AddStringToObject(wan, "d", tx);
        cJSON_AddStringToObject(wan, "e", mac);
        cJSON_AddStringToObject(wan, "f", "WAN");
        cJSON_AddStringToObject(wan, "g", "1");

        cJSON_AddItemToArray(arr, wan);
    }

    /* ============================================================
                        WWAN (MODEM) INTERFACE ENTRY
       ============================================================ */
    {
        /* SIM usage data */
        if (strcmp(simSlot, "1") == 0) {
            get_cmd_output("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 rx", rx, sizeof(rx));
            get_cmd_output("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 1 tx", tx, sizeof(tx));
        } else if (strcmp(simSlot, "2") == 0) {
            get_cmd_output("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 rx", rx, sizeof(rx));
            get_cmd_output("/usr/bin/lua /usr/bin/cio/sim_usage_total.lua 2 tx", tx, sizeof(tx));
        } else {
            strcpy(rx, "0");
            strcpy(tx, "0");
        }

        int wwanStatus = get_interface_status(WWAN);

        get_cmd_output("cat /sys/class/net/`ifconfig | grep qmim | awk '{print $1}'`/address",
                       mac, sizeof(mac));

        trim(rx); trim(tx); trim(mac);

        cJSON *wwan = cJSON_CreateObject();
        cJSON_AddStringToObject(wwan, "a", get_qmi_ip());
 	char buf1[16];
	sprintf(buf1, "%d", wwanStatus); 
	cJSON_AddStringToObject(wwan, "b", buf1);        
        cJSON_AddStringToObject(wwan, "c", rx);
        cJSON_AddStringToObject(wwan, "d", tx);
        cJSON_AddStringToObject(wwan, "e", mac);
        cJSON_AddStringToObject(wwan, "f", "WWAN");
        cJSON_AddStringToObject(wwan, "g", simSlot);

        cJSON_AddItemToArray(arr, wwan);
    }

    /* ============================================================
                        LAN PORTS (LAN1..LAN3)
       ============================================================ */
    for (int i = 1; i <= 3; i++)
    {
        char ifname[16], lanStatus[16];
        snprintf(ifname, sizeof(ifname), "eth0");
	LanPortStatsStrings s;
	get_elc_port_stats_strings(i, &s);

        snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/address", ifname);
        get_cmd_output(cmd, mac, sizeof(mac));

        snprintf(cmd, sizeof(cmd), SCRIPT_PORT_STATUS " %d", (i+1));
        get_cmd_output(cmd, lanStatus, sizeof(lanStatus));

        trim(rx); trim(tx); trim(mac); trim(lanStatus);

        cJSON *lan = cJSON_CreateObject();
        cJSON_AddStringToObject(lan, "a", get_lan_ip());
        cJSON_AddStringToObject(lan, "b", lanStatus);      
        cJSON_AddStringToObject(lan, "c", s.rx_str);
        cJSON_AddStringToObject(lan, "d", s.tx_str);        
        cJSON_AddStringToObject(lan, "e", mac);
        cJSON_AddStringToObject(lan, "f", "LAN");
 	char buf[16];
	sprintf(buf, "%d", i);        // convert int i to string
	cJSON_AddStringToObject(lan, "g", buf);       

        cJSON_AddItemToArray(arr, lan);
    }

    return Q;
}

/* Build WiFi Host Details JSON */
cJSON *buildWifiHostsJsonResp(const char *imei)
{
    cJSON *R = cJSON_CreateObject();     // The actual "R" object
    cJSON *arr = cJSON_CreateArray();    // R["b"] → array of hosts

    // Avoided IMEI as "a"
    /*if (imei)
        cJSON_AddStringToObject(R, "a", imei);
    else
        cJSON_AddStringToObject(R, "a", "-");*/

    //const char *interfaces[] = {"wlan0-1", "wlan1-2"};
    //const int ifaceCount = sizeof(interfaces) / sizeof(interfaces[0]);
    char interfaces[16][32];
    int ifaceCount = get_wifi_interfaces(interfaces, 16);

    for (int i = 0; i < ifaceCount; i++)
    {
        const char *iface = interfaces[i];
        char cmdList[128];

        snprintf(cmdList, sizeof(cmdList),
                 "iw dev %s station dump | grep Station | awk '{print $2}'", iface);

        FILE *fp = popen(cmdList, "r");
        if (!fp)
        {
            log_message("WARN", "Cannot read station list for %s", iface);
            continue;
        }

        char mac[64];
        while (fgets(mac, sizeof(mac), fp))
        {
            trim(mac);
            if (strlen(mac) == 0)
                continue;

            /* --- IP from ARP --- */
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
                     "iwinfo %s info | awk -F'\"' '/ESSID:/ {print $2}'", iface);
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

            /* --- Build host JSON object --- */
            cJSON *dev = cJSON_CreateObject();
            cJSON_AddStringToObject(dev, "a", host);
            cJSON_AddStringToObject(dev, "b", ip);
            cJSON_AddStringToObject(dev, "c", mac);
            cJSON_AddStringToObject(dev, "d", ssid);
            cJSON_AddStringToObject(dev, "e", rx);
            cJSON_AddStringToObject(dev, "f", tx);

            /* Push into array */
            cJSON_AddItemToArray(arr, dev);
        }

        pclose(fp);
    }

    /* Add array to R */
    cJSON_AddItemToObject(R, "b", arr);

    return R; // caller frees
}

/* Build Device Info JSON  */
cJSON *buildDeviceInfoJsonResp(const char *imei)
{
    char firmware_version[128] = {0};
    char iccid[64] = {0};
    char apn[64] = {0};
    char operator_name[64] = {0};
    char phone_number[32] = {0};
    char modem_version[64] = {0};
    char modem_type[64] = {0};

    char simIntf1[8] = {0}, simIntf2[8] = {0};
    char simSlot[8] = {0};

    /* ------------ Get BASIC info  ------------ */
    get_firmware_version(firmware_version);
    get_iccid(iccid);                 
    get_apn(apn);                     
    get_operator(operator_name);      
    get_phoneNumber(phone_number);    
    get_modem_firmware_version(modem_version);
    get_modem_module(modem_type);

    trim(firmware_version);
    trim(iccid);
    trim(apn);
    trim(operator_name);
    trim(phone_number);
    trim(modem_version);
    trim(modem_type);

    if (!strlen(firmware_version)) strcpy(firmware_version, "-");
    if (!strlen(iccid))           strcpy(iccid, "-");
    if (!strlen(apn))             strcpy(apn, "-");
    if (!strlen(operator_name))   strcpy(operator_name, "-");
    if (!strlen(phone_number))    strcpy(phone_number, "-");
    if (!strlen(modem_version))   strcpy(modem_version, "-");
    if (!strlen(modem_type))      strcpy(modem_type, "-");

    /* ------------ Determine active SIM slot ------------ */
    get_cmd_output("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",
                   simIntf1, sizeof(simIntf1));
    get_cmd_output("ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",
                   simIntf2, sizeof(simIntf2));

    trim(simIntf1);
    trim(simIntf2);

    if (strstr(simIntf1, "true"))
        strcpy(simSlot, "1");
    else if (strstr(simIntf2, "true"))
        strcpy(simSlot, "2");
    else
        strcpy(simSlot, "-");

    /* ------------ Active status (0/1/2) ------------ */
    int active_status = get_interface_status(WWAN);
    char activeStr[8];
    snprintf(activeStr, sizeof(activeStr), "%d", active_status);

    /* =====================================================
         BUILD NEW JSON FORMAT:  "S": { ... }
       ===================================================== */

    cJSON *S = cJSON_CreateObject();

    /* a = IMEI Avoided IMEI */ 
    //cJSON_AddStringToObject(S, "a", imei ? imei : "-");

    /* b = FW version */
    cJSON_AddStringToObject(S, "b", firmware_version);

    /* c = modem firmware version */
    cJSON_AddStringToObject(S, "c", modem_version);

    /* d = modem type */
    cJSON_AddStringToObject(S, "d", modem_type);

    /* e = array of SIM entries (only ONE entry) */
    cJSON *arr = cJSON_CreateArray();
    cJSON_AddItemToObject(S, "e", arr);

    cJSON *entry = cJSON_CreateObject();
    cJSON_AddStringToObject(entry, "a", apn);
    cJSON_AddStringToObject(entry, "b", operator_name);
    cJSON_AddStringToObject(entry, "c", phone_number);
    cJSON_AddStringToObject(entry, "d", iccid);
    cJSON_AddStringToObject(entry, "e", activeStr);
    cJSON_AddStringToObject(entry, "f", simSlot);

    cJSON_AddItemToArray(arr, entry);

    return S;
}

/* Build Device Network (U) JSON  */
cJSON *buildDeviceNetworkJsonResp(const char *imei)
{
    char snr[32] = {0};
    char netmode[64] = {0};
    char signal[32] = {0};
    char uptime[64] = {0};
    char simslot[8] = {0};
    char iccid[64] = {0};
    char simIntf1[8] = {0};
    char simIntf2[8] = {0};

    /* ---- Get modem values ---- */
    if (get_snr(snr) != 0)              strcpy(snr, "-");
    if (get_mode(netmode) != 0)         strcpy(netmode, "-");
    if (get_signal_strength(signal) != 0) strcpy(signal, "-");
    if (get_system_uptime(uptime) != 0) strcpy(uptime, "-");

    trim(snr);
    trim(netmode);
    trim(signal);
    trim(uptime);

    if (!strlen(snr)) strcpy(snr, "-");
    if (!strlen(netmode)) strcpy(netmode, "-");
    if (!strlen(signal)) strcpy(signal, "-");
    if (!strlen(uptime)) strcpy(uptime, "-");

    /* ---- Find active SIM slot ---- */
    execute_system_command("ubus -v call network.interface.mob1s1a1 status | jsonfilter -e '$.up'",  
                            simIntf1, sizeof(simIntf1));

    execute_system_command("ubus -v call network.interface.mob1s2a1 status | jsonfilter -e '$.up'",  
                            simIntf2, sizeof(simIntf2));

    if (strstr(simIntf1, "true"))
        strcpy(simslot, "1");
    else if (strstr(simIntf2, "true"))
        strcpy(simslot, "2");
    else
        strcpy(simslot, "-");

    trim(simslot);

    /* ---- Active status via modem ---- */
    int active_status = get_interface_status(WWAN);
    char activeStr[8];
    snprintf(activeStr, sizeof(activeStr), "%d", active_status);

    if (get_iccid(iccid) != 0) strcpy(iccid, "ERROR");
    if (!strlen(simslot)) strcpy(simslot, "-");
    trim(iccid);

    /* ---- JSON BUILD ---- */

    cJSON *U = cJSON_CreateObject();

    /* a - IMEI Avoided IMEI*/
    //cJSON_AddStringToObject(U, "a", imei ? imei : "-");

    /* b- system uptime */
    cJSON_AddStringToObject(U, "b", uptime);

    /* c -array */
    cJSON *arr = cJSON_CreateArray();
    cJSON_AddItemToObject(U, "c", arr);

    /* Only ONE entry inside array */
    cJSON *entry = cJSON_CreateObject();

    cJSON_AddStringToObject(entry, "a", snr);
    cJSON_AddStringToObject(entry, "b", netmode);
    cJSON_AddStringToObject(entry, "c", signal);
    cJSON_AddStringToObject(entry, "d", iccid);
    cJSON_AddStringToObject(entry, "e", activeStr);
    cJSON_AddStringToObject(entry, "f", simslot);

    cJSON_AddItemToArray(arr, entry);

    return U;
}


/* Build Ethernet Host JSON  */
/*cJSON *buildEthernetHostsJsonResp(const char *imei)
{
    FILE *fp = fopen("/proc/net/arp", "r");
    if (!fp)
    {
        log_message("ERROR", "Cannot open /proc/net/arp");
        return NULL;
    }

    typedef struct HostEntry {
        char host[64], ip[64], mac[64], rx[32], tx[32], port[8], iface[32];
    } HostEntry;

    HostEntry hosts[128];
    int host_count = 0;

    char line[256];

    fgets(line, sizeof(line), fp); // skip ARP header

    while (fgets(line, sizeof(line), fp))
    {
        char ip[64] = {0}, mac[64] = {0}, device[32] = {0};

        if (sscanf(line, "%63s %*s %*s %63s %*s %31s", ip, mac, device) != 3)
            continue;

        if (!(strncmp(device, "lan", 3) == 0 || strcmp(device, "br-lan") == 0))
            continue; // only LAN devices

        HostEntry *h = &hosts[host_count++];
        strncpy(h->ip, ip, sizeof(h->ip) - 1);
        strncpy(h->mac, mac, sizeof(h->mac) - 1);
        strncpy(h->iface, device, sizeof(h->iface) - 1);

        char cmd[256];
        snprintf(cmd, sizeof(cmd), "grep %s /tmp/dhcp.leases | awk '{print $4}'", mac);
        get_cmd_output(cmd, h->host, sizeof(h->host));
        trim(h->host);
        if (strlen(h->host) == 0)
            strcpy(h->host, "unknown");

        snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/rx_bytes", device);
        get_cmd_output(cmd, h->rx, sizeof(h->rx));
        trim(h->rx);

        snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/tx_bytes", device);
        get_cmd_output(cmd, h->tx, sizeof(h->tx));
        trim(h->tx);

        strcpy(h->port, "-");   // filled later
    }
    fclose(fp);


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

    cJSON *T = cJSON_CreateObject();
    cJSON *arr = cJSON_CreateArray();

    //cJSON_AddStringToObject(T, "a", (imei ? imei : "-")); Avoided IMEI
    cJSON_AddItemToObject(T, "b", arr);

    for (int i = 0; i < host_count; i++)
    {
        cJSON *obj = cJSON_CreateObject();

        cJSON_AddStringToObject(obj, "a", hosts[i].host);
        cJSON_AddStringToObject(obj, "b", hosts[i].ip);
        cJSON_AddStringToObject(obj, "c", hosts[i].mac);
        cJSON_AddStringToObject(obj, "d", hosts[i].rx);
        cJSON_AddStringToObject(obj, "e", hosts[i].tx);
        cJSON_AddStringToObject(obj, "f", hosts[i].port);
        cJSON_AddStringToObject(obj, "g", hosts[i].iface);

        cJSON_AddItemToArray(arr, obj);
    }

    return T;
}*/

cJSON *buildEthernetHostsJsonResp(const char *imei)
{
    FILE *fp = fopen("/proc/net/arp", "r");
    if (!fp)
    {
        log_message("ERROR", "Cannot open /proc/net/arp");
        return NULL;
    }

    typedef struct HostEntry {
        char host[64], ip[64], mac[64], rx[32], tx[32], port[8], iface[32];
    } HostEntry;

    HostEntry hosts[128];
    int host_count = 0;
    char line[256];

    fgets(line, sizeof(line), fp); // skip ARP header

    while (fgets(line, sizeof(line), fp) && host_count < 128)
    {
        char ip[64] = {0}, mac[64] = {0}, device[32] = {0};
        int flags;

        // Scans: IP, HW Type, Flags, MAC, Mask, Device
        if (sscanf(line, "%63s %*s 0x%x %63s %*s %31s", ip, &flags, mac, device) != 4)
            continue;

        // Skip incomplete ARP entries (flags 0x0) or non-LAN interfaces
        if (flags == 0x0 || !(strncmp(device, "lan", 3) == 0 || strcmp(device, "br-lan") == 0))
            continue;

        // --- 1. DEDUPLICATION ---
        int existing_idx = -1;
        for (int i = 0; i < host_count; i++) {
            if (strcasecmp(hosts[i].mac, mac) == 0) {
                existing_idx = i;
                break;
            }
        }

        // If MAC exists, we skip it (or update IP if you prefer)
        if (existing_idx != -1) continue;

        HostEntry *h = &hosts[host_count++];
        strncpy(h->ip, ip, sizeof(h->ip) - 1);
        strncpy(h->mac, mac, sizeof(h->mac) - 1);
        strncpy(h->iface, device, sizeof(h->iface) - 1);
        strcpy(h->port, "-"); 

        /* Hostname lookup */
        char cmd[256];
        snprintf(cmd, sizeof(cmd), "grep -i %s /tmp/dhcp.leases | awk '{print $4}'", mac);
        get_cmd_output(cmd, h->host, sizeof(h->host));
        trim(h->host);
        if (strlen(h->host) == 0) strcpy(h->host, "unknown");

        /* Note: rx_bytes/tx_bytes from /sys/class/net/br-lan are BRIDGE totals.
           Per-MAC stats usually require iptables/ebtables. 
           Keeping your logic but it will show the bridge total. */
        snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/rx_bytes 2>/dev/null", device);
        get_cmd_output(cmd, h->rx, sizeof(h->rx));
        trim(h->rx);

        snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/tx_bytes 2>/dev/null", device);
        get_cmd_output(cmd, h->tx, sizeof(h->tx));
        trim(h->tx);
    }
    fclose(fp);

    /* ---- 2. Map MAC to Physical LAN Port ---- */
    FILE *sf = popen("swconfig dev switch0 get dump_arl", "r");
    if (sf) {
    	char sw_line[256];
    	while (fgets(sw_line, sizeof(sw_line), sf)) {
        	char s_mac[64] = {0};
        	int s_mask = 0;

        	if (sscanf(sw_line, "MAC: %63s PORTMAP: 0x%x", s_mac, &s_mask) == 2) {
            		int s_port = maskToPort(s_mask);

            	for (int i = 0; i < host_count; i++) {
                	if (strcasecmp(hosts[i].mac, s_mac) == 0) {
                    		//  Port 2=LAN1, Port 3=LAN2, Port 4=LAN3
                    		if (s_port >= 2 && s_port <= 4) {
                        		snprintf(hosts[i].port, sizeof(hosts[i].port), "%d", s_port - 1);
                    		} else if (s_port == 0) {
                        		strcpy(hosts[i].port, "");
                    		} else {
                        		snprintf(hosts[i].port, sizeof(hosts[i].port), "%d", s_port);
                    		}
                    		break;
                	}
            	}
        	}
    	}
    	pclose(sf);
     }
    /* --- Build JSON --- */
    cJSON *T = cJSON_CreateObject();
    cJSON *arr = cJSON_CreateArray();
    cJSON_AddItemToObject(T, "b", arr);

    for (int i = 0; i < host_count; i++)
    {
        cJSON *obj = cJSON_CreateObject();
        cJSON_AddStringToObject(obj, "a", hosts[i].host);
        cJSON_AddStringToObject(obj, "b", hosts[i].ip);
        cJSON_AddStringToObject(obj, "c", hosts[i].mac);
        cJSON_AddStringToObject(obj, "d", hosts[i].rx);
        cJSON_AddStringToObject(obj, "e", hosts[i].tx);
        cJSON_AddStringToObject(obj, "f", hosts[i].port);
        cJSON_AddStringToObject(obj, "g", hosts[i].iface);
        cJSON_AddItemToArray(arr, obj);
    }

    return T;
}



/* Build the complete REFRESH JSON */
char *buildFullRefreshJson(const char *imei)
{
    // Root JSON
    cJSON *root = cJSON_CreateObject();

    // ---- Build each sub-section ----
    cJSON *I = buildDataUsageJsonResp();             // Data usage 
    cJSON *C = buildInterfaceStatusJsonResp(imei);      // Interface status
    cJSON *D = buildWifiHostsJsonResp(imei);            // Wi-Fi hosts
    cJSON *F = buildDeviceInfoJsonResp(imei);           // Device info
    cJSON *G = buildDeviceNetworkJsonResp(imei);        // Network info
    cJSON *H = buildEthernetHostsJsonResp(imei);        // Ethernet host details

    // ---- Attach only if valid ----
    if (I) cJSON_AddItemToObject(root, "I", I);
    if (C) cJSON_AddItemToObject(root, "Q", C);
    if (D) cJSON_AddItemToObject(root, "R", D);
    if (F) cJSON_AddItemToObject(root, "S", F);
    if (G) cJSON_AddItemToObject(root, "U", G);
    if (H) cJSON_AddItemToObject(root, "T", H);

    // Convert to string
    char *refreshStr = cJSON_PrintUnformatted(root);

    // Cleanup internal objects (root freed below cleans nested objects too)
    cJSON_Delete(root);

    return refreshStr; // caller must free()
}

/* Helper: Create JSON for a single interface */
static cJSON *create_interface_json(const char *ifname)
{
    char rxBytes[64] = {0}, rxPkts[64] = {0};
    char txBytes[64] = {0}, txPkts[64] = {0};
    char ipV4[64] = {0}, mask[64] = {0}, proto[32] = {0};
    char upTime[64] = {0}, mac[32] = {0}, status[16] = {0};

    /* Get details using shell commands (tune per your environment) */
    char cmd[128];
    snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/rx_bytes", ifname);
    get_cmd_output(cmd, rxBytes, sizeof(rxBytes));
    snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/rx_packets", ifname);
    get_cmd_output(cmd, rxPkts, sizeof(rxPkts));
    snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/tx_bytes", ifname);
    get_cmd_output(cmd, txBytes, sizeof(txBytes));
    snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/statistics/tx_packets", ifname);
    get_cmd_output(cmd, txPkts, sizeof(txPkts));

    snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/address", ifname);
    get_cmd_output(cmd, mac, sizeof(mac));

    snprintf(cmd, sizeof(cmd), "ifstatus %s | jsonfilter -e '@.ipv4_address[0].address'", ifname);
    get_cmd_output(cmd, ipV4, sizeof(ipV4));

    snprintf(cmd, sizeof(cmd), "ifstatus %s | jsonfilter -e '@.ipv4_address[0].mask'", ifname);
    get_cmd_output(cmd, mask, sizeof(mask));

    snprintf(cmd, sizeof(cmd), "ifstatus %s | jsonfilter -e '@.proto'", ifname);
    get_cmd_output(cmd, proto, sizeof(proto));

    snprintf(cmd, sizeof(cmd), "ifstatus %s | jsonfilter -e '@.uptime'", ifname);
    get_cmd_output(cmd, upTime, sizeof(upTime));

    snprintf(cmd, sizeof(cmd), "cat /sys/class/net/%s/operstate", ifname);
    get_cmd_output(cmd, status, sizeof(status));

    /* Build JSON */
    cJSON *iface = cJSON_CreateObject();
    cJSON_AddStringToObject(iface, "interfaceName", ifname);
    cJSON_AddStringToObject(iface, "mac", mac);
    char rxFmt[128], txFmt[128];
    snprintf(rxFmt, sizeof(rxFmt), "%s Bytes(%s Pkts)", rxBytes, rxPkts);
    snprintf(txFmt, sizeof(txFmt), "%s Bytes(%s Pkts)", txBytes, txPkts);
    cJSON_AddStringToObject(iface, "rx", rxFmt);
    cJSON_AddStringToObject(iface, "tx", txFmt);
    cJSON_AddStringToObject(iface, "ipV4", ipV4);
    cJSON_AddStringToObject(iface, "ipV4NetMask", mask);
    cJSON_AddStringToObject(iface, "protocol", proto);
    cJSON_AddStringToObject(iface, "upTime", upTime);
    cJSON_AddStringToObject(iface, "ipV6", "");
    cJSON_AddStringToObject(iface, "status", status);

    return iface;
}
/* Build LAN/WAN/WWAN grouped JSON */
char *build_interface_group_json(void)
{
    cJSON *root = cJSON_CreateObject();

    /* LAN interfaces */
    cJSON *lanArray = cJSON_CreateArray();
    for (int i = 1; i <= 3; i++) {
        char ifname[16];
        snprintf(ifname, sizeof(ifname), "eth0");
        cJSON_AddItemToArray(lanArray, create_interface_json(ifname));
    }
    cJSON_AddItemToObject(root, "LAN", lanArray);

    /* WAN */
    cJSON *wanArray = cJSON_CreateArray();
    cJSON_AddItemToArray(wanArray, create_interface_json("eth1"));
    cJSON_AddItemToObject(root, "WAN", wanArray);

    /* WWAN */
    cJSON *wwanArray = cJSON_CreateArray();
    cJSON_AddItemToArray(wwanArray, create_interface_json("wwan0"));
    cJSON_AddItemToObject(root, "WWAN", wwanArray);

    /* Convert to compact JSON string */
    char *jsonStr = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    return jsonStr;  /* caller must free(jsonStr) */
}
//Execute AT command
char *execute_at_command(const char *atCmd)
{
    if (!atCmd || strlen(atCmd) == 0)
    {
        log_message("ERROR", "execute_at_command(): empty command");
        return NULL;
    }

    char cmd[512];
    char output[2048] = {0};
    int rc;

    // Primary method: gsmctl
    snprintf(cmd, sizeof(cmd), "gsmctl -A \"%s\" 2>/dev/null", atCmd);
    rc = execute_system_command(cmd, output, sizeof(output));

    // Fallback: direct microcom on /dev/ttyUSB2 (if gsmctl unavailable)
    if (rc != 0 || strlen(output) == 0)
    {
        log_message("WARN", "gsmctl failed, trying microcom fallback...");
        snprintf(cmd, sizeof(cmd),
                 "echo \"%s\" | microcom -t 2000 /dev/ttyUSB2 2>/dev/null",
                 atCmd);
        execute_system_command(cmd, output, sizeof(output));
    }

    trim(output);

    if (strlen(output) == 0)
    {
        log_message("ERROR", "No response for AT command: %s", atCmd);
        return strdup("No response from modem");
    }

    log_message("INFO", "AT command '%s' output: %s", atCmd, output);
    return strdup(output);  // Caller will free()
}
//Perform factory reset
int perform_factory_reset(void)
{
    log_message("INFO", "Performing factory reset...");

    // Try factory reset (for OpenWrt)
    int ret = system("firstboot -y > /tmp/factory_reset.log 2>&1");

    if (ret != 0)
    {
        log_message("ERROR", "Factory reset command failed with code %d", ret);
        return -1;
    }

    log_message("INFO", "Factory reset completed successfully");
    return 0;
}

// Helper function to get the firewall rule status
unsigned int get_firewall_rule_status(unsigned int rule_index) {
	log_message("INFO", "Inside get_firewall_rule_status");
	char t_status[LOG_BUF_SZ] = {};
	char cmd[LOG_BUF_SZ];
	snprintf(cmd, sizeof(cmd), "uci get firewall.@rule[%d].target", rule_index);
	if (execute_system_command(cmd, t_status, sizeof(t_status)) != 0) {
		log_message("ERROR", "Failed to get rule %d status\n", rule_index);
		return 0;  // Return 0 if the command failed
	}

	if (strstr(t_status, "ACCEPT")) {
		return 1;  // Rule is ACCEPT
	} else if (strstr(t_status, "REJECT")) {
		return 0;  // Rule is REJECT
	} else {
		return 0;  // Default to REJECT in case of error
	}
}
//Read firewall rules
char *read_firewall_settings() {
	log_message("INFO", "Inside read_firewall_settings");
	unsigned int errcode = 0;
	unsigned int firewall_settings = 0;
	char status[2048] = {0};
	// Read each rule and update the firewall settings bitmask
	firewall_settings |= get_firewall_rule_status(0) ? DHCP_RENEW : 0;
	firewall_settings |= get_firewall_rule_status(1) ? ALLOW_PING : 0;
	firewall_settings |= get_firewall_rule_status(2) ? ALLOW_IGMP : 0;
	firewall_settings |= get_firewall_rule_status(3) ? ALLOW_DHCPv6 : 0;
	firewall_settings |= get_firewall_rule_status(4) ? ALLOW_MLD : 0;
	firewall_settings |= get_firewall_rule_status(5) ? ALLOW_ICMPv6_INPUT : 0;
	firewall_settings |= get_firewall_rule_status(6) ? ALLOW_ICMPv6_FWD : 0;
	firewall_settings |= get_firewall_rule_status(9) ? ALLOW_PING_SSH : 0;
	firewall_settings |= get_firewall_rule_status(9) ? ALLOW_SSH_WAN : 0;

	// Set error codes for rules that couldn't be fetched
	errcode |= (get_firewall_rule_status(0) == 0) ? DHCP_RENEW : 0;
	errcode |= (get_firewall_rule_status(1) == 0) ? ALLOW_PING : 0;
	errcode |= (get_firewall_rule_status(2) == 0) ? ALLOW_IGMP : 0;
	errcode |= (get_firewall_rule_status(3) == 0) ? ALLOW_DHCPv6 : 0;
	errcode |= (get_firewall_rule_status(4) == 0) ? ALLOW_MLD : 0;
	errcode |= (get_firewall_rule_status(5) == 0) ? ALLOW_ICMPv6_INPUT : 0;
	errcode |= (get_firewall_rule_status(6) == 0) ? ALLOW_ICMPv6_FWD : 0;
	errcode |= (get_firewall_rule_status(9) == 0) ? ALLOW_PING_SSH : 0;
	errcode |= (get_firewall_rule_status(9) == 0) ? ALLOW_SSH_WAN : 0;

	// Fetch the system hostname
	char hostname[MAX_HOSTNAME_LEN] = {};
	if (execute_system_command("uci get system.@system[0].hostname", hostname, sizeof(hostname)) != 0) {
		log_message("ERROR", "Failed to get hostname");
		return 1;  // Return error if hostname fetch fails
	}
	trim(hostname);
	// Format and return the status
	snprintf(status, LOG_BUF_SZ, "Success:Firewall_Settings:%04X:Err_Code:%d:Hostname:%s", firewall_settings, errcode, hostname);
	log_message("INFO", "%s", status);
	return strdup(status);  // Caller will free();
}

// Helper function to set the firewall rule
void set_firewall_rule(unsigned int rule_index, unsigned int flag, unsigned int setting) {
	const char *action = (setting & flag) ? "ACCEPT" : "REJECT";
	char cmd[LOG_BUF_SZ];
	snprintf(cmd, sizeof(cmd), "uci set firewall.@rule[%d].target=%s", rule_index, action);
	if (system(cmd) != 0) {
		printf("Failed to set rule %d to %s\n", rule_index, action);
	}
}
//Set firewall rules
unsigned int set_firewall_settings(char *firewall_setting, char *hostname) {
	log_message("INFO", "Inside set_firewall_settings");
	unsigned int ifirewall_settings = 0;
	unsigned char cHostname[MAX_HOSTNAME_LEN] = {};
	char t_data[LOG_BUF_SZ] = {};
	log_message("INFO", "Firewall Settings: %s, Hostname: %s\n", firewall_setting, hostname);
	// Convert the firewall_setting string to an integer
	ifirewall_settings = strtol(firewall_setting, NULL, 16);
	// Set firewall rules based on the provided bitmask
	set_firewall_rule(RULE_DHCP_RENEW, DHCP_RENEW, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_PING, ALLOW_PING, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_IGMP, ALLOW_IGMP, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_DHCPv6, ALLOW_DHCPv6, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_MLD, ALLOW_MLD, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_ICMPv6_INPUT, ALLOW_ICMPv6_INPUT, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_ICMPv6_FWD, ALLOW_ICMPv6_FWD, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_PING_SSH, ALLOW_PING_SSH, ifirewall_settings);
	set_firewall_rule(RULE_ALLOW_SSH_WAN, ALLOW_SSH_WAN, ifirewall_settings);

	// Commit and restart firewall
	if (system("uci commit firewall") != 0) {
		log_message("ERROR", "Failed to commit firewall settings\n");
	}
	if (system("fw3 reload") != 0) {
		log_message("ERROR", "Failed to restart firewall\n");
	}
	// Set hostname
	snprintf(t_data, sizeof(t_data), "uci set system.@system[0].hostname=%s", hostname);
	if (system(t_data) != 0) {
		log_message("ERROR", "Failed to set hostname\n");
	}

	// Commit and restart system
	if (system("uci commit system") != 0) {
		log_message("ERROR", "Failed to commit system settings\n");
	}
	return 0;
}
//Reboot the router
int perform_soft_reboot()
{
    log_message("INFO", "Received soft reboot command.");
    //Set reboot flag
    int rc = system("uci set system.@system[0].rebootFg=4 && uci commit system");
    if (rc != 0)
    {
            log_message("DRBUG", "Couldnt set reboot flag to 4");
    }

    // Step 1: Sync filesystems before reboot
    log_message("INFO", "Syncing filesystem...");
    system("sync");

    rc = system("sleep 2 && reboot -f");
    if (rc != 0)
    {
        log_message("ERROR", "Failed to execute reboot command (rc=%d)", rc);
        return -1;
    }
    log_message("INFO", "Soft reboot command executed successfully.");
    return 0;
}
//Execute Shell command
char *execute_shell_command(const char *cmd)
{
    if (!cmd || strlen(cmd) == 0)
    {
        log_message("ERROR", "Empty shell command received.");
        return strdup("Error: Empty command");
    }

    log_message("INFO", "Executing shell command: %s", cmd);

    FILE *fp = popen(cmd, "r");
    if (!fp)
    {
        char err[128];
        snprintf(err, sizeof(err), "popen failed: %s", strerror(errno));
        log_message("ERROR", "%s", err);
        return strdup(err);
    }

    char buffer[512];
    size_t total_len = 0;
    size_t cap = 1024;
    char *output = malloc(cap);
    if (!output)
    {
        pclose(fp);
        log_message("ERROR", "Memory allocation failed for command output");
        return strdup("Error: Memory allocation failed");
    }

    output[0] = '\0';

    while (fgets(buffer, sizeof(buffer), fp))
    {
        size_t len = strlen(buffer);
        if (total_len + len + 1 > cap)
        {
            cap *= 2;
            char *tmp = realloc(output, cap);
            if (!tmp)
            {
                free(output);
                pclose(fp);
                log_message("ERROR", "Memory reallocation failed");
                return strdup("Error: Memory reallocation failed");
            }
            output = tmp;
        }

        // Copy buffer exactly, preserving \n
        memcpy(output + total_len, buffer, len);
        total_len += len;
        output[total_len] = '\0';
    }

    int rc = pclose(fp);
    if (rc != 0)
    {
        log_message("WARN", "Command exited with status %d", rc);
    }

    if (strlen(output) == 0)
    {
        free(output);
        log_message("WARN", "No output from command: %s", cmd);
        return strdup("");
    }

    log_message("INFO", "Shell command output:\n%s", output);
    return output;
}

//Enable/Disable Web access
char *set_web_access(int flag)
{
    char cmd[512];
    int rc = 0;

    if (flag == 0)
    {
        log_message("INFO", "Disabling web access: Blocking LAN/WiFi to WAN...");

        const char *script =
            "BLOCK_RULE_NAME_LAN='block_lan_wan'; "
            "BLOCK_RULE_NAME_WIFI='block_wifi_wan'; "
            "if ! uci get firewall.$BLOCK_RULE_NAME_LAN >/dev/null 2>&1; then "
            "cfg=$(uci add firewall rule); "
            "uci set firewall.$cfg.name='Block LAN to WAN'; "
            "uci set firewall.$cfg.src='lan'; "
            "uci set firewall.$cfg.dest='wan'; "
            "uci set firewall.$cfg.proto='all'; "
            "uci set firewall.$cfg.target='DROP'; "
            "uci rename firewall.$cfg=$BLOCK_RULE_NAME_LAN; "
            "fi; "
            "if ! uci get firewall.$BLOCK_RULE_NAME_WIFI >/dev/null 2>&1; then "
            "cfg=$(uci add firewall rule); "
            "uci set firewall.$cfg.name='Block WiFi to WAN'; "
            "uci set firewall.$cfg.src='wifi'; "
            "uci set firewall.$cfg.dest='wan'; "
            "uci set firewall.$cfg.proto='all'; "
            "uci set firewall.$cfg.target='DROP'; "
            "uci rename firewall.$cfg=$BLOCK_RULE_NAME_WIFI; "
            "fi; "
            "uci set system.@system[0].enable_web_access=0; "
            "uci commit system; "
            "uci commit firewall; "
            "/etc/init.d/firewall restart";

        rc = system(script);
        if (rc != 0)
        {
            log_message("ERROR", "Failed to disable web access (rc=%d)", rc);
            return strdup("Error: Failed to disable web access");
        }

        log_message("INFO", "Web access disabled successfully");
        return strdup("Web access disabled");
    }
    else if (flag == 1)
    {
        log_message("INFO", "Enabling web access: Removing firewall blocks...");

        const char *script =
            "BLOCK_RULE_NAME_LAN='block_lan_wan'; "
            "BLOCK_RULE_NAME_WIFI='block_wifi_wan'; "
            "uci delete firewall.$BLOCK_RULE_NAME_LAN >/dev/null 2>&1; "
            "uci delete firewall.$BLOCK_RULE_NAME_WIFI >/dev/null 2>&1; "
            "uci set system.@system[0].enable_web_access=1; "
            "uci commit system; "
            "uci commit firewall; "
            "/etc/init.d/firewall restart";

        rc = system(script);
        if (rc != 0)
        {
            log_message("ERROR", "Failed to enable web access (rc=%d)", rc);
            return strdup("Error: Failed to enable web access");
        }

        log_message("INFO", "Web access enabled successfully");
        return strdup("Web access enabled");
    }

    log_message("ERROR", "Invalid flag for web access (expected 0 or 1, got %d)", flag);
    return strdup("Error: Invalid flag (expected 0 or 1)");
}
//Set check-in interval
char *set_checkin_interval(int newInterval)
{
    if (newInterval < 60 || newInterval > 86400){
    	log_message("ERROR", "Invalid check-in interval (60–86400 seconds)");
        return strdup("ERROR: Invalid check-in interval (60–86400 seconds)");
    }

    pthread_mutex_lock(&checkin_mutex);
    g_checkin_interval = newInterval;
    pthread_mutex_unlock(&checkin_mutex);

    if (!mqtt_config_exists())
    {
        log_message("INFO", "Creating /etc/config/mqtt for the first time");
        system("echo  > /etc/config/mqtt");
        system("uci add mqtt mqtt >/dev/null 2>&1");
        log_message("INFO", "Initialized new mqtt config section");
    }

    char cmd[256];
    snprintf(cmd, sizeof(cmd),
             "uci set mqtt.@mqtt[0].checkininterval=%d && uci commit mqtt",
             newInterval);
    system(cmd);

    log_message("INFO", "Check-in interval updated to %d seconds", newInterval);
    return strdup("Check-in interval updated successfully");
}

//Get check-in interval
char *get_checkin_interval(void)
{
    pthread_mutex_lock(&checkin_mutex);
    int current = g_checkin_interval;
    pthread_mutex_unlock(&checkin_mutex);

    log_message("INFO", "Current check-in interval is %d seconds", current);

    char buf[64];
    snprintf(buf, sizeof(buf), "%d", current);
    return strdup(buf);
}
//Set keep-alive time
char *set_mqtt_keepalive(int newKeepAlive)
{
    if (newKeepAlive < 30 || newKeepAlive > 3600){
    	log_message("ERROR", "Invalid keepalive (30–3600 seconds)");
        return strdup("ERROR: Invalid keepalive (30–3600 seconds)");
    }

    pthread_mutex_lock(&mqtt_keepalive_mutex);
    g_mqtt_keepalive = newKeepAlive;
    pthread_mutex_unlock(&mqtt_keepalive_mutex);

    if (!mqtt_config_exists())
    {
        log_message("INFO", "Creating /etc/config/mqtt for the first time");
        system("echo  > /etc/config/mqtt");
        system("uci add mqtt mqtt >/dev/null 2>&1");
        log_message("INFO", "Initialized new mqtt config section");
    }

    char cmd[256];
    snprintf(cmd, sizeof(cmd),
             "uci set mqtt.@mqtt[0].keepalive=%d && uci commit mqtt",
             newKeepAlive);
    system(cmd);

    log_message("INFO", "MQTT keepalive updated to %d seconds", newKeepAlive);
    return strdup("MQTT keepalive updated successfully");
}

//Get keep-alive time
char *get_mqtt_keepalive(void)
{
    pthread_mutex_lock(&mqtt_keepalive_mutex);
    int current = g_mqtt_keepalive;
    pthread_mutex_unlock(&mqtt_keepalive_mutex);
    g_force_mqtt_reconnect = 1;
    char buf[64];
    snprintf(buf, sizeof(buf), "%d", current);
    return strdup(buf);
}
//Restrict traffic for the given MAC
char *set_mac_filter_rule(const char *macAddress, int flag)
{
    if (!macAddress || strlen(macAddress) < 11)
        return strdup("Error: Invalid MAC address");

    char mac_cleaned[32] = {0};
    for (size_t i = 0, j = 0; i < strlen(macAddress); i++)
        if (macAddress[i] != ':')
            mac_cleaned[j++] = macAddress[i];

    char cmd[512];
    int rc = 0;

    /* ----------------------------------------
       BLOCK MAC  (flag = 0)
       ---------------------------------------- */
    if (flag == 0)
    {
        /* Add UCI firewall rule (persistent) */
        snprintf(cmd, sizeof(cmd),
            "cfg=$(uci add firewall rule); "
            "uci set firewall.$cfg.name='block_%s'; "
            "uci set firewall.$cfg.src='*'; "
            "uci set firewall.$cfg.dest='wan'; "            
            "uci set firewall.$cfg.src_mac='%s'; "
            "uci set firewall.$cfg.target='REJECT'; "
            "uci rename firewall.$cfg='block_%s'; "
            "uci commit firewall",
            mac_cleaned, macAddress, mac_cleaned);

        rc = system(cmd);

        if (rc != 0)
            return strdup("Error: Failed to save block rule");

        /* Apply rule immediately */
        snprintf(cmd, sizeof(cmd),
            "(/etc/init.d/firewall reload)&");

        rc = system(cmd);

        if (rc == 0){
            log_message("INFO", "Blocked %s successfully", macAddress);
            return strdup("MAC blocked");
        }
        else{
            log_message("ERROR", "Failed to block MAC %s (rc=%d)", macAddress, rc);
            return strdup("Error: iptables failed to enforce block");
        }
    }

    /* ----------------------------------------
       UNBLOCK MAC (flag = 1)
       ---------------------------------------- */
    else if (flag == 1)
    {
        /* Delete UCI rule */
        snprintf(cmd, sizeof(cmd),
            "uci -q delete firewall.block_%s; "
            "uci commit firewall",
            mac_cleaned);
        system(cmd);

        /* Remove iptables rule (live) */
        snprintf(cmd, sizeof(cmd),
            "(/etc/init.d/firewall reload)&");

        rc = system(cmd);

        if (rc == 0){
            log_message("INFO", "Unblocked MAC %s successfully", macAddress);
            return strdup("MAC unblocked");
        }
        else{
            log_message("ERROR", "Failed to unblock MAC %s (rc=%d)", macAddress, rc);
            return strdup("Error: iptables failed to remove block");
        }
    }

    return strdup("Error: Invalid flag");
}
//Set Wifi settings
char *set_wifi_config(const char *ifaceIndex,
                      const char *disabled,
                      const char *ssid,
                      const char *mode,
                      const char *encryption,
                      const char *password,
                      const char *ssidHide)
{
    if (!ifaceIndex || !ssid || !mode || !encryption || !password || !ssidHide)
        return strdup("Error: Missing WiFi configuration parameters");

    char cmd[1024];

    snprintf(cmd, sizeof(cmd),
        "uci set wireless.@wifi-iface[%s].disabled='%s' && "
        "uci set wireless.@wifi-iface[%s].ssid='%s' && "
        "uci set wireless.@wifi-iface[%s].mode='%s' && "
        "uci set wireless.@wifi-iface[%s].encryption='%s' && "
        "uci set wireless.@wifi-iface[%s].key='%s' && "
        "uci set wireless.@wifi-iface[%s].hidden='%s' && "
        "uci commit wireless && wifi reload",
        ifaceIndex, disabled,
        ifaceIndex, ssid,
        ifaceIndex, mode,
        ifaceIndex, encryption,
        ifaceIndex, password,
        ifaceIndex, ssidHide);

    int rc = system(cmd);

    if (rc == 0)
    {
        log_message("INFO", "Wi-Fi configuration updated successfully for iface[%s]", ifaceIndex);
        return strdup("Wi-Fi configuration updated successfully");
    }
    else
    {
        log_message("ERROR", "Failed to configure Wi-Fi iface[%s] (rc=%d)", ifaceIndex, rc);
        return strdup("Error: Failed to apply Wi-Fi configuration");
    }
}
//Set LAN,WAN and WWAN settings
char *set_network_config(const char *lanIp,
                         const char *lanProto,
                         const char *lanMask,
                         const char *wanIp,
                         const char *wanProto,
                         const char *wanMask,
                         const char *wwanIp,
                         const char *wwanProto,
                         const char *wwanMask)
{
    if (!lanIp || !lanProto || !lanMask || !wanIp || !wanProto ||
        !wanMask || !wwanIp || !wwanProto || !wwanMask)
    {
        return strdup("Error: Missing one or more network parameters");
    }

    char cmd[1024];

    // Build a UCI batch command to apply all settings safely
    snprintf(cmd, sizeof(cmd),
        "uci batch <<EOF\n"
        "set network.lan.ipaddr='%s'\n"
        "set network.lan.proto='%s'\n"
        "set network.lan.netmask='%s'\n"
        "set network.wan.ipaddr='%s'\n"
        "set network.wan.proto='%s'\n"
        "set network.wan.netmask='%s'\n"
        "set network.wwan.ipaddr='%s'\n"
        "set network.wwan.proto='%s'\n"
        "set network.wwan.netmask='%s'\n"
        "commit network\n"
        "EOF\n"
        "/etc/init.d/network reload",
        lanIp, lanProto, lanMask,
        wanIp, wanProto, wanMask,
        wwanIp, wwanProto, wwanMask);

    int rc = system(cmd);

    if (rc == 0)
    {
        log_message("INFO", "Network configuration updated successfully");
        return strdup("Network configuration updated successfully");
    }
    else
    {
        log_message("ERROR", "Failed to apply network configuration (rc=%d)", rc);
        return strdup("Error: Failed to apply network configuration");
    }
}
//Get Wifi connected devices
char *get_wifi_hosts_details(const char *imei)
{
    char output[16384] = {0};  // enough buffer for script output

    FILE *fp = fopen("/tmp/get_wifi_hosts.sh", "w");
    fwrite(assocList_sh, 1, assocList_sh_len, fp);
    fclose(fp);
    system("chmod +x /tmp/get_wifi_hosts.sh");
    FILE *out = popen("/tmp/get_wifi_hosts.sh", "r");
    if (!out)
    {
        log_message("ERROR", "Failed to execute get_wifi_hosts.sh");
        return strdup("{\"D\":{\"a\":\"ERROR\",\"b\":\"Script execution failed\"}}");
    }

    fread(output, 1, sizeof(output) - 1, out);
    pclose(out);

    trim(output);

    if (strlen(output) == 0)
    {
        log_message("WARN", "Wi-Fi hosts script returned empty output");
        return strdup("{\"D\":{\"a\":\"\"}}");
    }

    // Build final JSON: {"D":{"a":"<IMEI>", <script-output>}}
    char *jsonStr = NULL;
    asprintf(&jsonStr, "{\"D\":{\"a\":\"%s\",%s}}", imei, output);

    log_message("INFO", "Wi-Fi hosts JSON response: %s", jsonStr);
    return jsonStr;  // Caller must free()
}
//File Upload - URL, Filename
char *perform_file_upload(const char *url, const char *filename)
{
    if (!url || !filename)
        return strdup("Missing URL or filename");

    char cmd[512];
    char output[512] = {0};

    // Use curl with POST and fail on HTTP errors
    snprintf(cmd, sizeof(cmd),
             "curl -s -o /tmp/upload_resp.txt -w '%%{http_code}' -F 'file=@%s' '%s' 2>/dev/null",
             filename, url);

    log_message("INFO", "Executing upload command: %s", cmd);

    FILE *fp = popen(cmd, "r");
    if (!fp)
        return strdup("Failed to execute upload command");

    fread(output, 1, sizeof(output) - 1, fp);
    pclose(fp);
    trim(output);

    // Check for HTTP 200 or 201 success
    if (strcmp(output, "200") == 0 || strcmp(output, "201") == 0)
        return strdup("File upload successful");
    else
    {
        char msg[256];
        snprintf(msg, sizeof(msg), "Upload failed (HTTP %s)", output);
        return strdup(msg);
    }
}
//File Download - URL, Filename
char *perform_file_download(const char *url, const char *filename)
{
    if (!url || !filename)
        return strdup("Missing URL or filename");

    char filepath[256];
    snprintf(filepath, sizeof(filepath), "/tmp/%s", filename);

    char cmd[512];
    snprintf(cmd, sizeof(cmd), "wget -q -O %s '%s' 2>/dev/null", filepath, url);

    log_message("INFO", "Executing download command: %s", cmd);

    int ret = system(cmd);

    if (ret == 0)
    {
        char msg[256];
        snprintf(msg, sizeof(msg), "File downloaded successfully: %s", filepath);
        return strdup(msg);
    }
    else
        return strdup("File download failed (check URL or permissions)");
}
//Command response - 1000
char *build_simple_ack_json(const char *imei, const char *status)
{
    if (!imei || !status)
        return strdup("{\"A\":{\"a\":\"UNKNOWN\",\"b\":\"0\"}}");

    cJSON *root = cJSON_CreateObject();
    cJSON *A = cJSON_CreateObject();

    cJSON_AddStringToObject(A, "a", imei);
    cJSON_AddStringToObject(A, "b", status);
    cJSON_AddItemToObject(root, "A", A);

    char *jsonStr = cJSON_PrintUnformatted(root);
    cJSON_Delete(root);

    if (jsonStr)
        log_message("INFO", "Built command response JSON: %s", jsonStr);

    return jsonStr;  // caller must free
}
//Get station connection status
char *get_station_connection_details()
{
    char output[16384] = {0};  // enough buffer for script output

    FILE *fp = fopen("/tmp/get_station_connection_details.sh", "w");
    fwrite(cio_stationConnStatus_sh, 1, cio_stationConnStatus_sh_len, fp);
    fclose(fp);
    system("chmod +x /tmp/get_station_connection_details.sh");
    FILE *out = popen("/tmp/get_station_connection_details.sh", "r");
    if (!out)
    {
        log_message("ERROR", "Failed to execute get_station_connection_details.sh");
        return strdup("{\"D\":{\"a\":\"ERROR\",\"b\":\"Script execution failed\"}}");
    }

    fread(output, 1, sizeof(output) - 1, out);
    pclose(out);

    trim(output);

    if (strlen(output) == 0)
    {
        log_message("WARN", "Station connection hosts script returned empty output");
        return strdup("");
    }

    char *jsonStr = NULL;
    asprintf(&jsonStr, "%s", output);

    log_message("INFO", "Station connection JSON response: %s", jsonStr);
    return jsonStr;  // Caller must free()
}
