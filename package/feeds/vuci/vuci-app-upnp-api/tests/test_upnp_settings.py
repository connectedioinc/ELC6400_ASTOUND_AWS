import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import is_package_installed
import response_codes as codes

RC = codes.ResponseCodes

class test_upnp_settings(WrapTest):
    ERR_CODES = {
        "FILE_IS_DIR_ERR": 1,
        "FILE_READ_ERR": 2,
        "FILE_USED_ERR": 3
    }
    base_url = "/upnp/global"

    def setUp(self):
        if not is_package_installed(self, "upnp"):
            self.skipTest("UPNP package is not installed")

    def test_general_section_update(self):
        original_data = None

        with self.subTest("get_section"):
            x = self.get(self.base_url)
            x.assert_code(200)
            original_data = x.resp.json()["data"]
        with self.subTest("update_section"):
            x = self.put_data(self.base_url, {
                ".type": "upnpd",
                "clean_ruleset_interval": "600",
                "clean_ruleset_threshold": "20",
                "download": "2048",
                "enabled": "1",
                "log_output": "1",
                "model_number": "12345",
                "notify_interval": "30",
                "port": "5001",
                "presentation_url": "192.168.1.1",
                "secure_mode": "1",
                "serial_number": "12345678",
                "system_uptime": "1",
                "upload": "1024",
                "upnp_lease_file": "/var/run/miniupnpd.leases",
                "uuid": "2c1b66d8-a205-11e9-a2a3-2a2ae2dbcce4"
            })
            x.assert_data({
                "clean_ruleset_interval": "600",
                "clean_ruleset_threshold": "20",
                "download": "2048",
                "enabled": "1",
                "log_output": "1",
                "model_number": "12345",
                "notify_interval": "30",
                "port": "5001",
                "presentation_url": "192.168.1.1",
                "secure_mode": "1",
                "serial_number": "12345678",
                "system_uptime": "1",
                "upload": "1024",
                "upnp_lease_file": "/var/run/miniupnpd.leases",
                "uuid": "2c1b66d8-a205-11e9-a2a3-2a2ae2dbcce4"
            })
        with self.subTest("check_directory_error"):
            x = self.put_data(self.base_url, {
                "upnp_lease_file": "/var/run/",
            })
            x.assert_error("upnp_lease_file", "Provided path is a directory.", self.ERR_CODES["FILE_IS_DIR_ERR"])
        with self.subTest("restore_section"):
            if "id" in original_data:
                del original_data["id"]
            original_data["clean_ruleset_interval"] = ""
            original_data["clean_ruleset_threshold"] = ""
            original_data["model_number"] = ""
            original_data["notify_interval"] = ""
            original_data["presentation_url"] = ""
            original_data["serial_number"] = ""
            original_data["uuid"] = ""
            x = self.put_data(self.base_url, original_data)
            x.assert_code(200)

    def test_create(self):
        x = self.post_data(self.base_url, {
            ".type": "upnpd",
            "clean_ruleset_interval": "600",
            "clean_ruleset_threshold": "20",
            "download": "2048",
            "enabled": "1",
            "log_output": "1",
            "model_number": "12345",
            "notify_interval": "30",
            "port": "5001",
            "presentation_url": "192.168.1.1",
            "secure_mode": "1",
            "serial_number": "12345678",
            "system_uptime": "1",
            "upload": "1024",
            "upnp_lease_file": "/var/run/miniupnpd.leases",
            "uuid": "2c1b66d8-a205-11e9-a2a3-2a2ae2dbcce4"
        })
        x.assert_error("Request", "POST not implemented", 100)

    def test_delete(self):
        x = self.delete(self.base_url)
        x.assert_error("Validation", "Section deletion is not allowed", RC.NO_DELETE.val())