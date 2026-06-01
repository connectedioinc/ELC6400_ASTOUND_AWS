import sys
import utility_integration as util
sys.path.append("../../../../tests")


class test_overview(util.WrapTest):

    base_url = "/overview/config"

    def test_overview_base_functionality(self):
        id = None
        with self.subTest("get_overview"):
            x = self.get(self.base_url)
            resp = x.resp
            options = ["enabled", ".type", "card_id", "position", "id"]
            for section in resp.json()["data"]:
                if "section_name" in section.keys():
                    options.append("section_name")
                    self.assertListEqual(list(section.keys()), options)
                    options.remove("section_name")
                else:
                    self.assertListEqual(list(section.keys()), options)
            x.assert_code(200)
            id = resp.json()["data"][0]["id"]
        with self.subTest("get_single"):
            x = self.get(self.base_url + "/" + id)
            x.assert_data({
                "id": id,
                "enabled": "1",
                ".type": "overview",
                "card_id": "system",
                "position": "1"
            })
        with self.subTest("update_card"):
            x = self.put_data(self.base_url + "/" + id, {
                "position": "2",
                "enabled": "0"
            })
            x.assert_data({
                "id": id,
                "enabled": "0",
                ".type": "overview",
                "card_id": "system",
                "position": "2"
            })
            x = self.put_data(self.base_url + "/" + id, {
                "position": "1",
                "enabled": "1"
            })

    def test_overview_validations(self):
        with self.subTest("get_non_existant_config"):
            x = self.get(self.base_url + "/non_existant")
            x.assert_error("UCI", "Section: non_existant for service does not exist", 113)
        with self.subTest("update_non_existant_config"):
            x = self.put_data(self.base_url + "/non_existant", {
                "position": "2",
                "enabled": "0"
            })
            x.assert_error("UCI", "Section: non_existant for service does not exist", 113)
        with self.subTest("update_multiple_positions"):
            x = self.get(self.base_url)
            x.assert_code(200)
            id1 = x.resp.json()["data"][0]["id"]
            id2 = x.resp.json()["data"][1]["id"]
            x = self.put_data(self.base_url, [
                {
                    "id": id1,
                    "position": "2",
                    "enabled": "0"
                },
                {
                    "id": id2,
                    "position": "2",
                    "enabled": "0"
                }
            ])
            x.assert_error("Validation", "Position argument can not be the same for multiple sections", 113)
