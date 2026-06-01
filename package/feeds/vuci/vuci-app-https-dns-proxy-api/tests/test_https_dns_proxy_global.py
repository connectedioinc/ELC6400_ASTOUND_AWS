from utils.general_api import is_package_installed
import utility_integration as util
import sys
sys.path.append("../../../../tests")

class test_https_dns_proxy_global(util.WrapTest):
    url_global = "/dns/https_proxy/global"
    default_data = {
        "enabled": "0"
    }

    def setUp(self):
        if not is_package_installed(self, "https-dns-proxy"):
            self.skipTest("HTTPS DNS Proxy package is not installed")

    def test_https_dns_proxy_global_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url_global)
            get_response = self.default_data.copy()
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                "enabled": "1"
            }
            x = self.put_data(self.url_global, put_data)
            x.assert_data(put_data)
        with self.subTest("return_configuration_to_default"):
            x = self.put_data(self.url_global, self.default_data)
            x.assert_data(self.default_data)

    def test_https_dns_proxy_global_deletion(self):
        x = self.delete(self.url_global)
        x.assert_error(
            "Validation", "Section deletion is not allowed", 111, None, None)

    def test_https_dns_proxy_global_creation(self):
        x = self.post_data(self.url_global, {})
        x.assert_error(
            "Request", "POST not implemented", 100, None, None)
