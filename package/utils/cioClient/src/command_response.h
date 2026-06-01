#ifndef COMMAND_RESPONSE_H
#define COMMAND_RESPONSE_H
char *build_interface_group_json(void);
char *buildFullRefreshJson(const char *imei);
char *execute_at_command(const char *atCmd);
int perform_factory_reset(void);
char *read_firewall_settings();
unsigned int set_firewall_settings(char *firewall_setting, char *hostname);
int perform_soft_reboot();
char *execute_shell_command(const char *cmd);
char *set_web_access(int flag);
char *set_checkin_interval(int newInterval);
char *get_checkin_interval(void);
char *set_mqtt_keepalive(int newKeepAlive);
char *get_mqtt_keepalive(void);
char *set_mac_filter_rule(const char *macAddress, int flag);
char *set_wifi_config(const char *ifaceIndex, const char *disabled, const char *ssid, const char *mode, const char *encryption, const char *password, const char *ssidHide);
char *set_network_config(const char *lanIp, const char *lanProto, const char *lanMask, const char *wanIp, const char *wanProto, const char *wanMask, const char *wwanIp, const char *wwanProto, const char *wwanMask);
char *set_wifi_config(const char *ifaceIndex, const char *disabled, const char *ssid, const char *mode, const char *encryption, const char *password, const char *ssidHide);
char *get_wifi_hosts_details(const char *imei);
char *perform_file_upload(const char *url, const char *filename);
char *perform_file_download(const char *url, const char *filename);
char *build_simple_ack_json(const char *imei, const char *status);
char *get_station_connection_details();
cJSON *buildDataUsageJsonResp();
#endif
