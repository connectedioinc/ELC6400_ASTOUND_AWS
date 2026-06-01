import sys
import time

sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import get_ssh
from utils.general_api import is_package_installed


class EoIP(util.WrapTest):
    url = "/eoip/config"
    url_fw = "/firewall/zones/config"

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def setUp(self):
        if not is_package_installed(self, "eoip"):
            self.skipTest("EoIP package is not installed")

    def check_firewall(self, enabled):
        with self.subTest("check_firewall_zone"):
            x = self.get(self.url_fw)
            found = False
            for section in x.resp.json()["data"]:
                if section["name"] == "eoip":
                    found = True
            if enabled and not found:
                self.fail("Firewall zone is not created")
            if not enabled and found:
                self.fail("Firewall zone exist after instance delete")

            masq = self.ssh.send_cmd("grep 'masq_allow_invalid' /etc/config/firewall")
            if enabled and not masq:
                self.fail("Firewall masq parameter is not added")
            if not enabled and masq:
                self.fail("Firewall masq parameter exist after instance delete")

    def check_bridge(self, enabled, dev):
        ports = self.ssh.send_cmd("uci get network.br_lan.ports")
        found = False
        if ports:
            for port in ports.split():
                if port == dev:
                    found = True
            if enabled and not found:
                self.fail("Interface not added to bridge")
            if not enabled and found:
                self.fail("Interface still exist in bridge")

    def test_instance(self):
        with self.subTest("create_interface1"):
            x = self.post_data(self.url, {})
            x.assert_data(
                {"id": "inst1", ".type": "eoip", "name": "instance1"},
                201,
            )

        with self.subTest("enable_interface1"):
            x = self.put_data(
                f"{self.url}/inst1",
                {"enabled": "1"},
            )
            self.assertListEqual(
                x.json["errors"],
                [
                    {
                        "source": "enabled",
                        "code": 103,
                        "error": "Missing required option: tun_id",
                        "section": "inst1",
                    }
                ],
            )

        with self.subTest("update_interface1"):
            x = self.put_data(
                f"{self.url}/inst1",
                {
                    "enabled": "1",
                    "tun_id": "100",
                    "local_ip": util.Env().ip,
                    "remote_ip": "1.1.1.1",
                    "dynamic": "0",
                    "name": "Test inst1",
                },
            )
            x.assert_code(200)
            self.check_firewall(True)

        with self.subTest("create_interface2"):
            x = self.post_data(self.url, {"name": "Test inst2"})
            x.assert_data(
                {"id": "inst2", ".type": "eoip", "name": "Test inst2"},
                201,
            )

        with self.subTest("add_bridge_interface1"):
            x = self.put_data(
                f"{self.url}/inst1",
                {"to_bridge": "br_lan"},
            )
            x.assert_code(200)
            self.check_bridge(True, "eoip_1")

        with self.subTest("rm_bridge_interface1"):
            x = self.put_data(
                f"{self.url}/inst1",
                {"to_bridge": "none"},
            )
            x.assert_code(200)
            self.check_bridge(False, "eoip_1")

        with self.subTest("check_interface1"):
            x = self.get(f"{self.url}/inst1")
            x.assert_data(
                {
                    "enabled": "1",
                    "remote_ip": "1.1.1.1",
                    "dynamic": "0",
                    "id": "inst1",
                    "local_ip": util.Env().ip,
                    "to_bridge": "none",
                    "name": "Test inst1",
                    "tun_id": "100",
                    ".type": "eoip",
                },
                200,
            )

        with self.subTest("check_ipv6"):
            x = self.put_data(
                f"{self.url}/inst1",
                {"use_ipv6": "1", "remote_ip": "1.1.1.1", "local_ip": util.Env().ip},
            )
            self.assertListEqual(
                x.json["errors"],
                [
                    {
                        "source": "remote_ip",
                        "code": 103,
                        "value": "1.1.1.1",
                        "error": "IPv6 addresses are accepted. E.g. ::0000:8a2e:0370:7334, because use_ipv6 is enabled.",
                        "section": "inst1",
                    },
                    {
                        "source": "local_ip",
                        "code": 103,
                        "value": util.Env().ip,
                        "error": "IPv6 addresses are accepted. E.g. ::0000:8a2e:0370:7334, because use_ipv6 is enabled.",
                        "section": "inst1",
                    },
                ],
            )

        # del sec
        with self.subTest("delete_interface1"):
            x = self.delete(f"{self.url}/inst1")
            x.assert_data({"id": "inst1"}, 200)

        with self.subTest("delete_interface2"):
            x = self.delete(f"{self.url}/inst2")
            x.assert_data({"id": "inst2"}, 200)
            self.check_firewall(False)
