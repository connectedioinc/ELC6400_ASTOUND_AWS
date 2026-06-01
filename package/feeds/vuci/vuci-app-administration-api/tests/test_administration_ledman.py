import sys
import utility_integration as util
from utils.general_api import is_package_installed
sys.path.append("../../../../tests")

class test_administration_ledman(util.WrapTest):

    def setUp(self):
        if not is_package_installed(self, "ledman") and not is_package_installed(self, "ledman_full"):
            self.skipTest("Ledman package is not installed")
    
    def test_administration_ledman_base_functionality(self):
        base_url = "/system/led/config"
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            x.assert_data([{
                ".type":"ledman",
                "id":"general",
                "enabled":"1"
            }])
        with self.subTest("single_get"):
            x = self.get(base_url + "/general")
            x.assert_data({
                ".type":"ledman",
                "id":"general",
                "enabled":"1"
            })
        with self.subTest("configure_administration_ledman"):
            x = self.put_data(base_url + "/general", {
                "enabled":"0"
            })
            x.assert_data({
                ".type":"ledman",
                "id":"general",
                "enabled":"0"
            })
        with self.subTest("get_configured"):
            x = self.get(base_url + "/general")
            x.assert_data({
                ".type":"ledman",
                "id":"general",
                "enabled":"0"
            })
        with self.subTest("return_configuration"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1"
            })
            x.assert_data({
                ".type":"ledman",
                "id":"general",
                "enabled":"1"
            })

    def test_administration_ledman_deletion(self):
        x = self.delete("/system/led/config")
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
    def test_administration_ledman_creation(self):
        x = self.post_data("/system/led/config", {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)