import sys
import time

sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import get_ssh


class PPTP(util.WrapTest):
    url_s = "/pptp/server/config"
    url_c = "/pptp/client/config"
    url_u = "/pptp/users/config"
    url_fw = "/firewall/zones/config"

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
                if section["name"] == "pptp":
                    found = True
            if enabled and not found:
                self.fail("Firewall zone is not created")
            if not enabled and found:
                self.fail("Firewall zone exist after instance delete")

    def test_instance(self):
        # server
        with self.subTest("create_server"):
            x = self.post_data(self.url_s, {})
            sids = x.resp.json()["data"]["id"]
            x.assert_data(
                {
                    ".type": "service",
                    "limit": "192.168.0.30",
                    "localip": "192.168.0.1",
                    "start": "192.168.0.20",
                    "id": sids,
                    "mppe": "stateless",
                    "mppe_encryption": ["128"],
                    "description": "pptp1",
                    "pptp_options": [
                        "proxyarp",
                        "encounter",
                        "auth",
                        "lcp-echo-failure 3",
                        "lcp-echo-interval 60",
                        "default-asyncmap",
                        "mtu 1482",
                        "mru 1482",
                        "nobsdcomp",
                        "nodeflate",
                        "require-mschap-v2",
                        "refuse-chap",
                        "refuse-mschap",
                        "refuse-eap",
                        "refuse-pap",
                        "logfd 2",
                    ],
                },
                201,
            )

        with self.subTest("create_user1"):
            x = self.post_data(f"/pptp/server/{sids}/users/config", {})
            sidu1 = x.resp.json()["data"]["id"]
            x.assert_data({".type": "login", "id": "1"}, 201)

        with self.subTest("create_user2"):
            x = self.post_data(
                f"/pptp/server/{sids}/users/config",
                {"username": "user2", "password": "bbbb", "remoteip": "192.168.0.26"},
            )
            sidu2 = x.resp.json()["data"]["id"]
            x.assert_data(
                {
                    "username": "user2",
                    ".type": "login",
                    "password": "bbbb",
                    "remoteip": "192.168.0.26",
                    "id": "2",
                },
                201,
            )

        with self.subTest("update_user1"):
            x = self.put_data(
                f"/pptp/server/{sids}/users/config/{sidu1}",
                {
                    "username": "user1",
                    "password": "aaaa",
                    "remoteip": "192.168.0.25",
                },
            )
            x.assert_code(200)

        with self.subTest("update_server"):
            x = self.put_data(
                f"{self.url_s}/{sids}",
                {"enabled": "1"},
            )
            x.assert_code(200)
            self.check_firewall(True)

        # client
        with self.subTest("create_client1"):
            x = self.post_data(self.url_c, {"id": "cli1"})
            sidc1 = x.resp.json()["data"]["id"]
            x.assert_data(
                {
                    "enabled": "0",
                    ".type": "interface",
                    "id": "cli1",
                    "defaultroute": "0",
                    "mppe": "stateless",
                    "mppe_encryption": ["128"],
                    "description": "pptp2",
                    "pptp_options": [
                        "refuse-pap",
                        "refuse-eap",
                        "refuse-chap",
                        "refuse-mschap",
                        "noipdefault",
                        "noauth",
                        "nobsdcomp",
                        "nodeflate",
                        "idle 0",
                        "maxfail 0",
                    ],
                },
                201,
            )

        with self.subTest("update_client1"):
            time.sleep(5)
            x = self.put_data(
                f"{self.url_c}/{sidc1}",
                {
                    "enabled": "1",
                    "server": "127.0.0.1",
                    "username": "user1",
                    "password": "aaaa",
                },
            )
            x.assert_data(
                {
                    "enabled": "1",
                    "id": "cli1",
                    "defaultroute": "0",
                    "password": "aaaa",
                    "username": "user1",
                    ".type": "interface",
                    "server": "127.0.0.1",
                    "mppe": "stateless",
                    "mppe_encryption": ["128"],
                    "description": "pptp2",
                    "pptp_options": [
                        "refuse-pap",
                        "refuse-eap",
                        "refuse-chap",
                        "refuse-mschap",
                        "noipdefault",
                        "noauth",
                        "nobsdcomp",
                        "nodeflate",
                        "idle 0",
                        "maxfail 0",
                    ],
                },
                200,
            )

        with self.subTest("check_connection"):
            time.sleep(8)
            ip = self.ssh.send_cmd(
                "ubus call network.interface.cli1 status | jsonfilter -e '@[\"ipv4-address\"][0].address'"
            )
            if ip.strip() != "192.168.0.25":
                self.fail("Connection failed")

        with self.subTest("update_server_2"):
            x = self.put_data(f"{self.url_s}/{sids}", {"description": ""})
            x.assert_error("description", "Option can not be empty", 103)

        with self.subTest("create_client2"):
            x = self.post_data(self.url_c, {"id": "cli2"})
            sidc2 = x.resp.json()["data"]["id"]
            x.assert_code(201)

        with self.subTest("update_client2"):
            x = self.put_data(f"{self.url_c}/{sidc2}", {"description": ""})
            x.assert_error("description", "Option can not be empty", 103)

        with self.subTest("create_server2"):
            x = self.post_data(self.url_s, {"id": "srv2"})
            self.assertEqual(
                {"code": 106, "error": "Only 1 PPTP server instance is allowed"},
                x.resp.json()["errors"][0],
            )

        with self.subTest("disable_server"):
            x = self.put_data(
                f"{self.url_s}/{sids}",
                {"enabled": "0"},
            )
            x.assert_code(200)

        with self.subTest("disable_client1"):
            x = self.put_data(
                f"{self.url_c}/{sidc1}",
                {"enabled": "0"},
            )
            x.assert_code(200)

        # del sec
        with self.subTest("delete_user2"):
            x = self.delete(f"/pptp/server/{sids}/users/config/{sidu2}")
            x.assert_code(200)
            x.assert_data({"id": sidu2})

        with self.subTest("delete_user1"):
            x = self.delete(f"/pptp/server/{sids}/users/config/{sidu1}")
            x.assert_code(200)
            x.assert_data({"id": sidu1})

        with self.subTest("delete_server"):
            x = self.delete(f"{self.url_s}/{sids}")
            x.assert_code(200)
            x.assert_data({"id": sids})

        with self.subTest("delete_client1"):
            x = self.delete(f"{self.url_c}/{sidc1}")
            x.assert_code(200)
            x.assert_data({"id": sidc1})

        with self.subTest("delete_client2"):
            x = self.delete(f"{self.url_c}/{sidc2}")
            x.assert_code(200)
            x.assert_data({"id": sidc2})
            self.check_firewall(False)
