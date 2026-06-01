import sys
import response_codes as codes
import utility_integration as util
from utils.general_api import get_board, is_package_installed
sys.path.append("../../../../tests")

RC = codes.ResponseCodes

class test_hotspot_groups(util.WrapTest):
    url_groups = "/hotspot/groups"
    url = f"{url_groups}/config"

    def setUp(self):
        if not is_package_installed(self, "hotspot"):
            self.skipTest("Hotspot package is not installed")

    def create_config(self, name: str):
        response = self.post_data(self.url, {
            "name": name
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]
    
    def delete_config(self, id: str):
        self.delete(f"{self.url}/{id}").assert_code(200)

    def test_crud_basic(self):
        self.crud_test(self.url, {
            ".type": "group",
            "name": "test"
        }, {
            ".type": "group",
            "defidletimeout": "50",
            "defsessiontimeout": "50",
            "downloadbandwidth": "100",
            "uploadbandwidth": "100",
            "period": "1",
            "day": "20"
        }, ["name"])

    def test_base_functionality(self):
        sid = None
        with self.subTest("create_group"):
            sid = self.create_config("test123")
        with self.subTest("name_validation"):
            x = self.put_data(f"{self.url}/{sid}", {
                "name": "abc"
            })
            x.assert_error("name", "Name cannot be changed.", RC.INVALID_OPT.val())
            x = self.post_data(self.url, {
                "name": "test123"
            })
            x.assert_error("name", "Name is already used.", RC.INVALID_OPT.val())
        with self.subTest("check_limit"):
            x = self.put_data(f"{self.url}/{sid}", {
                "downloadlimit": "1000",
                "uploadlimit": "1000",
                "warning": "1000"
            })
            board = get_board(self)
            if "TRB5" in board.get("model", {}).get("platform"):
                x.assert_error("downloadlimit", "Invalid option", RC.INVALID_OPT.val())
            else:
                x.assert_data({
                    ".type": "group",
                    "downloadlimit": "1000",
                    "uploadlimit": "1000",
                    "warning": "1000",
                    "id": sid
                }, 200, ["name"])
        with self.subTest("delete_group"):
            self.delete_config(sid)