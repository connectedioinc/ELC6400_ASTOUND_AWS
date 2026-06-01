import sys
import io
import utility_integration as util
from utils.ssh import get_ssh
sys.path.append("../../../../tests")

class test_custom_scripts(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def test_custom_scripts_base_functionality(self):
        base_url = "/uscripts"
        default_script = "# Put your custom commands here that should be executed once\n# the system init finished. By default this file does nothing.\n\nexit 0\n"
        with self.subTest("get"):
            x = self.get(base_url + "/config")
            x.assert_data({
                "script": default_script
            })
        with self.subTest("update_script"):
            x = self.send_file(base_url + "/actions/upload", io.StringIO(default_script + "edited\n"))
            x.assert_data({
                "path":"/etc/rc.local"
            })
        with self.subTest("get_updated"):
            x = self.get(base_url + "/config")
            x.assert_data({
                "script": default_script + "edited\n"
            })
        with self.subTest("return_changes"):
            x  = self.send_file(base_url + "/actions/upload", io.StringIO(default_script))
            x.assert_data({
                "path":"/etc/rc.local"
            })
        with self.subTest("get_original"):
            x = self.get(base_url + "/config")
            x.assert_data({
                "script": default_script
            })
        with self.subTest("check_permissions"):
            res = self.ssh.send_cmd("ls -l /etc/rc.local | awk '{print $1}'")
            self.assertEqual(res.strip(), '-rwxrw----')
