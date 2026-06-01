import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import delete_all

class test_email_relay(WrapTest):
    url = "/email_relay/config"
    firewall_url = "/firewall/traffic_rules/config"

    def setUp(self):
        delete_all(self, self.url)

    def test_basic_crud(self):
        self.crud_test(self.url, {
            "enabled": "0",
            "mode": "cmdline",
            "id": "test",
            "name": "test",
            ".type": "emailrelay"
        }, 
        {
            ".type": "emailrelay",
            "enabled": "0",
            "mode": "server",
            "name": "test2",
            "smtp_port": "110",
            "pop_port": "150",
            "pop_username": "username",
            "pop_password": "password",
            "remote_clients": "0",
            "address_verifier": "test",
            "domain": "domain.com",
            "anonymous": "1",
            "server_auth": "1",
            "server_username": "username",
            "server_password": "password"
        })

    def test_firewall_rule(self):
        sid = "test"
        config = {
                ".type": "emailrelay",
                "id": sid,
                "name": sid,
                "enabled": "0",
                "mode": "server",
                "smtp_port": "110",
                "pop_port": "150",
                "pop_username": "username",
                "pop_password": "password",
                "remote_clients": "0",
                "address_verifier": "test",
                "domain": "domain.com",
                "anonymous": "1",
                "server_auth": "1",
                "server_username": "username",
                "server_password": "password",
                "server_tls": "0",
                "verbose": "0"
        }

        with self.subTest("create_section"):
            x = self.post_data(self.url, config)
            x.assert_data(config, 201)

        with self.subTest("check_firewall"):
            x = self.get(self.firewall_url)
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == ("Emailrelay_" + sid):
                    found = True
                    self.assertEqual(section['enabled'], "0")
                    self.assertEqual(section['src'], "wan")
                    self.assertEqual(section['target'], "ACCEPT")
                    self.assertEqual(section['proto'], ["tcp"])
                    self.assertListEqual(section['dest_port'], [config["smtp_port"], config["pop_port"]])

            if not found:
                self.fail("Firewall rule is not created")
        with self.subTest("rename"):
            config["name"] = "test5"
            x = self.put_data(self.url + "/" + sid, {
                "name": "test5"
            })
            x.assert_data(config, 200) # rename success
        with self.subTest("check_firewall_renamed"):
            x = self.get(self.firewall_url)
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == ("Emailrelay_" + "test5"):
                    found = True
                    self.assertEqual(section['enabled'], "0")
                    self.assertEqual(section['src'], "wan")
                    self.assertEqual(section['target'], "ACCEPT")
                    self.assertEqual(section['proto'], ["tcp"])
                    self.assertListEqual(section['dest_port'], [config["smtp_port"], config["pop_port"]])

            if not found:
                self.fail("Firewall rule is not renamed")
        with self.subTest("restore_name"):
            x = self.put_data(self.url + "/" + sid, {
                "name": sid
            })
            config["name"] = sid
            x.assert_data(config, 200)

        with self.subTest("update_config"):
            config["smtp_port"] = "69"
            config["pop_port"] = "6969"
            x = self.put_data(self.url, [config])
            x.assert_data([config], 200)

        with self.subTest("check_firewall_after_port_update"):
            x = self.get(self.firewall_url)
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == ("Emailrelay_" + sid):
                    found = True
                    self.assertEqual(section['enabled'], "0")
                    self.assertEqual(section['src'], "wan")
                    self.assertEqual(section['target'], "ACCEPT")
                    self.assertEqual(section['proto'], ["tcp"])
                    self.assertListEqual(section['dest_port'], [config["smtp_port"], config["pop_port"]])         

            if not found:
                self.fail("Firewall rule is disappeared")

        with self.subTest("enable_config"):
            config["enabled"] = "1"
            config["remote_clients"] = "1"
            x = self.put_data(self.url, [config])
            x.assert_data([config], 200)

        with self.subTest("check_firewall_after_enable"):
            x = self.get(self.firewall_url)
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == ("Emailrelay_" + sid):
                    found = True
                    self.assertEqual(section['enabled'], "1")
                    self.assertEqual(section['src'], "wan")
                    self.assertEqual(section['target'], "ACCEPT")
                    self.assertEqual(section['proto'], ["tcp"])
                    self.assertListEqual(section['dest_port'], [config["smtp_port"], config["pop_port"]])         

            if not found:
                self.fail("Firewall rule is disappeared")

        with self.subTest("disable_config"):
            config["remote_clients"] = "0"
            x = self.put_data(self.url, [config])
            x.assert_data([config], 200)

        with self.subTest("check_firewall_after_disable"):
            x = self.get(self.firewall_url)
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == ("Emailrelay_" + sid):
                    found = True
                    self.assertEqual(section['enabled'], "0")
                    self.assertEqual(section['src'], "wan")
                    self.assertEqual(section['target'], "ACCEPT")
                    self.assertEqual(section['proto'], ["tcp"])
                    self.assertListEqual(section['dest_port'], [config["smtp_port"], config["pop_port"]])         

            if not found:
                self.fail("Firewall rule is disappeared")

        with self.subTest("delete_config"):
            config["remote_clients"] = "0"
            x = self.delete(self.url + "/" + sid)
            x.assert_data({
				"id": sid
			})

        with self.subTest("check_firewall_after_config_delete"):
            x = self.get(self.firewall_url)
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == ("Emailrelay_" + sid):
                    found = True 

            if found:
                self.fail("Fierwall rule is not deleted")

    def test_require_options(self):
        sid = "test"
        config = {
            ".type": "emailrelay",
            "id": sid,
            "enabled": "1",
            "mode": "server",
            "remote_clients": "0",
            "address_verifier": "test",
            "domain": "domain.com",
            "anonymous": "1",
            "server_auth": "1",
            "server_username": "username",
            "server_password": "password",
            "server_tls": "0"
        }

        with self.subTest("check_server_mode_require"):
            x = self.post_data(self.url, config)
            if not (x.resp.status_code == 422 and len(x.resp.json()["errors"]) == 4):
                self.assertFalse(x.resp.status_code, "Expected '422' HTTP code and four error messages")


        with self.subTest("check_proxy_mode_require"):
            config["mode"] = "proxy"
            x = self.post_data(self.url, config)
            if not (x.resp.status_code == 422 and len(x.resp.json()["errors"]) == 1):
                self.assertFalse(x.resp.status_code, "Expected '422' HTTP code and one error message")
