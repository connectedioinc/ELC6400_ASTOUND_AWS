import response_codes as codes
import utility_integration as util
from utils.general_api import get_board
import sys

sys.path.append("../../../../tests")
PHONE_FILE_PATH = "./files/phone_groups.txt"


class test_phone_groups(util.WrapTest):
    def setUp(self):
        board_json = get_board(self)
        if not "mobile" in board_json["hwinfo"] or not board_json["hwinfo"]["mobile"]:
            self.skipTest("Device does not support GSM")
    def test_phone_groups_base_functionality(self):
        base_url = "/recipients/phone_groups/config"
        id = ""
        with self.subTest("create_section"):
            x = self.post_data(base_url, {
                "name": "testPhone",
                "tel": ["+37068539999", "+37068539998", "+37068539997"]
            })
            x.assert_data({
                ".type": "phone",
                "name": "testPhone",
                "tel": ["+37068539999", "+37068539998", "+37068539997"]
            }, 201, ["id"])
        with self.subTest("find_section_id"):
            x = self.get(base_url)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "testPhone":
                    found = True
                    id = section["id"]
            if not found:
                self.fail("Section is not created")
        with self.subTest("configure_section"):
            x = self.put_data(base_url + "/" + id, {
                "tel": ["+37061123333", "+37061124444"]
            })
            x.assert_data({
                ".type": "phone",
                "name": "testPhone",
                "tel": ["+37061123333", "+37061124444"],
                "id": id
            })
        with self.subTest("get_section"):
            x = self.get(base_url + "/" + id)
            x.assert_data({
                ".type": "phone",
                "name": "testPhone",
                "tel": ["+37061123333", "+37061124444"],
                "id": id
            })
        with self.subTest("get_multiple_sections"):
            x = self.get(base_url)
            x.assert_data([{
                ".type": "phone",
                "name": "testPhone",
                "tel": ["+37061123333", "+37061124444"],
                "id": id
            }])
        with self.subTest("upload_file"):
            f = open(PHONE_FILE_PATH, "w")
            f.write("+37000000000\n+37011111111")
            f.close()
            x = self.send_file(base_url + "/" + id, PHONE_FILE_PATH)
            x.assert_data({
                ".type": "phone",
                "name": "testPhone",
                "tel": ["+37000000000", "+37011111111"],
                "id": id
            }, 200)
        with self.subTest("upload_file_duplicate"):
            f = open(PHONE_FILE_PATH, "w")
            f.write("+37011111111\n+37011111111")
            f.close()
            x = self.send_file(base_url + "/" + id, PHONE_FILE_PATH)
            x.assert_error("tel: +37011111111", "Duplicate phone number found.", 2)
        with self.subTest("upload_file_empty"):
            f = open(PHONE_FILE_PATH, "w")
            f.write("\n")
            f.close()
            x = self.send_file(base_url + "/" + id, PHONE_FILE_PATH)
            x.assert_error("file", "No phone numbers found in the file.", 1)
        with self.subTest("delete_section"):
            x = self.delete(base_url + "/" + id)
            x.assert_data({
                "id": id
            })
