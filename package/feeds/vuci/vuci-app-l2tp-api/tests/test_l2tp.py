import sys
import time

sys.path.append("../../../../tests")
import utility_integration as util


class L2TP(util.WrapTest):
    url_s = "/l2tp/server/config"
    url_c = "/l2tp/client/config"
    url_u = "/l2tp/users/config"
    url_status = "/l2tp/status"
    url_fw = "/firewall/zones/config"
    url_tr = "/firewall/traffic_rules/config"

    def check_firewall(self, enabled):
        with self.subTest("check_firewall_zone"):
            x = self.get(self.url_fw)
            found = False
            for section in x.resp.json()["data"]:
                if section["name"] == "l2tp":
                    found = True
            if enabled and not found:
                self.fail("Firewall zone is not created")
            if not enabled and found:
                self.fail("Firewall zone exist after instance delete")

    def check_traffic_rule(self):
        with self.subTest("check_traffic_rule"):
            x = self.get(self.url_tr)
            rule_disabled = False
            rule_exist = False
            for section in x.resp.json()["data"]:
                if section["name"] == "Allow-l2tp-traffic":
                    rule_exist = True
                    if section["enabled"] == "0":
                        rule_disabled = True
            if not rule_exist:
                self.fail("Traffic rule is not created")
            if not rule_disabled:
                self.fail("Traffic rule is enabled, but should be disabled")

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
                    "use_ipv6": "0",
                    "id": sids,
                    "use_ipv6": "0",
                    "description": "l2tp1",
                    "pppd_options": [
                        "noauth",
                        "logfd 2",
                        "noccp",
                        "novj",
                        "novjccomp",
                        "nopcomp",
                        "noaccomp",
                        "mtu 1400",
                        "mru 1400",
                        "lcp-echo-interval 20",
                        "lcp-echo-failure 5",
                        "connect-delay 5000",
                        "nodefaultroute",
                        "noipdefault",
                        "proxyarp",
                    ],
                },
                201,
            )

        with self.subTest("create_user1"):
            x = self.post_data(self.url_u, {})
            sidu1 = x.resp.json()["data"]["id"]
            x.assert_data({".type": "login"}, 201, {"id"})

        with self.subTest("create_user2"):
            x = self.post_data(
                self.url_u,
                {
                    "username": "user#2",
                    "password": "bb#bb!",
                    "remoteip": "192.168.0.26",
                },
            )
            sidu2 = x.resp.json()["data"]["id"]
            x.assert_data(
                {
                    "username": "user#2",
                    ".type": "login",
                    "password": "bb#bb!",
                    "remoteip": "192.168.0.26",
                },
                201,
                {"id"},
            )

        with self.subTest("update_user1"):
            x = self.put_data(
                f"{self.url_u}/{sidu1}",
                {
                    "username": "user#1",
                    "password": "aa#aa!",
                    "remoteip": "192.168.0.25",
                },
            )
            x.assert_code(200)

        with self.subTest("update_server"):
            x = self.put_data(
                f"{self.url_s}/{sids}",
                {
                    "pppd_options": ["debug"],
                    "enabled": "1",
                    "chap": "1",
                    "auth": "cc@cc&",
                },
            )
            x.assert_code(200)
            self.check_firewall(True)

        with self.subTest("create_ipsec_instance"):
            x = self.post_data(
                "/ipsec/config",
                {"id": "l2tp_ipsec"},
            )
            x.assert_code(201)

        with self.subTest("update_ipsec_instance"):
            x = self.put_data(
                "/ipsec/config/l2tp_ipsec",
                {"bind_to": sids, "type": "transport"},
            )
            x.assert_code(200)

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
                    "description": "l2tp2",
                    "pppd_options": [
                        "usepeerdns",
                        "nodefaultroute",
                        "lcp-max-terminate 0",
                    ],
                },
                201,
            )

        with self.subTest("update_client1"):
            time.sleep(3)
            x = self.put_data(
                f"{self.url_c}/{sidc1}",
                {
                    "enabled": "1",
                    "server": "127.0.0.1",
                    "username": "user#1",
                    "password": "aa#aa!",
                    "pppd_options": ["debug"],
                    "auth": "cc@cc&",
                },
            )
            x.assert_data(
                {
                    "enabled": "1",
                    "pppd_options": ["debug"],
                    "id": "cli1",
                    "defaultroute": "0",
                    "password": "aa#aa!",
                    "username": "user#1",
                    ".type": "interface",
                    "server": "127.0.0.1",
                    "auth": "cc@cc&",
                    "description": "l2tp2",
                },
                200,
            )

        with self.subTest("check_status"):
            time.sleep(5)
            x = self.get(self.url_status)
            self.assertEqual(x.resp.json()["data"][sids]["status"], "2")
            self.assertEqual(x.resp.json()["data"][sids]["clients_all"], 2)

        with self.subTest("update_server_2"):
            x = self.put_data(f"{self.url_s}/{sids}", {"use_ipv6": "1"})
            x.assert_code(200)

        with self.subTest("update_client1_2"):
            time.sleep(3)
            x = self.put_data(f"{self.url_c}/{sidc1}", {"server": "::1"})
            x.assert_data(
                {
                    "enabled": "1",
                    "pppd_options": ["debug"],
                    "id": "cli1",
                    "defaultroute": "0",
                    "password": "aa#aa!",
                    "username": "user#1",
                    ".type": "interface",
                    "server": "::1",
                    "auth": "cc@cc&",
                    "description": "l2tp2",
                },
                200,
            )

        with self.subTest("check_status_2"):
            time.sleep(5)
            x = self.get(self.url_status)
            self.assertEqual(x.resp.json()["data"][sids]["status"], "2")
            self.assertEqual(x.resp.json()["data"][sids]["clients_all"], 2)

        with self.subTest("update_server_3"):
            x = self.put_data(f"{self.url_s}/{sids}", {"port": "1702"})
            x.assert_code(200)

        with self.subTest("update_server_4"):
            x = self.put_data(f"{self.url_s}/{sids}", {"description": ""})
            x.assert_error("description", "Option can not be empty", 103)

        with self.subTest("update_client1_3"):
            time.sleep(3)
            x = self.put_data(f"{self.url_c}/{sidc1}", {"server": "[::1]:1702"})
            x.assert_data(
                {
                    "enabled": "1",
                    "pppd_options": ["debug"],
                    "id": "cli1",
                    "defaultroute": "0",
                    "password": "aa#aa!",
                    "username": "user#1",
                    ".type": "interface",
                    "server": "[::1]:1702",
                    "auth": "cc@cc&",
                    "description": "l2tp2",
                },
                200,
            )

        with self.subTest("check_status_3"):
            time.sleep(5)
            x = self.get(self.url_status)
            self.assertEqual(x.resp.json()["data"][sids]["status"], "2")
            self.assertEqual(x.resp.json()["data"][sids]["clients_all"], 2)

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
                {"code": 106, "error": "Only 1 L2TP server instance is allowed"},
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
            x = self.delete(f"{self.url_u}/{sidu2}")
            x.assert_code(200)
            x.assert_data({"id": sidu2})

        with self.subTest("delete_user1"):
            x = self.delete(f"{self.url_u}/{sidu1}")
            x.assert_code(200)
            x.assert_data({"id": sidu1})

        with self.subTest("delete_server"):
            x = self.delete(f"{self.url_s}/{sids}")
            x.assert_code(200)
            x.assert_data({"id": sids})

        with self.subTest("delete_ipsec_instance"):
            x = self.delete("/ipsec/config/l2tp_ipsec")
            x.assert_code(200)

        with self.subTest("delete_client1"):
            x = self.delete(f"{self.url_c}/{sidc1}")
            x.assert_code(200)
            x.assert_data({"id": sidc1})

        with self.subTest("delete_client2"):
            x = self.delete(f"{self.url_c}/{sidc2}")
            x.assert_code(200)
            x.assert_data({"id": sidc2})
            self.check_firewall(False)
