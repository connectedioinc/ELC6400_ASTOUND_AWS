import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes
from utils.ssh import get_ssh

RC = codes.ResponseCodes

class test_wol(util.WrapTest):
    url = "/wol"

    STATUS_CODES = {
        "WAKE_FAILED": 1,
        "VALIDATION_FAILED": 2,
        "MULTI_VALIDATION_FAILED": 3,
    }

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def create_device_config(self, name: str, mac: str):
        resp = self.post_data(f"{self.url}/config", {
            "password": "AABBCCDDEEFF",
            ".type": "target",
            "name": name,
            "mac": mac,
            "wakeonboot": "1"
        })
        js = resp.resp.json()
        resp.assert_code(201)
        return js['data']['id']

    def delete_device_config(self, id: str):
        resp = self.delete(f"{self.url}/config/{id}")
        resp.assert_code(200)

    def test_wol_base_functionality(self):
        with self.subTest("get_setup_config"):
            x = self.get(self.url + "/global")
            x.assert_data({
                "broadcast": "off",
                "interface": "br-lan",
            })
        with self.subTest("edit_setup_config"):
            x = self.put_data(self.url + "/global", {
                "broadcast": "on",
                ".type": "etherwake"
            })
            x.assert_data({
                "broadcast": "on",
                "interface": "br-lan",
            })
        with self.subTest("set_setup_default_config"):
            x = self.put_data(self.url + "/global", {
                "broadcast": "off",
                ".type": "etherwake"
            })
            x.assert_data({
                "broadcast": "off",
                "interface": "br-lan",
            })
        with self.subTest("interface_validation"):
            x = self.put_data(self.url + "/global", {
                "interface": "invalid",
                ".type": "etherwake"
            })
            x.assert_error("interface", "Must be one of the following values [br-lan].", RC.INVALID_OPT.val())
        with self.subTest("devices_crud"):
            self.crud_test(self.url + "/config", {
                "password": "AABBCCDDEEFF",
                ".type": "target",
                "name": "testName",
                "mac": "11:22:33:44:55:69",
                "wakeonboot": "1"
            }, {
                "password": "FFEEDDCCBBAA",
                ".type": "target",
                "name": "example2",
                "mac": "11:22:33:44:55:69",
                "wakeonboot": "0"
            })

    def test_wol_wake_devices(self):
        with self.subTest("wake_device_empty_name"):
            x = self.post_data(self.url + "/actions/wake_device", {})
            x.assert_error("name", "Missing required option: name", RC.INVALID_OPT.val())
        with self.subTest("wake_device_empty_mac"):
            x = self.post_data(self.url + "/actions/wake_device", {
                "name": "test"
            })
            x.assert_error("mac", "Missing required option: mac", RC.INVALID_OPT.val())
        with self.subTest("wake_device_invalid_name"):
            x = self.post_data(self.url + "/actions/wake_device", {
                "name": "test",
                "mac": "11:22:33:44:55:66"
            })
            x.assert_error("name", "Must be one of the following values [example].", RC.INVALID_OPT.val())
        with self.subTest("wake_device_invalid_mac"):
            x = self.post_data(self.url + "/actions/wake_device", {
                "name": "example",
                "mac": "test"
            })
            x.assert_error("mac", "Must be one of the following values [11:22:33:44:55:66].", RC.INVALID_OPT.val())
        with self.subTest("wake_device_action"):
            x = self.post_data(self.url + "/actions/wake_device", {
                "name": "example",
                "mac": "11:22:33:44:55:66"
            })
            x.assert_data({
                "status": RC.OK.val()
            })
        with self.subTest("wake_device_password_validation"):
            id = self.create_device_config("testConfig", "11:22:33:44:55:77")
            # Fake config to fail service start
            self.ssh.send_cmd("uci set etherwake.@target[-1].password=1; uci commit")

            x = self.post_data(self.url + "/actions/wake_device", {
                "name": "testConfig",
                "mac": "11:22:33:44:55:77"
            })
            resp = x.resp.json()
            self.delete_device_config(id)

            self.assertEqual(resp["errors"][0]["status"], self.STATUS_CODES["VALIDATION_FAILED"])
            self.assertEqual(resp["errors"][0]["error"], "Password validation failed.")
        with self.subTest("wake_all_devices_action"):
            id1 = self.create_device_config("testConfig1", "11:22:33:44:55:77")
            id2 = self.create_device_config("testConfig2", "11:22:33:44:55:78")

            x = self.post(self.url + "/actions/wake_all_devices")

            self.delete_device_config(id2)

            self.delete_device_config(id1)
            x.assert_data({
                "status": RC.OK.val()
            })
        with self.subTest("wake_all_devices_failed"):
            id1 = self.create_device_config("testConfig1", "11:22:33:44:55:77")
            # Fake config to fail service start
            self.ssh.send_cmd("uci set etherwake.@target[-1].mac=1; uci commit")

            id2 = self.create_device_config("testConfig2", "11:22:33:44:55:78")
            # Fake config to fail service start
            self.ssh.send_cmd("uci set etherwake.@target[-1].mac=1; uci commit")

            x = self.post(self.url + "/actions/wake_all_devices")
            resp = x.resp.json()
            self.delete_device_config(id2)
            self.delete_device_config(id1)

            self.assertEqual(resp["errors"][0]["status"], self.STATUS_CODES["WAKE_FAILED"])
            self.assertEqual(resp["errors"][0]["error"], "Failed to wake 'testConfig1, testConfig2' device(s)")
        with self.subTest("wake_all_devices_failed_and_validation"):
            id1 = self.create_device_config("testConfig1", "11:22:33:44:55:77")
            # Fake config to fail service start
            self.ssh.send_cmd("uci set etherwake.@target[-1].mac=1; uci commit")

            id2 = self.create_device_config("testConfig2", "11:22:33:44:55:78")
            # Fake config to fail service start
            self.ssh.send_cmd("uci set etherwake.@target[-1].password=1; uci commit")

            x = self.post(self.url + "/actions/wake_all_devices")
            resp = x.resp.json()
            self.delete_device_config(id2)
            self.delete_device_config(id1)

            self.assertEqual(resp["errors"][0]["status"], self.STATUS_CODES["MULTI_VALIDATION_FAILED"])
            self.assertEqual(resp["errors"][0]["error"], "Password validation failed for testConfig2 and failed to wake testConfig1 device(s)")
