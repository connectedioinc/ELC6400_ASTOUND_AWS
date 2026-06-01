import sys

from utils.ssh import open_ssh_connection
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import get_modems, generate_require_error_messages
import response_codes as codes

RC = codes.ResponseCodes

class SMSGateway(WrapTest):
    url_auto_reply = "/sms_gateway/auto_reply/config"
    url_email_to_sms = "/sms_gateway/email_to_sms/config"
    phone_group_name = "test"
    wrong_name = "rampampam"
    modems = []

    def test_email_to_sms(self):
        x = self.get(self.url_email_to_sms)
        x.assert_code(200)
        sid = x.resp.json()["data"][0]["id"]

        if len(self.modems) == 0:
            self.modems.extend(get_modems(self))

        with self.subTest("Check 'modem_id' option"):
            if len(self.modems) > 1:
                for modem in self.modems:
                    x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                        "modem_id": modem["id"]
                    })
                    x.assert_code(200)
                x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                    "modem_id": ""
                })
                x.assert_code(200)
            elif len(self.modems) == 1:
                x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                    "modem_id": self.modems[0]["id"]
                })
                x.assert_error("modem_id", "modem_id can only be set if device has more than one modem", RC.INVALID_OPT.val())

        with self.subTest("Check all options"):
            x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                "enabled": "0",
                "host": "www.example.com",
                "port": "65",
                "username": "test",
                "password": "test",
                "ssl": "0",
                "ssl_verify": "0",
                "limit": "5",
                "time": "min",
                "min": "1",
                "hour": "1",
                "day": "1"
            })
            x.assert_code(200)

        with self.subTest("Clear config"):
            x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                "enabled": "",
                "host": "",
                "port": "",
                "username": "",
                "password": "",
                "ssl": "",
                "ssl_verify": "",
                "limit": "",
                "time": "",
                "min": "",
                "hour": "",
                "day": "",
                "modem_id": ""
            })
            x.assert_code(200)

        with self.subTest("check dependecy"):
            if len(self.modems) > 1:
                x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                    "enabled": "1",
                    "time": "min"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["password", "host", "port", "username", "min", "modem_id"]))
                x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                    "enabled": "1",
                    "time": "hour"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["password", "host", "port", "username", "hour", "modem_id"]))
                x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                    "enabled": "1",
                    "time": "day"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["password", "host", "port", "username", "day", "modem_id"]))
            elif len(self.modems) == 1:
                x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                    "enabled": "1",
                    "time": "min"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["password", "host", "port", "username", "min"]))
                x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                    "enabled": "1",
                    "time": "hour"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["password", "host", "port", "username", "hour"]))
                x = self.put_data(f'{self.url_email_to_sms}/{sid}', {
                    "enabled": "1",
                    "time": "day"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["password", "host", "port", "username", "day"]))
    def test_email_to_sms_segfault_does_not_occur(self):
        x = self.get(self.url_email_to_sms) # for auto skip

        with open_ssh_connection() as ssh:
            for i in range(10):
                self.assertNotIn("Segmentation fault", ssh.send_cmd("email_to_sms"))
