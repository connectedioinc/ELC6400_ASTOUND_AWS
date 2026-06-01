import response_codes as codes
from utility_integration import WrapTest
from utils.general_api import is_package_installed
from time import sleep
import sys
sys.path.append("../../../../tests")

RC = codes.ResponseCodes


class test_minidlna(WrapTest):
    base_url = "/minidlna"
    default_section = "/config/general"
    media_dirs = ["/tmp", "/mnt"]

    def setUp(self):
        if not is_package_installed(self, "minidlna"):
            self.skipTest("DLNA package is not installed")

    def test_base_functionaliy(self):
        original_data = None
        with self.subTest("get_section"):
            x = self.get(self.base_url + self.default_section)
            x.assert_code(200)
            original_data = x.resp.json()["data"]
        with self.subTest("configure_section"):
            x = self.put_data(self.base_url + self.default_section, {
                "enabled": "1",
                "port": "5000",
                "friendly_name": "Test Server",
                "root_container": "M",
                "media_dir": self.media_dirs,
                "album_art_names": ["test.jpg"],
                "interface": ["br-lan"],
                "inotify": "0",
                "enable_tivo": "0",
                "strict_dlna": "1",
                "notify_interval": "500"
            })
            x.assert_data({
                "id": "general",
                ".type": "minidlna",
                "enabled": "1",
                "port": "5000",
                "friendly_name": "Test Server",
                "root_container": "M",
                "media_dir": self.media_dirs,
                "album_art_names": ["test.jpg"],
                "interface": ["br-lan"],
                "inotify": "0",
                "enable_tivo": "0",
                "strict_dlna": "1",
                "notify_interval": "500"
            })
        with self.subTest("restore_section"):
            if "id" in original_data:
                del original_data["id"]
            x = self.put_data(
                self.base_url + self.default_section, original_data)
            x.assert_code(200)
        with self.subTest("root_container_validation"):
            x = self.put_data(self.base_url + self.default_section, {
                "root_container": "test",
            })
            x.assert_error(
                "root_container", "Must be one of the following values [., B, M, V, P].", RC.INVALID_OPT.val())
        with self.subTest("media_dir_validation"):
            x = self.put_data(self.base_url + self.default_section, {
                "media_dir": ["/test/test/test"],
            })
            x.assert_error(
                "media_dir at index 1", "Directory doesn't exist.", RC.INVALID_OPT.val())
        with self.subTest("required_options"):
            x = self.put_data(self.base_url + self.default_section, {
                "enabled": "1",
                "interface": "",
                "port": "",
                "media_dir": ""
            })
            x.assert_code(422)
            if not len(x.resp.json()["errors"]) == 3:
                self.assertFalse(
                    x.resp.status_code, "Expected three error messages, that tell about required options.")

    def test_status(self):
        with self.subTest("check_disabled_status"):
            x = self.get(self.base_url + "/status")
            x.assert_data({
                "running": False
            })
        with self.subTest("enable_dlna"):
            x = self.put_data(self.base_url + self.default_section, {
                "enabled": "1"
            })
            x.assert_code(200)
            if x.resp.json()["data"]["enabled"] != "1":
                self.assertFalse(x.resp.status_code, "Failed to enable dlna")
            sleep(5)
        with self.subTest("check_enabled_status"):
            attempt_limit = 30
            attempt_count = 0

            x = self.get(self.base_url + "/status")
            x.assert_code(200)

            while x.resp.json()["data"]["running"] == False and attempt_count < attempt_limit:
                x = self.get(self.base_url + "/status")
                attempt_count += 1
                sleep(1)

            x.assert_data({
                "running": True,
                "audio": 0,
                "clients": [],
                "connections": 0,
                "video": 0
            }, 200, ["images"])
        with self.subTest("disable_dlna"):
            x = self.put_data(self.base_url + self.default_section, {
                "enabled": "0"
            })
            x.assert_code(200)
            if x.resp.json()["data"]["enabled"] != "0":
                self.assertFalse(x.resp.status_code, "Failed to disable dlna")

    def test_create(self):
        x = self.post_data(self.base_url + "/config", {})
        x.assert_error(
            "Validation", "Section creation is not allowed", RC.NO_CREATE.val())

    def test_delete(self):
        x = self.delete(self.base_url + "/config")
        x.assert_error(
            "Validation", "Section deletion is not allowed", RC.NO_DELETE.val())
