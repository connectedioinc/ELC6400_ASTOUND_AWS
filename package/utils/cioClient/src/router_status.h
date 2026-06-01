/**
 * @file cio at command header
 * @brief Default defines and macros
 *
 * AT command related header file
 */

#ifndef ROUTER_STATUS_H_
#define ROUTER_STATUS_H_
# include <curl/curl.h>
#ifdef __cplusplus
extern "C" {
#endif
unsigned int get_wwan_data_usage(char* data_usage);
unsigned int execute_system_command(char *cmd, char *status, size_t max_size);
static void getEpochTime(unsigned long long *time);
//void strip_nonprintable(char *src);
unsigned int check_device_alerts(char *current_interface,  char *prev_interface);
unsigned int check_lan_status(char *current_interface, char *prev_interface);
unsigned int get_interface_status(int interface_name);
unsigned int get_lan_ip(char* lan_ip_address);
unsigned int get_wan_ip(char* wan_ip_address);
unsigned int get_wwan_ip(char* wwan_ip_address);
unsigned int get_assoc_list(char *assoc_hosts);
unsigned int get_ethernet_list(char *eth_hosts);
int manufacture_identification();
unsigned int get_wifi_settings(char* wifi_settings);
//unsigned int get_firmware_version(char* openwrt_version);
//unsigned int get_iccid(char* iccid);
//unsigned int get_apn(char* apn);
//unsigned int get_operator(char* op);
//unsigned int get_device_details(char* device_info);
//unsigned int get_snr(char* snr);
//unsigned int get_signal_strength(char* signal_strength);
//unsigned int get_mode(char* mode);
//unsigned int get_device_network_info(char* device_network);
unsigned int get_system_uptime(char* system_uptime);
unsigned int get_refresh_data(char* refresh_data);
unsigned int set_firewall_settings(char *firewall_setting,char *hostname,char *status);
unsigned int read_firewall_settings(char *status);
int cio_kaa_helper_set_webaccess_policy(int enable);
int cio_kaa_helper_get_webaccess_policy();
int init_mac_filter_rule();
unsigned int set_wifi_settings(char *wifi_setting);
unsigned int get_lan_interface_details(char* interfaceString);
unsigned int get_interface_settings(char* status);
unsigned int set_interface_settings(char* lanIP, char* lanProto, char* lanMask, char* wanIP, char* wanProto, char* wanMask, char* wwanIP, char* wwanProto, char* wwanMask);
unsigned int get_wan_interface_details(char* interfaceString);
unsigned int get_wwan_interface_details(char* interfaceString);
int cio_kaa_helper_get_data_traffic_policy();
int cio_kaa_helper_set_data_traffic_policy(int enable, char *uploadURL, char *timeDuration, char *notID, char *httpHeader);
void cio_kaa_helper_set_number_files_to_upload();
unsigned int cio_kaa_helper_get_notification_ID(char *notID);
unsigned int get_connection_status(char *eth_hosts);
#ifdef __cplusplus
}      /* extern "C" */
#endif

#endif /* ROUTER_STATUS_H_ */

