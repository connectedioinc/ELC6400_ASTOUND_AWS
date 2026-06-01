import sys
import response_codes as codes
import utility_integration as util
from utils.general_api import is_package_installed
sys.path.append("../../../../tests")

RC = codes.ResponseCodes

class test_hotspot_users(util.WrapTest):
    url_groups = "/hotspot/groups/config"
    url_users = "/hotspot/users"
    url = f"{url_users}/config"

    def setUp(self):
        if not is_package_installed(self, "hotspot"):
            self.skipTest("Hotspot package is not installed")

    def create_config(self, username: str, password: str):
        response = self.post_data(self.url, {
            "username": username,
            "password": password
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]
    
    def delete_config(self, id: str):
        self.delete(f"{self.url}/{id}").assert_code(200)

    def test_crud_basic(self):
        self.crud_test(self.url, {
            ".type": "user",
            "username": "test",
            "password": "test",
            "group": "default"
        }, {
            ".type": "user",
            "username": "abc",
            "password": "abc",
            "group": "default"
        }, ["password"])

    def test_base_functionality(self):
        sid = None
        with self.subTest("create_user"):
            sid = self.create_config("test123", "test")
        with self.subTest("username_validate"):
            x = self.post_data(self.url, {
                "username": "test123",
                "password": "test"
            })
            x.assert_error("username", "User with this name already exists.", RC.INVALID_OPT.val())
            x = self.put_data(f"{self.url}/{sid}", {
                "username": "test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test123456789test12345",
                "password": "test"
            })
            x.assert_error("username", f"Provided value is too long. Is 256 characters, but can be up to 255 characters", RC.INVALID_OPT.val())

        with self.subTest("group_validate"):
            x = self.put_data(f"{self.url}/{sid}", {
                "group": "group"
            })
            x.assert_error("group", "Must be one of the following values [default].", RC.INVALID_OPT.val())
            x = self.post_data(self.url_groups, {
                "name": "group"
            })
            g_sid = x.resp.json()["data"]["id"]
            x = self.put_data(f"{self.url}/{sid}", {
                "group": "group"
            })
            x.assert_data({
                ".type": "user",
                "group": "group",
                "id": sid
            }, 200, ["username", "password"])
            self.delete(f"{self.url_groups}/{g_sid}").assert_code(200)
        with self.subTest("delete_user"):
            self.delete_config(sid)

    def test_user_management_delete_validations(self):
        base_url = "/hotspot/user_management"
        with self.subTest("delete_no_section"):
            x = self.delete(base_url + "/config")
            x.assert_error("Validation", "Deletion of whole configuration is not allowed", RC.CONF_DEL_DISALLOWED.val())
        with self.subTest("delete_empty_data"):
            x = self.delete_data(base_url + "/config", {})
            x.assert_error("Validation", "Invalid data structure, only an array is acceptable", RC.INVALID_STRUCT.val())
        with self.subTest("delete_invalid_data"):
            x = self.delete_data(base_url + "/config", {"id": "test", "user_type": "user"})
            x.assert_error("Validation", "Invalid data structure, only an array is acceptable", RC.INVALID_STRUCT.val())
        with self.subTest("delete_invalid_structure"):
            x = self.delete_data(base_url + "/config", ["test"])
            x.assert_error("Validation", "Invalid data structure", RC.INVALID_STRUCT.val())
        with self.subTest("delete_invalid_sid"):
            x = self.delete_data(base_url + "/config", [{"id": "test", "user_type": "user"}])
            x.assert_error("UCI", "Section: test for service does not exist", RC.INVALID_SECTION.val())
        with self.subTest("delete_invalid_invalid_user_type"):
            x = self.delete_data(base_url + "/config", [{"id": "test", "user_type": "non_existent"}])
            x.assert_error("Validation", "User type is incorrect, accepted values: [user, sms_user].", RC.INVALID_OPT.val())
        with self.subTest("delete_section_invalid_sid"):
            x = self.delete_data(base_url + "/config/test", {"user_type": "user"})
            x.assert_error("UCI", "Section: test for service does not exist", RC.INVALID_SECTION.val())
        with self.subTest("delete_section_missing_data"):
            x = self.delete(base_url + "/config/test")
            x.assert_error("Validation", "Invalid data structure", RC.INVALID_STRUCT.val())
        with self.subTest("delete_section_missing_user_type"):
            x = self.delete_data(base_url + "/config/test", {})
            x.assert_error("Validation", "User type not found.", RC.INVALID_STRUCT.val())
        with self.subTest("delete_section_invalid_user_type"):
            x = self.delete_data(base_url + "/config/test", {"user_type": "non_existent"})
            x.assert_error("Validation", "User type is incorrect, accepted values: [user, sms_user].", RC.INVALID_OPT.val())
