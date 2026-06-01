import sys
sys.path.append("../../../../tests")
import utility_integration as util

class test_firewall_general_settings(util.WrapTest):
    url_global = "/firewall/global"
    default_data = {
        "drop_invalid": "0",
        "auto_helper": "1",
        "input": "REJECT",
        "forward": "REJECT",
        "output": "ACCEPT"
    }

    def test_firewall_general_settings_general_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url_global)
            x.assert_data(self.default_data)
        with self.subTest("edit_configuration"):
            put_data = {
                "drop_invalid": "1",
                "auto_helper": "0",
                "input": "REJECT",
                "forward": "REJECT",
                "output": "ACCEPT"
            }
            x = self.put_data(self.url_global, put_data)
            x.assert_data(put_data)
        with self.subTest("return_configuration_to_default"):
            x = self.put_data(self.url_global, self.default_data)
            x.assert_data(self.default_data)

    def test_firewall_general_settings_general_deletion(self):
        x = self.delete(self.url_global)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    def test_firewall_general_settings_general_creation(self):
        x = self.post_data(self.url_global, {})
        x.assert_error("Request", "POST not implemented", 100, None, None)
