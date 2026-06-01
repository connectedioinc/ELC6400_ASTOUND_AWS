import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import generate_require_error_messages, get_modems
from utils.mobile_utilities import create_phone_group, delete_phone_group, create_email_user, delete_email_user
import response_codes as codes

RC = codes.ResponseCodes

class SMSFowarding(WrapTest):
    url_to_htpp = "/sms_gateway/sms_forwarding/to_http/config"
    url_to_sms = "/sms_gateway/sms_forwarding/to_sms/config"
    url_to_smtp = "/sms_gateway/sms_forwarding/to_smtp/config"
    email_user_name = "test"
    phone_group_name = "test"
    wrong_name = "blatatataratatata"

# -----------------------------------SMS FOWARDING TO HTPP-----------------------------------
    def test_to_htpp(self):
        x = self.get(self.url_to_htpp)
        x.assert_code(200)
        sid = x.resp.json()["data"][0]["id"]

        with self.subTest("Clear sms fowarding to htpp config"):
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "extra_name1": "",
                "extra_value1": "",
                "message_name": "",
                "message_encode_b64": "",
                "number_name": "",
                "verify_cert": "",
                "extra_name2": "",
                "extra_value2": "",
                "url": "",
                "enabled": "",
                "delete_sms": "",
                "tel": [],
                "method": "",
                "mode": "",
                "sender_num": "",
                "every_sms": "",
                "group": ""
            })
            x.assert_code(200)

        with self.subTest("check dependecy"):
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "enabled": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_http", ["verify_cert", "method", "url", "message_name", "mode"]))
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "enabled": "1",
                "sender_num": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_http", ["verify_cert", "method", "url", "message_name", "mode", "number_name"]))
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "enabled": "1",
                "mode": "list_number"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_http", ["verify_cert", "method", "url", "message_name", "tel"]))
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "enabled": "1",
                "mode": "user_group"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_http", ["verify_cert", "method", "url", "message_name", "group"]))

        with self.subTest("Create phone group"):
            phone_group_sid, _ = create_phone_group(self, self.email_user_name)

        with self.subTest("Check with phone group"):
            x = self.put_data(self.url_to_htpp + "/" + sid, {
                "mode": "user_group",
                "group": self.email_user_name
            })
            x.assert_data({
                "group": "test",
                "mode": "user_group",
                "id": sid,
                ".type": "fwd"
            }, 200)
            x = self.put_data(self.url_to_htpp + "/" + sid, {
                "mode": "everyone",
                "group": ""
            })

        with self.subTest("Delete phone group"):
            delete_phone_group(self, phone_group_sid)
        
        with self.subTest("Check with wrong phone group"):
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "mode": "user_group",
                "group": self.wrong_name
            })
            x.assert_error("group", "user group not found", RC.INVALID_OPT.val())

        with self.subTest("Check if delete 'tel', after 'mode' option change"):
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "mode": "list_number",
                "tel": ["+37066666666"]
            })
            x.assert_code(200)
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "mode": "everyone"
            })
            x.assert_data({
                "mode": "everyone",
                "id": sid,
                ".type": "fwd"
			})

        with self.subTest("Update with all options"):
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "extra_name1": "test,test",
                "extra_value1": "888",
                "message_name": "test",
                "message_encode_b64": "1",
                "number_name": "test",
                "verify_cert": "ignore",
                "extra_name2": "test2,test2",
                "extra_value2": "420",
                "url": "www.example.com",
                "enabled": "0",
                ".type": "fwd",
                "delete_sms": "0",
                "tel": ["+370666666666"],
                "method": "get",
                "mode": "everyone",
                "sender_num": "1",
                "every_sms": "1",
                "group": ""
            })
            x.assert_data({
				"extra_name1": "test,test",
                "extra_value1": "888",
                "message_name": "test",
                "message_encode_b64": "1",
                "number_name": "test",
                "verify_cert": "ignore",
                "extra_name2": "test2,test2",
                "extra_value2": "420",
                "url": "www.example.com",
                "enabled": "0",
                ".type": "fwd",
                "delete_sms": "0",
                "tel": ["+370666666666"],
                "method": "get",
                "mode": "everyone",
                "sender_num": "1",
                "every_sms": "1",
                "id": sid
			})

        with self.subTest("Clear sms fowarding to htpp config"):
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "extra_name1": "",
                "extra_value1": "",
                "message_name": "",
                "message_encode_b64": "",
                "number_name": "",
                "verify_cert": "",
                "extra_name2": "",
                "extra_value2": "",
                "url": "",
                "enabled": "",
                ".type": "fwd",
                "delete_sms": "",
                "tel": [],
                "method": "",
                "mode": "",
                "sender_num": "",
                "every_sms": "",
                "group": ""
            })
            x.assert_code(200)

