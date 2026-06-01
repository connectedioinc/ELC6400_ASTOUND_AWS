from utils.general_api import is_package_installed
import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_connchecker(util.WrapTest):
    url_general = "/internet_connection/global"
    default_data = {
        "enabled": "1",
        "track_domain": "dns.google.com",
        "track_ipv4": "1.1.1.1",
        "track_ipv6": "2a00:1450:4001:831::200e",
        "interval": "60"
    }

    def setUp(self):
        if not is_package_installed(self, "connchecker"):
            self.skipTest("Connchecker package is not installed")

    def test_connchecker_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url_general)
            get_response = self.default_data.copy()
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                "enabled": "0",
                "track_domain": "google.com",
                "interval": "30",
                "track_ipv4": "123.123.123.123",
                "track_ipv6": "::0000:8a2e:0370:7334"
            }
            x = self.put_data(self.url_general, put_data)
            x.assert_data(put_data)
        with self.subTest("return_configuration_to_default"):
            x = self.put_data(self.url_general, self.default_data)
            x.assert_data(self.default_data)

    def test_connchecker_deletion(self):
        x = self.delete(self.url_general)
        x.assert_error(
            "Validation", "Section deletion is not allowed", 111, None, None)

    def test_connchecker_creation(self):
        x = self.post_data(self.url_general, {})
        x.assert_error(
            "Request", "POST not implemented", 100, None, None)
