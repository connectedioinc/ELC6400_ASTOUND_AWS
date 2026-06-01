import sys
import time
import os.path

sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import get_ssh
from utils.general_api import is_package_installed

http = util.Env.http
api_url = util.Env.get_api_url()


class test_eigrp(util.WrapTest):
    url = "/rip/global"
    url_int = "/rip/interface/config"
    url_fil = "/rip/access/config"
    url_status = "/rip/status"
    url_fw = "/firewall/traffic_rules/config"

    def setUp(self):
        if not is_package_installed(self, "rip"):
            self.skipTest("RIP package is not installed")

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def check_firewall(self, enabled):
        with self.subTest("check_firewall_rule"):
            x = self.get(self.url_fw)
            found = False
            for section in x.resp.json()["data"]:
                if (
                    section["name"] == "Allow-RIP-WAN-traffic"
                    and section["enabled"] == "1"
                ):
                    found = True
            if enabled and not found:
                self.fail("Firewall rule is not created")
            if not enabled and found:
                self.fail("Firewall rule exist after instance delete")

    def test_instance(self):
        with self.subTest("get_global_1"):
            x = self.get(self.url)
            x.assert_code(200)

        with self.subTest("update_global_1"):
            x = self.put_data(
                self.url,
                {
                    "enabled": "1",
                    "neighbors": ["1.1.1.1", "2.2.2.2"],
                    "enabled_vty": "1",
                },
            )
            x.assert_code(200)
            self.check_firewall(True)

        with self.subTest("get_interface_1"):
            x = self.get(self.url_int)
            x.assert_code(200)

        with self.subTest("create_interface_1"):
            x = self.post_data(
                self.url_int,
                {
                    "id": "int1",
                    "enabled": "1",
                    "ifname": "eth1",
                    "passive_interface": "0",
                },
            )
            x.assert_data(
                {
                    "enabled": "1",
                    ".type": "rip_interface",
                    "ifname": "eth1",
                    "id": "int1",
                    "passive_interface": "0",
                },
                201,
            )

        with self.subTest("create_interface_2"):
            x = self.post_data(
                self.url_int,
                {
                    "id": "int2",
                },
            )
            x.assert_data(
                {
                    ".type": "rip_interface",
                    "id": "int2",
                },
                201,
            )

        with self.subTest("get_interface_2"):
            x = self.get(self.url_int)
            x.assert_data(
                [
                    {
                        "enabled": "1",
                        "ifname": "eth1",
                        "passive_interface": "0",
                        "id": "int1",
                        ".type": "rip_interface",
                    },
                    {"id": "int2", ".type": "rip_interface"},
                ],
                200,
            )

        with self.subTest("get_filter_1"):
            x = self.get(self.url_fil)
            x.assert_code(200)

        with self.subTest("create_filter_1"):
            x = self.post_data(
                self.url_fil,
                {
                    "id": "filter1",
                    "target": "int1",
                    "action": "permit",
                    "net": "any",
                    "direction": "in",
                    "enabled": "1",
                },
            )
            x.assert_data(
                {
                    "id": "filter1",
                    ".type": "rip_access_list",
                    "target": "int1",
                    "action": "permit",
                    "net": "any",
                    "direction": "in",
                    "enabled": "1",
                },
                201,
            )

        with self.subTest("create_filter_2"):
            x = self.post_data(
                self.url_fil,
                {
                    "id": "filter2",
                    "target": "int2",
                },
            )
            x.assert_data(
                {".type": "rip_access_list", "id": "filter2", "target": "int2"},
                201,
            )

        with self.subTest("get_filter_2"):
            x = self.get(self.url_fil)
            x.assert_data(
                [
                    {
                        "enabled": "1",
                        ".type": "rip_access_list",
                        "action": "permit",
                        "target": "int1",
                        "direction": "in",
                        "net": "any",
                        "id": "filter1",
                    },
                    {"id": "filter2", ".type": "rip_access_list", "target": "int2"},
                ],
                200,
            )

        with self.subTest("get_status_1"):
            time.sleep(30)
            x = self.get(self.url_status)
            x.assert_code(200)
            self.assertEqual(x.resp.json()["data"]["sources"]["Interface"], "eth1")
            self.assertEqual(x.resp.json()["data"]["route1"]["Metric"], "1")

        with self.subTest("get_config"):
            if not os.path.isdir("./files/rip"):
                os.mkdir("./files/rip")
            f = open("./files/rip/rip.conf", "wt")
            cfg = self.ssh.send_cmd(
                "( usleep 0; echo admin01; usleep 0; echo \"enable\"; echo \"admin01\"; echo 'show run';) 2>/dev/null | nc 127.0.0.1 2602 | sed -n '/^Current configuration:/,/^end[[:space:]]*$/p'"
            )
            f.write(cfg)
            f.close()

        with self.subTest("update_global_2"):
            x = self.put_data(
                self.url,
                {
                    "neighbors": ["test"],
                    "version": "test",
                },
            )
            self.assertListEqual(
                x.json["errors"],
                [
                    {
                        "source": "neighbors at index 1",
                        "code": 103,
                        "value": "test",
                        "error": "IPv4 addresses with or without mask prefix are accepted. E.g. 192.168.1.1/24 .",
                        "section": "general",
                    },
                    {
                        "source": "version",
                        "code": 103,
                        "value": "test",
                        "error": "Value must be an integer and range of the value must be from 1 to 2.",
                        "section": "general",
                    },
                ],
            )

        with self.subTest("update_interface_1"):
            x = self.put_data(
                f"{self.url_int}/int1",
                {
                    "ifname": "eth100",
                },
            )
            x.assert_code(422)

        with self.subTest("update_filter_1"):
            x = self.put_data(
                f"{self.url_fil}/filter1",
                {
                    "target": "int3",
                    "net": "network",
                    "direction": "straight",
                },
            )
            self.assertListEqual(
                x.json["errors"],
                [
                    {
                        "source": "net",
                        "code": 103,
                        "value": "network",
                        "error": 'IPv4 address with netmask or "any" is accepted.',
                        "section": "filter1",
                    },
                    {
                        "source": "direction",
                        "code": 103,
                        "value": "straight",
                        "error": "Must be one of the following values [in, out].",
                        "section": "filter1",
                    },
                    {
                        "source": "target",
                        "code": 103,
                        "value": "int3",
                        "error": "Must be one of the following values [int1, int2].",
                        "section": "filter1",
                    },
                ],
            )

        with self.subTest("delete_filter_1"):
            x = self.delete(f"{self.url_fil}/filter1")
            x.assert_data({"id": "filter1"}, 200)

        with self.subTest("delete_filter_2"):
            x = self.delete(f"{self.url_fil}/filter2")
            x.assert_data({"id": "filter2"}, 200)

        with self.subTest("delete_interface_1"):
            x = self.delete(f"{self.url_int}/int1")
            x.assert_data({"id": "int1"}, 200)

        with self.subTest("delete_interface_2"):
            x = self.delete(f"{self.url_int}/int2")
            x.assert_data({"id": "int2"}, 200)

        with self.subTest("disable_instance"):
            x = self.put_data(
                self.url,
                {
                    "enabled": "0",
                    "neighbors": [],
                    "enabled_vty": "0",
                    "version": "2",
                },
            )
            x.assert_data(
                {
                    "enabled": "0",
                    "enabled_vty": "0",
                    "version": "2",
                    "debug" : "0",
                },
                200,
            )
            self.check_firewall(False)

        with self.subTest("upload_config"):
            x = self.send_file(
                "/rip/global",
                "./files/rip/rip.conf",
                None,
                {"option": "ripd_custom_conf"},
            )
            x.assert_code(200)

        with self.subTest("update_global_3"):
            x = self.put_data(
                self.url,
                {
                    "enabled": "1",
                    "ripd_custom_conf": "/etc/vuci-uploads/cbid.rip.rip.ripd_custom_confrip.conf",
                },
            )
            x.assert_code(200)
            self.check_firewall(True)

        with self.subTest("get_status_2"):
            time.sleep(30)
            x = self.get(self.url_status)
            x.assert_code(200)
            self.assertEqual(x.resp.json()["data"]["sources"]["Interface"], "eth1")
            self.assertEqual(x.resp.json()["data"]["route1"]["Metric"], "1")

        with self.subTest("disable_instance_2"):
            x = self.put_data(
                self.url,
                {
                    "enabled": "0",
                    "ripd_custom_conf": "",
                },
            )
            x.assert_data(
                {
                    "enabled": "0",
                    "enabled_vty": "0",
                    "version": "2",
                    "debug" : "0",
                },
                200,
            )
            self.check_firewall(False)