# -----------------------------------SMS FOWARDING TO SMS-----------------------------------
    def test_to_sms(self):
        x = self.get(self.url_to_sms)
        x.assert_code(200)
        sid = x.resp.json()["data"][0]["id"]

        with self.subTest("Clear sms fowarding to sms config"):
            x = self.put_data(f'{self.url_to_sms}/{sid}', {
                "enabled": "",
                "every_sms": "",
                "delete_sms": "",
                "sender_num": "",
                "send_modem_id": "",
                "mode": "",
                "tel": "",
                "group": "",
                "fwd_number": ""
            })
            x.assert_code(200)

        with self.subTest("Check dependecy"):
            modems = get_modems(self)
            if len(modems) > 1:
                x = self.put_data(f'{self.url_to_sms}/{sid}', {
                    "enabled": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_sms", ["mode", "fwd_number", "send_modem_id"]))
                x = self.put_data(f'{self.url_to_sms}/{sid}', {
                    "enabled": "1",
                    "mode": "list_number"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_sms", ["fwd_number", "tel", "send_modem_id"]))
                x = self.put_data(f'{self.url_to_sms}/{sid}', {
                    "enabled": "1",
                    "mode": "user_group"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_sms", ["fwd_number", "group", "send_modem_id"]))
            elif len(modems) == 1:
                x = self.put_data(f'{self.url_to_sms}/{sid}', {
                    "enabled": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_sms", ["mode", "fwd_number"]))
                x = self.put_data(f'{self.url_to_sms}/{sid}', {
                    "enabled": "1",
                    "mode": "list_number"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_sms", ["fwd_number", "tel"]))
                x = self.put_data(f'{self.url_to_sms}/{sid}', {
                    "enabled": "1",
                    "mode": "user_group"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_sms", ["fwd_number", "group"]))

        with self.subTest("Create phone group"):
            phone_group_sid, _ = create_phone_group(self, self.phone_group_name)

        with self.subTest("Check with phone group"):
            x = self.put_data(f'{self.url_to_sms}/{sid}', {
                "mode": "user_group",
                "group": self.phone_group_name
            })
            x.assert_data({
                "group": self.phone_group_name,
                "mode": "user_group",
                "id": sid,
                ".type": "fwd"
            }, 200)
            x = self.put_data(f'{self.url_to_htpp}/{sid}', {
                "mode": "everyone",
                "group": ""
            })

        with self.subTest("Check with wrong phone group"):
            x = self.put_data(f'{self.url_to_sms}/{sid}', {
                "mode": "user_group",
                "group": self.wrong_name
            })
            x.assert_error("group", "user group not found", RC.INVALID_OPT.val())

        with self.subTest("Delete phone group"):
            delete_phone_group(self, phone_group_sid)

        with self.subTest("Update with all options"):
            x = self.put_data(f'{self.url_to_sms}/{sid}', {
                "enabled": "0",
                "every_sms": "1",
                "delete_sms": "1",
                "sender_num": "1",
                "send_modem_id": "",
                "mode": "everyone",
                "group": "",
                ".type": "fwd",
                "fwd_number": ["+3706666666"]
            })
            x.assert_data({
				"enabled": "0",
                "every_sms": "1",
                "delete_sms": "1",
                "sender_num": "1",
                "mode": "everyone",
                ".type": "fwd",
                "fwd_number": ["+3706666666"],
                "id": sid
			})

        with self.subTest("Clear sms fowarding to sms config"):
            x = self.put_data(f'{self.url_to_sms}/{sid}', {
                "enabled": "",
                "every_sms": "",
                "delete_sms": "",
                "sender_num": "",
                "send_modem_id": "",
                "mode": "",
                "tel": "",
                "group": "",
                ".type": "fwd",
                "fwd_number": ""
            })

# -----------------------------------SMS FOWARDING TO SMTP-----------------------------------
    def test_to_smtp(self):
        x = self.get(self.url_to_smtp)
        x.assert_code(200)
        sid = x.resp.json()["data"][0]["id"]

        with self.subTest("Clear sms fowarding to smtp config"):
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "enabled": "",
                "every_sms": "",
                "delete_sms": "",
                "sender_num": "",
                "subject": "",
                "email_name": "",
                "recipemail": "",
                "mode": "",
                "tel": "",
                "group": ""
            })
            x.assert_code(200)

        with self.subTest("check dependecy"):
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "enabled": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_smtp", ["mode", "subject", "email_name", "recipemail"]))
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "enabled": "1",
                "mode": "list_number"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_smtp", ["subject", "email_name", "recipemail", "tel"]))
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "enabled": "1",
                "mode": "user_group"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "to_smtp", ["subject", "email_name", "recipemail", "group"]))

        with self.subTest("Create email user"):
            email_user_sid, _ = create_email_user(self, self.email_user_name)

        with self.subTest("Check email user"):
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "email_name": self.email_user_name
            })
            x.assert_code(200)

        with self.subTest("Check with wrong email user"):
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "email_name": self.wrong_name
            })
            x.assert_error("email_name", "user group not found", RC.INVALID_OPT.val())

        with self.subTest("Clear 'email_user' option"):
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "email_name": ""
            })

        with self.subTest("Delete email user"):
            delete_email_user(self, email_user_sid)

        with self.subTest("Create phone group"):
            phone_group_sid, _ = create_phone_group(self, self.phone_group_name)

        with self.subTest("Check with phone group"):
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "mode": "user_group",
                "group": self.phone_group_name
            })
            x.assert_data({
                "group": self.phone_group_name,
                "mode": "user_group",
                "id": sid,
                ".type": "fwd"
            }, 200)

        with self.subTest("Check with wrong phone group"):
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "mode": "user_group",
                "group": self.wrong_name
            })
            x.assert_error("group", "user group not found", RC.INVALID_OPT.val())

        with self.subTest("Delete phone group"):
            delete_phone_group(self, phone_group_sid)

        with self.subTest("Update with all options"):
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "enabled": "0",
                "every_sms": "1",
                "delete_sms": "1",
                "sender_num": "1",
                "subject": "Test",
                "email_name": "",
                "recipemail": ["test@test.com"],
                "mode": "everyone",
                "tel": "",
                ".type": "fwd",
                "group": ""
            })
            x.assert_data({
				"enabled": "0",
                "every_sms": "1",
                "delete_sms": "1",
                "sender_num": "1",
                "subject": "Test",
                "recipemail": ["test@test.com"],
                "mode": "everyone",
                ".type": "fwd",
                "id": sid
			})

        with self.subTest("Clear sms fowarding to smtp config"):
            x = self.put_data(f'{self.url_to_smtp}/{sid}', {
                "enabled": "",
                "every_sms": "",
                "delete_sms": "",
                "sender_num": "",
                "subject": "",
                "email_name": "",
                "recipemail": "",
                "mode": "",
                "tel": "",
                ".type": "fwd",
                "group": ""
            })
            x.assert_code(200)




        