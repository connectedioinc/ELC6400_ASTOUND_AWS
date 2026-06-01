import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed

class test_sshfs(util.WrapTest):
    url_general = "/sshfs/config/general"
    sid = "general"
    default_data = {
        "enabled": "0",
        "mount_point": "/sshmount",
        "mount_path": "/home/"
    }

    def setUp(self):
        if not is_package_installed(self, "sshfs"):
            self.skipTest("SSHFS package is not installed")

    def test_sshfs_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url_general)
            get_response = self.default_data.copy()
            get_response["id"] = self.sid
            get_response[".type"] = "sshfs"
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                "enabled": "1",
                "mount_point": "/sshmount",
                "mount_path": "/home/test/",
                "hostname": "example.com",
                "port": "22",
                "username": "test",
                "password": "test123"
            }
            x = self.put_data(self.url_general, put_data)
            put_data["id"] = self.sid
            put_data[".type"] = "sshfs"
            x.assert_data(put_data)
        with self.subTest("return_configuration_to_default"):
            restore_data = self.default_data.copy()
            restore_data["hostname"] = ""
            restore_data["port"] = ""
            restore_data["username"] = ""
            restore_data["password"] = ""
            x = self.put_data(self.url_general, restore_data)
            self.default_data["id"] = self.sid
            self.default_data[".type"] = "sshfs"
            x.assert_data(self.default_data)

    def test_sshfs_deletion(self):
        x = self.delete(self.url_general)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    def test_sshfs_creation(self):
        x = self.post_data(self.url_general, {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)