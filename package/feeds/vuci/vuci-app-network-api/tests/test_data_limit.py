import sys
sys.path.append("../../../../tests")
import utility_integration as util
from response_codes import ResponseCodes
from utils.general_api import get_board, get_modems
from utils.ssh import get_ssh

class TestDataLimit(util.WrapTest):
    base_url = "/data_limit"
    rate_limit = True
    modems = []

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls):
        cls.ssh.logout()

    def setUp(self):
        self.rate_limit = self.ssh.send_cmd("ls /sys/quota &> /dev/null; echo $?").strip() == "1"
        board_json = get_board(self)
        if not "mobile" in board_json["hwinfo"] or not board_json["hwinfo"]["mobile"]:
            self.skipTest("Device does not support GSM")
        self.modems = get_modems(self)

    def test_data_limit(self):
        endpoint = self.base_url + "/config"
        interface_endpoint = "/interfaces/config"
        mobile_if_name = ""

        if len(self.modems) == 0:
            self.skipTest("No modems found")

        m = self.modems[0]
        multi_apn = m["multi_apn"]
        old_interface = [i for i in self.get(interface_endpoint).resp.json()["data"] if i["proto"] == "wwan" and i["modem"] == m["id"]][0]

        new_device_post_data = {}
        if len(self.modems) > 1:
            new_device_post_data = {
                "proto" : "wwan",
                "sim" : "1",
                "area_type" : "wan",
                "modem" : m["id"]
            }
        else:
            new_device_post_data = {
                "proto" : "wwan",
                "sim" : "1",
                "area_type" : "wan",
            }

        if multi_apn != True:
            x = self.put_data(interface_endpoint, [{
                "id": old_interface["id"],
                "enabled": "0"
            }])
            x.assert_code(200)

        with self.subTest("Create new mobile interface"):
            x = self.post_data(interface_endpoint, new_device_post_data)
            x.assert_code(201)

            resp_json = x.resp.json()["data"]

            if "id" in resp_json:
                mobile_if_name = resp_json["id"]
        
        with self.subTest("Data limit get config"):
            x = self.get(endpoint + "/" + mobile_if_name)
            x.assert_data({
                "id": mobile_if_name,
                ".type": "interface"
            })

        with self.subTest("Data limit post config"):
            x = self.post_data(endpoint, {
                "id" : "nonExistantIf",
                "enabled" : "1",
                "data_limit" : "1024",
            })
            x.assert_code(422)
            
        with self.subTest("Data limit put config"):
            x = self.put_data(endpoint, [{
                "id" : mobile_if_name,
                "enabled" : "1",
                "data_limit" : "2048",
                "period": "week",
                "reset_day": "2",
                "reset_hour": "13",
                "reset_weekday": "2",
                "enable_warning": "1",
                "warning_limit" : "256",
                "warning_num" : "+37067777777"  
            }])
            x.assert_code(200)
            x.assert_data([{
                "enabled" : "1",
                ".type" : "interface",
                "reset_hour": "13",
                "id" : mobile_if_name,
                "data_limit" : "2048",
                "enable_warning": "1",
                "period": "week",
                "reset_day": "2",
                "warning_limit" : "256",
                "reset_weekday": "2",
                "warning_num" : "+37067777777"  
            }])

        with self.subTest("Data limit put config rate limit invalid"):
            if not self.rate_limit:
                self.skipTest("Rate limit not supported on this device")
            x = self.put_data(endpoint, [{
                "id": mobile_if_name,
                "enabled": "1",
                "data_limit": "2048",
                "period": "week",
                "reset_day": "2",
                "reset_hour": "13",
                "reset_weekday": "2",
                "enable_warning": "1",
                "warning_limit": "256",
                "warning_num": "+37067777777",
                "enable_rate_limit": "1"
            }])

            x.assert_error("enable_rate_limit", "Missing required option: rate_limit_rx", 103)
            x = self.put_data(endpoint, [{
                "id": mobile_if_name,
                "enabled": "1",
                "data_limit": "2048",
                "period": "week",
                "reset_day": "2",
                "reset_hour": "13",
                "reset_weekday": "2",
                "enable_warning": "1",
                "warning_limit": "256",
                "warning_num": "+37067777777",
                "enable_rate_limit": "1",
                "rate_limit_rx": "1000"
            }])
            x.assert_error("enable_rate_limit", "Missing required option: rate_limit_tx", 103)

        with self.subTest("Data limit put config rate limit valid"):
            if not self.rate_limit:
                self.skipTest("Rate limit not supported on this device")
            x = self.put_data(endpoint, [{
                "id": mobile_if_name,
                "enabled": "1",
                "data_limit": "2048",
                "period": "week",
                "reset_day": "2",
                "reset_hour": "13",
                "reset_weekday": "2",
                "enable_warning": "1",
                "warning_limit": "256",
                "warning_num": "+37067777777",
                "enable_rate_limit": "1",
                "rate_limit_rx": "1000",
                "rate_limit_tx": "1000"
            }])
            x.assert_data([{
                "enabled": "1",
                ".type": "interface",
                "reset_hour": "13",
                "id": mobile_if_name,
                "data_limit": "2048",
                "enable_warning": "1",
                "period": "week",
                "reset_day": "2",
                "warning_limit": "256",
                "reset_weekday": "2",
                "warning_num": "+37067777777",
                "enable_rate_limit": "1",
                "rate_limit_rx": "1000",
                "rate_limit_tx": "1000"
            }])

        with self.subTest("Data limit delete config"):
            x = self.delete_data(endpoint, [mobile_if_name])
            x.assert_code(200)

        with self.subTest("Data limit get config with id"):
            x = self.post_data(endpoint, {
                "id" : mobile_if_name,
                "enabled" : "1",
                "data_limit" : "1024",
                "period": "day",
                "reset_day": "1",
                "reset_hour": "12",
                "reset_weekday": "1",
                "enable_warning": "0",
                "warning_limit" : "512",
                "warning_num" : "+37065555555"  
            })
            x.assert_code(201)
            endpoint = endpoint + "/" + mobile_if_name

            x = self.get(endpoint)
            x.assert_code(200)

        with self.subTest("Data limit put config with id"):
            x = self.put_data(endpoint, {
                "enabled" : "1",
                "data_limit" : "12345678",
                "period": "day",
                "reset_day": "2",
                "reset_hour": "13",
                "reset_weekday": "2",
                "enable_warning": "1",
                "warning_limit" : "5120",
                "warning_num" : "+37068888888"  
            })

            x.assert_data({
                "enabled" : "1",
                ".type" : "interface",
                "reset_hour": "13",
                "id" : mobile_if_name,
                "data_limit" : "12345678",
                "enable_warning": "1",
                "period": "day",
                "reset_day": "2",
                "warning_limit" : "5120",
                "reset_weekday": "2",
                "warning_num" : "+37068888888"  
            })

            x = self.put_data(endpoint + "invalid", {
                "enabled" : "1",
                "data_limit" : "12345678",
                "period": "day",
                "reset_day": "2",
                "reset_hour": "13",
                "reset_weekday": "2",
                "enable_warning": "1",
                "warning_limit" : "5120",
                "warning_num" : "+37068888888"  
            })

            x.assert_code(404)

        with self.subTest("Data limit status"):
            x = self.get(self.base_url + "/status")
            x.assert_code(200)
            x = self.get(self.base_url + "/status/" + mobile_if_name)
            x.assert_code(200)
            x = self.get(self.base_url + "/status/invalid")
            x.assert_code(404)

        with self.subTest("Data limit clear limit"):
            x = self.post_data(self.base_url + "/actions/clear", {
                "interface" : mobile_if_name
            })
            x.assert_code(200)

            x = self.post_data(self.base_url + "/actions/clear", {
                "interface" : "invalid"
            })
            x.assert_code(422)


        with self.subTest("Data limit delete config id"):
            x = self.delete(endpoint)
            x.assert_code(200)
            x = self.delete(endpoint + "invalid")
            x.assert_code(404)

        with self.subTest("Delete the mobile interface"):
            x = self.delete_data(interface_endpoint, [mobile_if_name])
            x.assert_code(200)

        if multi_apn != "1":
            with self.subTest("Reenable original mobile interface"):
                self.put_data(interface_endpoint, [{
                    "id": old_interface["id"],
                    "enabled": "1",
                    "auto_apn": "1"
                }])
                x.assert_code(200)