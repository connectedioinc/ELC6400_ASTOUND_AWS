import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_dhcp_ipv6(util.WrapTest):
    iface_url = "/interfaces/config"
    dhcp_url = "/dhcp/servers/ipv6/config"
    status_url = "/dhcp/servers/ipv6/status"
    default_data = [
        {
            "enable_dhcpv6": "1",
            ".type": "dhcp",
            "leasetime": "12h",
            "dhcpv6": "server",
            "ra": "server",
            "id": "lan",
            "ra_management": "1",
            "dynamicdhcp": "1",
            "interface": "lan"
        }
    ]
    sid = None

    @util.skip_device("TAP")
    def setUp(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        if "switch" in board["hwinfo"] and board["hwinfo"]["switch"]:
            self.skipTest("DHCPv6 is not supported on switch devices")
        if "guest" in board["network"]:
            self.default_data.append({
                "enable_dhcpv6": "1",
                ".type": "dhcp",
                "leasetime": "1h",
                "id": "guest",
                "ra_management": "1",
                "dynamicdhcp": "1",
                "interface": "guest"
            })

    @util.skip_device("TAP")
    def test_dhcp_base_functionality(self):
        with self.subTest("get_status"):
            x = self.get(self.status_url)
            x.assert_code(200)
            data = x.resp.json()["data"]
            for d in data:
                for key in ["id", "running", "interface"]:
                    self.assertIn(key, d)
        with self.subTest("get_configuration"):
            x = self.get(self.dhcp_url)
            get_response = x.resp.json()["data"]
            self.assertEqual(self.default_data, get_response)
        with self.subTest("create_configuration"):
            x = self.post_data(self.iface_url, {
                "proto": "static",
                "ipaddr": "192.168.2.1",
                "netmask": "255.255.255.0",
                "area_type": "lan"
            })
            x.assert_code(201)
            self.sid = x.resp.json()["data"]["id"]
            y = self.post_data(self.dhcp_url, {
                "id": self.sid,
                "dhcpv6": "server"
            })
            y.assert_data({
                "id": self.sid,
                ".type": "dhcp",
                "dhcpv6": "server",
                "leasetime": "12h",
                "ra_management": "0",
                "dynamicdhcp": "1",
                "enable_dhcpv6": "0",
                "interface": "lan1"
            }, 201)
        with self.subTest(f"edit_configuration"):
            put_data = {
                ".type": "dhcp",
                "leasetime": "60m",
                "dynamicdhcp": "0",
                "enable_dhcpv6": "1",
                "dhcpv6": "relay",
                "ra_management": "2",
                "ra": "server",
                "ndp": "hybrid",
                "ra_default": "0",
                "dns": ["1.1.1.1", "1.0.0.1"],
                "domain": ["google.com"]
            }
            x = self.put_data(self.dhcp_url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["interface"] = "lan1"
            x.assert_data(put_data)
        with self.subTest("delete_configuration"):
            x = self.delete(self.iface_url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })

    @util.skip_device("TAP")
    def test_dhcp_creation_edge_cases(self):
        with self.subTest(f"create_configuration_non_existing_interface"):
            x = self.post_data(self.dhcp_url, {
                "id": "test123"
            })
            x.assert_error(
                "URL", "DHCP configuration ID must match an ID of a network interface configuration.", 113, None, None)
        with self.subTest("create_configuration_non_static_protocol"):
            x = self.post_data(self.iface_url, {
                "proto": "none",
                "area_type": "lan"
            })
            x.assert_code(201)
            self.sid = x.resp.json()["data"]["id"]
            y = self.post_data(self.dhcp_url, {
                "id": self.sid
            })
            y.assert_error(
                "URL", "DHCP configuration can only be created for interface with static protocol.", 113, None, None)
            z = self.delete(self.iface_url + "/" + self.sid)
            z.assert_data({
                "id": self.sid
            })
        with self.subTest("create_configuration_wan_area_type"):
            x = self.post_data(self.iface_url, {
                "proto": "static",
                "ipaddr": "192.168.2.1",
                "netmask": "255.255.255.0",
                "area_type": "wan"
            })
            x.assert_code(201)
            self.sid = x.resp.json()["data"]["id"]
            y = self.post_data(self.dhcp_url, {
                "id": self.sid
            })
            y.assert_error(
                "id", "DHCP configuration can be created only for LAN type interfaces", 1, None, None)
            z = self.delete(self.iface_url + "/" + self.sid)
            z.assert_data({
                "id": self.sid
            })
