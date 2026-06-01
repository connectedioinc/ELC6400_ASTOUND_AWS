import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed
import response_codes as codes

RC = codes.ResponseCodes

class test_relayd(util.WrapTest):
    url = "/relayd/config"
    firewall_zones_url = "/firewall/zones/config"
    wireless_interfaces_url = "/wireless/interfaces/config"
    interfaces_url = "/interfaces/config"
    sid = None
    wifi_network = "wifi0"
    wifi_network_id = None
    network_id = None

    def setUp(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        if not is_package_installed(self, "relay"):
            self.skipTest("RelayD package is not installed")
        if not board["hwinfo"]["wifi"]:
            self.skipTest("Device doesn't suppert Wi-Fi")

    def test_relayd_base_functionality(self):
        with self.subTest("create_configuration"):
            default_config = {
                ".type": "relayd",
                "enabled": "0",
                "lan_mark": "none",
            }
            x = self.post_data(self.url, default_config)
            self.sid = x.resp.json()["data"]["id"]
            default_config["id"] = self.sid
            x.assert_data(default_config, 201)

        with self.subTest("edit_with_not_existing_wifi_clients_network"):
            edit_options = {
                "enabled": "1",
                "network": "wifi_network",
                "lan_mark": "lan"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            x.assert_error("network", "No wireless clients configured.", RC.INVALID_OPT.val())

        with self.subTest("create_wireless_client"):
            post_options = {
                "mode": "sta",
                "enabled": "0",
                "device": ["radio0"],
                "network": self.wifi_network
            }
            x = self.post_data(self.wireless_interfaces_url, post_options)
            resp = x.resp.json()["data"]
            self.wifi_network_id = resp["id"]
            post_options["id"] = self.wifi_network_id
            post_options["wifi_id"] = resp["wifi_id"]
            post_options[".type"] = "wifi-iface"
            post_options["disassoc_low_ack"] = "1"
            post_options["scan_time"] = "60"
            post_options["short_preamble"] = "1"
            post_options["wmm"] = "1"
            post_options["auto_reconnect"] = "1"
            post_options["trm_enabled"] = "0"
            x.assert_data(post_options, 201)

        with self.subTest("edit_configuration_dhcp_enabled"):
            edit_options = {
                "enabled": "1",
                "network": self.wifi_network,
                "lan_mark": "lan"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            edit_options[".type"] = "relayd"
            edit_options["id"] = self.sid
            x.assert_error("enabled", "DHCPv4 or DHCPv6 server is running on 'lan' interface, disable it first.", 103)

        with self.subTest("edit_configuration_dhcp_disabled"):
            x = self.put_data("/dhcp/servers/ipv4/config/lan", { "enable_dhcpv4": "0" })
            x.assert_code(200)
            x = self.put_data("/dhcp/servers/ipv6/config/lan", { "enable_dhcpv6": "0" })
            x.assert_code(200)
            edit_options = {
                "enabled": "1",
                "network": self.wifi_network,
                "lan_mark": "lan"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            edit_options[".type"] = "relayd"
            edit_options["id"] = self.sid
            x.assert_data(edit_options, 200)

        with self.subTest("check_firewall_zone_exists"):
            x = self.get(self.firewall_zones_url)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "relayd":
                    found = True
                    self.assertEqual(section["input"], "REJECT")
                    self.assertEqual(section["output"], "ACCEPT")
                    self.assertEqual(section["forward"], "REJECT")
                    self.assertEqual(section["log"], "0")
                    self.assertEqual(section["network"], [self.wifi_network])
                    self.assertEqual(section["in"], ["lan"])
                    self.assertEqual(section["out"], ["lan"])
                    self.assertEqual(section["conntrack"], "0")
                    self.assertEqual(section["masq"], "0")
                    self.assertEqual(section["mtu_fix"], "0")
            if not found:
                self.fail("Firewall zone is not created")

        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({ "id": self.sid })

        with self.subTest("reset_dhcp"):
            x = self.put_data("/dhcp/servers/ipv4/config/lan", { "enable_dhcpv4": "1" })
            x.assert_code(200)
            x = self.put_data("/dhcp/servers/ipv6/config/lan", { "enable_dhcpv6": "1" })
            x.assert_code(200)

        with self.subTest("check_firewall_zone_deleted"):
            x = self.get(self.firewall_zones_url)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "relayd":
                    found = True
            if found:
                self.fail("Firewall zone is not deleted")

        with self.subTest("delete_wireless_client"):
            x = self.delete(self.wireless_interfaces_url + "/" + self.wifi_network_id)
            x.assert_data({
                "id": self.wifi_network_id
            })

        with self.subTest("create_network_interface"):
            post_options = {
                "name": "test_network",
                "area_type": "lan"
            }
            x = self.post_data(self.interfaces_url, post_options)
            x.assert_code(201)
            self.network_id = x.resp.json()["data"]["id"]

        with self.subTest("create_configuration_with_invalid_network_id"):
            post_options = {
                ".type": "relayd",
                "enabled": "0",
                "lan_mark": self.network_id
            }
            x = self.post_data(self.url, post_options)
            x.assert_error("lan_mark", "Must be one of the following values [none, loopback, lan, wan, wan6, test_network]. Relayd section can only be created for interfaces with these protocols: 'dhcp', 'dhcpv6', 'pppoe', 'static'.", 103)

        with self.subTest("create_configuration_with_network_name"):
            post_options = {
                ".type": "relayd",
                "enabled": "0",
                "lan_mark": "test_network"
            }
            x = self.post_data(self.url, post_options)
            x.assert_code(201)
            self.sid = x.resp.json()["data"]["id"]
            post_options["id"] = self.network_id

        with self.subTest("delete_network_interface"):
            x = self.delete(self.interfaces_url + "/" + self.network_id)
            x.assert_data({ "id": self.network_id })
        
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({ "id": self.sid })
