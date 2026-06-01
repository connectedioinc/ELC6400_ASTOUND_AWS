import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import get_mobile_ids, generate_require_error_messages, get_modems
import response_codes as codes

RC = codes.ResponseCodes

class Azure(WrapTest):
    url = "/azure_iot_hub/config/device_1"
    
    def setUp(self):
        self.modems = get_modems(self)

        self.empty = {
            "enabled": "",
            "mqtt_topic": "",
            "mqtt_port": "",
            "msg_type": "mqtt",
            ".type": "azure_iothub",
            "mqtt_ip": "",
            "connection_string": "",
            "mqtt_username": "",
            "mqtt_password": "",
            "message_interval": ""
        }
        if len(self.modems) > 0:
            self.empty["gsm"] = ""
            self.empty["interface"] = ""

        self.mqtt = {
            "enabled": "0",
            "mqtt_topic": "test",
            "mqtt_topic": "test",
            "mqtt_port": "69",
            "enabled": "0",
            "msg_type": "mqtt",
            ".type": "azure_iothub",
            "mqtt_ip": "example.com",
            "connection_string": "test_connecntion_string",
            "mqtt_username": "test_username",
            "mqtt_password": "test_password"
        }

        self.gsm = {
            "enabled": "0",
            ".type": "azure_iothub",
            "msg_type": "gsmctl",
            "gsm": [
                "rsrq",
                "pinstate",
                "manuf",
                "bsent",
                "revision",
                "ecio",
                "sinr",
                "operator",
                "model",
                "imei",
                "imsi",
                "ipaddr",
                "iccid",
                "connstate",
                "cellid",
                "signal",
                "conntype",
                "rsrp",
                "netstate",
                "opernum",
                "serial",
                "brecv",
                "rscp",
                "pincount",
                "temp",
                "simstate"
            ],
            "connection_string": "asdadasd",
            "message_interval": "300",
            "interface": ""
        }

        x = self.put_data(self.url, self.empty)
        x.assert_data({
            "id": "device_1",
            ".type": "azure_iothub",
            "msg_type": "mqtt"
        }, 200)

    def test_mqtt_option(self):

        with self.subTest("update_with_mqtt_config"):
            x = self.put_data(self.url, self.mqtt)
            x.assert_data(self.mqtt, skippable_options=["id"])

        with self.subTest("clear_config"):
            x = self.put_data(self.url, self.empty)
            x.assert_data({
                ".type": "azure_iothub",
                "msg_type": "mqtt"
            }, skippable_options=["id"])

    def test_gsm_option(self):

        mobile_ids = get_mobile_ids(self)

        if len(mobile_ids) == 0:
            self.skipTest("requires modem")

        self.gsm["interface"] = mobile_ids[0]

        with self.subTest("update_with_gsm_config"):
            x = self.put_data(self.url, self.gsm)
            x.assert_data(self.gsm, skippable_options=["id", "gsm"])
            self.assertListEqual(self.gsm["gsm"], x.json["data"]["gsm"])

        with self.subTest("update_with_bad_gsm_config"):
            self.gsm["gsm"] = ["test"]
            error_msg = "Must be one of the following values [rsrq, pinstate, manuf, revision, ecio, sinr, conntype, model, imsi, ipaddr," \
                " opernum, cellid, signal, rsrp, imei, serial, netstate, rscp, pincount, modem, iccid, connstate, temp, operator, simstate, brecv, bsent]."
            del self.gsm["id"]
            x = self.put_data(self.url, self.gsm)
            x.assert_code(422)
            x.assert_error("gsm at index 1", error_msg, RC.INVALID_OPT.val())

        with self.subTest("clear_config"):
            x = self.put_data(self.url, self.empty)
            x.assert_data({
                "id": "device_1",
                ".type": "azure_iothub",
                "msg_type": "mqtt"
            }, 200)

    def test_require_dependecy(self):
        mobile_ids = get_mobile_ids(self)
        x = self.put(self.url, {"data": {"enabled": "1", "msg_type": ""}})
        self.assertListEqual(x.json["errors"], generate_require_error_messages('enabled', "device_1", ["msg_type", "connection_string"]))
        x = self.put(self.url, {"data": {"enabled": "1", "msg_type":"mqtt"}})
        self.assertListEqual(x.json["errors"], generate_require_error_messages('enabled', "device_1", ["connection_string"])
                             + generate_require_error_messages('msg_type', "device_1", ["mqtt_ip", "mqtt_port", "mqtt_topic"]))
        if len(mobile_ids) > 0:
            x = self.put(self.url, {"data": {"enabled": "1", "msg_type":"gsmctl"}})
            self.assertListEqual(x.json["errors"], generate_require_error_messages('enabled', "device_1", ["connection_string"])
                                 + generate_require_error_messages('msg_type', "device_1", ["message_interval", "interface", "gsm"]))
