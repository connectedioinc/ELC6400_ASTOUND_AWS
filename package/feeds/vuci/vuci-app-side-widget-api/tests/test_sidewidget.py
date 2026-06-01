import sys
import utility_integration as util
sys.path.append("../../../../tests")


class sidewidget(util.WrapTest):

    base_url = "/widget/config"

    def test_sidewidget_base_functionality(self):
        id = ""
        with self.subTest("get_sidewidget"):
            x = self.get(self.base_url)
            resp = x.resp
            for section in resp.json()["data"]:
                options = ["enabled", ".type", "card_id", "position", "id"]
                keys = list(section.keys())
                if "section_name" in keys:
                    options.append("section_name")
                self.assertListEqual(keys, options)
            id = resp.json()["data"][0]["id"]
            x.assert_code(200)
        with self.subTest("get_single"):
            x = self.get(self.base_url + "/" + id)
            x.assert_data({
                "id": id,
                "enabled": "1",
                ".type": "widget",
                "position": "1",
            }, 200, ["card_id", "section_name"])
        with self.subTest("update_card"):
            x = self.put_data(self.base_url + "/" + id, {
                "position": "2",
                "enabled": "0"
            })
            x.assert_data({
                "id": id,
                "enabled": "0",
                ".type": "widget",
                "position": "2",
            }, 200, ["card_id", "section_name"])
            x = self.put_data(self.base_url + "/" + id, {
                "position": "1",
                "enabled": "1"
            })
