import io
import json
from response_codes import ResponseCodes
from utils.general_api import generate_require_error_messages
import utility_integration as util
import sys

from utils.ssh import open_ssh_connection

sys.path.append("../../../../tests")

BROKER_GENERAL_URL = "/mqtt/broker/config/mqtt"
BROKER_URL = "/mqtt/broker/config"

AVAILABLE_OPTS = {"enabled": "",
                  "local_port": "",
                  "allow_ra": "",
                  "use_tls_ssl": "",
                  "tls_type": "",
                  "tls_version": "",
                  "psk": "",
                  "identity": "",
                  "persistence": "",
                  "anonymous_access": "",
                  "device_sec_files": "",
                  "ca_file": "",
                  "cert_file": "",
                  "key_file": "",
                  "acl_file_path": "",
                  "password_file": "",
                  "max_queued_messages": "",
                  "max_packet_size": "",
                  "require_certificate": ""}

class test_mqtt_broker(util.WrapTest):

    def setUp(self) -> None:
        self.default_cfg = None
        x = self.get(BROKER_GENERAL_URL)
        x.assert_code(200)
        self.default_cfg = x.json["data"]

    def tearDown(self) -> None:
        cfg = {}
        for opt in AVAILABLE_OPTS:
            cfg[opt] = self.default_cfg.get(opt) or ""
        cfg["psk"] = "abc154d"
        x = self.put_data(BROKER_GENERAL_URL, cfg)
        x.assert_code(200)
        self.default_cfg["psk"] = "abc154d"
        x.assert_data(self.default_cfg)

    def get_fw_rule(self, ssh):
        res = ssh.send_cmd("""ubus call uci get '{"config":"firewall"}'""")
        fw_cfg = json.loads(res)["values"]
        fw_rule = None
        for sid in fw_cfg:
            if fw_cfg[sid][".type"] == "rule" and fw_cfg[sid]["name"] == "Enable_MQTT_WAN":
                fw_rule = fw_cfg[sid]
                break
        return fw_rule

    def test_mqtt_broker_PUT(self):
        data = {"enabled": "1",
                ".type": "mqtt",
                "local_port": ["555"],
                "allow_ra": "1",
                "use_tls_ssl": "1",
                "tls_type": "psk",
                "tls_version": "all",
                "psk": "abc154d",
                "identity": "8oo8",
                "persistence": "1",
                "anonymous_access": "1",
                "device_sec_files": "",
                "ca_file": "",
                "cert_file": "",
                "key_file": "",
                "acl_file_path": "",
                "password_file": "",
                "max_queued_messages": "50",
                "max_packet_size": "65121",
                "require_certificate": "0"}
        data_check = {}
        for k in data:
            if len(data[k]) > 0:
                data_check[k] = data[k]
        x = self.put_data(BROKER_GENERAL_URL, data)
        x.assert_code(200)
        x.assert_data(data_check, skippable_options=["id", ".type"])

    def test_mqtt_broker_custom_options(self):
        with open_ssh_connection() as ssh:
            # "allow_ra" option
            x = self.put_data(BROKER_GENERAL_URL, {
                "enabled": "1",
                "local_port": ["1883"],
                "allow_ra": "1",
                "anonymous_access": "1"
            })
            x.assert_code(200)
            self.assertEqual(x.json["data"]["allow_ra"], "1")
            fw_rule = self.get_fw_rule(ssh)
            self.assertTrue(fw_rule)
            self.assertEqual(fw_rule["enabled"], "1")

            x = self.put_data(BROKER_GENERAL_URL, {"allow_ra": "0"})
            x.assert_code(200)
            self.assertEqual(x.json["data"]["allow_ra"], "0")
            fw_rule = self.get_fw_rule(ssh)
            self.assertTrue(fw_rule)
            self.assertEqual(fw_rule["enabled"], "0")

            # "max_packet_size" option
            x = self.put_data(BROKER_GENERAL_URL, {"max_packet_size": ""})
            x.assert_code(200)
            self.assertEqual(x.json["data"]["max_packet_size"], "1048576")

            # "upload" options
            # x = self.send_file(BROKER_GENERAL_URL, io.StringIO("invalid file\n"), "ca_file")
            # x.assert_code(422)
            # x = self.send_file(BROKER_GENERAL_URL, io.StringIO("invalid file\n"), "cert_file")
            # x.assert_code(422)
            # x = self.send_file(BROKER_GENERAL_URL, io.StringIO("invalid file\n"), "key_file")
            # x.assert_code(422)
            x = self.send_file(BROKER_GENERAL_URL, io.StringIO("valid file\n"), "acl_file_path")
            x.assert_code(200)
            x = self.send_file(BROKER_GENERAL_URL, io.StringIO("valid file\n"), "password_file")
            x.assert_code(200)


    def test_mqtt_broker_deletion(self):
        x = self.delete(BROKER_GENERAL_URL)
        x.assert_error("Validation", "Section deletion is not allowed", ResponseCodes.NO_DELETE.val())
    def test_mqtt_broker_creation(self):
        x = self.post_data(BROKER_URL, {})
        x.assert_error("Validation", "Section creation is not allowed", ResponseCodes.NO_CREATE.val())

    def test_require_enable_dependecy(self):
        with self.subTest("clear confing"):
            x = self.put_data(BROKER_GENERAL_URL, AVAILABLE_OPTS).assert_code(200)

        with self.subTest("check dependecy"):
            x = self.put_data(BROKER_GENERAL_URL, {
                "enabled": "1",
                "anonymous_access": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt", ["local_port"]))
            x = self.put_data(BROKER_GENERAL_URL, {
                "enabled": "1",
                "use_tls_ssl": "1",
                "anonymous_access": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt", ["local_port", "tls_type"]))
            x = self.put_data(BROKER_GENERAL_URL, {
                "enabled": "1",
                "use_tls_ssl": "1",
                "tls_type": "psk",
                "anonymous_access": "1"
                
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt", ["psk", "local_port", "identity"]))
            x = self.put_data(BROKER_GENERAL_URL, {
                "enabled": "1",
                "use_tls_ssl": "1",
                "tls_type": "cert",
                "anonymous_access": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt", ["local_port", "ca_file", "cert_file", "key_file", "tls_version"]))

