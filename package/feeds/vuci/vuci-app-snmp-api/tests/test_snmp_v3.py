import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import generate_require_error_messages
import response_codes as codes

RC = codes.ResponseCodes

class test_snmp_v3(WrapTest):
    url_v3 = "/snmp/users/config"

    def test_basic_crud(self):
        self.crud_test(self.url_v3, {
            "authtype": "SHA",
            ".type": "user",
            "username": "blatata",
            "mibaccess": "test",
            "privpass": "testastt",
            "enabled": "0",
            "authpass": "assdavvv",
            "seclevel": "auth",
            "rights": "ro",
            "privtype": "DES"
        },
        {
            "username": "blatata",
            "authtype": "MD5",
            ".type": "user",
            "mibaccess": "test",
            "privpass": "testastt",
            "enabled": "0",
            "authpass": "assdavvv",
            "seclevel": "priv",
            "rights": "rw",
            "privtype": "AES"
        })

    def test_common_username(self):
        x = self.post_data(self.url_v3,{
            "username": "blatataratata"
        })
        x.assert_code(201)
        sid = x.resp.json()["data"]["id"]
        x = self.post_data(self.url_v3,{
            "username": "blatataratata"
        })
        x.assert_error("username", "User 'blatataratata' already exists", RC.INVALID_OPT.val())

        x = self.delete(f"{self.url_v3}/{sid}")
        x.assert_data({
            "id": sid
        })

    def test_enable_require_depedency(self):
        x = self.post_data(self.url_v3,{
            "username": "blatataratata"
        })
        x.assert_code(201)
        sid = x.resp.json()["data"]["id"]

        with self.subTest("check dependency"): 
            x = self.put_data(f"{self.url_v3}/{sid}",{
                "enabled": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["rights", "seclevel"]))
            x = self.put_data(f"{self.url_v3}/{sid}",{
                "enabled": "1",
                "seclevel": "auth"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["rights", "authtype", "authpass"]))
            x = self.put_data(f"{self.url_v3}/{sid}",{
                "enabled": "1",
                "seclevel": "priv"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["rights", "authtype", "authpass", "privtype", "privpass"]))

        x = self.delete(f"{self.url_v3}/{sid}")
        x.assert_data({
            "id": sid
        })
        