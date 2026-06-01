import sys
import response_codes as codes
import utility_integration as util
from utils.general_api import is_package_installed
sys.path.append("../../../../tests")

RC = codes.ResponseCodes

class test_hotspot_themes_img(util.WrapTest):
    url_theme = "/hotspot/images/config"
    custom_theme_packages = ["airport", "airport2", "bus", "coffee_shop", "grocery_store", "office", "park", "ship", "station"]

    def setUp(self):
        if not is_package_installed(self, "hotspot"):
            self.skipTest("Hotspot package is not installed")

    def test_base_functionality(self):
        with self.subTest("images_list"):
            x = self.get(f"{self.url_theme}/default")
            x.assert_code(200)
            for img in x.resp.json()["data"]:
                self.assertTrue("file_name" in img)
                self.assertTrue("file_path" in img)
                self.assertTrue("name" in img)

        with self.subTest("images_list_validation"):
            x = self.get(f"{self.url_theme}")
            x.assert_error("Validation", "Theme identifier missing.", RC.INVALID_SECTION.val())

            x = self.get(f"{self.url_theme}/test")
            themes = ["default"]
            for package in self.custom_theme_packages:
                if is_package_installed(self, f"hs_{package}"):
                    themes.append(package)
            x.assert_error("Request", "Section: Must be one of the following values [" + ", ".join(sorted(themes)) + "].", RC.INCORRECT_REQUEST.val())
