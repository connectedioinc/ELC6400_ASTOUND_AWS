import sys
import json
from utils.ssh import get_ssh
import utility_integration as util
sys.path.append("../../../../tests")


class test_hotspot2_op_name(util.WrapTest):
    @classmethod
    def setUpClass(cls) -> None:
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    hotspot_url = "/hotspot2/config"
    url = "/hotspot2/{}/names/config"

    def setUp(self):
        board = json.loads(self.ssh.send_cmd("cat /etc/board.json"))
        if not "wifi" in board["hwinfo"] or ("wifi" in board["hwinfo"] and board["hwinfo"]["wifi"] != True):
            self.skipTest("Wifi is not supported")

    def test_op_name_base_functionality(self):
        sections = {}
        hotspot_data = []

        with self.subTest("get_hotspot_config"):
            x = self.get(self.hotspot_url)
            x.assert_code(200)
            hotspot_data = x.resp.json()["data"]
        with self.subTest("create_sections"):
            for x in hotspot_data:
                resp = self.post_data(self.url.format(x["id"]), {
                    "country_code": "eng",
                    "name": "test"
                })
                resp.assert_code(201)
                section = resp.json["data"]
                sections[x["id"]] = section["id"]
        with self.subTest("get_sections"):
            for x in hotspot_data:
                resp = self.get(self.url.format(x["id"]))
                resp.assert_data([
                    {
                        ".type": "hs20_oper_friendly_name",
                        "id": sections[x["id"]],
                        "name": "test",
                        "country_code": "eng",
                    }
                ])
        with self.subTest("edit_sections"):
            for x in hotspot_data:
                resp = self.put_data(self.url.format(x["id"]), [
                    {
                        ".type": "hs20_oper_friendly_name",
                        "id": sections[x["id"]],
                        "name": "abc",
                        "country_code": "lt"
                    }
                ])
                resp.assert_data([
                    {
                        ".type": "hs20_oper_friendly_name",
                        "id": sections[x["id"]],
                        "name": "abc",
                        "country_code": "lt"
                    }
                ])
        with self.subTest("delete_sections"):
            for x in hotspot_data:
                resp = self.delete_data(
                    self.url.format(x["id"]), [sections[x["id"]]])
                resp.assert_data([
                    {
                        "id": sections[x["id"]],
                    }
                ])
