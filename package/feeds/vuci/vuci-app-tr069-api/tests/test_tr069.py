import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.ssh import open_ssh_connection, is_process_running, is_process_stopped
from utils.general_api import generate_require_error_messages

class TR069(WrapTest):
    url = "/tr069/config/cfg025cbc"
    firewall_url = "/firewall/traffic_rules/config"

    def test_basic_update(self):
        x = self.put_data(self.url, {
            "enabled": "0",
            ".type": "acs",
            "password": "easycwmp",
            "periodic_interval": "100",
            "username": "easycwmp",
            "periodic_enable": "0",
            "allow_ra": "0",
            "url": "http://192.168.1.110:8080/openacs/acs"
        })
        x.assert_data({
            "enabled": "0",
            ".type": "acs",
            "id": "cfg025cbc",
            "password": "easycwmp",
            "periodic_interval": "100",
            "username": "easycwmp",
            "periodic_enable": "0",
            "allow_ra": "0",
            "url": "http://192.168.1.110:8080/openacs/acs"
        })

    def test_check_firewall_rule(self):
        x = self.get(self.url) # used to skip the test if pkg not installed
        x.assert_code(200)

        with self.subTest("Enable Firewall rule"):
            x = self.put_data(self.url, {
                "enabled": "1",
                "allow_ra": "1",
            })
            x.assert_code(200)

        with self.subTest("Check firewall rule"):
            x = self.get(self.firewall_url)
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == "Allow_TR069_server_request":
                    found = True        
                    self.assertEqual(section['target'], "ACCEPT")
                    self.assertListEqual(section['proto'], ["tcp"])
                    self.assertListEqual(section['dest_port'], ["7547"])
                    self.assertEqual(section['enabled'], "1")

            if not found:
                self.fail("Firewall rule is not created")

        with self.subTest("Disable Firewall rule"):
            x = self.put_data(self.url, {
                "enabled": "0",
                "allow_ra": "0",
            })
            x.assert_code(200)

    def test_check_process(self):
        with open_ssh_connection() as ssh:
            with self.subTest(""): 
                x = self.put_data(self.url, {
                    "enabled": "0"
                }).assert_code(200)

            with self.subTest(""): 
                self.assertTrue(is_process_stopped(ssh, "easycwmpd"), "Expected 'easycwmpd' not to be running")

            with self.subTest(""): 
                x = self.put_data(self.url, {
                    "enabled": "1",
                    "password": "easycwmp",
                    "username": "easycwmp",
                    "url": "http://192.168.1.110:8080/openacs/acs",
                }).assert_code(200)

            with self.subTest(""): 
                self.assertTrue(is_process_running(ssh, "easycwmpd"), "Expected 'easycwmpd' to be running")

            with self.subTest(""): 
                x = self.put_data(self.url, {
                    "enabled": "0"
                }).assert_code(200)

    def test_enable_require_dependecy(self):
        with self.subTest("clear config"):
            self.put_data(self.url, {
                "enabled": "",
                "periodic_enable": "",
                "periodic_interval": "",
                "username": "",
                "password": "",
                "url": "",
                "allow_ra": "",
            }) .assert_code(200)

        with self.subTest("check dependecy"):
            x = self.put_data(self.url, {
                "enabled": "1",
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "cfg025cbc", ["password", "username", "url"]))
            x = self.put_data(self.url, {
                "enabled": "1",
                "periodic_enable": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "cfg025cbc", ["password", "username", "url", "periodic_interval"]))
        
        with self.subTest("clear config"):
            self.put_data(self.url, {
                "enabled": "",
                "periodic_enable": "",
                "periodic_interval": "",
                "username": "",
                "password": "",
                "url": "",
                "allow_ra": "",
            }).assert_code(200)