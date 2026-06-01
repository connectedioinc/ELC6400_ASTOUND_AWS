-- Paths are written as an array of objects because order must be maintained
-- as some path patterns can be more or less specific and they must be written first
-- so they are matched first. If match is not found then the following - more general route is tried
-- an so on
-- all services can have following 'groups' - config, actions, options, status
local paths = {
    -- MAIN
    { ["/login"]                                                        = "/usr/lib/lua/api/core/login" },
    { ["/logout"]                                                       = "/usr/lib/lua/api/core/logout" },
    { ["/jwt_login"]                                                    = "/usr/lib/lua/api/core/jwt_login" },
    { ["/refresh"]                                                      = "/usr/lib/lua/api/core/refresh" },
	{ ["/bulk"]                                                         = "/usr/lib/lua/api/core/bulk" },
    { ["/session/status"]                                               = "/usr/lib/lua/api/core/session" },
	{ ["/unauthorized/status"]                                          = "/usr/lib/lua/api/core/base_info" },
    { ["/system/password/{service_group}/{sid}"]                                 = "/usr/lib/lua/api/core/password_hash_change" },
    -- STATUS
    { ["/events_log/{service_group}/{sid}"]                             = "/usr/lib/lua/api/status/events_log" },

    { ["/services/{service_group}/{sid}"]                               = "/usr/lib/lua/api/status/services" },

    { ["/overview/{service_group}/{sid}"]                               = "/usr/lib/lua/api/status/overview" },
    { ["/topology/{service_group}/{sid}"]                        = "/usr/lib/lua/api/status/networkmap" },
    { ["/network_usage/global"]                        = "/usr/lib/lua/api/status/network_usage_global" },
    { ["/network_usage/{service_group}/{sid}/{type}"]                        = "/usr/lib/lua/api/status/network_usage_status" },

    { ["/widget/{service_group}/{sid}"]                          = "/usr/lib/lua/api/status/widget" },

    -- SERVICE
    { ["/console/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/console" },

    { ["/wireguard/{binding}/peers/{service_group}/{sid}"]     = "/usr/lib/lua/api/services/wireguard_peer" },
    { ["/wireguard/{service_group}/{sid}"]                     = "/usr/lib/lua/api/services/wireguard" },

    {["/hotspot2/{binding}/names/{service_group}/{sid}"]       = "/usr/lib/lua/api/services/hotspot2_op_name"},
    {["/hotspot2/{binding}/capabilities/{service_group}/{sid}"] = "/usr/lib/lua/api/services/hotspot2_conn_cap"},
    {["/hotspot2/{binding}/3gpp/{service_group}/{sid}"]        = "/usr/lib/lua/api/services/hotspot2_3gpp"},
    {["/hotspot2/{binding}/venues/{service_group}/{sid}"]      = "/usr/lib/lua/api/services/hotspot2_venues"},
    {["/hotspot2/{binding}/nai/{service_group}/{sid}"]         = "/usr/lib/lua/api/services/hotspot2_nai_realm"},
    {["/hotspot2/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/hotspot2"},

    { ["/mqtt/publisher/{service_group}/{sid}"]                            = "/usr/lib/lua/api/services/mqtt_pub" },
    { ["/mqtt/bridge/topics/{service_group}/{sid}"] = "/usr/lib/lua/api/services/mqtt_broker_topic" },
    { ["/mqtt/bridge/{binding}/topics/{service_group}/{sid}"] = "/usr/lib/lua/api/services/mqtt_broker_topic" },
    { ["/mqtt/bridge/{service_group}/{sid}"]                  = "/usr/lib/lua/api/services/mqtt_bridge" },
    { ["/mqtt/broker/{service_group}/{sid}"]                         = "/usr/lib/lua/api/services/mqtt_broker" },

    { ["/cumulocity/{service_group}/{sid}"]    = "/usr/lib/lua/api/services/cumulocity" },
    { ["/cloud_of_things/{service_group}/{sid}"]           = "/usr/lib/lua/api/services/cot" },
    { ["/thingworx/{service_group}/{sid}"]     = "/usr/lib/lua/api/services/thingworx" },
    { ["/rms/proxy/{service_group}/{sid}"]              = "/usr/lib/lua/api/services/rms_proxy" },
    { ["/rms/internal/{service_group}/{sid}"]           = "/usr/lib/lua/api/services/rms_internal" },
    { ["/rms/{service_group}/{sid}"]           = "/usr/lib/lua/api/services/rms" },
    { ["/azure/iot_hub/{service_group}/{sid}/{binding}"] = "/usr/lib/lua/api/services/azure_iothub" },
    { ["/azure/iot_hub/{service_group}/{sid}"] = "/usr/lib/lua/api/services/azure_iothub" },
    { ["/azure_iot_hub/{service_group}/{sid}"] = "/usr/lib/lua/api/services/old_azure_iothub" },

    { ["/aws/jobs/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/aws_jobs" },
    { ["/aws/provisioning/{service_group}/{sid}"]              = "/usr/lib/lua/api/services/aws_provisioning" },

    { ["/email_relay/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/email_relay" },

    { ["/tr069/{service_group}/{sid}"]                         = "/usr/lib/lua/api/services/tr069" },

    { ["/minidlna/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/minidlna" },

    { ["/ntrip/{service_group}/{sid}"]                         = "/usr/lib/lua/api/services/ntrip" },

    { ["/dmvpn/{service_group}/{sid}"]                         = "/usr/lib/lua/api/services/dmvpn" },

    { ["/wol/global"]                                          = "/usr/lib/lua/api/services/wol_setup" },
    { ["/wol/{service_group}/{sid}"]                           = "/usr/lib/lua/api/services/wol_devices" },

    { ["/speedtest/config/{sid}"]                              = "/usr/lib/lua/api/services/speedtest_config" },
    { ["/speedtest/{service_group}/{sid}"]                     = "/usr/lib/lua/api/services/speedtest" },

    { ["/ulog/ftp/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/ulog_ftp" },
    { ["/ulog/{service_group}/options"]                  = "/usr/lib/lua/api/services/ulog_options" },
    { ["/ulog/{service_group}/{sid}"]                  = "/usr/lib/lua/api/services/ulog" },


    { ["/udprelay/{service_group}/{sid}"]                       = "/usr/lib/lua/api/network/udprelay" },
    { ["/relayd/{service_group}/{sid}"]                         = "/usr/lib/lua/api/network/relayd" },

    -- OPC UA Server
    { ["/opcua/destination_server/nodes/{service_group}/{sid}"] = "/usr/lib/lua/api/services/opcua_server/nodes" },
    { ["/opcua/destination_server/{service_group}/{sid}"]       = "/usr/lib/lua/api/services/opcua_server/general" },

    -- OPC UA Client
    { ["/opcua/global"]                                        = "/usr/lib/lua/api/services/opcua_global" },
    { ["/opcua/server/{binding}/nodes/{service_group}/{sid}"]  = "/usr/lib/lua/api/services/opcua_server_node" },
    { ["/opcua/server/{service_group}/{sid}"]                  = "/usr/lib/lua/api/services/opcua_server" },
    { ["/opcua/group/{binding}/values/{service_group}/{sid}"]  = "/usr/lib/lua/api/services/opcua_value" },
    { ["/opcua/group/{service_group}/{sid}"]                   = "/usr/lib/lua/api/services/opcua_value_group" },
    { ["/opcua/database/entries/{service_group}"]              = "/usr/lib/lua/api/services/opcua_database_entries" },
    { ["/opcua/{service_group}/{sid}"]                         = "/usr/lib/lua/api/services/opcua_actions" },

    { ["/stunnel/global"]                                      = "/usr/lib/lua/api/services/stunnel_global" },
    { ["/stunnel/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/stunnel" },


    { ["/samba/global"]                                        = "/usr/lib/lua/api/services/samba" },
    { ["/samba/{service_group}"]                                        = "/usr/lib/lua/api/services/samba_status" },
    { ["/samba/shares/{service_group}/{sid}"]                  = "/usr/lib/lua/api/services/samba_share" },
    { ["/samba/users/{service_group}/{sid}"]                   = "/usr/lib/lua/api/services/samba_users" },

    { ["/usb_tools/p910nd/{service_group}/{sid}"]              = "/usr/lib/lua/api/services/p910nd" },
    { ["/usb_tools/memory_expansion/{service_group}/{sid}"]    = "/usr/lib/lua/api/services/memory_expansion" },
    { ["/usb_tools/mount/{service_group}"]              = "/usr/lib/lua/api/services/usb_mounts" },
    { ["/usb_tools/{service_group}/{sid}"]             = "/usr/lib/lua/api/services/usb_tools" },

    { ["/sms_gateway/auto_reply/{service_group}/{sid}"]   = "/usr/lib/lua/api/services/sms_gateway/auto_reply" },
    { ["/sms_gateway/email_to_sms/{service_group}/{sid}"]              = "/usr/lib/lua/api/services/sms_gateway/email_to_sms" },
    { ["/sms_gateway/sms_forwarding/to_http/{service_group}/{sid}"]    = "/usr/lib/lua/api/services/sms_forwarding/to_http" },
    { ["/sms_gateway/sms_forwarding/to_smtp/{service_group}/{sid}"]    = "/usr/lib/lua/api/services/sms_forwarding/to_smtp" },
    { ["/sms_gateway/sms_forwarding/to_sms/{service_group}/{sid}"]     = "/usr/lib/lua/api/services/sms_forwarding/to_sms" },
    { ["/call_utilities/global"]                           = "/usr/lib/lua/api/services/call_utilities/call_general" },
    { ["/call_utilities/rules/{service_group}/{sid}"]      = "/usr/lib/lua/api/services/call_utilities/call_rules" },
    { ["/phone_settings/{service_group}/{sid}"] = "/usr/lib/lua/api/services/phone_settings/phone_settings" },
    { ["/sms_utilities/rules/{service_group}/{sid}"]       = "/usr/lib/lua/api/services/sms_rules" },
    { ["/messages/storage/{service_group}/{sid}"]          = "/usr/lib/lua/api/services/sms_storage" },
    { ["/messages/modem/{sid}/sms/{binding}/{service_group}"]                 = "/usr/lib/lua/api/services/messages" },
    { ["/messages/modem/{sid}/{service_group}"]                 = "/usr/lib/lua/api/services/messages" },
    { ["/messages/{service_group}/{sid}"]                           = "/usr/lib/lua/api/services/messages" },
    { ["/messages/{service_group}"]                           = "/usr/lib/lua/api/services/messages" },

    { ["/pptp/client/{service_group}/{sid}"]                   = "/usr/lib/lua/api/services/pptp_client" },
	{ ["/pptp/server/{service_group}/{sid}"]                   = "/usr/lib/lua/api/services/pptp_server" },
	{ ["/pptp/server/{binding}/users/{service_group}/{sid}"]   = "/usr/lib/lua/api/services/pptp_login" },

    { ["/ethernet_ip/{service_group}/{sid}"]                     = "/usr/lib/lua/api/services/ethernet_ip" },

    { ["/mrp/instance/{service_group}/{sid}"]                     = "/usr/lib/lua/api/network/mrp_section" },
    { ["/mrp/{service_group}/{sid}"]                     = "/usr/lib/lua/api/network/mrp" },

    { ["/smpp/{service_group}/{sid}"]                          = "/usr/lib/lua/api/services/smpp" },

	{ ["/gre/{service_group}/{sid}"]                           = "/usr/lib/lua/api/services/gre" },
    { ["/gre/{binding}/routes/{service_group}/{sid}"]          = "/usr/lib/lua/api/services/gre_routes_ipv4" },
    { ["/gre/{binding}/routes6/{service_group}/{sid}"]          = "/usr/lib/lua/api/services/gre_routes_ipv6" },

    { ["/ipsec/global"]                              = "/usr/lib/lua/api/services/ipsec_global" },
    { ["/ipsec/secrets/{service_group}/{sid}"]       = "/usr/lib/lua/api/services/ipsec_secret" },
    { ["/ipsec/{service_group}/{sid}"]               = "/usr/lib/lua/api/services/ipsec" },

    { ["/package_manager/restore/{service_group}/{sid}"]               = "/usr/lib/lua/api/services/package_restore" },
    { ["/package_manager/{service_group}/status"]                      = "/usr/lib/lua/api/services/packages" },
    { ["/package_manager/{service_group}/options"]                      = "/usr/lib/lua/api/services/packages_options" },
    { ["/package_manager/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/packages" },

	{ ["/events_reporting/{service_group}/{sid}"]				= "/usr/lib/lua/api/services/events_reporting" },

    { ["/event_juggler/events/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/event_juggler_events" },
    { ["/event_juggler/events/{binding}/operations/{service_group}/{sid}"]     = "/usr/lib/lua/api/services/event_juggler_actions" },
    { ["/event_juggler/events/{binding}/conditions/{service_group}/{sid}"] = "/usr/lib/lua/api/services/event_juggler_conditions" },
    { ["/event_juggler/operations/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/event_juggler_actions" },
    { ["/event_juggler/conditions/{service_group}/{sid}"]                   = "/usr/lib/lua/api/services/event_juggler_conditions" },
    { ["/event_juggler/{service_group}/{sid}"]                              = "/usr/lib/lua/api/services/event_juggler" },

	{ ["/auto_reboot/scheduler/{service_group}/{sid}"]          = "/usr/lib/lua/api/services/periodic_reboot" },
	{ ["/auto_reboot/ping_wget/{service_group}/{sid}"]              = "/usr/lib/lua/api/services/ping_reboot" },
	{ ["/auto_reboot/wireless/{service_group}/{sid}"]              = "/usr/lib/lua/api/services/wireless_reboot" },

	{ ["/igmp_proxy/routes/{service_group}/{sid}"]             = "/usr/lib/lua/api/services/igmp_routes" },
	{ ["/igmp_proxy/global"]                                   = "/usr/lib/lua/api/services/igmp_proxy" },

    { ["/dlms/global"]                                            = "/usr/lib/lua/api/services/dlms_global" },
    { ["/dlms/devices/{service_group}/{sid}"]                     = "/usr/lib/lua/api/services/dlms_devices" },
    { ["/dlms/cosem_group/{binding}/cosem/{service_group}/{sid}"] = "/usr/lib/lua/api/services/dlms_cosem" },
    { ["/dlms/connections/{service_group}/{sid}"]                 = "/usr/lib/lua/api/services/dlms_connections" },
    { ["/dlms/cosem_group/{service_group}/{sid}"]                 = "/usr/lib/lua/api/services/dlms_cosem_group" },
    { ["/dlms/scan/{service_group}/{sid}"]                        = "/usr/lib/lua/api/services/dlms_scan" },
    { ["/dlms/found_parameters/{service_group}/{sid}"]            = "/usr/lib/lua/api/services/dlms_found_parameters" },
    { ["/dlms/database/entries/{service_group}"]                  = "/usr/lib/lua/api/services/dlms_database_entries" },

    { ["/dnp3/serial_outstation/objects/{service_group}/{sid}"] = "/usr/lib/lua/api/services/dnp3_serial_outstation_tag" },
    { ["/dnp3/serial_outstation/{service_group}/{sid}"]         = "/usr/lib/lua/api/services/dnp3_serial_outstation" },
    { ["/dnp3/{type}/{binding}/requests/{service_group}/{sid}"] = "/usr/lib/lua/api/services/dnp3_request" },
    { ["/dnp3/tcp/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/dnp3_tcp" },
    { ["/dnp3/serial/{service_group}/{sid}"]                    = "/usr/lib/lua/api/services/dnp3_serial" },
    { ["/dnp3/outstation/objects/{service_group}/{sid}"]      = "/usr/lib/lua/api/services/dnp3_outstation_tag" },
    { ["/dnp3/outstation/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/dnp3_outstation" },
    { ["/dnp3/global"]                                          = "/usr/lib/lua/api/services/dnp3_global" },
    { ["/dnp3/database/entries/{service_group}"]                = "/usr/lib/lua/api/services/dnp3_database_entries_status" },

    { ["/docker/global"]                                       = "/usr/lib/lua/api/services/docker_global" },
    { ["/docker/containers/{service_group}/{sid}"]             = "/usr/lib/lua/api/services/docker_containers" },
    { ["/docker/images/{service_group}/{sid}"]                 = "/usr/lib/lua/api/services/docker_images" },
    { ["/docker/login/{service_group}/{sid}"]                  = "/usr/lib/lua/api/services/docker_login" },

    { ["/qos/interfaces/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/qos_interfaces" },
    { ["/qos/rules/{service_group}/{sid}"]                     = "/usr/lib/lua/api/services/qos_classification" },

    { ["/vrrp/{service_group}/{sid}"]                          = "/usr/lib/lua/api/services/vrrp" },

    { ["/ddns/{service_group}/{sid}"]                          = "/usr/lib/lua/api/services/ddns" },

    { ["/bluetooth/paired/{service_group}/{sid}"]           = "/usr/lib/lua/api/services/bluetooth_paired" },
    { ["/bluetooth/scanning/{service_group}"]               = "/usr/lib/lua/api/services/scanning_status" },
    { ["/bluetooth/result/{service_group}"]                 = "/usr/lib/lua/api/services/result_status" },
    { ["/bluetooth/database/entries/{service_group}"]       = "/usr/lib/lua/api/services/bluetooth_database_entries" },
    { ["/bluetooth/{service_group}/{sid}"]                  = "/usr/lib/lua/api/services/bluetooth" },

    { ["/snmp/communities_v6/{service_group}/{sid}"]                     = "/usr/lib/lua/api/services/snmp_communities_v6" },
    { ["/snmp/communities/{service_group}/{sid}"]                        = "/usr/lib/lua/api/services/snmp_communities" },
    { ["/snmp/agent/objects/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/snmp_tag" },
    { ["/snmp/agent/{service_group}/{sid}"]                           = "/usr/lib/lua/api/services/snmp_settings" },
    { ["/snmp/system/{service_group}/{sid}"]                             = "/usr/lib/lua/api/services/snmp_system" },
    { ["/snmp/trap/global"]                      = "/usr/lib/lua/api/services/snmp_trap_settings" },
    { ["/snmp/trap/{service_group}/{sid}"]                         = "/usr/lib/lua/api/services/snmp_trap_rules" },
    { ["/snmp/users/{service_group}/{sid}"]                                 = "/usr/lib/lua/api/services/snmp_users" },

    { ["/hotspot/logs/{service_group}/{sid}"]                  = "/usr/lib/lua/api/services/hotspot_logs" },
    { ["/hotspot/users/{service_group}/{sid}"]                 = "/usr/lib/lua/api/services/hotspot_users" },
    { ["/hotspot/groups/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/hotspot_groups" },
    { ["/hotspot/user_management/{service_group}/{sid}"]       = "/usr/lib/lua/api/services/hotspot_user_management" },
    { ["/hotspot/themes/global"]                               = "/usr/lib/lua/api/services/hotspot_landing_page" },
    { ["/hotspot/themes/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/hotspot_themes" },
    { ["/hotspot/themes/{type}/{service_group}/{sid}"]         = "/usr/lib/lua/api/services/hotspot_themes_files" },
    { ["/hotspot/images/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/hotspot_theme_img" },
    { ["/hotspot/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/hotspot_general" },

    { ["/sshfs/{service_group}/{sid}"]                         = "/usr/lib/lua/api/services/sshfs" },

    { ["/upnp/redirects/{service_group}/{sid}"]            = "/usr/lib/lua/api/services/upnp_redirects" },
    { ["/upnp/global"]             = "/usr/lib/lua/api/services/upnp_settings" },
    { ["/upnp/acls/{service_group}/{sid}"]                 = "/usr/lib/lua/api/services/upnp_acls" },

    { ["/data_to_server/collections/{binding}/data/{service_group}/{sid}"]   = "/usr/lib/lua/api/services/data_sender_inputs" },
    { ["/data_to_server/collections/{binding}/servers/{service_group}/{sid}"]   = "/usr/lib/lua/api/services/data_sender_outputs" },
    { ["/data_to_server/data/{service_group}/{sid}"]            = "/usr/lib/lua/api/services/data_sender_inputs" },
    { ["/data_to_server/servers/{service_group}/{sid}"]           = "/usr/lib/lua/api/services/data_sender_outputs" },
    { ["/data_to_server/collections/{service_group}/{sid}"]       = "/usr/lib/lua/api/services/data_sender_collections" },
    { ["/data_to_server/format/{service_group}/{sid}"]            = "/usr/lib/lua/api/services/data_sender_format" },
    { ["/data_to_server/encoder/{service_group}/{sid}"]            = "/usr/lib/lua/api/services/data_sender_encoder" },

    { ["/netbird/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/netbird" },

    { ["/tailscale/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/tailscale" },

    { ["/openvpn/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/openvpn" },
    { ["/openvpn/{binding}/clients/{service_group}/{sid}"]         = "/usr/lib/lua/api/services/openvpn_tls" },
    { ["/openvpn/{type}/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/openvpn_export" },

    { ["/impulse_counter/global"]                                = "/usr/lib/lua/api/services/impulse_counter_global" },
    { ["/impulse_counter/historic/{service_group}"]                 = "/usr/lib/lua/api/services/impulse_counter_historic" },
    { ["/impulse_counter/{service_group}/{sid}"]                 = "/usr/lib/lua/api/services/impulse_counter_sections" },

    { ["/io/scheduler/global"]                      = "/usr/lib/lua/api/services/io_scheduler" },
    { ["/io/scheduler/{service_group}/{sid}"]  =    "/usr/lib/lua/api/services/io_scheduler_instance" },
    { ["/io/juggler/operations/{service_group}/{sid}"]      = "/usr/lib/lua/api/services/io_juggler_action" },
    { ["/io/juggler/conditions/{service_group}/{sid}"]   = "/usr/lib/lua/api/services/io_juggler_condition" },
    { ["/io/juggler/inputs/{service_group}/{sid}"]       = "/usr/lib/lua/api/services/io_juggler_input" },
    { ["/io/juggler/global"]                        = "/usr/lib/lua/api/services/io_juggler" },
    { ["/io/{sid}/{service_group}"]                         = "/usr/lib/lua/api/services/io_status" },
    { ["/io/{service_group}"]                         = "/usr/lib/lua/api/services/io_status" },
    { ["/io/{binding}/{service_group}/{sid}"]                         = "/usr/lib/lua/api/services/io_status" },

    { ["/itxpt/global"]                                         = "/usr/lib/lua/api/services/itxpt_general" },
    { ["/itxpt/services/{service_group}/{sid}"]                 = "/usr/lib/lua/api/services/itxpt_services" },

    { ["/power_control/{service_group}/{sid}"]                  = "/usr/lib/lua/api/services/power_control" },

    { ["/l2tp/client/{service_group}/{sid}"]                   = "/usr/lib/lua/api/services/l2tp_client" },
    { ["/l2tp/server/{service_group}/{sid}"]                   = "/usr/lib/lua/api/services/l2tp_server" },
    { ["/l2tp/users/{service_group}/{sid}"]                    = "/usr/lib/lua/api/services/l2tp_users" },
    { ["/l2tpv3/{service_group}/{sid}"]                        = "/usr/lib/lua/api/services/l2tpv3" },
    { ["/l2tp/{service_group}/{sid}"]                          = "/usr/lib/lua/api/services/l2tp_status" },

    { ["/mbus/global"]                                          = "/usr/lib/lua/api/services/mbus_global" },
    { ["/mbus/{service_group}"]                                 = "/usr/lib/lua/api/services/mbus_status" },
    { ["/mbus/database/entries/{service_group}"]                = "/usr/lib/lua/api/services/mbus_database_entries" },
    { ["/mbus/devices/{service_group}/{sid}"]                   = "/usr/lib/lua/api/services/mbus_devices" },
    { ["/mbus/devices/{binding}/{service_group}/{sid}"]         = "/usr/lib/lua/api/services/mbus_device_actions" },
    { ["/mbus/found_devices/{service_group}/{sid}"]             = "/usr/lib/lua/api/services/mbus_found_devices" },
    { ["/mbus/scan/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/mbus_scan" },
    { ["/mbus/groups/{service_group}/{sid}"]                    = "/usr/lib/lua/api/services/mbus_groups" },
    { ["/mbus/groups/{binding}/values/{service_group}/{sid}"]   = "/usr/lib/lua/api/services/mbus_group_values" },

    { ["/mbus/client/{service_group}/{sid}"]                     = "/usr/lib/lua/api/services/mbus_legacy/mbus" },
    { ["/mbus/records/{binding}/requests/{service_group}/{sid}"] = "/usr/lib/lua/api/services/mbus_legacy/mbus_request" },
    { ["/mbus/records/{service_group}/{sid}"]                    = "/usr/lib/lua/api/services/mbus_legacy/mbus_record" },

    { ["/sstp/{service_group}/{sid}"]                          = "/usr/lib/lua/api/services/sstp" },

    { ["/gps/nmea/serial/{service_group}/{sid}"]               = "/usr/lib/lua/api/services/gps/nmea_serial" },
    { ["/gps/nmea/rules/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/gps/nmea_rules" },
    { ["/gps/nmea/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/gps/nmea" },
    { ["/gps/geofencing/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/gps/geofencing" },
    { ["/gps/https/tavl_rules/{service_group}/{sid}"]          = "/usr/lib/lua/api/services/gps/https_tavl" },
    { ["/gps/https/{service_group}/{sid}"]                     = "/usr/lib/lua/api/services/gps/https" },
    { ["/gps/avl/io_rules/{service_group}/{sid}"]              = "/usr/lib/lua/api/services/gps/avl_io" },
    { ["/gps/avl/tavl_rules/{service_group}/{sid}"]            = "/usr/lib/lua/api/services/gps/avl_tavl" },
    { ["/gps/avl/main_rules/{service_group}/{sid}"]            = "/usr/lib/lua/api/services/gps/avl_main" },
    { ["/gps/avl/secondary_rules/{service_group}/{sid}"]       = "/usr/lib/lua/api/services/gps/avl_rules" },
    { ["/gps/avl/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/gps/avl_general" },
    { ["/gps/position/{service_group}"]                        = "/usr/lib/lua/api/services/gps/gps_position"},
    { ["/gps/global"]                                          = "/usr/lib/lua/api/services/gps/gps_global" },
    { ["/gps/{service_group}/{sid}"]                           = "/usr/lib/lua/api/services/gps/gps" },

    { ["/webfilter/privoxy/{service_group}/{sid}"]             = "/usr/lib/lua/api/services/privoxy" },
    { ["/webfilter/global"]                                    = "/usr/lib/lua/api/services/webfilter_general" },
    { ["/webfilter/{service_group}/{sid}"]                     = "/usr/lib/lua/api/services/webfilter_hostnames" },

    { ["/profinet/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/profinet" },
    { ["/lldp/neighbor/{service_group}"]                       = "/usr/lib/lua/api/services/lldp_neighbor" },
    { ["/lldp/{service_group}/{sid}"]                       = "/usr/lib/lua/api/services/lldp" },

    { ["/bacnet/bip/{service_group}/{sid}"]                    = "/usr/lib/lua/api/services/bacnet_bip" },
    { ["/bacnet/bdt/{service_group}/{sid}"]                    = "/usr/lib/lua/api/services/bacnet_bdt" },
    { ["/bacnet/mstp/{service_group}/{sid}"]                   = "/usr/lib/lua/api/services/bacnet_mstp" },
    { ["/bacnet/{service_group}/{sid}"]                        = "/usr/lib/lua/api/services/bacnet_general" },

    { ["/zerotier/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/zerotier" },
    { ["/zerotier/{binding}/networks/{service_group}/{sid}"]   = "/usr/lib/lua/api/services/zerotier_network" },

    { ["/sqm/{service_group}/{sid}"]                           = "/usr/lib/lua/api/services/sqm" },

    { ["/modbus/tcp_over_serial/{binding}/filters/{service_group}/{sid}"] = "/usr/lib/lua/api/services/modbus_tcp_serial_filters" },
    { ["/modbus/tcp_over_serial/{service_group}/{sid}"]        = "/usr/lib/lua/api/services/modbus_tcp_serial" },

    { ["/modbus/serial_gateway/{service_group}/{sid}"]         = "/usr/lib/lua/api/services/mqtt_serial_gateway" },
    { ["/modbus/gateway/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/mqtt_gateway" },

    { ["/overip/{binding}/filters/{service_group}/{sid}"]      = "/usr/lib/lua/api/services/overip_filters" },
    { ["/overip/{service_group}/{sid}"]                        = "/usr/lib/lua/api/services/overip" },

    { ["/canbus/gateway/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/canbus_gateway" },

    { ["/modbus/server/tcp/registers/{service_group}/{sid}"]           = "/usr/lib/lua/api/services/modbus_server_tag" },
    { ["/modbus/server/tcp/{service_group}/{sid}"]                  = "/usr/lib/lua/api/services/modbus_server" },
    { ["/modbus/server/serial/registers/{service_group}/{sid}"]           = "/usr/lib/lua/api/services/modbus_serial_server_tag" },
    { ["/modbus/server/serial/{service_group}/{sid}"]           = "/usr/lib/lua/api/services/modbus_serial_server" },

    { ["/modem_control/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/modem_control" },

    { ["/modbus/client/global"]                                       = "/usr/lib/lua/api/services/modbus_global" },
    { ["/modbus/client/tcp/{service_group}/{sid}"]                    = "/usr/lib/lua/api/services/modbus" },
    { ["/modbus/client/tcp/{binding}/requests/{service_group}/{sid}"] = "/usr/lib/lua/api/services/modbus_request" },
    { ["/modbus/client/tcp/{binding}/alarms/{service_group}/{sid}"]   = "/usr/lib/lua/api/services/modbus_alarm" },
    { ["/modbus/client/serial/servers/{service_group}/{sid}"]             = "/usr/lib/lua/api/services/modbus_serial_client_server" },
    { ["/modbus/client/serial/servers/{binding}/requests/{service_group}/{sid}"] = "/usr/lib/lua/api/services/modbus_serial_request" },
    { ["/modbus/client/serial/servers/{binding}/alarms/{service_group}/{sid}"]   = "/usr/lib/lua/api/services/modbus_serial_alarm" },
    { ["/modbus/client/serial/{service_group}/{sid}"]                    = "/usr/lib/lua/api/services/modbus_serial_client" },
    { ["/modbus/client/database/entries/{service_group}"]                        = "/usr/lib/lua/api/services/modbus_database_entries_status" },
    { ["/modbus/client/database/{service_group}"]                        = "/usr/lib/lua/api/services/modbus_database_status" },

    { ["/universal_gateway/{service_group}/{sid}"]             = "/usr/lib/lua/api/services/universal_gateway" },

    { ["/tinc/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/tinc" },
    { ["/tinc/{binding}/hosts/{service_group}/{sid}"]      = "/usr/lib/lua/api/services/tinc_host" },
    { ["/eoip/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/eoip" },

    -- SYSTEM
    { ["/firmware/{service_group}/{sid}/{type}"]                 = "/usr/lib/lua/api/system/firmware" },
    { ["/firmware/{service_group}/{sid}"]                        = "/usr/lib/lua/api/system/firmware" },
    { ["/fota/{service_group}/{sid}"]                            = "/usr/lib/lua/api/system/fota" },

    { ["/certificates/root_ca/{service_group}/{sid}"]            = "/usr/lib/lua/api/system/root_ca" },
    { ["/certificates/{service_group}/{sid}"]                    = "/usr/lib/lua/api/system/certificates" },
    { ["/certificates/{type}/{service_group}/{sid}"]             = "/usr/lib/lua/api/system/certificates" },

    { ["/access_control/device_pairing/{service_group}/{sid}"]   = "/usr/lib/lua/api/system/jwt_config" },
    { ["/access_control/webui/{service_group}/status"]           = "/usr/lib/lua/api/system/access_control_webui_status" },
    { ["/access_control/webui/{service_group}/{sid}"]            = "/usr/lib/lua/api/system/access_control_webui" },
    { ["/access_control/ssh/{service_group}/{sid}"]              = "/usr/lib/lua/api/system/access_control_ssh" },
    { ["/access_control/telnet/{service_group}/{sid}"]           = "/usr/lib/lua/api/system/access_control_telnet" },
    { ["/access_control/cli/{service_group}/{sid}"]              = "/usr/lib/lua/api/system/access_control_cli" },
    { ["/access_control/security/attempts/{service_group}/{sid}"]= "/usr/lib/lua/api/system/access_control_login_attempts" },
    { ["/access_control/security/{service_group}/{sid}"]         = "/usr/lib/lua/api/system/access_control_login_attempts_general" },
    { ["/access_control/pam/{service_group}/{sid}"]              = "/usr/lib/lua/api/system/access_control_pam" },
    { ["/users/groups/{service_group}/{sid}"]                    = "/usr/lib/lua/api/system/groups" },
    { ["/users/{service_group}/{sid}"]                           = "/usr/lib/lua/api/system/users" },

    { ["/password_policy/{service_group}/{sid}"]                 = "/usr/lib/lua/api/system/password_policy" },

    { ["/profiles/scheduler/global"]                             = "/usr/lib/lua/api/system/scheduler_general" },
    { ["/profiles/scheduler/{service_group}/{sid}"]              = "/usr/lib/lua/api/system/scheduler" },
    { ["/profiles/{service_group}/{sid}"]                        = "/usr/lib/lua/api/system/profiles" },

    { ["/recipients/phone_groups/{service_group}/{sid}"]         = "/usr/lib/lua/api/system/phone_groups" },
    { ["/recipients/email_users/{service_group}/{sid}"]          = "/usr/lib/lua/api/system/email_users" },

    { ["/system/banner/{service_group}/{sid}"]                   = "/usr/lib/lua/api/system/banner" },
    { ["/system/led/{service_group}/{sid}"]                      = "/usr/lib/lua/api/system/ledman" },
    { ["/system/buttons/{service_group}/{sid}"]                  = "/usr/lib/lua/api/system/buttons" },
    { ["/uscripts/{service_group}/{sid}"]                        = "/usr/lib/lua/api/system/uscripts" },

    { ["/date_time/ntp/client/{service_group}/options"]         = "/usr/lib/lua/api/services/ntp_client_options" },
    { ["/date_time/ntp/client/{service_group}/{sid}"]         = "/usr/lib/lua/api/services/ntp_client" },
    { ["/date_time/ntp/server/{service_group}/{sid}"]         = "/usr/lib/lua/api/services/ntp_server" },
    { ["/date_time/ntp/time_servers/{service_group}/{sid}"] = "/usr/lib/lua/api/services/ntp_servers" },
    { ["/date_time/ntpd/{service_group}/{sid}"]               = "/usr/lib/lua/api/services/ntpd" },

    { ["/ui/{service_group}/{sid}"]                              = "/usr/lib/lua/api/system/ui" },

    { ["/logging/services/{service_group}/{sid}"]                = "/usr/lib/lua/api/system/log_services" },
    { ["/logging/{service_group}/{sid}"]                         = "/usr/lib/lua/api/system/logging" },
    { ["/troubleshoot/{service_group}/{sid}"]                    = "/usr/lib/lua/api/system/troubleshoot" },
    { ["/diagnostics/{service_group}/{sid}"]                     = "/usr/lib/lua/api/system/diagnostics" },

    { ["/backup/{service_group}/{sid}"]                          = "/usr/lib/lua/api/system/backup" },

    { ["/serial/{service_group}"]                                       = "/usr/lib/lua/api/services/serial_status" },

    -- NETWORK
    { ["/wireless/devices/global"]                           = "/usr/lib/lua/api/network/wireless_devices_global" },
    { ["/wireless/devices/basic/{service_group}/{sid}"]                      = "/usr/lib/lua/api/network/wireless_devices_basic" },
    { ["/wireless/devices/{service_group}/{sid}"]                      = "/usr/lib/lua/api/network/wireless_devices" },
    { ["/wireless/interfaces/basic/{service_group}/{sid}"]                   = "/usr/lib/lua/api/network/wireless_interfaces_basic" },
    { ["/wireless/interfaces/{service_group}/{sid}"]                   = "/usr/lib/lua/api/network/wireless_interfaces" },
	{ ["/wireless/multi_ap/{service_group}/{sid}"]                     = "/usr/lib/lua/api/network/multi_ap_access_points" },
    { ["/wireless/vlans/{service_group}/{sid}"]                        = "/usr/lib/lua/api/network/wireless_vlans" },
    { ["/wireless/stations/{service_group}/{sid}"]                        = "/usr/lib/lua/api/network/wireless_stations" },
    { ["/wireless/ppsk/groups/{service_group}/{sid}"]                     = "/usr/lib/lua/api/network/wireless_ppsk_groups" },
    { ["/wireless/{service_group}/{sid}"]                              = "/usr/lib/lua/api/network/wireless_actions" },

	{ ["/wifi_scanner/{service_group}/{sid}"]                 = "/usr/lib/lua/api/network/wifi_scanner" },

    { ["/interfaces/basic/status/{sid}"]                     = "/usr/lib/lua/api/network/interfaces_status" },
    { ["/interfaces/{service_group}/{sid}"]                     = "/usr/lib/lua/api/network/interfaces" },
    { ["/basic/network/devices/{type}/{service_group}/{sid}"]                 = "/usr/lib/lua/api/network/devices_status" },
    { ["/network/devices/{type}/{service_group}/{sid}"]                 = "/usr/lib/lua/api/network/devices" },
    { ["/system/device/{service_group}"]                                = "/usr/lib/lua/api/system/board" },
    { ["/system/device/{service_group}/status"]                         = "/usr/lib/lua/api/system/status" },

    { ["/data_limit/{service_group}/{sid}"]                         = "/usr/lib/lua/api/network/data_limit" },

    { ["/system/{service_group}/{sid}"]                          = "/usr/lib/lua/api/system/general" },

    { ["/routes/{service_group}/{sid}"]                         = "/usr/lib/lua/api/network/routes/status" },

    { ["/ip_neighbors/ipv4/{service_group}"]                         = "/usr/lib/lua/api/network/routes/ip_neighbors_ipv4" },
    { ["/ip_neighbors/ipv6/{service_group}"]                         = "/usr/lib/lua/api/network/routes/ip_neighbors_ipv6" },

    { ["/ip_routes/ipv4/{service_group}/{sid}"]             = "/usr/lib/lua/api/network/routes/static_routes/static_route_ipv4" },
    { ["/ip_routes/ipv6/{service_group}/{sid}"]             = "/usr/lib/lua/api/network/routes/static_routes/static_route_ipv6" },

    { ["/ip_rules/ipv4/{service_group}/{sid}"]   = "/usr/lib/lua/api/network/routes/advanced_static_routes/advanced_route_rules" },

    { ["/routing_tables/{service_group}/{sid}"]   = "/usr/lib/lua/api/network/routes/advanced_static_routes/advanced_route_table" },

    { ["/bgp/access/{service_group}/{sid}"]                         = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_access" },
    { ["/bgp/instance/{service_group}/{sid}"]                       = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_instance" },
    { ["/bgp/peer_group/{service_group}/{sid}"]                     = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_peer_group" },
    { ["/bgp/peer/{service_group}/{sid}"]                           = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_peer" },
    { ["/bgp/maps/{service_group}/{sid}"]                           = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_route_maps" },
    { ["/bgp/map_filters/{service_group}/{sid}"]                    = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_route_map_filters" },
    { ["/bgp/instance/{binding}/peer/{service_group}/{sid}"]        = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_peer" },
    { ["/bgp/instance/{binding}/peer_group/{service_group}/{sid}"]  = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_peer_group" },
    { ["/bgp/instance/{binding}/map_filters/{service_group}/{sid}"] = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_route_map_filters" },
    { ["/bgp/global"]                                               = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_general" },
    { ["/bgp/{service_group}"]                                      = "/usr/lib/lua/api/network/routes/dynamic_routes/bgp/bgp_status" },

    { ["/eigrp/{service_group}/{sid}"]    = "/usr/lib/lua/api/network/routes/dynamic_routes/eigrp/eigrp_general" },

    { ["/nhrp/interface/{service_group}/{sid}"]                   = "/usr/lib/lua/api/network/routes/dynamic_routes/nhrp/nhrp_interface" },
    { ["/nhrp/interface/{binding}/mapping/{service_group}/{sid}"] = "/usr/lib/lua/api/network/routes/dynamic_routes/nhrp/nhrp_mapping" },
    { ["/nhrp/interface/{binding}/nhs/{service_group}/{sid}"]     = "/usr/lib/lua/api/network/routes/dynamic_routes/nhrp/nhrp_nhs" },
    { ["/nhrp/global"]                                            = "/usr/lib/lua/api/network/routes/dynamic_routes/nhrp/nhrp_general" },
    { ["/nhrp/{service_group}"]                                   = "/usr/lib/lua/api/network/routes/dynamic_routes/nhrp/nhrp_status" },

    { ["/ospf/area/{service_group}/{sid}"]       = "/usr/lib/lua/api/network/routes/dynamic_routes/ospf/ospf_area" },
    { ["/ospf/interface/{service_group}/{sid}"]  = "/usr/lib/lua/api/network/routes/dynamic_routes/ospf/ospf_interface" },
    { ["/ospf/neighbor/{service_group}/{sid}"]   = "/usr/lib/lua/api/network/routes/dynamic_routes/ospf/ospf_neighbor" },
    { ["/ospf/network/{service_group}/{sid}"]    = "/usr/lib/lua/api/network/routes/dynamic_routes/ospf/ospf_network" },
    { ["/ospf/global"]                           = "/usr/lib/lua/api/network/routes/dynamic_routes/ospf/ospf_general" },
    { ["/ospf/{service_group}"]                  = "/usr/lib/lua/api/network/routes/dynamic_routes/ospf/ospf_status" },

    { ["/rip/access/{service_group}/{sid}"]      = "/usr/lib/lua/api/network/routes/dynamic_routes/rip/rip_access" },
    { ["/rip/interface/{service_group}/{sid}"]   = "/usr/lib/lua/api/network/routes/dynamic_routes/rip/rip_interface" },
    { ["/rip/global"]                            = "/usr/lib/lua/api/network/routes/dynamic_routes/rip/rip_general" },
    { ["/rip/{service_group}"]                   = "/usr/lib/lua/api/network/routes/dynamic_routes/rip/rip_status" },

    { ["/modems/{modem_id}/sim_cards/{service_group}/{sid}"] = "/usr/lib/lua/api/network/sim_cards" },
	{ ["/sim_cards/{service_group}/{sid}"]                   = "/usr/lib/lua/api/network/sim_cards" },
    { ["/sim_cards/{sim_id}/{service_group}/{sid}"]          = "/usr/lib/lua/api/network/sim_cards_actions" },

    { ["/sim_switch/log/{sid}"]                              = "/usr/lib/lua/api/network/sim_switch_log" },
    { ["/sim_switch/status/{sid}"]                           = "/usr/lib/lua/api/network/sim_switch_status" },
    { ["/sim_switch/{service_group}/{sid}"]                  = "/usr/lib/lua/api/network/sim_switch" },

    { ["/data_usage/{service_group}/status"]                 = "/usr/lib/lua/api/network/data_usage" },
    { ["/data_usage/{service_group}/modem/{modem_id}/status"] = "/usr/lib/lua/api/network/data_usage" },
    { ["/data_usage/{service_group}/modem/{modem_id}/{sim_esim}/{sim_position}/status"] = "/usr/lib/lua/api/network/data_usage" },
    { ["/data_usage/{service_group}/interface/{interface}/status"] = "/usr/lib/lua/api/network/interface_data_usage" },
    { ["/data_usage/{service_group}/device/{device}/status"] = "/usr/lib/lua/api/network/interface_data_usage" },

    { ["/dfota/{service_group}/{sid}"]                       = "/usr/lib/lua/api/network/dfota" },

    { ["/esim/{service_group}/{sid}"]                         = "/usr/lib/lua/api/network/esim" },

    { ["/modems/apns/status/{sid}"]                          = "/usr/lib/lua/api/network/modems_apns" },
    { ["/modems/scan/status/{sid}"]                          = "/usr/lib/lua/api/network/modems_scan" },
    { ["/modems/signal/status/{sid}"]                        = "/usr/lib/lua/api/network/signal_data" },
    { ["/modems/countries/{sid}"]                            = "/usr/lib/lua/api/network/modems_countries" },
    { ["/modems/status/{sid}"]                               = "/usr/lib/lua/api/network/modems" },
    { ["/modems/{modem_id}/{service_group}/{sid}"]           = "/usr/lib/lua/api/network/modems_config" },

    { ["/operator_lists/{service_group}/{sid}"]              = "/usr/lib/lua/api/network/operator_lists" },
	{ ["/sim_idle_protection/{service_group}/{sid}"]         = "/usr/lib/lua/api/network/sim_idle_protection" },

    { ["/dhcp/static_leases/ipv4/{service_group}/{sid}"]                       = "/usr/lib/lua/api/network/static_leases" },
    { ["/dhcp/static_leases/ipv6/{service_group}/{sid}"]                       = "/usr/lib/lua/api/network/static_leases6" },
    { ["/dhcp/servers/ipv4/{service_group}/{sid}"]                                     = "/usr/lib/lua/api/network/dhcp" },
    { ["/dhcp/servers/ipv6/{service_group}/{sid}"]                                     = "/usr/lib/lua/api/network/dhcp6" },
    { ["/dhcp/leases/ipv4/{service_group}"]                                     = "/usr/lib/lua/api/network/leases_status" },
    { ["/dhcp/leases/ipv6/{service_group}"]                                     = "/usr/lib/lua/api/network/leases_status6" },

    { ["/failover/interfaces/{service_group}/{sid}"]               = "/usr/lib/lua/api/network/mwan_ifaces" },
	{ ["/failover/policies/{service_group}/{sid}"]                 = "/usr/lib/lua/api/network/mwan_policies" },
	{ ["/failover/mode/{service_group}/{sid}"]                  = "/usr/lib/lua/api/network/mwan_general" },
	{ ["/failover/rules/{service_group}/{sid}"]                    = "/usr/lib/lua/api/network/mwan_rules" },
	{ ["/failover/members/{service_group}/{sid}"]                    = "/usr/lib/lua/api/network/mwan_members" },
    { ["/failover/basic/status"]                  = "/usr/lib/lua/api/network/mwan_status_basic" },
    { ["/failover/{service_group}"]                  = "/usr/lib/lua/api/network/mwan_status" },

    { ["/site_manager/devices/{service_group}/{sid}"]    = "/usr/lib/lua/api/services/site_manager/available_siteman_devices" },
    { ["/site_manager/groups/{service_group}/{sid}"]    = "/usr/lib/lua/api/services/site_manager/siteman_groups" },
    { ["/site_manager/auto_reboot/scheduler/{service_group}/{sid}"] = "/usr/lib/lua/api/services/site_manager/auto_reboot/siteman_periodic_reboot" },
    { ["/site_manager/auto_reboot/ping_wget/{service_group}/{sid}"] = "/usr/lib/lua/api/services/site_manager/auto_reboot/siteman_ping_reboot" },
    { ["/site_manager/interfaces/{service_group}/{sid}"] = "/usr/lib/lua/api/services/site_manager/network/siteman_interfaces" },
    { ["/site_manager/ports_settings/{service_group}/{sid}"] = "/usr/lib/lua/api/services/site_manager/network/switch_ports" },
    { ["/site_manager/switch/interfaces/{service_group}/{sid}"] = "/usr/lib/lua/api/services/site_manager/network/switch_interfaces" },
    { ["/site_manager/switch/vlan/{service_group}/{sid}"] = "/usr/lib/lua/api/services/site_manager/vlan/siteman_vlan" },
    { ["/site_manager/wireless/interfaces/{service_group}/{sid}"] = "/usr/lib/lua/api/services/site_manager/wireless/siteman_wireless_interfaces" },
    { ["/site_manager/wireless/devices/{service_group}/{sid}"] = "/usr/lib/lua/api/services/site_manager/wireless/siteman_wireless_devices" },
    { ["/site_manager/certificate/{service_group}/{sid}"] = "/usr/lib/lua/api/services/site_manager/siteman_download" },
    { ["/site_manager/global"]                   = "/usr/lib/lua/api/services/site_manager/siteman_general" },
    { ["/network/topology/status"]                  = "/usr/lib/lua/api/network/topology" },

    { ["/firewall/port_forwards/{service_group}/{sid}"]     = "/usr/lib/lua/api/network/firewall/port_forwards" },
    { ["/firewall/traffic_rules/{service_group}/{sid}"]     = "/usr/lib/lua/api/network/firewall/traffic_rules" },
    { ["/firewall/custom_rules/{service_group}/{sid}"]      = "/usr/lib/lua/api/network/firewall/custom_rules" },
    { ["/firewall/nat_rules/{service_group}/{sid}"]         = "/usr/lib/lua/api/network/firewall/nat_rules" },
    { ["/firewall/connections/{service_group}/{sid}"]       = "/usr/lib/lua/api/network/firewall/connections" },
    { ["/firewall/iptables/ipv4/{service_group}/{sid}"]          = "/usr/lib/lua/api/network/firewall/iptables_ipv4" },
    { ["/firewall/iptables/ipv6/{service_group}/{sid}"]          = "/usr/lib/lua/api/network/firewall/iptables_ipv6" },
    { ["/firewall/zones/{service_group}/{sid}"]             = "/usr/lib/lua/api/network/firewall/zones" },
    { ["/firewall/global"]                   = "/usr/lib/lua/api/network/firewall/general_settings" },
    { ["/nat_offloading/global"]        = "/usr/lib/lua/api/network/firewall/nat_offloading" },
    { ["/dmz/{service_group}/{sid}"]                   = "/usr/lib/lua/api/network/firewall/dmz" },
    { ["/attack_prevention/https/{service_group}/{sid}"] = "/usr/lib/lua/api/network/firewall/attack_prevention/https_attack_prevention" },
    { ["/attack_prevention/http/{service_group}/{sid}"]  = "/usr/lib/lua/api/network/firewall/attack_prevention/http_attack_prevention" },
    { ["/attack_prevention/ssh/{service_group}/{sid}"]   = "/usr/lib/lua/api/network/firewall/attack_prevention/ssh_attack_prevention" },
    { ["/attack_prevention/icmp/{service_group}/{sid}"]    = "/usr/lib/lua/api/network/firewall/attack_prevention/remote_icmp_requests" },
    { ["/attack_prevention/port_scan/{service_group}/{sid}"]               = "/usr/lib/lua/api/network/firewall/attack_prevention/port_scan" },
    { ["/attack_prevention/syn_flood/{service_group}/{sid}"]    = "/usr/lib/lua/api/network/firewall/attack_prevention/syn_flood_protection" },

    { ["/port_based_vlan/{service_group}/{sid}"]                          = "/usr/lib/lua/api/network/vlan/port_based" },
    { ["/devices/port_based_vlan/{service_group}/{sid}"]                  = "/usr/lib/lua/api/network/devices_port_based" },
    { ["/interface_based_vlan/devices/{service_group}"]                   = "/usr/lib/lua/api/network/vlan/interface_based_devices_status" },
    { ["/interface_based_vlan/{binding}/devices/{service_group}/{sid}"]   = "/usr/lib/lua/api/network/vlan/interface_based_device" },
    { ["/interface_based_vlan/{service_group}/{sid}"]                     = "/usr/lib/lua/api/network/vlan/interface_based" },

    { ["/apn_database/{service_group}/{sid}"]                      = "/usr/lib/lua/api/network/apn_database" },

    { ["/dns/https_proxy/global"]                            = "/usr/lib/lua/api/network/https_dns_proxy_global" },
    { ["/dns/https_proxy/{service_group}/{sid}"]                            = "/usr/lib/lua/api/network/https_dns_proxy" },
    { ["/dns/{service_group}/{sid}"]                            = "/usr/lib/lua/api/network/dns" },
    { ["/vrf/global"]                                           = "/usr/lib/lua/api/network/vrf_global" },
    { ["/vrf/{service_group}/{sid}"]                            = "/usr/lib/lua/api/network/vrf" },
    { ["/stp/global"]                                           = "/usr/lib/lua/api/network/stp_global" },
    { ["/stp/{service_group}"]                                  = "/usr/lib/lua/api/network/stp" },
    { ["/rstp/{service_group}"]                                 = "/usr/lib/lua/api/network/rstp" },
    { ["/ports/traffic/errors/{service_group}/{sid}"]                     = "/usr/lib/lua/api/status/port_traffic_errors" },
    { ["/ports_settings/global"]                                    = "/usr/lib/lua/api/network/ports_general" },
    { ["/ports_settings/{service_group}/{sid}"]                     = "/usr/lib/lua/api/network/ports_settings" },
    { ["/dot1x/radius/{service_group}/{sid}"]                   = "/usr/lib/lua/api/network/port_security_radius" },
    { ["/dot1x/ports/{service_group}/{sid}"]                    = "/usr/lib/lua/api/network/port_security_ports" },
    { ["/dot1x/client/{service_group}/{sid}"]                   = "/usr/lib/lua/api/network/port_security_ports" },
    { ["/macfilter/{service_group}/{sid}"]                      = "/usr/lib/lua/api/network/macfilter" },
    { ["/port_mirroring/{service_group}/{sid}"]                          = "/usr/lib/lua/api/network/port_mirroring" },
    { ["/forwarding_table/{service_group}/{sid}"]                          = "/usr/lib/lua/api/network/forwarding_table" },
    { ["/loopback/global"]                                          = "/usr/lib/lua/api/network/loopback_globals" },
    { ["/loopback/{service_group}/{sid}"]                           = "/usr/lib/lua/api/network/loopback_detection" },
    { ["/qos/priority/{service_group}/{sid}"]                           = "/usr/lib/lua/api/network/priority" },
    { ["/qos/dscp/{service_group}/{sid}"]                               = "/usr/lib/lua/api/network/dscp_priority" },
    { ["/qos/bandwidth/global"]                                         = "/usr/lib/lua/api/network/bandwidth" },
    { ["/qos/scheduling/global"]                                        = "/usr/lib/lua/api/network/qos_scheduling_general" },
    { ["/qos/scheduling/{service_group}/{sid}"]                         = "/usr/lib/lua/api/network/qos_scheduling_weights" },
    { ["/cable_diagnostic/{service_group}/{sid}"]                       = "/usr/lib/lua/api/system/cable_diagnostic" },
    { ["/link_aggregation/{service_group}/{sid}"]                                   = "/usr/lib/lua/api/network/link_aggregation" },
    { ["/internet_connection/global"]                                   = "/usr/lib/lua/api/network/internet" },
    { ["/internet_connection/{service_group}"]                          = "/usr/lib/lua/api/network/internet_status" },
    { ["/jool/global"]                                             = "/usr/lib/lua/api/network/jool_general" },
    { ["/jool/rules/{service_group}/{sid}"]                              = "/usr/lib/lua/api/network/jool" },
    { ["/bfd/peers/{service_group}/{sid}"]                               = "/usr/lib/lua/api/network/bfd_peer" },
    { ["/bfd/profiles/{service_group}/{sid}"]                            = "/usr/lib/lua/api/network/bfd_profile" },
    { ["/openconnect/client/{service_group}/{sid}"]                      = "/usr/lib/lua/api/services/openconnect" },
    { ["/starlink/{service_group}/{sid}"]                                = "/usr/lib/lua/api/network/starlink" },
    
    { ["/iec60870/server/global"]                                   = "/usr/lib/lua/api/services/iec60870_server/global" },
    { ["/iec60870/server/{service_group}"]                          = "/usr/lib/lua/api/services/iec60870_server/status" },
    { ["/iec60870/server/instances/{service_group}/{sid}"]          = "/usr/lib/lua/api/services/iec60870_server/instances" },
    
    { ["/iec60870/client/global"]                               = "/usr/lib/lua/api/services/iec60870_client/global" },
    { ["/iec60870/client/database/entries/{service_group}"]     = "/usr/lib/lua/api/services/iec60870_client/database_entries" },
    { ["/iec60870/client/instances/{service_group}/{sid}"]      = "/usr/lib/lua/api/services/iec60870_client/instances" },
    -- TODO: Uncomment this when application supports serial. Related issue: #27669
    -- { ["/iec60870/client/serial_devices/{service_group}/{sid}"] = "/usr/lib/lua/api/services/iec60870_client/serial_devices" },
    { ["/iec60870/client/{service_group}/{sid}"]                = "/usr/lib/lua/api/services/iec60870_client/actions" },
    { ["/mpls/ldp/status"]                                               = "/usr/lib/lua/api/network/ldp_status" },
    { ["/mpls/ldp/global"]                                               = "/usr/lib/lua/api/network/ldp" }
}
return paths
