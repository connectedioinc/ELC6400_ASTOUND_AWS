import sys
import utility_integration as util
from utils.general_api import is_package_installed

sys.path.append("../../../../tests")

class test_network_usage(util.WrapTest):
    def setUp(self):
        if not is_package_installed(self, "network_usage"):
            self.skipTest("Network usage package is not installed")

    def test_global(self):
        base_url = "/network_usage/global"
        with self.subTest("get_global"):
            x = self.get(base_url)
            x.assert_data({
                "enabled": "0",
                "save_history": "1"
            })
        with self.subTest("put_global"):
            x = self.put_data(base_url, {
                "enabled": "1",
            })
            x.assert_data({
                "enabled": "1",
                "save_history": "1"
            })
        with self.subTest("put_global_reset"):
            x = self.put_data(base_url, {
                "enabled": "0",
            })
            x.assert_data({
                "enabled": "0",
                "save_history": "1"
            })
        with self.subTest("not_allowed_delete"):
            x = self.delete(base_url)
            x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
        with self.subTest("not_allowed_post"):
            x = self.post_data(base_url, {})
            x.assert_error("Request", "POST not implemented", 100, None, None)

    def test_metrics(self):
        base_url = "/network_usage"
        endpoints = ["day", "week", "month", "total"]

        for period in endpoints:
            with self.subTest(f"check_{period}_metrics"):
                x = self.get(f"{base_url}/metrics/{period}/status")
                x.assert_code(200)
                data = x.resp.json().get("data")
                if period == "total":
                    self.assertIsInstance(data, list)
                else:
                    self.assertIsInstance(data, dict)
                

    def test_transfers(self):
        base_url = "/network_usage"
        endpoints = ["day"]

        for period in endpoints:
            with self.subTest(f"check_{period}_transfers"):
                x = self.get(f"{base_url}/transfers/{period}/status")
                x.assert_code(200)
                data = x.resp.json().get("data")
                self.assertIsInstance(data, dict)
