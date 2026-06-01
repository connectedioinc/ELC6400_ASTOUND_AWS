import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import is_package_installed
import response_codes as codes

RC = codes.ResponseCodes

class test_samba(WrapTest):
    base_url = "/samba/global"

    def setUp(self):
        if not is_package_installed(self, "samba"):
            self.skipTest("Samba package is not installed")

    def test_general_section_update(self):
        original_data = None

        with self.subTest("get_section"):
            x = self.get(self.base_url)
            x.assert_code(200)
            original_data = x.resp.json()["data"]

        with self.subTest("update_section"):
            x = self.put_data(self.base_url, {
                ".type": "samba",
                "description": "Test Samba",
                "enabled": "1",
                "homes": "0",
                "name": "test_samba",
                "workgroup": "test"
            })
            x.assert_data({
                "description": "Test Samba",
                "enabled": "1",
                "homes": "0",
                "name": "test_samba",
                "workgroup": "test"
            })
        with self.subTest("restore_section"):
            if "id" in original_data:
                del original_data["id"]
            x = self.put_data(self.base_url, original_data)
            x.assert_code(200)

    def test_create(self):
        x = self.post_data(self.base_url, {
            ".type": "samba",
            "description": "Router share",
            "enabled": "0",
            "homes": "1",
            "name": "Router_share",
            "workgroup": "WORKGROUP"
        })
        x.assert_error("Request", "POST not implemented", 100)

    def test_delete(self):
        x = self.delete(self.base_url)
        x.assert_error("Validation", "Section deletion is not allowed", RC.NO_DELETE.val())
