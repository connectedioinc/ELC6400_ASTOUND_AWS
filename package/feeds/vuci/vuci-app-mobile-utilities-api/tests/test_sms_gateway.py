import sys

sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import get_modems, generate_require_error_messages
from utils.mobile_utilities import create_phone_group, delete_phone_group
import response_codes as codes

RC = codes.ResponseCodes

class SMSGateway(WrapTest):
    url_auto_reply = "/sms_gateway/auto_reply/config"
    phone_group_name = "test"
    wrong_name = "rampampam"
    modems = []

    def test_auto_reply(self):
        x = self.get(self.url_auto_reply)
        x.assert_code(200)
        sid = x.resp.json()["data"][0]["id"]

        if len(self.modems) == 0:
            self.modems.extend(get_modems(self))

        with self.subTest("Check 'send_modem_id' option"):
            if len(self.modems) > 1:
                for modem in self.modems:
                    x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                        "send_modem_id": modem["id"]
                    })
                    x.assert_code(200)
                x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                    "send_modem_id": ""
                })
                x.assert_code(200)
            elif len(self.modems) == 1:
                x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                    "send_modem_id": self.modems[0]["id"]
                })
                x.assert_code(200)
        
        with self.subTest("Create phone group"):
            phone_group_sid, _ = create_phone_group(self, self.phone_group_name)

        with self.subTest("Check 'group' option"):
            x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                "mode": "user_group",
                "group": self.phone_group_name
            })
            x.assert_code(200)
            x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                "mode": "everyone",
                "group": ""
            })
            x.assert_code(200)

        with self.subTest("Delete phone group"):
            delete_phone_group(self, phone_group_sid)

        with self.subTest("Check with wrong phone group"):
            x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                "mode": "user_group",
                "group": self.wrong_name
            })
            x.assert_error("group", "user group not found", RC.INVALID_OPT.val())

        with self.subTest("Check if 'tel' option is deleted"):
            x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                "mode": "list_number",
                "tel": ["+3706666666666"]
            })
            x.assert_code(200)
            x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                "mode": "everyone"
            })
            x.assert_code(200)
            if "tel" in x.resp.json()["data"]:
                self.fail("'tel' option was not deleted")

        with self.subTest("Check endpoint with all options"):
            x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                "enabled": "0",
                "every_sms":"1",
                "delete_sms": "1",
                "mode": "everyone",
                "msg": "test test test"
            })

        with self.subTest("Clear config"):
            x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                "enabled": "",
                "every_sms":"",
                "delete_sms": "",
                "msg": ""
            })
            x.assert_code(200)

        with self.subTest("Check dependecy"):
            if len(self.modems) > 1:
                x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                    "enabled": "1",
                    "msg": "",
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["msg", "send_modem_id"]))
                x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                    "enabled": "1",
                    "mode":"list_number",
                    "msg": ""
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["msg", "tel", "send_modem_id"]))
                x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                    "enabled": "1",
                    "mode":"user_group"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["msg", "group", "send_modem_id"]))
            elif len(self.modems) == 1:
                x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                    "enabled": "1",
                    "mode":"list_number",
                    "msg": ""
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["msg", "tel"]))
                x = self.put_data(f'{self.url_auto_reply}/{sid}', {
                    "enabled": "1",
                    "mode":"user_group",
                    "msg": ""
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["msg", "group"]))
