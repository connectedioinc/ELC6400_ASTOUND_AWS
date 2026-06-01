from utils.general_api import is_package_installed
import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_mwan_general(util.WrapTest):
    url = "/failover/mode/config/globals"
    default_data = {
        "id": "globals",
        "mode": "mwan",
        ".type": "globals"
    }

    def setUp(self):
        if not is_package_installed(self, "mwan"):
            self.skipTest("MWAN3 package is not installed")

    def test_mwan_general_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()["data"]
            self.assertEqual(self.default_data, get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                ".type": "globals",
                "mode": "balance"
            }
            x = self.put_data(self.url, put_data)
            put_data["id"] = "globals"
            x.assert_data(put_data)
        with self.subTest("try_non_existing_mode"):
            put_data = {
                "mode": "non_existing_mode"
            }
            x = self.put_data(self.url, put_data)
            x.assert_error(
                "mode", "Must be one of the following values [balance, mwan].", 103)
        with self.subTest("reset_configuration"):
            default = self.default_data.copy()
            del default["id"]
            x = self.put_data(self.url, default)
            default["id"] = "globals"
            x.assert_data(default)

    def test_mwan_general_deletion(self):
        x = self.delete(self.url)
        x.assert_error(
            "Validation", "Section deletion is not allowed", 111, None, None)

    def test_mwan_general_creation(self):
        x = self.post_data(self.url, {})
        x.assert_error(
            "Validation", "Section creation is not allowed", 108, None, None)
