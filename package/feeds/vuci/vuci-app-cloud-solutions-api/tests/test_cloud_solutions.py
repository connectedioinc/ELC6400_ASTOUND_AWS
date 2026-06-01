import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import get_mnfinfo, generate_require_error_messages
from utils.ssh import open_ssh_connection, pgrep
from time import sleep
from datetime import datetime

RMS_INTERNAL_URL = "/rms/internal/config/rms_mqtt"

class test_cloud_solutions(WrapTest):
    url = "/rms/config/rms_connect_mqtt"
    status = "/rms/status"

    empty = {
        "enable": "",
        "remote": "",
        "port": ""
    }

    default = {
        "enable": "0",
        "remote": "rms.teltonika-networks.com",
        "port": "15009",
        ".type": "rms_connect_mqtt"
    }

    update = {
        "enable": "2",
        "remote": "rms.com",
        "port": "6969",
        ".type": "rms_connect_mqtt"
    }

    enable_check = {
        "enable": "1",
        "remote": "",
        "port": "",
        ".type": "rms_connect_mqtt"
    }

    def setUp(self):
        x = self.put_data(self.url, self.empty)
        x.assert_data({
            "id": "rms_connect_mqtt",
            ".type": "rms_connect_mqtt"
        }, 200)

    def test_basic(self):

        with self.subTest("set_to_modify_values"):
            x = self.put_data(self.url, self.update)
            x.assert_data({**self.update, "id": "rms_connect_mqtt"}, 200)

        with self.subTest("set_to_default_values"):
            x = self.put_data(self.url, self.default)
            x.assert_data({**self.default, "id": "rms_connect_mqtt"}, 200)

    def test_require_depend_on_enable(self):
        with self.subTest("set_to_empty_values"):
            x = self.put_data(self.url, self.empty)
            x.assert_data({
                "id": "rms_connect_mqtt",
                ".type": "rms_connect_mqtt"
            }, 200)

        with self.subTest("set_to_enable_values"):
            x = self.put_data(self.url, self.enable_check)
            self.assertListEqual(x.json["errors"], generate_require_error_messages('enable', "rms_connect_mqtt", ["remote", "port"]))
        
    def test_status(self):

        mnfinfo = get_mnfinfo(self)

        with self.subTest("set_to_default_values"):
            x = self.put_data(self.url, self.default)
            x.assert_data({**self.default, "id": "rms_connect_mqtt"}, 200)

        with self.subTest("check_default_config_status"):
            changed_status = False
            started_time = datetime.now()
            
            while ((datetime.now() - started_time).total_seconds()) < 5:
                x = self.get(self.status)
                data = x.resp.json()["data"]
                if not ("error" in data):
                    x.assert_data({
                        "lan_mac": mnfinfo["mac"].upper(),
                        "serial_nbr" : mnfinfo["serial"],
                        "status": "0"
                    }, 200)
                    changed_status = True
                    break
                sleep(0.1)

            if not changed_status:
                self.fail("Connection state does not change to 'disabled'")
            

        with self.subTest("check_connect_action"):
            self.default["enable"] = "1"
            x = self.put_data(self.url, self.default)
            x.assert_data({**self.default, "id": "rms_connect_mqtt"}, 200)

            changed_status = False
            started_time = datetime.now()
            
            while ((datetime.now() - started_time).total_seconds()) < 5:
                x = self.get(self.status)
                data = x.resp.json()["data"]
                if "msg" in data and data["msg"] == "Connecting":
                    x.assert_data({
                        "msg": "Connecting",
                        "serial_nbr": mnfinfo["serial"],
                        "lan_mac": mnfinfo["mac"].upper(),
                        "next_try": "0",
                        "status": self.default["enable"], 
                        "connection_state": "2",
                        "error": "0"
                    }, 200)
                    changed_status = True
                    break
                sleep(0.1)

            if not changed_status:
                self.fail("Connection state does not change to 'connecting'")

    def test_rms_internal_commit_without_reload_event(self):
        with open_ssh_connection() as ssh:
            with self.subTest(""):
                self.put_data(self.url, {
                    "enable": "2",
                    "remote": "rms.teltonika-networks.com",
                    "port": "15009",
                    ".type": "rms_connect_mqtt"
                }).assert_code(200)
                sleep(2)

            pid1 = pgrep(ssh, "rms_mqtt")

            initial_id = ""
            with self.subTest(""):
                x = self.get(RMS_INTERNAL_URL)
                initial_id = x.json["data"].get("demo_rms_id", "")

            with self.subTest(""):
                self.put_data(RMS_INTERNAL_URL, {
                    "demo_rms_id": "ababa"
                }).assert_code(200)
                sleep(2)

            with self.subTest(""):
                pid2 = pgrep(ssh, "rms_mqtt")
                self.assertEqual(pid1, pid2, "rms_mqtt must not restart")

            with self.subTest(""):
                self.put_data(RMS_INTERNAL_URL, {
                    "demo_rms_id": initial_id
                }).assert_code(200)