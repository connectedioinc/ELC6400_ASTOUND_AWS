import sys
from time import sleep

sys.path.append("../../../../tests")
from utility_integration import WrapResponse, WrapTest
from response_codes import ResponseCodes as RC
from utils.ssh import get_ssh
from utils.general_api import get_modems

class test_interfaces(WrapTest):
    url = "/interfaces/config"
    sid = None
    lan_to_wan = False
    wifi = False

    def setUp(self):
        response = self.get("/system/device/status")
        self.board = response.resp.json()["data"]["board"]
        self.ports = response.resp.json()["data"]["ports"]
        self.lan_to_wan = self.supports_lan_to_wan(self.board)
        self.wifi = self.has_wifi(self.board)
        self.mobile = self.has_mobile(self.board)
        self.custom_proto = self.get_custom_proto(self.board)
        self.mobile_proto = self.custom_proto or "wwan"

    def supports_lan_to_wan(self, board):
        lan_port_devices = board.get("network", {}).get("lan", {}).get("device", None) or board.get("network", {}).get("lan", {}).get("ports", [])
        if type(lan_port_devices) is not list:
            lan_port_devices = [lan_port_devices]
        in_network = len([d for d in lan_port_devices if d.startswith("lan") or d.startswith("eth")]) == 1

        switch_ports = board.get("switch", {}).get("switch0", {}).get("ports", [])
        lan_ports_len = len([p for p in switch_ports if p.get("role", None) == "lan"])
        in_switch = lan_ports_len == 0 or lan_ports_len == 1
        
        has_single_ethernet_lan = in_network and in_switch

        default_wan_device = "wan" in board["network"] and "device" in board["network"]["wan"]
        router_name = "model" in board and board["model"]["platform"]
        return has_single_ethernet_lan and not default_wan_device

    def has_wifi(self, board):
        return "wifi" in board["hwinfo"] and board["hwinfo"]["wifi"]

    def has_mobile(self, board):
        return board["hwinfo"]["mobile"]

    def get_custom_proto(self, board):
        return "custom_proto" in board and board["custom_proto"]

    def get_instance(self, data, name):
        return next((d for d in data if d["name"] == name), None)

    def get_iface_type(self, iface_name):
        if iface_name == "lan":
            return "bridge"
        elif iface_name.startswith("lan") or iface_name.startswith("wan") or iface_name == "loopback":
            return "wired"
        elif iface_name.startswith("mob"):
            return "mobile"
        elif iface_name.startswith("wifi"):
            return "wireless"
        return ""

    def convert_to_unsigned(self, val):
        if val < 0:
            val = 2**32 + val
        return val
    
    def test_interfaces_functionality(self):
        for area_type in ["lan", "wan"]:
            with self.subTest(f"create_configuration_area_type_{area_type}"):
                x = self.post_data(self.url, { "area_type": area_type })
                self.sid = x.resp.json()["data"]["id"]
                x.assert_code(201)
                self.assertEqual(self.sid, f"{area_type}1")
            with self.subTest("delete_configuration"):
                x = self.delete(self.url + "/" + self.sid)
                x.assert_data({
                    "id": self.sid
                })

        if self.lan_to_wan:
            with self.subTest("enable_lan_to_wan"):
                x = self.post_data("/interfaces/actions/lan_to_wan")
                x.assert_code(200)
                x = self.get("/firewall/traffic_rules/config")
                rules = x.resp.json()["data"]
                x = self.get("/firewall/zones/config")
                zones = x.resp.json()["data"]
                wan_zone = self.get_instance(zones, "wan")
                http_wan_rule = self.get_instance(rules, "Enable_HTTP_WAN")
                https_wan_rule = self.get_instance(rules, "Enable_HTTPS_WAN")
                self.assertEqual(http_wan_rule["enabled"], "1")
                self.assertEqual(https_wan_rule["enabled"], "1")
                self.assertTrue("lan_to_wan" in wan_zone["network"])
            with self.subTest("enable_lan_to_wan_twice"):
                x = self.post_data("/interfaces/actions/lan_to_wan")
                x.assert_error("lan_to_wan", "lan_to_wan was already enabled. wan_to_lan action can be used to revert it.", 3)
            with self.subTest("enable_wan_to_lan"):
                x = self.post_data("/interfaces/actions/wan_to_lan")
                x.assert_code(200)
                x = self.get("/firewall/traffic_rules/config")
                rules = x.resp.json()["data"]
                x = self.get("/firewall/zones/config")
                zones = x.resp.json()["data"]
                wan_zone = self.get_instance(zones, "wan")
                http_wan_rule = self.get_instance(rules, "Enable_HTTP_WAN")
                https_wan_rule = self.get_instance(rules, "Enable_HTTPS_WAN")
                self.assertEqual(http_wan_rule["enabled"], "1")
                self.assertEqual(https_wan_rule["enabled"], "1")
                self.assertFalse("lan_to_wan" in wan_zone["network"])
            with self.subTest("enable_wan_to_lan_twice"):
                x = self.post_data("/interfaces/actions/wan_to_lan")
                x.assert_error("wan_to_lan", "Can not execute wan_to_lan - lan_to_wan is currently not enabled. wan_to_lan action can only be used if lan_to_wan was previously used.", 4)

        with self.subTest("check_network_types"):
            sid_wifi = None
            wifi_url = "/wireless/interfaces/config"
            status_url = "/interfaces/status"

            with self.subTest("create_configuration"):
                x = self.post_data(self.url, { "area_type": "lan" })
                self.sid = x.resp.json()["data"]["id"]
                x.assert_code(201)
            with self.subTest("create_wifi_configuration"):
                if not self.wifi:
                    self.skipTest("WiFi is not supported")
                x = self.post_data(wifi_url, { "mode": "ap", "device": ["radio0"], "ssid": "test_wifi", "encryption": "none", "network": "wifi1"})
                if x.resp.status_code != 201:
                    x = self.post_data(wifi_url, { "mode": "ap", "ssid": "test_wifi", "encryption": "none", "network": "wifi1"})
                sid_wifi = x.resp.json()["data"]["id"]
                x.assert_code(201)
                x = self.put_data(self.url + "/" + "lan2", { "bridge": "0", "ifname": [] })
                x.assert_code(200)
            with self.subTest("check_network_interface_types"):
                x = self.get(status_url)
                ifaces = x.resp.json()["data"]
                for iface in ifaces:
                    self.assertEqual(iface["network_type"], self.get_iface_type(iface["name"]))
            with self.subTest("delete_wifi_configuration"):
                if not self.wifi:
                    self.skipTest("WiFi is not supported")
                x = self.delete(wifi_url + "/" + sid_wifi)
                x.assert_data({ "id": sid_wifi })
            with self.subTest("delete_network_wifi_configuration"):
                if not self.wifi:
                    self.skipTest("WiFi is not supported")
                x = self.delete(self.url + "/" + "lan2")
                x.assert_data({ "id": "lan2" })
            with self.subTest("delete_network_configuration"):
                x = self.delete(self.url + "/" + self.sid)
                x.assert_data({ "id": self.sid })

        if self.wifi:
            wifi_url = "/wireless/interfaces/config"
            status_url = "/interfaces/basic/status"
            iface = None
            sid_wifi = None
            with self.subTest("create_network_interface"):
                x = self.post_data(self.url, { "enabled": "1", "area_type": "lan" })
                self.sid = x.resp.json()["data"]["id"]
                x.assert_code(201)
            with self.subTest("check_interface_network_type"):
                x = self.get(status_url + "/" + self.sid)
                iface = x.resp.json()["data"]
                self.assertEqual(iface["network_type"], "wired")
            with self.subTest("create_wireless_interface"):
                x = self.post_data(wifi_url, { "device": ["radio0"], "ssid": "test_wifi", "encryption": "none", "network": iface["name"]})
                if x.resp.status_code != 201:
                    x = self.post_data(wifi_url, { "ssid": "test_wifi", "encryption": "none", "network": iface["name"]})
                sid_wifi = x.resp.json()["data"]["id"]
                x.assert_code(201)
            with self.subTest("check_interface_network_type_after_wireless_creation"):
                x = self.get(status_url + "/" + self.sid)
                iface = x.resp.json()["data"]
                self.assertEqual(iface["network_type"], "bridge")
            with self.subTest("disable_interface_bridge"):
                x = self.put_data(self.url + "/" + self.sid, { "bridge": "0" })
                x.assert_code(200)
            with self.subTest("check_interface_network_type_after_bridge_disabled"):
                x = self.get(status_url + "/" + self.sid)
                iface = x.resp.json()["data"]
                self.assertEqual(iface["network_type"], "wireless")
            with self.subTest("delete_wifi_configuration"):
                x = self.delete(wifi_url + "/" + sid_wifi)
                x.assert_data({
                    "id": sid_wifi
                })
            with self.subTest("delete_network_configuration"):
                x = self.delete(self.url + "/" + self.sid)
                x.assert_data({
                    "id": self.sid
                })
        
        with self.subTest("check_default_network_protos"):
            default_protos = {
                "lan": "static",
                "wan": "dhcp",
                "wan6": "dhcpv6",
                "mob1s1a1": self.mobile_proto,
                "mob1s2a1": self.mobile_proto,
                "mob1s3a1": self.mobile_proto,
            }
            x = self.get(self.url)
            ifaces = x.resp.json()["data"]
            for iface in ifaces:
                proto = self.mobile_proto if iface["name"].startswith("mob") else default_protos[iface["name"]]
                self.assertEqual(iface["proto"], proto)

        with self.subTest("check_framed_routing_validation"):
            if not self.mobile:
                self.skipTest("Mobile not supported on this device")

            self.modems = get_modems(self)
            first_modem = self.modems[0]
            framed_routing_supported = first_modem.get("framed_routing", False)
            for area_type in ["lan", "wan"]:
                for proto in [self.mobile_proto, "dhcp", "dhcpv6", "pppoe", "static", "none"]:
                    # Skip for now due to lan + mobile bug
                    if area_type == "lan" and proto == self.mobile_proto:
                        continue
                    for framed_routing_value in ["0", "1", ""]:
                        with self.subTest(f"area_type_{area_type}_proto_{proto}_framed_routing_{framed_routing_value}"):
                            post_data = {
                                "area_type": area_type,
                                "proto": proto,
                                "sim": "1",
                                "framed_routing": framed_routing_value
                            }
                            if len(self.modems) > 1:
                                post_data["modem"] = first_modem["id"]
                            x = self.post_data(self.url, post_data)
                            if area_type == "wan" and proto == self.mobile_proto and framed_routing_supported:
                                x.assert_code(201)
                                self.destroy_lan_iface(x.resp.json()["data"]["id"]).assert_code(200)
                            elif proto == self.mobile_proto and not framed_routing_supported:
                                x.assert_error("framed_routing", "This modem does not support framed routing", 103)
                            else:
                                x.assert_error("framed_routing", "Option 'framed_routing' can only be set for mobile interfaces", 103)

    
    def prepare_test(self, ifname):
        tries = 0
        max_tries = 5
        while tries < max_tries:
            tries += 1
            x = self.get(f"/interfaces/config/{ifname}")
            if x.resp.status_code != 200:
                break
            sleep(1)

    def create_lan_iface(self, area_type="lan"):
        x = self.post_data(self.url, { "area_type": area_type, "ipaddr": "192.168.2.1", "netmask": "255.255.255.0" })
        return x
    
    def destroy_lan_iface(self, id):
        x = self.delete(self.url + "/" + id)
        return x

    def test_wan_general(self):
        self.modems = get_modems(self)
        m = self.modems[0] if len(self.modems) > 0 else { "multi_apn": False }
        multi_apn = m["multi_apn"]

        new_wwan_device_post_data = {}
        wwan_device_put_data = {}
        if len(self.modems) > 1:
            wwan_device_put_data = {
                "proto" : "wwan",
                "sim" : "1",
                "modem" : m["id"]
            }
        else:
            wwan_device_put_data = {
                "proto" : "wwan",
                "sim" : "1"
            }

        new_wwan_device_post_data = {
            **wwan_device_put_data,
            "area_type" : "wan",
        }

        with self.subTest("Enforce lack of multi APN support"):
            if multi_apn:
                self.skipTest("Multi APN support on this device.")
            x = self.post_data(self.url, new_wwan_device_post_data)
            x.assert_code(422)

        with self.subTest("check_auto_apn_disabled_on_same_sim"):
            if not multi_apn:
                self.skipTest("No multi APN support on this device.")

            old_interface = [i for i in self.get(self.url).resp.json()["data"] if i["proto"] == "wwan" and i["modem"] == m["id"]][0]

            x = self.post_data(self.url, new_wwan_device_post_data)
            x.assert_code(201)

            wwan_if = x.resp.json()["data"]

            x = self.get(self.url + "/" + old_interface["id"])
            x.assert_code(200)
            self.assertEqual(x.resp.json()["data"]["auto_apn"], "0")

            self.destroy_lan_iface(wwan_if["id"]).assert_code(200)
            x = self.put_data(self.url, [{ "id": old_interface["id"], "auto_apn": "1", "pdptype": "ipv4v6" }])
            x.assert_code(200)

        with self.subTest("check_proto_options"):
            with self.subTest("invalid_proto"):
                x = self.post_data(self.url, { "area_type": "wan", "proto": "notAProto"})
                protos = "[none, static, wwan, dhcp, dhcpv6, pppoe]" if len(self.modems) > 0 else "[none, static, dhcp, dhcpv6, pppoe]"
                x.assert_error("proto", f"Must be one of the following values {protos}.", 103)

            self.prepare_test("wan1")
            x = self.create_lan_iface("wan")
            x.assert_code(201)
            self.iface = x.resp.json()["data"]

            with self.subTest("proto_none"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": "none" }])
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "pdptype": "ip" }])
                x.assert_error("pdptype", "Option 'pdptype' can only be set for mobile interfaces." if len(self.modems) > 0 else "Invalid option", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "sim": "value" }])
                x.assert_error("sim", "Option 'sim' can only be set for mobile interfaces." if len(self.modems) > 0 else "Invalid option", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6table": "1" }])
                x.assert_error("ip6table", "'ip6table' configuration option is available for 'dhcpv6' protocol.", 103)

            for p in [["dhcp", "DHCP"], ["dhcpv6", "DHCPv6"]]:
                with self.subTest(f"proto_{p[0]}"):
                    original_iface = self.get(self.url + "/wan").resp.json()["data"]

                    x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": p[0] }])
                    x.assert_code(200)

                    x = self.put_data(self.url, [{ "id": self.iface["id"], "hostname": "test" }])
                    x.assert_code(200)

                    if p[0] == "dhcpv6":
                        x = self.put_data(self.url, [{ "id": self.iface["id"], "ip4table": "1" }])
                        x.assert_error("ip4table", "'ip4table' configuration option is not available for 'none' and 'dhcpv6' protocols.", 103)

                        x = self.put_data(self.url, [{ "id": self.iface["id"], "reqaddress": "notAccepted" }])
                        x.assert_error("reqaddress", "Must be one of the following values [try, force, none].", 103)

                        for val in ["try", "force", "none"]:
                            x = self.put_data(self.url, [{ "id": self.iface["id"], "reqaddress": val }])
                            x.assert_code(200)
                        
                        with self.subTest("check_ip6_table"):
                            with self.subTest("check_invalid_ip6table_values"):
                                
                                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6table": "NotAnInteger"}])
                                x.assert_error("ip6table", "Value must be a valid unsigned integer", 103)

                                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6table": "-1"}])
                                x.assert_error("ip6table", "Value must be a valid unsigned integer", 103)

                                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6table": str((2**46)+1)}])
                                x.assert_error("ip6table", "Unsigned integer range is 0 to 2^46", 103)

                            x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6table": ""}])
                            x.assert_code(200)

                    x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": original_iface["ifname"] }])
                    x.assert_error("ifname", f"Only a single {p[1]} interface can exist on '{original_iface["ifname"][0]}' device", 103)

            with self.subTest("proto_pppoe"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": "pppoe" }])
                x.assert_code(200)
            
            with self.subTest("proto_wwan"):
                if len(self.modems) == 0:
                    self.skipTest("No modems found")

                old_interface = [i for i in self.get(self.url).resp.json()["data"] if i["proto"] == "wwan" and i["modem"] == m["id"]][0]

                if not multi_apn:
                    self.put_data(self.url, [{ "id": old_interface["id"], "enabled": "0" }]).assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": "wwan", **wwan_device_put_data }])
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "pdptype": "notAccepted" }])
                x.assert_error("pdptype", "Must be one of the following values [ip, ipv6, ipv4v6].", 103)

                x = self.put_data(self.url, [{ "id": old_interface["id"], "pdptype": "" }])

                for val in ["ip", "ipv4v6", "ipv6"]:
                    x = self.put_data(self.url, [{ "id": self.iface["id"], "pdptype": val }])
                    x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "sim": "" }])
                if len(self.modems) == 1:
                    if self.modems[0]["sim_count"] > 1:
                        x.assert_error("proto", "Missing required option: sim", 103)
                    else:
                        x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "leasetime": "3600s" }])
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "leasetime": "3600 test" }])
                x.assert_error("leasetime", "Allowed characters: positive number followed by 'h', 'm' or 's' symbol.", 103)

            if len(self.modems) > 0:
                with self.subTest("cleanup_proto_wwan"):
                    self.put_data(self.url, [{ "id": self.iface["id"], "proto": "none" }])
                    old_interface = [i for i in self.get(self.url).resp.json()["data"] if i["proto"] == "wwan" and i["modem"] == m["id"]][0]
                    x = self.put_data(self.url, [{ "id": old_interface["id"], "pdptype": "ipv4v6", "enabled": "1", "auto_apn": "1" }])
                    x.assert_code(200)

            self.destroy_lan_iface(self.iface["id"]).assert_code(200)
            self.iface = None

    def test_wan_advanced(self):
        self.prepare_test("wan1")
        x = self.create_lan_iface("wan")
        x.assert_code(201)
        self.iface = x.resp.json()["data"]

        with self.subTest("check_dns"):
            with self.subTest("invalid_dns_entries"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "dns": "notAnIP" }])
                x.assert_error("dns", "Option only accepts arrays", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "dns": ["256.1.1.1"] }])
                x.assert_error("dns at index 1", "IPv4 and IPv6 addresses are accepted. E.g. 192.168.1.1.", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "dns": ["2001:db8:::1"] }])
                x.assert_error("dns at index 1", "IPv4 and IPv6 addresses are accepted. E.g. 192.168.1.1.", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "dns": ["192.168.1.1"]*2 }])
                x.assert_error("dns", "No duplicate values allowed. Found duplicate values [192.168.1.1].", 103)

                with self.subTest("check_dns_with_none_proto"):
                    x = self.put_data(self.url, [{ "id": self.iface["id"], "dns": [] }])
                    x.assert_code(200)

                    x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": "none" }])
                    x.assert_code(200)

                    x = self.put_data(self.url, [{ "id": self.iface["id"], "dns": ["192.168.1.1"] }])
                    x.assert_error("dns", "Option can be configured only for wan interface with not none protocol", 103)

                    x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": "static" }])
                    x.assert_code(200)

            with self.subTest("valid_dns_entries"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "dns": ["192.168.1.1"] }])
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "dns": ["192.168.1.1", "192.168.1.2"] }])
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "dns": ["2001:db8::1"] }])
                x.assert_code(200)

        self.destroy_lan_iface(self.iface["id"]).assert_code(200)
        self.iface = None

    def test_lan_general(self):
        self.prepare_test("lan1")
        self.modems = get_modems(self)
        with self.subTest("check_delete_nonexistant_interface"):
            x = self.destroy_lan_iface("thisDoesntExist")
            x.assert_error("UCI", "Section: thisDoesntExist for service does not exist", 113)
            
        with self.subTest("check_new_interface_invalid_area_type"):
                x = self.create_lan_iface("invalid_area")
                x.assert_error("area_type", "Must be one of the following values [lan, wan].", 103)

        with self.subTest("check_new_interface_duplicate_name"):
            x = self.post_data(self.url, { "area_type": "lan", "name": "lan" })
            x.assert_error("name", "Duplicate names are not allowed", 103)

        with self.subTest("check_new_interface_defaults"):
            refdata = {
                "ifname": [],
                "keepalive_interval": "1",
                "fwzone": "lan",
                "bridge": "0",
                "defaultroute": "1",
                "metric": "0",
                "delegate": "1",
                "force_link": "1",
                "enabled": "0",
                "keepalive_failure": "5",
                "id": "lan1",
                "name": "lan1",
                "proto": "static",
                "ipaddr": "192.168.2.1",
                ".type": "interface",
                "netmask": "255.255.255.0",
                "area_type": "lan"
            }
            x = self.create_lan_iface("lan")

            self.iface = x.resp.json()["data"]
            x.assert_data(refdata, 201)
            self.get(self.url + "/" + self.iface["id"]).assert_data(refdata, 200)
            pass

        self.assertIsNotNone(self.iface, "Failed to create a lan interface")

        with self.subTest("check_cant_change_area_type"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "area_type": "wan" }])
            x.assert_error("area_type", "'area_type' can not be changed.", 103)

        with self.subTest("check_invalid_option"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "thisDoesntExist": ""}])
            x.assert_error("thisDoesntExist", "Invalid option", 103)

        for toggle in ["enabled", "bridge", "defaultroute", "delegate", "force_link", "stp", "igmp_snooping", "defaultroute", "broadcast_dhcp"]:
            with self.subTest(f"check_invalid_toggle_{toggle}_values"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], toggle: "invalid" }])
                x.assert_error(toggle, "Provided value is not '1' or '0'.", 103)

        with self.subTest("check_bridge_options_when_bridge_disabled"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "stp": "1"}])
            x.assert_error("stp", "STP cannot be turned on if bridge is disabled", 103)
            x = self.put_data(self.url, [{ "id": self.iface["id"], "igmp_snooping": "1"}])
            x.assert_error("igmp_snooping", "Turn on 'bridge' option before enabling 'igmp_snooping'.", 103)
            
        with self.subTest("check_wan_as_lan_on_non_default_iface"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "wan_as_lan": "1"}])
            x.assert_error("wan_as_lan", "'wan_as_lan' option can only be set for the 'lan' interface", 103)

        with self.subTest("check_wan_as_lan_on_default_iface"):
            net_devices = []
            lan_devices = []
            wan_devices = []
            for net in self.board["network"]:
                if "device" in self.board["network"][net]:
                    net_devices.append(self.board["network"][net]["device"])
                    if net == "lan":
                        lan_devices.append(self.board["network"][net]["device"])
                    elif net == "wan":
                        wan_devices.append(self.board["network"][net]["device"])
                elif "ports" in self.board["network"][net]:
                    for p in self.board["network"][net]["ports"]:
                        net_devices.append(p)
                        if net == "lan":
                            lan_devices.append(p)
                        elif net == "wan":
                            wan_devices.append(p)

            net_devices.sort()
            lan_devices.sort()
            wan_devices.sort()

            x = self.put_data(self.url, [{ "id": "lan", "wan_as_lan": "1"}])
            resp_devices = x.resp.json()["data"][0]["ifname"]
            resp_devices.sort()
            self.assertListEqual(resp_devices, net_devices)
            x.assert_data([{
                "ipaddr": "192.168.1.1",
                "fwzone": "lan",
                "bridge": "1",
                "defaultroute": "1",
                "netmask": "255.255.255.0",
                "id": "lan",
                ".type": "interface",
                "ip6assign": "60",
                "delegate": "1",
                "area_type": "lan",
                "igmp_snooping": "0",
                "proto": "static",
                "stp": "0",
                "device": "br_lan",
                "keepalive_interval": "1",
                "name": "lan",
                "enabled": "1",
                "metric": "0",
                "force_link": "1",
                "keepalive_failure": "5",
                "wan_as_lan": "1"
            }], 200, ["ifname"])

            for iface in [ "wan", "wan6" ]:
                with self.subTest(f"check_{iface}_emptied_when_wan_as_lan_enabled"):
                    x = self.get(self.url + "/" + iface)
                    resp = x.resp.json()["data"]
                    self.assertEqual(resp["ifname"], [])

            x = self.put_data(self.url, [{ "id": "lan", "wan_as_lan": "0"}])
            resp_devices = x.resp.json()["data"][0]["ifname"]
            resp_devices.sort()
            self.assertListEqual(resp_devices, lan_devices)
            x.assert_data([{
                "ipaddr": "192.168.1.1",
                "fwzone": "lan",
                "bridge": "1",
                "defaultroute": "1",
                "netmask": "255.255.255.0",
                "id": "lan",
                ".type": "interface",
                "ip6assign": "60",
                "delegate": "1",
                "area_type": "lan",
                "igmp_snooping": "0",
                "proto": "static",
                "stp": "0",
                "device": "br_lan",
                "keepalive_interval": "1",
                "name": "lan",
                "enabled": "1",
                "metric": "0",
                "force_link": "1",
                "keepalive_failure": "5",
                "wan_as_lan": "0"
            }], 200, ["ifname"])

            for iface in [ "wan", "wan6" ]:
                with self.subTest(f"check_{iface}_restored_when_wan_as_lan_disabled"):
                    x = self.get(self.url + "/" + iface)
                    resp = x.resp.json()["data"]["ifname"]
                    resp.sort()
                    self.assertEqual(resp, wan_devices)
        
        with self.subTest("check_proto_values"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": "dhcp"}])
            protos = "[none, static, wwan]" if len(self.modems) > 0 else "[none, static]"
            x.assert_error("proto", f"Must be one of the following values {protos}.", 103)

        with self.subTest("check_proto_options"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": "none"}])
            x.assert_code(200)
            resp = x.resp.json()["data"][0]
            self.assertEqual(resp["proto"], "none")

            with self.subTest("check_options_can_only_be_set_for_static_proto"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "gateway": "192.168.1.1"}])
                x.assert_error("gateway", "Option can be configured only for wan interface with static protocol", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "broadcast": "192.168.1.1"}])
                x.assert_error("broadcast", "Option can be configured only for wan interface with static protocol", 103)

            with self.subTest("check_static_proto_without_addr"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "ipaddr": "", "ip6addr": ""}])
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": "static"}])
                x.assert_error("proto", "one of the ipaddr or ip6addr options must be defined", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ipaddr": self.iface["ipaddr"]}])
                x.assert_code(200)

            x = self.put_data(self.url, [{ "id": self.iface["id"], "proto": "static"}])
            x.assert_code(200)
            resp = x.resp.json()["data"][0]
            self.assertEqual(resp["proto"], "static")

            x = self.put_data(self.url, [{ "id": self.iface["id"], "ipaddr": "0"}])
            x.assert_error("ipaddr", "IPv4 addresses are accepted. E.g. 192.168.1.1 .", 103)

            x = self.put_data(self.url, [{ "id": self.iface["id"], "ipaddr": "192.168.3.1"}])
            x.assert_code(200)
            self.assertEqual(x.resp.json()["data"][0]["ipaddr"], "192.168.3.1")
                
            x = self.destroy_lan_iface(self.iface["id"])
            x.assert_code(200)
            self.iface = None

    def test_lan_ipv6(self):
        self.prepare_test("lan1")
        x = self.create_lan_iface("lan")
        x.assert_code(201)
        self.iface = x.resp.json()["data"]

        with self.subTest("check_ipv6_assignment_hint_values"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6assign": "1"}])
            x.assert_code(200)

            x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6hint": "0"}])
            x.assert_error("ip6hint", "ip6assign must be from 33 to 64 in order to set ip6hint", 103)

            x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6assign": "33"}])
            x.assert_code(200)

            x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6hint": ""}])
            self.assertTrue("ip6hint" not in x.resp.json()["data"][0])

        with self.subTest("check_ipv6_suffix_values"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6ifaceid": "random"}])
            x.assert_code(200)

            x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6ifaceid": "eui64"}])
            x.assert_code(200)

            x = self.put_data(self.url, [{ "id": self.iface["id"], "ip6ifaceid": "::1"}])
            x.assert_code(200)
        
        x = self.destroy_lan_iface(self.iface["id"])
        x.assert_code(200)
        self.iface = None
           
    def test_lan_advanced(self):
        self.prepare_test("lan1")
        x = self.create_lan_iface("lan")
        x.assert_code(201)
        self.iface = x.resp.json()["data"]
    
        with self.subTest("check_mac_override"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "macaddr": "FF:FF:FF:FF:FF:FF"}])
            x.assert_error("macaddr", "Unicast MAC address is allowed. E.g. 00:23:45:67:89:AB.", 103)

            x = self.put_data(self.url, [{ "id": self.iface["id"], "macaddr": "00:11:22:33:44:55"}])
            x.assert_code(200)
                        
            x = self.put_data(self.url, [{ "id": self.iface["id"], "macaddr": ""}])
            x.assert_code(200)
                
        with self.subTest("check_ip4_table"):
            with self.subTest("check_invalid_ip4table_values"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip4table": "NotAnInteger"}])
                x.assert_error("ip4table", "Value must be a valid unsigned integer", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip4table": "-1"}])
                x.assert_error("ip4table", "Value must be a valid unsigned integer", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip4table": str((2**46)+1)}])
                x.assert_error("ip4table", "Unsigned integer range is 0 to 2^46", 103)

            x = self.put_data(self.url, [{ "id": self.iface["id"], "ip4table": ""}])
            x.assert_code(200)

            with self.subTest("check_valid_ip4table_values_when_no_device_assigned"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip4table": "0"}])
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip4table": str(2**32)}])
                x.assert_code(200)

            with self.subTest("check_valid_ip4table_values"):
                self.put_data(self.url + "/" + self.iface["id"], { "ifname": ["br-lan.72"], "enabled": "1" })
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip4table": "0"}])
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ip4table": str(2**32)}])
                x.assert_code(200)

        x = self.destroy_lan_iface(self.iface["id"])
        x.assert_code(200)
        self.iface = None

    def test_lan_physical(self):
        self.prepare_test("lan1")
        x = self.create_lan_iface("lan")
        x.assert_code(201)
        self.iface = x.resp.json()["data"]

        x = self.put_data(self.url, [{ "id": self.iface["id"], "enabled": "1"}])

        with self.subTest("check_ifname_values"):
            with self.subTest("check_invalid_ifname_values"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": "NotAList"}])
                x.assert_error("ifname", "Option only accepts arrays", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": ["ThisNameIsTooLong"]}])
                x.assert_error("ifname", "Provided value is too long. Is 17 characters, but can be up to 15 characters", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": ["=Invalid==!"]}])
                x.assert_error("ifname at index 1", "Value must match the format: ^[A-Za-z0-9._@-]+$", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": ["one", "two"]}])
                x.assert_error("ifname at index 1", "Turn on 'bridge' option to allow multiple ifnames.", 103)

                x = self.get(self.url + "/lan")
                x.assert_code(200)
                original_dev = x.resp.json()["data"]["ifname"][0]

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": [original_dev]}])
                err = "Physical interface '" + original_dev + "' is used in 'br-lan' bridge, you need to remove it first"
                x.assert_error("Validation", err, 103)

            with self.subTest("check_valid_ifname_values"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": ["lo"]}])
                x.assert_code(200)
                resp = x.resp.json()["data"][0]
                self.assertEqual(resp["ifname"], ["lo"])
                self.assertEqual(resp["device"], "lo")

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": ["br-lan.72"]}])
                x.assert_code(200)
                resp = x.resp.json()["data"][0]
                self.assertEqual(resp["ifname"], ["br-lan.72"])
                self.assertEqual(resp["device"], "br-lan.72")

        with self.subTest("check_bridge_options_when_bridge_enabled"):
            x = self.put_data(self.url, [{ "id": self.iface["id"], "bridge": "1"}])
            x.assert_code(200)

            with self.subTest("check_bridging_bridge"):
                x = self.get(self.url + "/lan")
                x.assert_code(200)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": ["br-lan"]}])
                x.assert_error("Validation", "'br-lan' is bridge and it cannot be bridged", 103)

            with self.subTest("check_multiple_bridge_devices"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "ifname": ["one", "two"]}])
                x.assert_code(200)

            with self.subTest("check_stp_toggle"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "stp": "1"}])
                x.assert_code(200)
                self.assertEqual(x.resp.json()["data"][0]["stp"], "1")

                x = self.put_data(self.url, [{ "id": self.iface["id"], "stp": "0"}])
                x.assert_code(200)

            with self.subTest("check_igmp_snooping_toggle"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "igmp_snooping": "1"}])
                x.assert_code(200)
                self.assertEqual(x.resp.json()["data"][0]["igmp_snooping"], "1")

                x = self.put_data(self.url, [{ "id": self.iface["id"], "igmp_snooping": "0"}])
                x.assert_code(200)
        
        x = self.destroy_lan_iface(self.iface["id"])
        x.assert_code(200)
        self.iface = None
    
    def test_lan_firewall(self):
        self.prepare_test("lan1")
        x = self.create_lan_iface("lan")
        x.assert_code(201)
        self.iface = x.resp.json()["data"]

        with self.subTest("check_fwzone_values"):
            with self.subTest("check_invalid_fwzone_values"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "fwzone": ["NotAZone"]}])
                x.assert_error("fwzone", "Option does not accept an array", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "fwzone": 5}])
                x.assert_error("fwzone", "Value must be a string", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "fwzone": "ThisZoneIsTooLong"}])
                x.assert_error("fwzone", "Provided value is too long. Is 17 characters, but can be up to 11 characters", 103)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "fwzone": "!aZone!"}])
                x.assert_error("fwzone", "A string of a-Z, 0-9 and _ characters is accepted.", 103)

                with self.subTest("check_failed_fwzones_not_creating_zones"):
                    x = self.get("/firewall/zones/config").resp.json()["data"]
                    self.assertTrue(len([i for i in x if i["name"] == "NotAZone"]) == 0)
                    self.assertTrue(len([i for i in x if i["name"] == "ThisZoneIsTooLong"]) == 0)
                    self.assertTrue(len([i for i in x if i["name"] == "!aZone!"]) == 0)

            with self.subTest("check_valid_fwzone_values"):
                x = self.put_data(self.url, [{ "id": self.iface["id"], "fwzone": "wan"}])
                x.assert_code(200)
                self.assertEqual(x.resp.json()["data"][0]["fwzone"], "wan")
                x = self.get("/firewall/zones/config").resp.json()["data"]
                self.assertTrue(len([i for i in x if i["name"] == "wan" and self.iface["id"] in i["network"]]) > 0)

                x = self.put_data(self.url, [{ "id": self.iface["id"], "fwzone": "exists"}])
                x.assert_code(200)
                self.assertEqual(x.resp.json()["data"][0]["fwzone"], "exists")
                x = self.get("/firewall/zones/config").resp.json()["data"]
                self.assertTrue(len([i for i in x if i["name"] == "exists" and self.iface["id"] in i["network"]]) > 0)

        x = self.get("/firewall/zones/config").resp.json()["data"]
        zone_id = [i for i in x if i["name"] == "exists" and self.iface["id"] in i["network"]][0]["id"]

        with self.subTest("cleanup_fwzones_zone"):
            self.delete_data("/firewall/zones/config", [zone_id]).assert_code(200)
            
            x = self.get("/firewall/zones/config").resp.json()["data"]
            self.assertTrue(len([i for i in x if i["name"] == "exists" and i["id"] == zone_id]) == 0)



        x = self.destroy_lan_iface(self.iface["id"])
        x.assert_code(200)
        self.iface = None
