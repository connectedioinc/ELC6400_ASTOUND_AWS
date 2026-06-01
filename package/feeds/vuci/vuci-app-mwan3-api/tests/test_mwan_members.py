import utility_integration as util
import response_codes as codes
from utils.general_api import is_package_installed
import sys
sys.path.append("../../../../tests")

RC = codes.ResponseCodes


class test_mwan_members(util.WrapTest):
    url = "/failover/members/config"
    default_data = []
    sid = "wan"
    mobile = None
    dual_sim = None
    dual_modem = None
    max_metric = 0

    def setUp(self):
        if not is_package_installed(self, "mwan"):
            self.skipTest("MWAN3 package is not installed")
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        self.mobile = self.has_mobile(board)
        self.dual_sim = self.has_dual_mobile_iface(board)

    def has_mobile(self, board):
        return board["hwinfo"]["mobile"]

    def has_dual_mobile_iface(self, board):
        return board["hwinfo"]["dual_sim"] or board["hwinfo"]["dual_modem"]

    def test_mwan_members_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()["data"]
            self.default_data = get_response
            res = 2
            if self.mobile and self.dual_sim:
                res = 6
            elif self.mobile:
                res = 4
            self.assertEqual(res, len(get_response))
        with self.subTest("edit_configuration_member_balance"):
            put_data = {
                ".type": "member",
                "weight": "99"
            }
            put_data["metric"] = str(len(self.default_data) // 2)
            x = self.put_data(self.url + "/" + self.sid +
                              "_member_balance", put_data)
            put_data["id"] = self.sid + "_member_balance"
            put_data["name"] = put_data["id"]
            put_data["interface"] = self.sid
            x.assert_data(put_data)
        with self.subTest("edit_configuration_member_mwan"):
            put_data = {
                ".type": "member",
                "metric": "1",
            }
            put_data["metric"] = str(len(self.default_data) // 2)
            x = self.put_data(self.url + "/" + self.sid +
                              "_member_mwan", put_data)
            put_data["id"] = self.sid + "_member_mwan"
            put_data["name"] = put_data["id"]
            put_data["interface"] = self.sid
            x.assert_data(put_data)
        with self.subTest("reset_configuration_member_balance"):
            default = self.default_data.copy()
            default_wan = next(
                d for d in default if d["id"] == self.sid + "_member_balance")
            del default_wan["id"]
            del default_wan["interface"]
            x = self.put_data(self.url + "/" + self.sid +
                              "_member_balance", default_wan)
            default_wan["id"] = self.sid + "_member_balance"
            default_wan["interface"] = self.sid
            x.assert_data(default_wan)
        with self.subTest("reset_configuration_member_mwan"):
            default = self.default_data.copy()
            default_wan = next(
                d for d in default if d["id"] == self.sid + "_member_mwan")
            del default_wan["id"]
            del default_wan["interface"]
            x = self.put_data(self.url + "/" + self.sid +
                              "_member_mwan", default_wan)
            default_wan["id"] = self.sid + "_member_mwan"
            default_wan["interface"] = self.sid
            x.assert_data(default_wan)
        with self.subTest("post_configuration"):
            self.max_metric = 0
            for member in self.default_data:
                if int(member["metric"]) > self.max_metric:
                    self.max_metric = int(member["metric"])
            post_data = {
                "interface": "wan"
            }
            default_data = {
                ".type": "member",
                "name": "member1",
                "metric": str(self.max_metric + 1),
                "id": "member1",
                "interface": "wan"
            }
            x = self.post_data(self.url, post_data)
            self.sid = x.resp.json()["data"]["id"]
            x.assert_data(default_data, 201)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
        with self.subTest("post_configuration_no_interface"):
            data = {
                ".type": "member",
                "name": "member1",
                "metric": str(self.max_metric + 1),
                "id": "member1",
            }
            x = self.post_data(self.url, {})
            self.sid = x.resp.json()["data"]["id"]
            x.assert_data(data, 201)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
