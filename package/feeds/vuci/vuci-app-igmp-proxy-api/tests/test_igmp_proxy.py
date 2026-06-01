import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed

class test_igmp_proxy(util.WrapTest):
    url_general = "/igmp_proxy/global"
    sid = "general"
    default_data = {
        "enabled": "0",
        "quickleave": "1"
    }

    def setUp(self):
        if not is_package_installed(self, "igmp_proxy"):
            self.skipTest("IGMP Proxy package is not installed")

    def test_igmp_proxy_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url_general)
            get_response = self.default_data.copy()
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                "enabled": "1",
                "quickleave": "0"
            }
            x = self.put_data(self.url_general, put_data)
            x.assert_data(put_data)
        with self.subTest("return_configuration_to_default"):
            x = self.put_data(self.url_general, self.default_data)
            x.assert_data(self.default_data)

    def test_igmp_proxy_deletion(self):
        x = self.delete(self.url_general)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    def test_igmp_proxy_creation(self):
        x = self.post_data(self.url_general, {})
        x.assert_error("Request", "POST not implemented", 100, None, None)
