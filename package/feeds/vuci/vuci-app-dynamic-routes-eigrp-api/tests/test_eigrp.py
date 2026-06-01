import sys
import time

sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed


class test_eigrp(util.WrapTest):
    url = "/eigrp/config/general"
    url_status = "/eigrp/status"
    url_fw = "/firewall/traffic_rules/config"

    def setUp(self):
        if not is_package_installed(self, "eigrpd"):
            self.skipTest("EIGRP package is not installed")

    def check_firewall(self, enabled):
        with self.subTest("check_firewall_rule"):
            x = self.get(self.url_fw)
            found = False
            for section in x.resp.json()["data"]:
                if (
                    section["name"] == "Allow-EIGRP-WAN-traffic"
                    and section["enabled"] == "1"
                ):
                    found = True
            if enabled and not found:
                self.fail("Firewall rule is not created")
            if not enabled and found:
                self.fail("Firewall rule exist after instance delete")

    def test_instance(self):
        with self.subTest("get_section_1"):
            x = self.get(self.url)
            x.assert_code(200)

        with self.subTest("update_section_1"):
            x = self.put_data(
                self.url,
                {
                    "enabled": "1",
                    "debug": "1",
                    "as": "65535",
                    "router_id": "192.168.1.1",
                    "network": ["192.168.1.1/24"],
                    "redistribute": ["kernel"],
                    "neighbor": ["1.1.1.1"],
                },
            )
            x.assert_data(
                {
                    "enabled": "1",
                    ".type": "eigrp_general",
                    "network": ["192.168.1.1/24"],
                    "id": "general",
                    "router_id": "192.168.1.1",
                    "redistribute": ["kernel"],
                    "as": "65535",
                    "neighbor": ["1.1.1.1"],
                    "debug": "1",
                },
                200,
            )
            self.check_firewall(True)

        with self.subTest("get_status_1"):
            time.sleep(30)
            x = self.get(self.url_status)
            x.assert_code(200)
            self.assertEqual(x.resp.json()["data"]["neighbors"], [])
            self.assertEqual(x.resp.json()["data"]["route1"]["interface"], "br-lan")

        with self.subTest("update_section_2"):
            x = self.put_data(
                self.url,
                {
                    "debug": "0",
                    "as": "0",
                    "router_id": "test_id",
                    "network": ["192.168.1.1"],
                    "redistribute": ["test"],
                    "neighbor": ["neighbor"],
                },
            )
            self.assertListEqual(
                x.json["errors"],
                [
                    {
                        "source": "router_id",
                        "code": 103,
                        "value": "test_id",
                        "error": "IPv4 and IPv6 addresses are accepted. E.g. 192.168.1.1.",
                        "section": "general",
                    },
                    {
                        "source": "as",
                        "code": 103,
                        "value": "0",
                        "error": "Value must be an integer and range of the value must be from 1 to 65535.",
                        "section": "general",
                    },
                    {
                        "source": "neighbor at index 1",
                        "code": 103,
                        "value": "neighbor",
                        "error": "IPv4 addresses with or without mask prefix are accepted. E.g. 192.168.1.1/24 .",
                        "section": "general",
                    },
                ],
            )

        with self.subTest("disable_instance"):
            x = self.put_data(
                self.url,
                {
                    "enabled": "0",
                    "debug": "0",
                    "as": "",
                    "router_id": "",
                    "network": [],
                    "redistribute": [],
                    "neighbor": [],
                },
            )
            x.assert_code(200)
            self.check_firewall(False)

        with self.subTest("get_section_2"):
            x = self.get(self.url)
            x.assert_data(
                {
                    "enabled": "0",
                    ".type": "eigrp_general",
                    "debug": "0",
                    "id": "general",
                },
                200,
            )
