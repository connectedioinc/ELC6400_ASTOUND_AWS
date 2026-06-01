import utility_integration as util
import response_codes as codes
from utils.general_api import is_package_installed
import sys
sys.path.append("../../../../tests")

RC = codes.ResponseCodes


class test_mwan_policies(util.WrapTest):
    url = "/failover/policies/config"
    default_data = []
    sid = None

    def setUp(self):
        if not is_package_installed(self, "mwan"):
            self.skipTest("MWAN3 package is not installed")

    def test_mwan_policies_base_mwan_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()["data"]
            self.default_data = get_response
            self.assertEqual(2, len(get_response))
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, {
                "mode": "mwan"
            })
            self.sid = x.resp.json()["data"]["id"]
            x.assert_data({
                "id": self.sid,
                "name": self.sid,
                ".type": "policy"
            }, 201)
        with self.subTest("edit_configuration"):
            put_data = {
                ".type": "policy",
                "last_resort": "default",
                "use_member": ["wan_member_mwan"]
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["name"] = self.sid
            x.assert_data(put_data)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })

    def test_mwan_policies_base_balance_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()["data"]
            self.default_data = get_response
            self.assertEqual(2, len(get_response))
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, {
                "mode": "balance"
            })
            self.sid = x.resp.json()["data"]["id"]
            x.assert_data({
                "id": self.sid,
                "name": self.sid,
                ".type": "policy"
            }, 201)
        with self.subTest("edit_configuration"):
            put_data = {
                ".type": "policy",
                "last_resort": "blackhole",
                "use_member": ["wan_member_balance"]
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["name"] = self.sid
            x.assert_data(put_data)
        with self.subTest("edit_configuration_invalid_member"):
            member_name = "test_member"
            put_data = {
                ".type": "policy",
                "last_resort": "blackhole",
                "use_member": [member_name]
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            x.assert_error("Validation", "Provided member '"+ member_name +"' does not exist", 103)
        with self.subTest("edit_configuration_valid_member_duplicate_iface"):
            put_data = {
                ".type": "policy",
                "last_resort": "blackhole",
                "use_member": ["wan_member_balance", "wan_member_mwan"]
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            x.assert_error(
                "Validation", "Same member interface 'wan' cannot be used multiple times in the same policy", 103)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
