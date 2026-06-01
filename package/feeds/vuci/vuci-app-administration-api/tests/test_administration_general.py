import random
import string
import sys
import utility_integration as util
import response_codes as codes
from utils.general_api import is_package_installed
from utils.ssh import get_ssh
sys.path.append("../../../../tests")

class test_administration_general(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def test_administration_general_base_functionality(self):
        base_url = "/system/config"
        original_data = None
        device = util.Env().device
        # x86 hostname is with a dash instead of underscore, so we need to replace it
        hostname = device.strip().replace("_", "-", 1)
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            x.assert_data([{
                ".type":"core",
                "id":"general",
                "lang_code":"en",
                "hostname":hostname,
                "devicename":device,
                "session_timeout": "1800",
                "api_session_timeout": "300",
                "data_analytics": "0",
                "notifications_enabled": "1",
                "alerts_enabled": "1",
            }], 200, ["advanced", "firstlogin"])
        with self.subTest("single_get"):
            x = self.get(base_url + "/general")
            original_data = x.resp.json()["data"]
            x.assert_data({
                ".type":"core",
                "id":"general",
                "lang_code":"en",
                "hostname":hostname,
                "devicename":device,
                "session_timeout": "1800",
                "api_session_timeout": "300",
                "data_analytics": "0",
                "notifications_enabled": "1",
                "alerts_enabled": "1",
            }, 200, ["advanced", "firstlogin"])
        with self.subTest("configure_administration_general"):
            put_data = {
                "lang_code":"en",
                "hostname":"test.com",
                "devicename":"integrationTest",
                "notifications_enabled": "0",
                "alerts_enabled": "0",
            }
            expected = {
                ".type":"core",
                "firstlogin":original_data["firstlogin"],
                "id":"general",
                "lang_code":"en",
                "hostname":"test.com",
                "devicename":"integrationTest",
                "session_timeout": "1800",
                "api_session_timeout": "300",
                "data_analytics": "0",
                "notifications_enabled": "0",
                "alerts_enabled": "0",
            }
            x = self.put_data(base_url + "/general", put_data)
            x.assert_data(expected, 200, ["advanced"])
        with self.subTest("get_configured"):
            x = self.get(base_url + "/general")
            expected = {
                ".type":"core",
                "firstlogin":original_data["firstlogin"],
                "id":"general",
                "lang_code":"en",
                "hostname":"test.com",
                "devicename":"integrationTest",
                "session_timeout": "1800",
                "api_session_timeout": "300",
                "data_analytics": "0",
                "notifications_enabled": "0",
                "alerts_enabled": "0",
            }
            x.assert_data(expected, 200, ["advanced"])
        with self.subTest("return_configuration"):
            if "id" in original_data:
                del original_data["id"]
            if "firstlogin" in original_data:
                del original_data["firstlogin"]
            x = self.put_data(base_url + "/general", original_data)
            x.assert_code(200)
        with self.subTest("check_readonly_firstlogin"):
            data = {
                "firstlogin":"1"
            }
            x = self.put_data(base_url + "/general", data)
            x.assert_error("firstlogin", "Option is readonly", 103)

    def test_firstlogin_password_change(self):
        base_url = "/system"
        def set_initial_password():
            self.ssh.send_cmd(f"echo root:{util.Env.password} | chpasswd")
            self.ssh.send_cmd(f"echo admin:{util.Env.password} | chpasswd")
            self.ssh.send_cmd("uci set vuci.main.firstlogin=0")
            self.ssh.send_cmd("uci commit vuci")
        with self.subTest("firstlogin_set_option"):
            self.ssh.send_cmd("uci set vuci.main.firstlogin=1")
            self.ssh.send_cmd("uci commit vuci")
        with self.subTest("firstlogin_change_to_same_password"):
            if util.Env.password != "admin01":
                x = self.post_data(base_url + "/actions/change_password_firstlogin", {
                    "password":util.Env.password,
                    "password_confirm":util.Env.password
                })
                x.assert_error("Validation", "Password is the same. Use a different new password.", 1)
        with self.subTest("firstlogin_change_to_random_password"):
            password = random.choice(string.ascii_uppercase) + ''.join(random.choice(string.ascii_lowercase) for _ in range(7)) + random.choice(string.punctuation) + random.choice(string.digits)
            x = self.post_data(base_url + "/actions/change_password_firstlogin", {
                "password":password,
                "password_confirm":password
            })
            x.assert_code(200)
        with self.subTest("firstlogin_reset_option"):
            self.ssh.send_cmd("uci set vuci.main.firstlogin=1")
            self.ssh.send_cmd("uci commit vuci")
        with self.subTest("firstlogin_change_to_initial_password"):
            if util.Env.password == "admin01":
                set_initial_password()
            else:
                x = self.post_data(base_url + "/actions/change_password_firstlogin", {
                    "password":util.Env.password,
                    "password_confirm":util.Env.password
                })
                if x.resp.status_code != 200:
                    set_initial_password()
                    self.fail(f"Failed to change to initial password: {x.resp.text}")
        with self.subTest("firstlogin_already_changed"):
            if util.Env.password != "admin01":
                x = self.post_data(base_url + "/actions/change_password_firstlogin", {
                    "password":util.Env.password,
                    "password_confirm":util.Env.password
                })
                x.assert_error("Request", "First login is already done and password is not expired.", codes.ResponseCodes.INCORRECT_REQUEST.val())

    def test_administration_general_deletion(self):
        x = self.delete("/system/config")
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
    def test_administration_general_creation(self):
        x = self.post_data("/system/config", {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)