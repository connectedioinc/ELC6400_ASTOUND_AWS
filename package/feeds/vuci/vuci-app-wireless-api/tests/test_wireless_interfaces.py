import utility_integration as util
import response_codes as codes
import sys
import time
from utils.ssh import get_ssh
from utils.general_api import is_package_installed
sys.path.append("../../../../tests")

RC = codes.ResponseCodes


class test_wireless_interfaces(util.WrapTest):
    url = "/wireless/interfaces/config"
    sid = None
    wifi = False
    dual_band = False
    is_access_point = False
    travelmate = False

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls):
        cls.ssh.logout()

    def setUp(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        if not self.supports_wifi(board):
            self.skipTest("Device doesn't support Wi-Fi")
        self.dual_band = self.supports_dual_band()
        self.is_access_point = self.check_if_access_point(board)
        self.travelmate = is_package_installed(self, "travelmate")

    def check_if_access_point(self, board):
        return "access_point" in board["hwinfo"] and board["hwinfo"]["access_point"]

    def supports_wifi(self, board):
        return board["hwinfo"]["wifi"]

    def supports_dual_band(self):
        response = self.get("/wireless/devices/config")
        data = response.resp.json()["data"]
        return len(data) > 1

    def get_driver_name(self):
        response = self.get("/wireless/devices/status")
        return response.resp.json()["data"][0]["type"]

    def await_cert_generation(self, times=10):
        for i in range(times):
            time.sleep(1)
            if self.ssh.send_cmd("grep -F '[]' /tmp/certificates-status > /dev/null ; echo $?").strip() == "0":
                break

    def create_section(self):
        with self.subTest("post_configuration"):
            x = self.post_data(self.url, {})
            self.sid = x.resp.json()["data"]["id"]
            x.assert_code(201)

    def remove_section(self):
        with self.subTest("delete_configuration"):
            x = self.delete(f"{self.url}/{self.sid}")
            x.assert_code(200)

    def edit_interface_template(self, put_data, to_remove=[], to_update=[]):
        if not self.dual_band:
            del put_data["device"]
        x = self.put_data(f"{self.url}/{self.sid}", put_data)
        if x.resp.status_code != 200:
            x.assert_code(200)
        data = x.resp.json()["data"]
        put_data["id"] = data["id"]
        put_data["wifi_id"] = data["wifi_id"]
        for r in to_remove:
            del put_data[r]
        for t in to_update:
            put_data[t] = data[t]
        x.assert_data(put_data)

    def generate_certs(self):
        self.post_data("/certificates/actions/generate", {
            "days": "3560",
            "delete": "0",
            "sign": "0",
            "subject": "",
            "type": "ca",
            "name": "ca",
            "key_size": "512"
        })
        self.await_cert_generation()
        self.post_data("/certificates/actions/generate", {
            "days": "3560",
            "delete": "0",
            "sign": "0",
            "subject": "",
            "type": "client",
            "name": "client",
            "key_size": "512"
        })
        self.await_cert_generation()
        self.post_data("/certificates/actions/sign", {
            "ca_key": "ca.key.pem",
            "req_file": "ca.req.pem",
            "days": "3560",
            "delete": "0",
            "type": "ca",
            "name": "ca"
        })
        self.await_cert_generation()
        self.post_data("/certificates/actions/sign", {
            "ca": "ca.cert.pem",
            "ca_key": "ca.key.pem",
            "req_file": "client.req.pem",
            "days": "3560",
            "delete": "0",
            "type": "client",
            "name": "client"
        })
        self.await_cert_generation()

    def remove_certs(self):
        for cert in ["ca.cert.pem", "ca.key.pem", "ca.req.pem", "client.cert.pem", "client.key.pem", "client.req.pem"]:
            self.delete(f"/certificates/config/{cert}")

    def check_encryption(self, default_settings, mode):
        with self.subTest("edit_configuration_encryption_none"):
            self.edit_interface_template(default_settings.copy())

        with self.subTest("edit_configuration_encryption_owe"):
            put_data = {
                **default_settings.copy(),
                "encryption": "owe",
                "cipher": "ccmp"
            }
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_encryption_psk"):
            put_data = {
                **default_settings.copy(),
                "encryption": "psk",
                "cipher": "ccmp",
                "key": "123456789"
            }
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_encryption_psk2"):
            put_data = {
                **default_settings.copy(),
                "encryption": "psk",
                "cipher": "tkip",
                "key": "123456789"
            }
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_encryption_psk_mixed"):
            put_data = {
                **default_settings.copy(),
                "encryption": "psk-mixed",
                "cipher": "tkip+ccmp",
                "key": "123456789"
            }
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_encryption_sae"):
            put_data = {
                **default_settings.copy(),
                "encryption": "sae",
                "cipher": "ccmp",
                "key": "123456789"
            }
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_encryption_sae_mixed"):
            put_data = {
                **default_settings.copy(),
                "encryption": "sae-mixed",
                "cipher": "ccmp",
                "key": "123456789"
            }
            self.edit_interface_template(put_data)

        if mode == "ap":
            for encryption in ["wpa", "wpa2", "wpa3", "wpa3-mixed"]:
                with self.subTest(f"edit_configuration_ap_{encryption}_eap"):
                    put_data = {
                        **default_settings.copy(),
                        "encryption": encryption,
                        "cipher": "auto",
                        "auth_server": "10.11.12.15",
                        "auth_port": "1812",
                        "auth_secret": "@test_auth_secret_123",
                        "acct_server": "10.10.10.10",
                        "acct_port": "1813",
                        "acct_secret": "@test_acct_secret_123",
                        "nasid": "1",
                        "key": ""
                    }
                    if encryption == "wpa3-mixed":
                        put_data["cipher"] = "ccmp"
                    self.edit_interface_template(put_data, ["key"])
        elif mode == "sta":
            self.generate_certs()

            for encryption in ["wpa", "wpa2", "wpa3", "wpa3-mixed"]:
                for method in ["tls", "ttls", "peap", "fast"]:
                    if method == "tls":
                        with self.subTest(f"edit_configuration_encryption_sta_{encryption}_eap_{method}"):
                            put_data = {
                                **default_settings.copy(),
                                "encryption": encryption,
                                "cipher": "auto",
                                "eap_type": method,
                                "key": "",
                                "pkcs_cert": "",
                                "pkcs_passwd": "",
                                "password": "",
                                "auth": "",
                                "ca_cert2": "",
                                "client_cert2": "",
                                "priv_key2": "",
                                "priv_key2_pwd": "",
                                "use_pkcs": "0",
                                "ca_cert": "/etc/certificates/ca.cert.pem",
                                "client_cert": "/etc/certificates/client.cert.pem",
                                "priv_key": "/etc/certificates/ca.key.pem",
                                "priv_key_pwd": "test1234",
                                "identity": "aaaaa",
                                "anonymous_identity": "bbbbb"
                            }
                            if self.travelmate:
                                put_data["trm_enabled"] = "0"
                            if encryption == "wpa3-mixed":
                                put_data["cipher"] = "ccmp"
                            self.edit_interface_template(put_data, ["key", "pkcs_cert", "pkcs_passwd", "password", "auth", "ca_cert2", "client_cert2", "priv_key2", "priv_key2_pwd"], ["ca_cert:file_size", "client_cert:file_size",
                                                                                                                                                                                       "priv_key:file_size"])

                        with self.subTest(f"edit_configuration_encryption_sta_{encryption}_eap_pkcs_${method}"):
                            put_data = {
                                **default_settings.copy(),
                                "encryption": encryption,
                                "cipher": "auto",
                                "eap_type": method,
                                "use_pkcs": "1",
                                "ca_cert": "/etc/certificates/ca.cert.pem",
                                "pkcs_cert": "/etc/certificates/ca.cert.pem",
                                "client_cert": "",
                                "priv_key": "",
                                "priv_key_pwd": "",
                                "pkcs_passwd": "test1234",
                                "identity": "aaaaa",
                                "anonymous_identity": "bbbbb"
                            }
                            if self.travelmate:
                                put_data["trm_enabled"] = "0"
                            if encryption == "wpa3-mixed":
                                put_data["cipher"] = "ccmp"
                            self.edit_interface_template(put_data, ["client_cert", "priv_key", "priv_key_pwd"], [
                                "ca_cert:file_size", "pkcs_cert:file_size"])
                    else:
                        for auth in ["PAP", "CHAP", "MSCHAP", "MSCHAPV2", "EAP-GTC", "EAP-MD5", "EAP-MSCHAPV2", "EAP-TLS"] if method == "ttls" else ["EAP-GTC", "EAP-MD5", "EAP-MSCHAPV2", "EAP-TLS"]:
                            with self.subTest(f"edit_configuration_encryption_sta_{encryption}_eap_{method}_{auth}"):
                                put_data = {
                                    **default_settings.copy(),
                                    "encryption": encryption,
                                    "cipher": "auto",
                                    "eap_type": method,
                                    "auth": auth,
                                    "use_pkcs": "0",
                                    "pkcs_cert": "",
                                    "pkcs_passwd": "",
                                    "key": "",
                                    "ca_cert": "",
                                    "client_cert": "",
                                    "priv_key": "",
                                    "priv_key_pwd": "",
                                    "priv_key2_pwd": "test1234",
                                    "ca_cert2": "/etc/certificates/ca.cert.pem",
                                    "client_cert2": "/etc/certificates/client.cert.pem",
                                    "priv_key2": "/etc/certificates/ca.key.pem",
                                    "identity": "aaaaa",
                                    "anonymous_identity": "bbbbb",
                                    "password": "ccccc"
                                }
                                if self.travelmate:
                                    put_data["trm_enabled"] = "0"
                                if encryption == "wpa3-mixed":
                                    put_data["cipher"] = "ccmp"
                                self.edit_interface_template(put_data, ["key", "pkcs_cert", "pkcs_passwd", "ca_cert", "client_cert", "priv_key", "priv_key_pwd"], [
                                    "client_cert2:file_size", "priv_key2:file_size", "ca_cert2:file_size"])

            self.remove_certs()

    def test_wireless_interfaces_ap_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()["data"]
            self.assertEqual(2 if self.dual_band else 1, len(get_response))

        self.create_section()

        with self.subTest("edit_configuration_ap_mode_2G"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "test_net_123",
                "encryption": "none",
                "device": ["radio0"],
                "scan_time": "30",
                "disassoc_low_ack": "0",
                "wmm": "0",
                "short_preamble": "0",
                "ssid": "TEST_2G",
                "mode": "ap"
            }
            if self.is_access_point:
                del put_data["scan_time"]
                put_data["ft_psk_generate_local"] = "1"
                self.edit_interface_template(put_data, [], ["vlan_id"])
            else:
                self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_ap_mode_5G"):
            put_data = {
                "enabled": "0",
                ".type": "wifi-iface",
                "network": "lan",
                "encryption": "psk2",
                "cipher": "auto",
                "device": ["radio1"],
                "scan_time": "60",
                "disassoc_low_ack": "1",
                "key": "123456789",
                "wmm": "1",
                "short_preamble": "1",
                "ssid": "TEST_5G",
                "mode": "ap"
            }
            if self.is_access_point:
                del put_data["scan_time"]
                put_data["ft_psk_generate_local"] = "1"
                self.edit_interface_template(put_data, [], ["vlan_id"])
            else:
                self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_ap_mode_2G_5G"):
            put_data = {
                "enabled": "0",
                ".type": "wifi-iface",
                "network": "lan",
                "encryption": "psk2",
                "cipher": "auto",
                "device": ["radio0", "radio1"],
                "scan_time": "60",
                "disassoc_low_ack": "1",
                "key": "123456789",
                "wmm": "1",
                "short_preamble": "1",
                "ssid": "TEST_2G_5G",
                "mode": "ap"
            }
            if self.is_access_point:
                del put_data["scan_time"]
                put_data["ft_psk_generate_local"] = "1"
                put_data["vlan_id"] = "lan"
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_ap_extra_settings"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "lan",
                "encryption": "psk2",
                "cipher": "auto",
                "key": "123456789",
                "device": ["radio0"],
                "scan_time": "60",
                "disassoc_low_ack": "1",
                "wmm": "1",
                "short_preamble": "0",
                "ssid": "TEST_2G_EXTRA_SETTINGS",
                "mode": "ap",
                "ieee80211r": "1",
                "hidden": "1",
                "isolate": "1",
                "bss_transition": "1",
                "ieee80211k": "1",
                "nasid": "123",
                "mobility_domain": "144f",
                "reassociation_deadline": "1000",
                "ft_over_ds": "0",
                "short_preamble": "0",
                "dtim_period": "255",
                "wpa_group_rekey": "60000",
                "skip_inactivity_poll": "1",
                "max_inactivity": "300",
                "max_listen_interval": "10",
                "wds": "1",
                "wmm": "0",
                "macfilter": "deny",
                "maclist": ["11:11:11:11:11:11"],
                "delete_from_whitelist": "1"
            }
            if self.is_access_point:
                del put_data["scan_time"]
                del put_data["delete_from_whitelist"]
                put_data["ft_psk_generate_local"] = "1"
                put_data["vlan_id"] = "lan"
            self.edit_interface_template(put_data)
        self.remove_section()

    def test_wireless_interfaces_ap_encryption(self):
        default_settings = {
            "enabled": "1",
            ".type": "wifi-iface",
            "network": "lan",
            "device": ["radio0"],
            "scan_time": "60",
            "disassoc_low_ack": "1",
            "wmm": "1",
            "short_preamble": "1",
            "ssid": "TEST_2G_ENCRYPTION",
            "mode": "ap",
            "encryption": "none"
        }
        if self.is_access_point:
            del default_settings["scan_time"]
            default_settings["ft_psk_generate_local"] = "1"
            default_settings["vlan_id"] = "lan"
        self.create_section()
        self.check_encryption(default_settings, "ap")
        self.remove_section()

    @util.skip_device("TAP")
    def test_wireless_interfaces_sta_functionality(self):
        self.create_section()

        with self.subTest("edit_configuration_sta_mode_2G"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "wifi100",
                "encryption": "none",
                "device": ["radio0"],
                "scan_time": "60",
                "disassoc_low_ack": "1",
                "wmm": "1",
                "short_preamble": "1",
                "ssid": "TEST_STA_2G",
                "auto_reconnect": "1",
                "mode": "sta"
            }
            if self.travelmate:
                put_data["trm_enabled"] = "0"
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_sta_mode_5G"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "wifi100",
                "encryption": "psk2",
                "cipher": "auto",
                "device": ["radio1"],
                "scan_time": "60",
                "disassoc_low_ack": "1",
                "key": "123456789",
                "wmm": "1",
                "short_preamble": "1",
                "auto_reconnect": "0",
                "ssid": "TEST_STA_5G",
                "mode": "sta"
            }
            if self.travelmate:
                put_data["trm_enabled"] = "0"
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_sta_mode_2G_5G"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "wifi100",
                "encryption": "psk2",
                "cipher": "auto",
                "device": ["radio0", "radio1"],
                "scan_time": "60",
                "disassoc_low_ack": "0",
                "key": "123456789",
                "wmm": "0",
                "short_preamble": "0",
                "bssid": "01:23:45:67:89:AB",
                "ssid": "TEST_STA_2G_5G",
                "auto_reconnect": "1",
                "mode": "sta"
            }
            if self.travelmate:
                put_data["trm_enabled"] = "0"
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_sta_extra_settings"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "wifi100",
                "encryption": "psk2",
                "cipher": "auto",
                "key": "123456789",
                "device": ["radio0"],
                "scan_time": "60",
                "wmm": "1",
                "short_preamble": "1",
                "disassoc_low_ack": "0",
                "ssid": "TEST_STA_2G",
                "bssid": "",
                "mode": "sta",
                "auto_reconnect": "1",
                "bgscan_enabled": "1",
                "bgscan_mode": "learn",
                "short_interval": "300",
                "long_interval": "3000",
                "signal_thresh": "-50",
                "dtim_period": "1",
                "wpa_group_rekey": "1",
                "skip_inactivity_poll": "1",
                "max_inactivity": "0",
                "max_listen_interval": "65000",
                "wds": "1",
                "ieee80211r": "1"
            }
            if self.travelmate:
                put_data["trm_enabled"] = "0"
            self.edit_interface_template(put_data, ["bssid"])
        self.remove_section()

    @util.skip_device("TAP")
    def test_wireless_interfaces_sta_encryption(self):
        default_settings = {
            "enabled": "1",
            ".type": "wifi-iface",
            "network": "wifi100",
            "device": ["radio0"],
            "scan_time": "60",
            "wmm": "1",
            "short_preamble": "1",
            "disassoc_low_ack": "1",
            "ssid": "TEST_2G_STA_ENCRYPTION",
            "mode": "sta",
            "auto_reconnect": "1",
            "encryption": "none"
        }
        if self.travelmate:
            default_settings["trm_enabled"] = "0"
        self.create_section()
        self.check_encryption(default_settings, "sta")
        self.remove_section()

    def test_wireless_interfaces_mesh_functionality(self):
        self.create_section()

        with self.subTest("edit_configuration_mesh_mode_2G"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "wifi100",
                "encryption": "none",
                "device": ["radio0"],
                "scan_time": "60",
                "disassoc_low_ack": "1",
                "wmm": "1",
                "short_preamble": "1",
                "mesh_id": "TEST_MESH_2G",
                "mode": "mesh",
                "mesh_fwding": "1",
                "mesh_rssi_threshold": "-255"
            }
            if self.is_access_point:
                del put_data["scan_time"]
                put_data["ft_psk_generate_local"] = "1"
                self.edit_interface_template(put_data, [], ["vlan_id"])
            else:
                self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_mesh_mode_5G"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "wifi100",
                "encryption": "sae",
                "cipher": "ccmp",
                "device": ["radio1"],
                "scan_time": "60",
                "disassoc_low_ack": "1",
                "key": "123456789",
                "wmm": "1",
                "short_preamble": "1",
                "mesh_id": "TEST_MESH_5G",
                "mode": "mesh",
                "mesh_fwding": "1",
                "mesh_rssi_threshold": "0"
            }
            if self.is_access_point:
                del put_data["scan_time"]
                put_data["ft_psk_generate_local"] = "1"
                self.edit_interface_template(put_data, [], ["vlan_id"])
            else:
                self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_mesh_mode_2G_5G"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "wifi100",
                "encryption": "sae",
                "cipher": "ccmp",
                "device": ["radio0", "radio1"],
                "scan_time": "60",
                "disassoc_low_ack": "0",
                "key": "123456789",
                "wmm": "0",
                "short_preamble": "0",
                "mesh_id": "TEST_MESH_2G_5G",
                "mode": "mesh",
                "mesh_fwding": "1",
                "mesh_rssi_threshold": "-255",
                "dtim_period": "1",
                "wpa_group_rekey": "1",
                "skip_inactivity_poll": "1",
                "max_inactivity": "0",
                "max_listen_interval": "65000"
            }
            if self.is_access_point:
                del put_data["scan_time"]
                put_data["ft_psk_generate_local"] = "1"
                put_data["device"] = ["radio0"]
                self.edit_interface_template(put_data, [], ["vlan_id"])
            else:
                self.edit_interface_template(put_data)
        self.remove_section()

    @util.skip_device("TAP")
    def test_wireless_interfaces_multi_ap_functionality(self):
        self.create_section()

        with self.subTest("edit_configuration_multi_ap_mode_2G"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "wifi100",
                "device": ["radio0"],
                "scan_time": "60",
                "disassoc_low_ack": "1",
                "wmm": "1",
                "short_preamble": "1",
                "mode": "multi_ap"
            }
            if self.travelmate:
                put_data["trm_enabled"] = "0"
            self.edit_interface_template(put_data)

        with self.subTest("edit_configuration_multi_ap_mode_5G"):
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "network": "wifi100",
                "device": ["radio1"],
                "scan_time": "60",
                "disassoc_low_ack": "1",
                "wmm": "1",
                "short_preamble": "1",
                "mode": "multi_ap",
                "bgscan_enabled": "1",
                "bgscan_mode": "learn",
                "short_interval": "300",
                "long_interval": "3000",
                "signal_thresh": "-50",
                "dtim_period": "1",
                "wpa_group_rekey": "1",
                "skip_inactivity_poll": "1",
                "max_inactivity": "0",
                "max_listen_interval": "65000",
                "ieee80211r": "1"
            }
            if self.travelmate:
                put_data["trm_enabled"] = "0"
            self.edit_interface_template(put_data)
        self.remove_section()

        with self.subTest("remove_network_configuration"):
            x = self.delete(f"/interfaces/config/lan1")
            x.assert_code(200)

    def test_wireless_interfaces_edge_cases(self):
        with self.subTest("edit_configuration_set_device_no_dual_band"):
            if self.dual_band:
                self.skipTest("Non dual band device is required for this test")
            self.create_section()
            put_data = {
                "enabled": "1",
                ".type": "wifi-iface",
                "encryption": "none",
                "device": ["radio0", "radio1"],
                "ssid": "TEST_DEV",
                "mode": "ap"
            }
            x = self.put_data(f"{self.url}/{self.sid}", put_data)
            x.assert_error("device", "Invalid option",
                           RC.INVALID_OPT.val())
            self.remove_section()
    def test_dfs_options(self):
        with self.subTest("check_dfs_status_options"):
            response = self.get("/wireless/interfaces/status")
            dfs_data = response.resp.json()["data"][0]["dfs"]

            # Common for all drivers
            self.assertIn("cac_active", dfs_data)
            self.assertIn("cac_seconds", dfs_data)

            if self.get_driver_name() == "qcawifi":
                self.assertNotIn("cac_seconds_left", dfs_data)
            else:
                self.assertIn("cac_seconds_left", dfs_data)

    def test_wireless_ppsk(self):
        vlan_url = "/wireless/vlans/config"
        station_url = "/wireless/stations/config"
        group_url = "/wireless/ppsk/groups/config"
        iface_url = "/interfaces/config"
        vlan_sid = None
        station_sid = None
        group_sid = None
        iface_sid = None
        default_options = {
            ".type": "wifi-iface",
            "encryption": "ppsk2",
            "device": ["radio0", "radio1"],
            "ssid": "TEST_PPSK",
            "mode": "ap",
            "cipher": "auto",
            "disassoc_low_ack": "1",
            "scan_time": "60",
            "short_preamble": "1",
            "wmm": "1"
        }
        if not self.dual_band:
            del default_options["device"]
        if self.is_access_point:
            del default_options["scan_time"]
            default_options["ft_psk_generate_local"] = "1"

        with self.subTest("create_ppsk_configuration"):
            self.create_section()
            put_data = {
                **default_options,
                "enabled": "0",
                "radius_ppsk": "1",
                "radius_ppsk_mode": "mac_auth"
            }
            self.edit_interface_template(put_data)

        for mode in ["freeradius", "teltonika", "mac_auth"]:
            with self.subTest(f"edit_ppsk_configuration_{mode}_mode"):
                put_data = {
                    **default_options,
                    "enabled": "0",
                    "radius_ppsk": "1",
                    "radius_ppsk_mode": mode
                }
                self.edit_interface_template(put_data)

        for dynamic_vlan in ["disabled", "optional", "required", ""]:
            with self.subTest(f"edit_ppsk_configuration_dynamic_vlan_{dynamic_vlan}"):
                put_data = {
                    **default_options,
                    "enabled": "0",
                    "radius_ppsk": "1",
                    "radius_ppsk_mode": "mac_auth",
                    "dynamic_vlan": dynamic_vlan
                }
                self.edit_interface_template(put_data, ["dynamic_vlan"] if dynamic_vlan == "" else [])

        with self.subTest("edit_ppsk_configuration_invalid_ppsk_mode"):
            put_data = {
                **default_options,
                "enabled": "1",
                "radius_ppsk": "1",
                "radius_ppsk_mode": "test_mode"
            }
            x = self.put_data(f"{self.url}/{self.sid}", put_data)
            x.assert_error("radius_ppsk_mode", "Must be one of the following values [mac_auth, freeradius, teltonika].",
                          RC.INVALID_OPT.val())

        with self.subTest("edit_ppsk_configuration_invalid_dynamic_vlan"):
            put_data = {
                **default_options,
                "enabled": "1",
                "radius_ppsk": "1",
                "radius_ppsk_mode": "mac_auth",
                "dynamic_vlan": "test_option"
            }
            x = self.put_data(f"{self.url}/{self.sid}", put_data)
            x.assert_error("dynamic_vlan", "Must be one of the following values [disabled, optional, required].",
                          RC.INVALID_OPT.val())

        with self.subTest("edit_ppsk_configuration_missing_auth_server"):
            put_data = {
                **default_options,
                "enabled": "1",
                "radius_ppsk": "1",
                "radius_ppsk_mode": "mac_auth"
            }
            x = self.put_data(f"{self.url}/{self.sid}", put_data)
            x.assert_error("mode,encryption", "Missing required option: auth_server",
                          RC.INVALID_OPT.val())

        with self.subTest("edit_ppsk_configuration_add_auth"):
            put_data = {
                **default_options,
                "enabled": "1",
                "radius_ppsk": "1",
                "radius_ppsk_mode": "mac_auth",
                "auth_server": "10.10.254.1",
                "auth_secret": "test1234",
            }
            self.edit_interface_template(put_data)

        with self.subTest("add_wifi_vlan"):
            post_data = {
                "iface": self.sid,
                "network": "lan",
                "vid": "10"
            }
            if self.is_access_point:
                del post_data["network"]
            x = self.post_data(vlan_url, post_data)
            vlan_sid = x.resp.json()["data"]["id"]
            post_data[".type"] = "wifi-vlan"
            post_data["id"] = vlan_sid
            post_data["description"] = vlan_sid
            x.assert_data(post_data, 201)

        with self.subTest("enable_local_ppsk"):
            put_data = {
                **default_options,
                "enabled": "1",
                "radius_ppsk": "0"
            }
            self.edit_interface_template(put_data)

        with self.subTest("add_ppsk_group"):
            post_data = {}
            x = self.post_data(group_url, post_data)
            group_sid = x.resp.json()["data"]["id"]
            post_data[".type"] = "psk-group"
            post_data["id"] = group_sid
            post_data["description"] = group_sid
            x.assert_data(post_data, 201)

        with self.subTest("add_ppsk_station"):
            post_data = {
                "psk_group": group_sid,
                "mac": "11:22:33:44:55:66",
                "key": "testppsk1234",
            }
            if self.is_access_point:
                post_data["vid"] = "100"
            else:
                y = self.post_data(iface_url, {
                    "bridge": "1",
                    "area_type": "lan"
                })
                iface_sid = y.resp.json()["data"]["id"]
                post_data["network"] = iface_sid
            x = self.post_data(station_url, post_data)
            station_sid = x.resp.json()["data"]["id"]
            post_data[".type"] = "wifi-station"
            post_data["id"] = station_sid
            post_data["username"] = station_sid
            x.assert_data(post_data, 201)

        with self.subTest("radius_ppsk_try_set_ppsk_group"):
            put_data = {
                **default_options,
                "enabled": "1",
                "radius_ppsk": "1",
                "psk_group": group_sid
            }
            x = self.put_data(f"{self.url}/{self.sid}", put_data)
            x.assert_error("psk_group", "Only available when 'radius_ppsk' is disabled",
                          RC.INVALID_OPT.val())

        with self.subTest("remove_group"):
            x = self.delete(f"{group_url}/{group_sid}")
            x.assert_code(200)
            y = self.get(f"{station_url}/{station_sid}")
            y.assert_error("UCI", f"Section: {station_sid} for service does not exist",
                           RC.INVALID_SECTION.val())

        with self.subTest("remove_network_interface"):
            if self.is_access_point:
                self.skipTest("Network interface removal is only for routers")
            x = self.delete(f"{iface_url}/{iface_sid}")
            x.assert_code(200)

        with self.subTest("local_ppsk_try_set_radius_mode"):
            put_data = {
                **default_options,
                "enabled": "1",
                "radius_ppsk": "0",
                "radius_ppsk_mode": "freeradius"
            }
            x = self.put_data(f"{self.url}/{self.sid}", put_data)
            x.assert_error("radius_ppsk_mode", "Only available when 'radius_ppsk' is enabled",
                          RC.INVALID_OPT.val())

        with self.subTest("local_ppsk_try_set_dynamic_vlan"):
            put_data = {
                **default_options,
                "enabled": "1",
                "radius_ppsk": "0",
                "dynamic_vlan": "required"
            }
            x = self.put_data(f"{self.url}/{self.sid}", put_data)
            x.assert_error("dynamic_vlan", "Only available when 'radius_ppsk' is enabled",
                          RC.INVALID_OPT.val())

        with self.subTest("disable_local_ppsk"):
            put_data = {
                **default_options,
                "enabled": "1",
                "radius_ppsk": "1",
                "radius_ppsk_mode": "mac_auth",
                "dynamic_vlan": "optional",
                "auth_server": "10.10.254.1",
                "auth_secret": "test1234"
            }
            self.edit_interface_template(put_data)

        with self.subTest("delete_ppsk_configuration"):
            self.remove_section()
            x = self.get(f"{vlan_url}/{vlan_sid}")
            x.assert_error("UCI", f"Section: {vlan_sid} for service does not exist",
                           RC.INVALID_SECTION.val())
        