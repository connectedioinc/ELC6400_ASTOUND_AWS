import utility_integration as util
import sys

from utils.ssh import get_ssh
sys.path.append("../../../../tests")

PACKAGES_URL = "/system/device/packages/status"

class test_system_info(util.WrapTest):
    @classmethod
    def setUpClass(self):
        self.ssh = get_ssh()

    @classmethod
    def tearDownClass(self):
        self.ssh.logout()

    def test_package_control_file_list(self):
        x = self.get(PACKAGES_URL)
        x.assert_code(200)
        data = x.json["data"]
        files = self.ssh.send_cmd("ls -1 /usr/lib/opkg/info/*.control | cat")
        for file in files.strip().split():
            self.assertIn(file, data)
