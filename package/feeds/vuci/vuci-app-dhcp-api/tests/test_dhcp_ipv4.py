import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_dhcp_ipv4(util.WrapTest):
    iface_url = "/interfaces/config"
    dhcp_url = "/dhcp/servers/ipv4/config"
    status_url = "/dhcp/servers/ipv4/status"
    actions_url = "/dhcp/servers/ipv4/actions/restart"
    default_data = [
        {
            "enable_dhcpv4": "1",
            ".type": "dhcp",
            "leasetime": "12h",
            "id": "lan",
            "start_ip": "192.168.1.100",
            "end_ip": "192.168.1.249",
            "dynamicdhcp": "1",
            "mode": "server",
            "dhcp_option": ["43,192.168.1.1"],
            "interface": "lan"
        }
    ]
    sid = None,

    if util.Env.ip != "192.168.1.1":
        subnet = util.Env.ip.split(".")[2]
        default_data[0]["start_ip"] = "192.168." + subnet + ".100"
        default_data[0]["end_ip"] = "192.168." + subnet + ".249"

    @util.skip_device("TAP")
    def setUp(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        if "switch" in board["hwinfo"] and board["hwinfo"]["switch"]:
            self.skipTest("DHCPv6 is not supported on switch devices")
        if "guest" in board["network"]:
            self.default_data.append({
                "enable_dhcpv4": "1",
                ".type": "dhcp",
                "leasetime": "1h",
                "id": "guest",
                "start_ip": "192.168.3.100",
                "end_ip": "192.168.3.249",
                "dynamicdhcp": "1",
                "mode": "server",
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
                "ipaddr": "192.168.254.1",
                "netmask": "255.255.255.0",
                "area_type": "lan"
            })
            x.assert_code(201)
            self.sid = x.resp.json()["data"]["id"]
            y = self.post_data(self.dhcp_url, {
                "id": self.sid
            })
            y.assert_data({
                "id": self.sid,
                ".type": "dhcp",
                "start_ip": "192.168.254.100",
                "end_ip": "192.168.254.249",
                "dynamicdhcp": "1",
                "mode": "server",
                "enable_dhcpv4": "0",
                "interface": "lan1"
            }, 201)
        with self.subTest(f"edit_configuration"):
            put_data = {
                ".type": "dhcp",
                "leasetime": "infinite",
                "dynamicdhcp": "0",
                "enable_dhcpv4": "1",
                "mode": "relay",
                "server_relay": "192.168.254.101",
                "netmask": "255.255.255.0",
                "dhcp_option": ["3,192.168.254.100", "6"],
                "circuit_id": "test_circuit_id",
                "remote_id": "test_remote_id",
                "force_options": "1"
            }
            x = self.put_data(self.dhcp_url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["interface"] = "lan1"
            x.assert_data(put_data)
        with self.subTest(f"edit_configuration_disable_option_82"):
            put_data = {
                ".type": "dhcp",
                "leasetime": "infinite",
                "dynamicdhcp": "0",
                "enable_dhcpv4": "1",
                "mode": "relay",
                "server_relay": "192.168.254.101",
                "netmask": "255.255.255.0",
                "dhcp_option": ["3,192.168.254.100", "6"],
                "force_options": "1",
                "circuit_id": "",
                "remote_id": ""
            }
            x = self.put_data(self.dhcp_url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["interface"] = "lan1"
            del put_data["circuit_id"]
            del put_data["remote_id"]
            x.assert_data(put_data)
        with self.subTest("delete_configuration"):
            x = self.delete(self.iface_url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
        with self.subTest("actions_restart"):
            x = self.post_data(self.actions_url, {})
            data = x.resp.json()
            self.assertEqual(data, {
                "success": True
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
                "ipaddr": "192.168.254.1",
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
        with self.subTest(f"edit_configuration_duplicate_dhcp_option"):
            x = self.put_data(self.dhcp_url + "/lan", {
                "dhcp_option": ["3", "3", "6,1.1.1.1"]
            })
            x.assert_error(
                "dhcp_option", "No duplicate values allowed. Found duplicate values [3].", 103, None, None)
        with self.subTest(f"edit_configuration_duplicate_dhcp_option_with_values"):
            x = self.put_data(self.dhcp_url + "/lan", {
                "dhcp_option": ["3,1.1.1.10,4.4.4.4", "3", "6,10.10.10.10"]
            })
            x.assert_error(
                "Validation", "Duplicate option code values are not allowed", 103, None, None)
        for opt in ["netmask", "start_ip", "end_ip"]:
            with self.subTest(f"edit_configuration_{opt}_array"):
                x = self.put_data(self.dhcp_url + "/lan", {
                    opt: ["255.255.255.0", "123"]
                })
                x.assert_error(opt, "Option does not accept an array", 103, None, None)
        with self.subTest(f"try_set_remote_id_without_circuit_id"):
            x = self.put_data(self.dhcp_url + "/lan", {
                "remote_id": "test_remote_id"
            })
            x.assert_error("remote_id", "Missing required option: circuit_id", 103, None, None)
        with self.subTest(f"try_set_circuit_id_without_remote_id"):
            x = self.put_data(self.dhcp_url + "/lan", {
                "circuit_id": "test_circuit_id"
            })
            x.assert_error("circuit_id", "Missing required option: remote_id", 103, None, None)
