import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.ssh import open_ssh_connection, is_process_running, is_process_stopped
from utils.general_api import get_modems, generate_require_error_messages
import response_codes as codes

RC = codes.ResponseCodes

class SMPP(WrapTest):
    url = "/smpp/config/smpp"

    def test_basic_update(self):
        modems = get_modems(self)
        if len(modems) > 1:
            x = self.put_data(self.url, {
                "enabled": "0",
                "username": "usr",
                "password": "pswd",
                "port": "420",
                'modem': '3-1',
                "device_files": "",
                "use_tls_ssl": "0",
                "tls_ciphers": "",
                "tls_crt": "",
                "tls_key": ""
            }).assert_data({
                "id": "smpp",
                ".type": "smpp",
                'modem': '3-1',
                "enabled": "0",
                "username": "usr",
                "password": "pswd",
                "port": "420",
                "use_tls_ssl": "0"
            })
        elif len(modems) == 1:
            x = self.put_data(self.url, {
                "enabled": "0",
                "username": "usr",
                "password": "pswd",
                "port": "420",
                "device_files": "",
                "use_tls_ssl": "0",
                "tls_ciphers": "",
                "tls_crt": "",
                "tls_key": ""
            }).assert_data({
                "id": "smpp",
                ".type": "smpp",
                "enabled": "0",
                "username": "usr",
                "password": "pswd",
                "port": "420",
                "use_tls_ssl": "0"
            })

    def test_check_process(self):
        modems = get_modems(self)
        self.put_data(self.url, {
            "enabled": "0",
        }).assert_code(200)

        with open_ssh_connection() as ssh:
            self.assertTrue(is_process_stopped(ssh, "smppd"), "Expected 'smppd' not to be running")

            if len(modems) > 1:
                x = self.put_data(self.url, {
                    "enabled": "1",
                    "username": "usr",
                    "password": "pswd",
                    "port": "420",
                    "modem": modems[0]["id"],
                    "use_tls_ssl": "0",
                }).assert_code(200)
                self.assertTrue(is_process_running(ssh, "smppd"), "Expected 'smppd' to be running")
            elif len(modems) == 1:
                x = self.put_data(self.url, {
                    "enabled": "1",
                    "username": "usr",
                    "password": "pswd",
                    "port": "420",
                    "use_tls_ssl": "0",
                }).assert_code(200)
                self.assertTrue(is_process_running(ssh, "smppd"), "Expected 'smppd' to be running")

    def test_modem_option(self):
        modems = get_modems(self)

        if len(modems) > 1:
            for modem in modems:
                x = self.put_data(self.url, {
                    "enabled": "0",
                    "username": "usr",
                    "password": "pswd",
                    "port": "420",
                    "modem": modem["id"]
                })
                x.assert_data({
                    "id": "smpp",
                    ".type": "smpp",
                    "enabled": "0",
                    "username": "usr",
                    "password": "pswd",
                    "port": "420",
                    "modem": modem["id"]
                }, 200)
            x = self.put_data(self.url, {
                "modem": ""
            })
            x.assert_code(200)
        elif len(modems) == 1:
            x = self.put_data(self.url, {
                "modem": modems[0]["id"],
            })
            x.assert_error("modem", "'modem' option is available only for devices with more than 1 modem.", RC.INVALID_OPT.val())

    def test_enable_require_depedency(self):
        modems = get_modems(self)
        with self.subTest("clear config"):
            if len(modems) > 1:
                x = self.put_data(self.url,{
                    "enabled": "",
                    "username": "",
                    "password": "",
                    "port": "",
                    "modem": "",
                    "use_tls_ssl": "",
                    "tls_ciphers": "",
                    "tls_crt": "",
                    "tls_key": ""
                }).assert_code(200)
            else:
                 x = self.put_data(self.url,{
                    "enabled": "",
                    "username": "",
                    "password": "",
                    "port": "",
                    "use_tls_ssl": "",
                    "tls_ciphers": "",
                    "tls_crt": "",
                    "tls_key": ""
                }).assert_code(200)

        with self.subTest("check depedency"):
            if len(modems) > 1:
                x = self.put_data(self.url,{
                    "enabled": "1",
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "smpp", ["username", "password", "port", "modem"]))
                x = self.put_data(self.url,{
                    "enabled": "1",
                    "use_tls_ssl": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "smpp", ["username", "password", "port", "modem", "tls_ciphers", "tls_crt", "tls_key"]))
            else:
                x = self.put_data(self.url,{
                    "enabled": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "smpp", ["username", "password", "port"]))
                x = self.put_data(self.url,{
                    "enabled": "1",
                    "use_tls_ssl": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "smpp", ["username", "password", "port", "tls_ciphers", "tls_crt", "tls_key"]))
