import sys
import utility_integration as util
import response_codes as codes
from utils.ssh import get_ssh
import json
sys.path.append("../../../../tests")

class test_setup_wizard(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def test_setup_wizard_general(self):
        general_settings_url = "/date_time/ntp/client/config"
        webui_settings_url = "/system/config"
        with self.subTest("get_general_settings_multiple"):
            x = self.get(general_settings_url)
            x.assert_data([{
                "enabled": "1",
                ".type": "ntpclient",
                "zoneName": "UTC",
                "freq": "0",
                "timezone": "UTC",
                "interval": "86400",
                "id": "general"
            }], 200, {"current_system_time"})
        with self.subTest("edit_general_settings"):
            x = self.put_data(general_settings_url + "/general", {
                "zoneName":"Africa/Luanda"
            })
            x.assert_data({
                "enabled": "1",
                ".type": "ntpclient",
                "zoneName": "Africa/Luanda",
                "freq": "0",
                "timezone": "WAT-1",
                "interval": "86400",
                "id": "general"
            }, 200, {"current_system_time"})
        with self.subTest("get_general_settings_modified"):
            x = self.get(general_settings_url + "/general")
            x.assert_data({
                "enabled": "1",
                ".type": "ntpclient",
                "zoneName": "Africa/Luanda",
                "freq": "0",
                "timezone": "WAT-1",
                "interval": "86400",
                "id": "general"
            }, 200, {"current_system_time"})
        with self.subTest("return_general_settings"):
            x = self.put_data(general_settings_url + "/general", {
                "zoneName":"UTC"
            })
            x.assert_data({
                "enabled": "1",
                ".type": "ntpclient",
                "zoneName": "UTC",
                "freq": "0",
                "timezone": "UTC",
                "interval": "86400",
                "id": "general"
            }, 200, {"current_system_time"})
        with self.subTest("get_webui_settings_multiple"):
            x = self.get(webui_settings_url)
            x.assert_data([{
                "id": "main",
                ".type": "core",
                "firstlogin":"0",
                "lang_code":"en",
                "advanced":"0"
            }])
        with self.subTest("edit_webui_settings"):
            x = self.put_data(webui_settings_url + "/main", {
                "advanced":"1"
            })
            x.assert_data({
                "id": "main",
                ".type": "core",
                "firstlogin":"0",
                "lang_code":"en",
                "advanced":"1"
            })
        with self.subTest("get_webui_settings_modified"):
            x = self.get(webui_settings_url + "/main")
            x.assert_data({
                "id": "main",
                ".type": "core",
                "firstlogin":"0",
                "lang_code":"en",
                "advanced":"1"
            })
        with self.subTest("return_webui_settings"):
            x = self.put_data(webui_settings_url + "/main", {
                "advanced":"0"
            })
            x.assert_data({
                "id": "main",
                ".type": "core",
                "firstlogin":"0",
                "lang_code":"en",
                "advanced":"0"
            })

    def test_setup_wizard_lan(self):
        lan_url = "/interfaces/config"
        dhcp_url = "/dhcp/servers/config"
        with self.subTest("get_lan_settings"):
            x = self.get(lan_url + "/lan")
            x.assert_data({
                "enabled": "1",
                "proto": "static",
                "ipaddr": "192.168.1.1",
                "id": "lan",
                "bridge": "1",
                "fwzone": "lan",
                ".type": "interface",
                "metric": "1",
                "netmask": "255.255.255.0",
                "ip6assign": "60"
            }, 200, {"ifname"})
        with self.subTest("edit_lan_settings"):
            x = self.put_data(lan_url + "/lan", {
                "netmask":"255.255.255.255"
            })
            x.assert_data({
                "enabled": "1",
                "proto": "static",
                "ipaddr": "192.168.1.1",
                "id": "lan",
                "bridge": "1",
                "fwzone": "lan",
                ".type": "interface",
                "metric": "1",
                "netmask": "255.255.255.255",
                "ip6assign": "60"
            }, 200, {"ifname"})
        with self.subTest("return_lan_settings"):
            x = self.put_data(lan_url + "/lan", {
                "netmask":"255.255.255.0"
            })
            x.assert_data({
                "enabled": "1",
                "proto": "static",
                "ipaddr": "192.168.1.1",
                "id": "lan",
                "bridge": "1",
                "fwzone": "lan",
                ".type": "interface",
                "metric": "1",
                "netmask": "255.255.255.0",
                "ip6assign": "60"
            }, 200, {"ifname"})
        with self.subTest("get_dhcp_settings"):
            x = self.get(dhcp_url + "/lan")
            x.assert_data({
                ".type": "dhcp",
                "id": "lan",
                "ra_management": "1",
                "end_ip": "192.168.1.249",
                "leasetime": "12h",
                "ignore": "enable",
                "start_ip": "192.168.1.100",
                "dynamicdhcp": "1",
                "interface": "lan"
            })
        with self.subTest("edit_dhcp_settings"):
            x = self.put_data(dhcp_url + "/lan", {
                "leasetime":"24h"
            })
            x.assert_data({
                ".type": "dhcp",
                "id": "lan",
                "ra_management": "1",
                "end_ip": "192.168.1.249",
                "leasetime": "24h",
                "ignore": "enable",
                "start_ip": "192.168.1.100",
                "dynamicdhcp": "1",
                "interface": "lan"
            })
        with self.subTest("return_dhcp_settings"):
            x = self.put_data(dhcp_url + "/lan", {
                "leasetime":"12h"
            })
            x.assert_data({
                ".type": "dhcp",
                "id": "lan",
                "ra_management": "1",
                "end_ip": "192.168.1.249",
                "leasetime": "12h",
                "ignore": "enable",
                "start_ip": "192.168.1.100",
                "dynamicdhcp": "1",
                "interface": "lan"
            })

    ## x in test name is used to allow mobile test run last as it restarts mobile interface
    def test_setup_wizard_x_mobile(self):
        interfaces_url = "/interfaces/config"
        mobile_url = "/sim_cards/config"
        interface_id = ""
        simcard_id = ""
        modem_count = 0
        with self.subTest("check_modems"):
            available_modems = self.ssh.send_cmd("ubus list gsm.modem*")
            modem_count = len(available_modems.splitlines())
        if modem_count > 0:
            with self.subTest("find_mobile_interface"):
                x = self.get(interfaces_url)
                for interface in x.resp.json()["data"]:
                    if "modem" in interface:
                        interface_id = interface["id"]
                        break
            with self.subTest("get_mobile_interface"):
                x = self.get(interfaces_url + "/" + interface_id)
                x.assert_data({
                    "enabled": "1",
                    "proto": "wwan",
                    "method": "nat",
                    "id": interface_id,
                    "sim": "1",
                    "auto_apn": "0",
                    ".type": "interface",
                    "fwzone": "wan",
                    "pdptype": "ip",
                    "auth": "none"
                }, 200, {"metric", "modem", "delegate", "force_link"})
            with self.subTest("modify_mobile_configuration"):
                x = self.put_data(interfaces_url + "/" + interface_id, {
                    "auto_apn":"1"
                })
                x.assert_data({
                    "enabled": "1",
                    "proto": "wwan",
                    "method": "nat",
                    "id": interface_id,
                    "sim": "1",
                    "auto_apn": "1",
                    ".type": "interface",
                    "fwzone": "wan",
                    "pdptype": "ip",
                    "auth": "none"
                }, 200, {"metric", "modem", "delegate", "force_link"})
            with self.subTest("return_mobile_configuration"):
                x = self.put_data(interfaces_url + "/" + interface_id, {
                    "auto_apn":"0"
                })
                x.assert_data({
                    "enabled": "1",
                    "proto": "wwan",
                    "method": "nat",
                    "id": interface_id,
                    "sim": "1",
                    "auto_apn": "0",
                    ".type": "interface",
                    "fwzone": "wan",
                    "pdptype": "ip",
                    "auth": "none"
                }, 200, {"metric", "modem", "delegate", "force_link"})
            with self.subTest("find_simcard_id"):
                x = self.get(mobile_url)
                for simcard in x.resp.json()["data"]:
                    if simcard["position"] == "1":
                        simcard_id = simcard["id"]
                        break
            with self.subTest("modify_simcard_settings"):
                x = self.put_data(mobile_url + "/" + simcard_id, {
                    "pincode":"12345"
                })
                x.assert_data({
                    "volte": "auto",
                    ".type": "sim",
                    "id": simcard_id,
                    "primary": "1",
                    "pincode": "12345",
                    "position": "1"
                }, 200, {"modem"})
            with self.subTest("get_modified_simcard"):
                x = self.get(mobile_url + "/" + simcard_id)
                x.assert_data({
                    "volte": "auto",
                    ".type": "sim",
                    "id": simcard_id,
                    "primary": "1",
                    "pincode": "12345",
                    "position": "1"
                }, 200, {"modem"})
            with self.subTest("return_simcard_settings"):
                x = self.put_data(mobile_url + "/" + simcard_id, {
                    "pincode":""
                })
                x.assert_data({
                    "volte": "auto",
                    ".type": "sim",
                    "id": simcard_id,
                    "primary": "1",
                    "position": "1"
                }, 200, {"modem"})

    def test_setup_wizard_wireless(self):
        wireless_url = "/wireless/interfaces/config"
        wireless = False
        original_wifi_key = ""
        wifi_5ghz = False
        with self.subTest("check_wifi"):
            board = json.loads(self.ssh.send_cmd("cat /etc/board.json"))
            if "wifi" in board["hwinfo"]:
                wireless = board["hwinfo"]["wifi"] == True
        if wireless:
            with self.subTest("get_wifi_ifaces"):
                x = self.get(wireless_url)
                resp = x.resp.json()
                if len(resp["data"]) > 1:
                    wifi_5ghz = True
                for interface in resp["data"]:
                    if "key" in interface:
                        original_wifi_key = interface["key"]
                        break
                if wifi_5ghz:
                    x.assert_data([
                        {
                            "enabled": "1",
                            ".type": "wifi-iface",
                            "encryption": "psk2",
                            "device": "radio0",
                            "id": "default_radio0",
                            "network": "lan",
                            "disassoc_low_ack": "1",
                            "cipher": "tkip+ccmp",
                            "wifi_id": "wifi0",
                            "wmm": "1",
                            "short_preamble": "1",
                            "ft_psk_generate_local": "1",
                            "mode": "ap"
                        },
                        {
                            "enabled": "1",
                            ".type": "wifi-iface",
                            "encryption": "psk2",
                            "device": "radio1",
                            "id": "default_radio1",
                            "network": "lan",
                            "disassoc_low_ack": "1",
                            "cipher": "tkip+ccmp",
                            "wifi_id": "wifi1",
                            "wmm": "1",
                            "short_preamble": "1",
                            "ft_psk_generate_local": "1",
                            "mode": "ap"
                        }
                    ], 200, {"key", "ssid"})
                else:
                    x.assert_data([{
                        "enabled": "1",
                        ".type": "wifi-iface",
                        "encryption": "psk2",
                        "device": "radio0",
                        "id": "default_radio0",
                        "network": "lan",
                        "disassoc_low_ack": "1",
                        "cipher": "tkip+ccmp",
                        "wifi_id": "wifi0",
                        "wmm": "1",
                        "short_preamble": "1",
                        "ft_psk_generate_local": "1",
                        "mode": "ap"
                    }], 200, {"key", "ssid"})
            with self.subTest("modify_wifi_2ghz_settings"):
                x = self.put_data(wireless_url + "/default_radio0", {
                    "key":"integr@tionTest123"
                })
                x.assert_data({
                    "enabled": "1",
                    ".type": "wifi-iface",
                    "encryption": "psk2",
                    "device": "radio0",
                    "id": "default_radio0",
                    "network": "lan",
                    "disassoc_low_ack": "1",
                    "cipher": "tkip+ccmp",
                    "wifi_id": "wifi0",
                    "wmm": "1",
                    "short_preamble": "1",
                    "ft_psk_generate_local": "1",
                    "mode": "ap",
                    "key": "integr@tionTest123"
                }, 200, {"ssid"})
            with self.subTest("return_2ghz_wifi_settings"):
                x = self.put_data(wireless_url + "/default_radio0", {
                    "key":original_wifi_key
                })
                x.assert_data({
                    "enabled": "1",
                    ".type": "wifi-iface",
                    "encryption": "psk2",
                    "device": "radio0",
                    "id": "default_radio0",
                    "network": "lan",
                    "disassoc_low_ack": "1",
                    "cipher": "tkip+ccmp",
                    "wifi_id": "wifi0",
                    "wmm": "1",
                    "short_preamble": "1",
                    "ft_psk_generate_local": "1",
                    "mode": "ap",
                    "key": original_wifi_key
                }, 200, {"ssid"})
            if wifi_5ghz:
                with self.subTest("modify_wifi_5ghz_settings"):
                    x = self.put_data(wireless_url + "/default_radio1", {
                        "key":"integr@tionTest123"
                    })
                    x.assert_data({
                        "enabled": "1",
                        ".type": "wifi-iface",
                        "encryption": "psk2",
                        "device": "radio1",
                        "id": "default_radio1",
                        "network": "lan",
                        "disassoc_low_ack": "1",
                        "cipher": "tkip+ccmp",
                        "wifi_id": "wifi1",
                        "wmm": "1",
                        "short_preamble": "1",
                        "ft_psk_generate_local": "1",
                        "mode": "ap",
                        "key": "integr@tionTest123"
                    }, 200, {"ssid"})
                with self.subTest("return_5ghz_wifi_settings"):
                    x = self.put_data(wireless_url + "/default_radio1", {
                        "key":original_wifi_key
                    })
                    x.assert_data({
                        "enabled": "1",
                        ".type": "wifi-iface",
                        "encryption": "psk2",
                        "device": "radio1",
                        "id": "default_radio1",
                        "network": "lan",
                        "disassoc_low_ack": "1",
                        "cipher": "tkip+ccmp",
                        "wifi_id": "wifi1",
                        "wmm": "1",
                        "short_preamble": "1",
                        "ft_psk_generate_local": "1",
                        "mode": "ap",
                        "key": original_wifi_key
                    }, 200, {"ssid"})

    def test_setup_wizard_rms(self):
        rms_url = "/rms/config"
        internet_connection = False
        with self.subTest("check_internet_connection"):
            res = self.ssh.send_cmd("ping -c 1 1.1.1.1 &> /dev/null ; echo $?")
            internet_connection = res.strip() == "0"
        with self.subTest("get_rms_multiple"):
            x = self.get(rms_url)
            x.assert_data([{
                ".type": "rms_connect_mqtt",
                "enable": "1",
                "id": "general",
                "remote": "rms.teltonika-networks.com",
                "port": "15009"
            }])
        with self.subTest("edit_rms"):
            x = self.put_data(rms_url + "/general", {
                "enable": "1",
                "remote": "integrationTest.com",
                "port": "42069"
            })
            x.assert_data({
                ".type": "rms_connect_mqtt",
                "enable": "1",
                "id": "general",
                "remote": "integrationTest.com",
                "port": "42069"
            })
        with self.subTest("get_rms_single"):
            x = self.get(rms_url + "/general")
            x.assert_data({
                ".type": "rms_connect_mqtt",
                "enable": "1",
                "id": "general",
                "remote": "integrationTest.com",
                "port": "42069"
            })
        with self.subTest("return_rms_configuration"):
            x = self.put_data(rms_url + "/general", {
                "enable": "1",
                "remote": "rms.teltonika-networks.com",
                "port": "15009"
            })
            x.assert_data({
                ".type": "rms_connect_mqtt",
                "enable": "1",
                "id": "general",
                "remote": "rms.teltonika-networks.com",
                "port": "15009"
            })
        with self.subTest("get_rms_status"):
            if internet_connection:
                x = self.get("/rms/status")
                x.assert_data({
                    "error_code": "8",
                    "status": "1",
                    "connection_state": "1",
                    "error": "1",
                    "error_text": "Device is not registered in RMS. Please login to rms.teltonika-networks.com and add this device to your account device list"
                }, 200, {"serial_nbr", "lan_mac", "next_try"})
            else:
                x = self.get("/rms/status")
                x.assert_data({
                    "error_code": "34",
                    "status": "1",
                    "connection_state": "1",
                    "error": "1",
                    "error_text": "Failed to resolve hostname"
                }, 200, {"serial_nbr", "lan_mac", "next_try"})