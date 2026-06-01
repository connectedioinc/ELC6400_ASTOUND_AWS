import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed
import response_codes as codes

RC = codes.ResponseCodes

class test_igmp_routes(util.WrapTest):
    url = "/igmp_proxy/routes/config"
    sid = None

    def setUp(self):
        if not is_package_installed(self, "igmp_proxy"):
            self.skipTest("IGMP Proxy package is not installed")

    def test_igmp_routes_functionality(self):
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, {})
            self.sid = x.resp.json()["data"]["id"]
            x.assert_data({
                "id": self.sid,
                ".type": "phyint"
            }, 201)
        
        with self.subTest("edit_configuration"):
            put_data = {
                "direction": "upstream",
                "network": "lan",
                "zone": "lan",
                "altnet": [
                    "1.1.1.1/24",
                    "2.2.2.2/24"
                ]
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data[".type"] = "phyint"
            x.assert_data(put_data)
        with self.subTest("try_create_with_same_direction"):
            x = self.post_data(self.url, {
                "direction": "upstream"
            })
            x.assert_error("igmp_routes", "Only a single instance with upstream direction can be saved.", RC.INVALID_SECTION.val(), None, None)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
