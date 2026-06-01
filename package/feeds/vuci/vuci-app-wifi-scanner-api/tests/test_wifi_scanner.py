from utility_integration import WrapTest
import response_codes as codes
import sys
sys.path.append("../../../../tests")

RC = codes.ResponseCodes


class test_wifi_scanner(WrapTest):
    base_url = "/wifi_scanner/config"
    default_section = "/general"

    def test_base_functionality(self):
        original_data = None
        with self.subTest("get_section"):
            x = self.get(self.base_url + self.default_section)
            x.assert_code(200)
            original_data = x.resp.json()["data"]
        with self.subTest("configure_section"):
            x = self.put_data(self.base_url + self.default_section, {
                "two_g_enabled": "1",
                "five_g_enabled": "1",
                "interval": "50"
            })
            x.assert_data({
                "id": "general",
                ".type": "section",
                "two_g_enabled": "1",
                "five_g_enabled": "1",
                "interval": "50"
            })
        with self.subTest("restore_section"):
            if "id" in original_data:
                del original_data["id"]
            x = self.put_data(
                self.base_url + self.default_section, original_data)
            x.assert_code(200)
        with self.subTest("check_required_options"):
            x = self.put_data(self.base_url + self.default_section, {
                "two_g_enabled": "1",
                "five_g_enabled": "1",
                "interval": ""
            })
            x.assert_code(422)
            if not len(x.resp.json()["errors"]) == 2:
                self.assertFalse(
                    x.resp.status_code, "Expected two error messages, that tell about required options.")

    def test_create(self):
        x = self.post_data(self.base_url, {})
        x.assert_error(
            "Validation", "Section creation is not allowed", RC.NO_CREATE.val())

    def test_delete(self):
        x = self.delete(self.base_url)
        x.assert_error(
            "Validation", "Section deletion is not allowed", RC.NO_DELETE.val())
