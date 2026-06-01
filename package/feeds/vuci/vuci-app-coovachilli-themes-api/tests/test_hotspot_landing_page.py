import sys
import response_codes as codes
import utility_integration as util
from utils.general_api import is_package_installed
sys.path.append("../../../../tests")

RC = codes.ResponseCodes

class test_hotspot_landing_page(util.WrapTest):
    url = "/hotspot/themes/global"
    custom_theme_packages = ["airport", "airport2", "bus", "coffee_shop", "grocery_store", "office", "park", "ship", "station"]

    def setUp(self):
        if not is_package_installed(self, "hotspot"):
            self.skipTest("Hotspot package is not installed")

    def test_base_functionality(self):
        with self.subTest("theme_validation"):
            x = self.put_data(self.url, {
                "theme": "test"
            })
            themes = ["default"]
            for package in self.custom_theme_packages:
                if is_package_installed(self, f"hs_{package}"):
                    themes.append(package)
            x.assert_error("theme", "Must be one of the following values [" + ", ".join(sorted(themes)) + "].", RC.INVALID_OPT.val())

    def test_section_delete(self):
        x = self.delete(self.url)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    def test_section_create(self):
        x = self.post_data(self.url, {})
        x.assert_error("Request", "POST not implemented", 100, None, None)