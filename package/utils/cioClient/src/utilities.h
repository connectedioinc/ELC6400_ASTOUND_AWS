#ifndef UTILITIES_H
#define UTILITIES_H
#include <pthread.h>
#include <stdint.h>
#include "core_mqtt.h" 
#include <stddef.h>  /* for size_t */
#define CLIENT_ID_MAX_LEN 64
//Structure for getting TX and RX of LAN ports
typedef struct {
    char rx_str[32];
    char tx_str[32];
} LanPortStatsStrings;
extern char clientIdentifier[CLIENT_ID_MAX_LEN];  // globally accessible client ID
extern uint16_t clientIdentifierLength;
int get_device_serial(char *buf, size_t buflen);
unsigned int execute_system_command(char *cmd, char *status, size_t max_size);
void get_cmd_output(const char *cmd, char *buf, size_t len);
void trim(char *s);
int publishToTopicQOS(MQTTContext_t *pMqttContext, const char *topic, const char *message, MQTTQoS_t qos);
unsigned int get_imei(char* imei);
int get_device_imei(void *buf, int max);
int buildClientIdentifier(void);
int ensure_dir_exists(const char *path);
int save_file_secure(const char *path, const char *data);
char *read_file(const char *path);
char *get_lan_ip(void);
char *get_wan_ip(void);
char *get_qmi_ip(void);
unsigned int get_firmware_version(char* openwrt_version);
unsigned int get_iccid(char* iccid);
unsigned int get_apn(char* apn);
unsigned int get_operator(char* op);
unsigned int get_phoneNumber(char* phoneNumber);
unsigned int get_modem_firmware_version(char *modem_firmware);
unsigned int get_modem_module(char* modem_module);
unsigned int get_snr(char *snr);
unsigned int get_system_uptime(char* system_uptime);
unsigned int get_mode(char *mode);
unsigned int get_signal_strength(char* signal_strength);
int mqtt_config_exists(void);
int uci_get_int(const char *key, int default_value);
unsigned int get_interface_status(int interface_name);
int backup_certs_to_log(void);
int restore_certs_from_log(void);
int delete_directory_recursive(const char *path);
int get_wifi_interfaces(char ifaces[][32], int max);
int get_elc_port_stats_strings(int lan_idx, LanPortStatsStrings *stats);
int maskToPort(int mask);
void get_port_stats(int port_id, char *rx_out, char *tx_out, size_t max_len);
#endif /* UTILITIES_H */

