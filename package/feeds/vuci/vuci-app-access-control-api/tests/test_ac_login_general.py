import response_codes as codes
import utility_integration as util
import sys

sys.path.append("../../../../tests")


class test_access_control_login_attempts_general(util.WrapTest):
    def test_access_control_login_attempts_general_base_functionality(self):
        base_url = "/access_control/security/config"
        with self.subTest("configure_section"):
            x = self.put_data(base_url + "/general", {
                "enabled": "1",
                "enabled_time_based": "1",
                "reboot_clear": "1",
                "max_attempt_count": "69",
                "enable_mac_filter": "0"
            })
            x.assert_data({
                "id": "general",
                ".type": "globals",
                "enabled": "1",
                "enabled_time_based": "1",
                "reboot_clear": "1",
                "max_attempt_count": "69",
                "enable_mac_filter": "0"
            })
        with self.subTest("single_get"):
            x = self.get(base_url + "/general")
            x.assert_data({
                "id": "general",
                ".type": "globals",
                "enabled": "1",
                "enabled_time_based": "1",
                "reboot_clear": "1",
                "max_attempt_count": "69",
                "enable_mac_filter": "0"
            })
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            x.assert_data([{
                "id": "general",
                ".type": "globals",
                "enabled": "1",
                "enabled_time_based": "1",
                "reboot_clear": "1",
                "max_attempt_count": "69",
                "enable_mac_filter": "0"
            }])
        with self.subTest("clear_configuration"):
            x = self.put_data(base_url + "/general", {
                "max_attempt_count": "10",
                "reboot_clear": "0",
                "enable_mac_filter": ""
            })
            x.assert_data({
                "id": "general",
                ".type": "globals",
                "enabled": "1",
                "enabled_time_based": "1",
                "max_attempt_count": "10",
                "reboot_clear": "0"
            })
        with self.subTest("test_ac_la_general_deletion"):
            x = self.delete(base_url)
            x.assert_error(
                "Validation", "Section deletion is not allowed", 111, None, None)
        with self.subTest("test_ac_la_general_creation"):
            x = self.post_data(base_url, {})
            x.assert_error(
                "Validation", "Section creation is not allowed", 108, None, None)
