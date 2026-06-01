import sys
import time

sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import get_ssh


class L2TPV3(util.WrapTest):
    url = "/l2tpv3/config"
    url_fw = "/firewall/zones/config"
    Env = util.Env

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def check_firewall(self, enabled):
        with self.subTest("check_firewall_zone"):
            x = self.get(self.url_fw)
            found = False
            for section in x.resp.json()["data"]:
                if section["name"] == "l2tpv3":
                    found = True
            if enabled and not found:
                self.fail("Firewall zone is not created")
            if not enabled and found:
                self.fail("Firewall zone exist after instance delete")

    def check_bridge(self, enabled, dev):
        ports = self.ssh.send_cmd("uci get network.br_lan.ports")
        found = False
        if ports:
            for port in ports.split():
                if port == "@" + dev:
                    found = True
            if enabled and not found:
                self.fail("Interface not added to bridge")
            if not enabled and found:
                self.fail("Interface still exist in bridge")

    def test_instance(self):
        with self.subTest("create_inst1"):
            x = self.post_data(self.url, {"id": "inst1"})
            sid1 = x.resp.json()["data"]["id"]
            x.assert_data(
                {
                    "enabled": "0",
                    ".type": "interface",
                    "id": "inst1",
                    "encap": "ip",
                    "l2spec_type": "default",
                },
                201,
            )

        with self.subTest("update_inst1"):
            x = self.put_data(
                f"{self.url}/{sid1}",
                {
                    "enabled": "1",
                    "localaddr": self.Env.ip,
                    "tunnel_id": "30",
                    "session_id": "40",
                    "cookie": "88ABCDEF",
                    "peeraddr": "127.0.0.1",
                    "peer_tunnel_id": "50",
                    "peer_session_id": "60",
                    "peer_cookie": "89ABCDEF",
                    "ipaddr": "10.0.0.1",
                    "ip6addr": "2000::1/64",
                    "netmask": "255.255.255.0",
                },
            )
            x.assert_data(
                {
                    "enabled": "1",
                    "peeraddr": "127.0.0.1",
                    "peer_tunnel_id": "50",
                    "id": "inst1",
                    ".type": "interface",
                    "cookie": "88ABCDEF",
                    "peer_session_id": "60",
                    "peer_cookie": "89ABCDEF",
                    "tunnel_id": "30",
                    "ip6addr": "2000::1/64",
                    "ipaddr": "10.0.0.1",
                    "netmask": "255.255.255.0",
                    "localaddr": self.Env.ip,
                    "session_id": "40",
                    "encap": "ip",
                    "l2spec_type": "default",
                },
                200,
            )
            self.check_firewall(True)

        with self.subTest("create_inst2"):
            time.sleep(3)
            x = self.post_data(
                self.url,
                {
                    "id": "inst2",
                    "enabled": "1",
                    "peeraddr": "127.0.0.1",
                    "peer_tunnel_id": "30",
                    ".type": "interface",
                    "cookie": "89ABCDEF",
                    "peer_session_id": "40",
                    "peer_cookie": "88ABCDEF",
                    "tunnel_id": "50",
                    "ip6addr": "2000::2/64",
                    "ipaddr": "10.0.0.2",
                    "netmask": "255.255.255.0",
                    "localaddr": self.Env.ip,
                    "session_id": "60",
                },
            )
            sid2 = x.resp.json()["data"]["id"]
            x.assert_code(201)

        with self.subTest("check_connection"):
            time.sleep(6)
            ip1 = self.ssh.send_cmd(
                "ubus call network.interface.inst1 status | jsonfilter -e '@[\"ipv4-address\"][0].address'"
            )
            ip2 = self.ssh.send_cmd(
                "ubus call network.interface.inst2 status | jsonfilter -e '@[\"ipv4-address\"][0].address'"
            )
            if ip1.strip() != "10.0.0.1" or ip2.strip() != "10.0.0.2":
                self.fail("Connection failed")

        with self.subTest("create_inst3"):
            x = self.post_data(
                self.url,
                {
                    "id": "inst3",
                    "peer_tunnel_id": "50",
                    "peer_session_id": "60",
                    "tunnel_id": "30",
                    "session_id": "40",
                },
            )
            self.assertEqual(
                x.resp.json()["errors"][0],
                {
                    "code": 103,
                    "error": "The Tunnel ID is already being used by another instance.",
                    "section": "inst3",
                },
            )

        with self.subTest("add_to_bridge"):
            x = self.put_data(
                f"{self.url}/{sid1}",
                {"bridge_to": "lan"},
            )
            x.assert_code(200)
            self.check_bridge(True, sid1)

        with self.subTest("remove_from_bridge"):
            x = self.put_data(
                f"{self.url}/{sid1}",
                {"bridge_to": "none"},
            )
            x.assert_code(200)
            self.check_bridge(False, sid1)

        with self.subTest("update_inst1_ipv6"):
            x = self.put_data(
                f"{self.url}/{sid1}", {"peeraddr": "2001::1", "localaddr": "2001::2"}
            )
            x.assert_code(200)

        with self.subTest("disable_inst1"):
            x = self.put_data(
                f"{self.url}/{sid1}",
                {
                    "enabled": "0",
                    "l2spec_type": "none",
                    "encap": "udp",
                    "udp_sport": "80",
                    "udp_dport": "80",
                },
            )
            x.assert_code(200)

        # del sec
        with self.subTest("delete_inst1"):
            x = self.delete(f"{self.url}/{sid1}")
            x.assert_code(200)
            x.assert_data({"id": "inst1"})

        with self.subTest("delete_inst2"):
            x = self.delete(f"{self.url}/{sid2}")
            x.assert_code(200)
            x.assert_data({"id": "inst2"})
            self.check_firewall(False)
