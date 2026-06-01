import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import send_cmd, get_ssh

class test_static_routes(util.WrapTest):
    mobile = None
    mobile_iface = None
    def setUp(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        self.mobile = self.has_mobile(board)
        self.mobile_iface = self.get_mobile_iface()

    def has_mobile(self, board):
        return board["hwinfo"]["mobile"]

    def get_mobile_iface(self):
        if not self.mobile:
            return
        x = self.get("/interfaces/config")
        mobile_ifaces = list(filter(lambda m: m["proto"] == "wwan" or m["proto"] == "connm", x.resp.json()["data"]))
        return mobile_ifaces[0]

    def check_mobile_iface_name(self, options, url, sid):
        if not self.mobile:
            return
        del options["id"]
        custom_name = "mobile123"
        x = self.put_data("/interfaces/config/" + self.mobile_iface["id"], { "name": custom_name })
        x.assert_code(200)
        options["interface"] = custom_name
        x = self.put_data(url + "/" + sid, options)
        options["id"] = sid
        x.assert_data(options)

    def test_static_ipv4_routes_base_functionality(self):
        ipv4_sid = ""
        ipv4_url = "/ip_routes/ipv4/config"
        ipv4_options = {
            'interface': "lan",
            'target': "192.168.5.1",
            'netmask': "255.255.255.0",
            'gateway': "192.168.5.254",
            'metric': "21",
            'mtu': "690",
            'type': "local",
            'table': "254"
        }
        with self.subTest("create_configuration"):
            x = self.post_data(ipv4_url, ipv4_options)
            ipv4_sid = x.resp.json()['data']['id']
            response_options = ipv4_options.copy()
            response_options[".type"] = "route"
            response_options["id"] = ipv4_sid
            x.assert_data(response_options, 201)
        with self.subTest("edit_configuration"):
            ipv4_options['target'] = "192.168.8.16"
            ipv4_options['netmask'] = "255.255.255.255"
            ipv4_options['gateway'] = "192.168.8.254"
            ipv4_options['metric'] = "29"
            ipv4_options['mtu'] = "72"
            ipv4_options['type'] = "broadcast"
            x = self.put_data(ipv4_url + "/" + ipv4_sid, ipv4_options)
            ipv4_options['.type'] = "route"
            ipv4_options['id'] = ipv4_sid
            x.assert_data(ipv4_options)
        with self.subTest("check_mobile_iface_name"):
            self.check_mobile_iface_name(ipv4_options, ipv4_url, ipv4_sid)
        with self.subTest("edit_configuration_incorrect_type"):
            ipv4_options['type'] = "test"
            del ipv4_options["id"]
            x = self.put_data(ipv4_url + "/" + ipv4_sid, ipv4_options)
            x.assert_error(
                "type", "Must be one of the following values [unicast, local, broadcast, multicast, unreachable, prohibit, blackhole, anycast].", 103, None, None)
        with self.subTest("edit_configuration_invalid_iface_proto"):
            # Create dummy iface
            iface_url = "/interfaces/config"
            x = self.post_data(iface_url, {"area_type": "wan"})
            iface_sid = x.resp.json()["data"]["id"]
            iface_name = x.resp.json()["data"]["name"]
            ssh = get_ssh()
            send_cmd(ssh, "uci set network.vrfdev=device")
            send_cmd(ssh, "uci set network.vrfdev.type=vrf")
            send_cmd(ssh, "uci set network.vrfdev.name=vrf1")
            send_cmd(ssh, "uci set network." + iface_sid + ".proto=none")
            send_cmd(ssh, "uci set network." + iface_sid + ".device=vrf1")
            send_cmd(ssh, "uci commit network")
            x = self.put_data(ipv4_url + "/" + ipv4_sid, {"interface": iface_name})
            x.assert_error("interface", "Must be one of the following values [lan, wan, wan6].", 103)
            # Revert proto so that interface endpoint does not filter it
            send_cmd(ssh, "uci set network." + iface_sid + ".proto=none")
            send_cmd(ssh, "uci delete network." + iface_sid + ".device")
            send_cmd(ssh, "uci commit network")
            # Delete dummy iface
            x = self.delete(iface_url + "/" + iface_sid)
            x.assert_data({
                "id": iface_sid
            })
        with self.subTest("delete_configuration"):
            x = self.delete(ipv4_url + "/" + ipv4_sid)
            x.assert_data({
                'id': ipv4_sid
            })
            if not self.mobile:
                return
            x = self.put_data("/interfaces/config/" + self.mobile_iface["id"], { "name": self.mobile_iface["id"] })
            x.assert_code(200)

    def test_static_ipv6_routes_base_functionality(self):
        ipv6_sid = ""
        ipv6_url = "/ip_routes/ipv6/config"
        ipv6_options = {
            'interface': "lan",
            'target': "2001:0DB8:ABCD:0012:0000:0000:0000:0000",
            'gateway': "2001:0DB8:ABCD:0012:0000:0000:0000:0002",
            'metric': "21",
            'mtu': "690",
            'type': "multicast",
            'table': "254"
        }
        with self.subTest("create_configuration"):
            x = self.post_data(ipv6_url, ipv6_options)
            ipv6_sid = x.resp.json()['data']['id']
            response_options = ipv6_options.copy()
            response_options[".type"] = "route6"
            response_options["id"] = ipv6_sid
            x.assert_data(response_options, 201)
        with self.subTest("edit_configuration"):
            ipv6_options['target'] = "2001:0DB8:ABCD:0012:0000:0000:0000:0003"
            ipv6_options['gateway'] = "2001:0DB8:ABCD:0012:0000:0000:0000:0005"
            ipv6_options['metric'] = "29"
            ipv6_options['mtu'] = "72"
            ipv6_options['type'] = "anycast"
            x = self.put_data(ipv6_url + "/" + ipv6_sid, ipv6_options)
            ipv6_options['.type'] = "route6"
            ipv6_options['id'] = ipv6_sid
            x.assert_data(ipv6_options)
        with self.subTest("check_mobile_iface_name"):
            self.check_mobile_iface_name(ipv6_options, ipv6_url, ipv6_sid)
        with self.subTest("edit_configuration_incorrect_type"):
            ipv6_options['type'] = "test"
            del ipv6_options["id"]
            x = self.put_data(ipv6_url + "/" + ipv6_sid, ipv6_options)
            x.assert_error(
                "type", "Must be one of the following values [unicast, local, broadcast, multicast, unreachable, prohibit, blackhole, anycast].", 103, None, None)
        with self.subTest("delete_configuration"):
            x = self.delete(ipv6_url + "/" + ipv6_sid)
            x.assert_data({
                'id': ipv6_sid
            })
            if not self.mobile:
                return
            x = self.put_data("/interfaces/config/" + self.mobile_iface["id"], { "name": self.mobile_iface["id"] })
            x.assert_code(200)
