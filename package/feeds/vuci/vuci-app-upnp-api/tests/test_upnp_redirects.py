import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import is_package_installed
import response_codes as codes

RC = codes.ResponseCodes

class test_upnp_redirects(WrapTest):
    base_url = "/upnp/redirects/config"

    def setUp(self):
        if not is_package_installed(self, "upnp"):
            self.skipTest("UPNP package is not installed")

    def test_config(self):
        with self.subTest("config_empty"):
            x = self.get(self.base_url)
            self.assertTrue(x.json["data"] == [])

    def test_delete_validations(self):
        with self.subTest("delete_no_section"):
            x = self.delete(self.base_url)
            x.assert_error("Validation", "Deletion of whole configuration is not allowed", RC.CONF_DEL_DISALLOWED.val())
        with self.subTest("delete_empty_data"):
            x = self.delete_data(self.base_url, {})
            x.assert_error("Validation", "Invalid data structure, only an array is acceptable", RC.INVALID_STRUCT.val())
        with self.subTest("delete_invalid_data"):
            x = self.delete_data(self.base_url, {"id": "test"})
            x.assert_error("Validation", "Invalid data structure, only an array is acceptable", RC.INVALID_STRUCT.val())
        with self.subTest("delete_invalid_sid"):
            x = self.delete_data(self.base_url, ["test"])
            x.assert_error("UCI", "Section: test for service does not exist", RC.INVALID_SECTION.val())
        with self.subTest("delete_section_invalid_sid"):
            x = self.delete(self.base_url + "/test")
            x.assert_error("UCI", "Section: test for service does not exist", RC.INVALID_SECTION.val())
