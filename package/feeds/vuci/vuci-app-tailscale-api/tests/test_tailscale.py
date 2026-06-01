import sys
import time

sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed


class test_tailscale(util.WrapTest):
    url = "/tailscale/config/general"
    url_status = "/tailscale/status"
    url_fw = "/firewall/zones/config"

    def setUp(self):
        if not is_package_installed(self, "tailscale"):
            self.skipTest("Tailscale package is not installed")

    def test_instance(self):
        with self.subTest("get_section"):
            x = self.get(self.url)
            x.assert_code(200)

        with self.subTest("update_section_1"):
            x = self.put_data(
                self.url,
                {
                    "auth_type": "url",
                    "enabled": "1",
                    "advert_routes": ["192.168.5.0/24", "192.168.6.0/24"],
                    "accept_routes": "1",
                    "exit_node": "1",
                },
            )
            x.assert_data(
                {
                    "enabled": "1",
                    "advert_routes": ["192.168.5.0/24", "192.168.6.0/24"],
                    "accept_routes": "1",
                    "id": "general",
                    "exit_node": "1",
                    ".type": "settings",
                    "auth_type": "url",
                    "default_route": "0",
                },
                200,
            )

        with self.subTest("get_status_1"):
            time.sleep(30)
            x = self.get(self.url_status)
            x.assert_code(200)
            self.assertEqual(x.resp.json()["data"][0]["status"], "0")

        with self.subTest("update_section_2"):
            x = self.put_data(
                self.url,
                {"auth_type": "url", "default_route": "1", "exit_node_ip": "10.0.0.1"},
            )
            x.assert_data(
                {
                    "enabled": "1",
                    "advert_routes": ["192.168.5.0/24", "192.168.6.0/24"],
                    "id": "general",
                    "exit_node_ip": "10.0.0.1",
                    ".type": "settings",
                    "auth_type": "url",
                    "default_route": "1",
                    "accept_routes": "1",
                },
                200,
            )

        with self.subTest("get_status_2"):
            time.sleep(30)
            x = self.get(self.url_status)
            x.assert_code(200)
            self.assertEqual(x.resp.json()["data"][0]["status"], "0")

        with self.subTest("update_section_3"):
            x = self.put_data(self.url, {"auth_type": "key"})
            self.assertListEqual(
                x.json["errors"],
                [
                    {
                        "source": "enabled",
                        "code": 103,
                        "error": "Missing required option: auth_key",
                        "section": "general",
                    }
                ],
            )

        with self.subTest("check_firewall_zone"):
            x = self.get(self.url_fw)
            found = False
            for section in x.resp.json()["data"]:
                if section["name"] == "tailscale":
                    found = True
                    self.assertEqual(section["input"], "ACCEPT")
                    self.assertEqual(section["output"], "ACCEPT")
                    self.assertEqual(section["forward"], "REJECT")
            if not found:
                self.fail("Firewall zone is not created")

        with self.subTest("restore_section"):
            x = self.put_data(
                self.url,
                {
                    "enabled": "0",
                    "advert_routes": "",
                    "default_route": "0",
                    "accept_routes": "0",
                },
            )
            x.assert_code(200)
