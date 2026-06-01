import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes

class test_webfilter_general(util.WrapTest):
    url = "/webfilter/global"

    def test_webfilter_general_functionality(self):
        with self.subTest("test_get"):
            x = self.get(self.url)
            x.assert_data({
                "enabled": "0",
                "network": "all",
                "mode": "whitelist",
            })
        with self.subTest("test_put"):
            x = self.put_data(self.url, {
                "enabled": "1",
                "network": "all",
                "mode": "blacklist"
            })
            x.assert_data({
                "enabled": "1",
                "network": "all",
                "mode": "blacklist",
            })
        with self.subTest("test_wrong_enabled"):
            x = self.put_data(self.url, {
                "enabled": "test",
                "network": "all",
                "mode": "blacklist"
            })
            x.assert_error("enabled", "Provided value is not '1' or '0'.", 103)
        with self.subTest("test_wrong_network"):
            x = self.put_data(self.url, {
                "enabled": "1",
                "network": "test",
                "mode": "blacklist"
            })
            x.assert_error("network", "Must be one of the following values [all].", 103)
        with self.subTest("test_post"):
            x = self.delete(self.url)
            x.assert_error("Validation", "Section deletion is not allowed", 111)
        with self.subTest("reset"):
            x = self.put_data(self.url, {
                "enabled": "0",
                "network": "all",
                "mode": "whitelist",
            })
            x.assert_data({
                "enabled": "0",
                "network": "all",
                "mode": "whitelist",
            })
