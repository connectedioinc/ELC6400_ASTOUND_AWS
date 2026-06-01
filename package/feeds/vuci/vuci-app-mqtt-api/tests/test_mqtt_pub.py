import io
from response_codes import ResponseCodes
from utils.general_api import generate_require_error_messages, get_modems
import utility_integration as util
import sys

sys.path.append("../../../../tests")

PUB_GENERAL_URL = "/mqtt/publisher/config/mqtt_pub"
PUB_URL = "/mqtt/publisher/config"

AVAILABLE_OPTS = {"enabled": "",
                  "device_files": "",
                  "remote_addr": "",
                  "remote_port": "",
                  "modem_id": "",
                  "username": "",
                  "password": "",
                  "tls": "",
                  "tls_type": "",
                  "tls_insecure": "",
                  "cafile": "",
                  "certfile": "",
                  "keyfile": "",
                  "psk": "",
                  "identity": ""}

class test_mqtt_pub(util.WrapTest):

    def setUp(self) -> None:
        self.default_cfg = None
        x = self.get(PUB_GENERAL_URL)
        x.assert_code(200)
        self.default_cfg = x.json["data"]

    def tearDown(self) -> None:
        cfg = {}
        for opt in AVAILABLE_OPTS:
            cfg[opt] = self.default_cfg.get(opt) or ""
        cfg["psk"] = ""
        x = self.put_data(PUB_GENERAL_URL, cfg)
        x.assert_code(200)
        x.assert_data(self.default_cfg)

    def test_mqtt_pub_PUT(self):
        data = {"enabled": "1",
                  "device_files": "",
                  "remote_addr": "1.1.1.1",
                  "remote_port": "220",
                  "modem_id": "",
                  "username": "wergt",
                  "password": "gerga",
                  "tls": "1",
                  "tls_type": "psk",
                  "tls_insecure": "1",
                  "cafile": "",
                  "certfile": "",
                  "keyfile": "",
                  "psk": "abc5416d51",
                  "identity": "ghsfghf"}
        modems = get_modems(self)
        if len(modems) > 1:
            data["modem_id"] = modems[0]["id"]
        data_check = {}
        for k in data:
            if len(data[k]) > 0:
                data_check[k] = data[k]
        x = self.put_data(PUB_GENERAL_URL, data)
        x.assert_code(200)
        x.assert_data(data_check, skippable_options=["id", ".type"])

    def test_mqtt_custom_options(self):
        # "psk" option
        x = self.put_data(PUB_GENERAL_URL, {"psk": "0xabc"})
        x.assert_code(422)
        x = self.put_data(PUB_GENERAL_URL, {"psk": "lOOOOL"})
        x.assert_code(422)
        x = self.put_data(PUB_GENERAL_URL, {"psk": "abcdef1234567890"})
        x.assert_code(200)

        # # upload options
        # x = self.send_file(PUB_GENERAL_URL, io.StringIO("invalid file\n"), "cafile")
        # x.assert_code(422)
        # x = self.send_file(PUB_GENERAL_URL, io.StringIO("invalid file\n"), "certfile")
        # x.assert_code(422)
        # x = self.send_file(PUB_GENERAL_URL, io.StringIO("invalid file\n"), "keyfile")
        # x.assert_code(422)

        # custom requires
        x = self.put_data(PUB_GENERAL_URL, {"enabled": "1", "tls_insecure": "1", "tls": "1", "tls_type": "psk", "psk": "", "identity": ""})
        x.assert_code(422)
        x = self.put_data(PUB_GENERAL_URL, {"enabled": "1", "tls_insecure": "1", "tls": "1", "tls_type": "psk", "psk": ""})
        x.assert_code(422)
        x = self.put_data(PUB_GENERAL_URL, {"enabled": "1", "tls_insecure": "1", "tls": "1", "tls_type": "psk", "identity": ""})
        x.assert_code(422)
        x = self.put_data(PUB_GENERAL_URL, {"enabled": "1", "tls_insecure": "1", "tls": "1", "tls_type": "cert", "cafile": ""})
        x.assert_code(422)
        x = self.put_data(PUB_GENERAL_URL, {"enabled": "1", "tls_insecure": "0", "tls": "1", "tls_type": "cert", "cafile": "", "certfile": "", "keyfile": ""})
        x.assert_code(422)
        x = self.put_data(PUB_GENERAL_URL, {"enabled": "1", "tls_insecure": "0", "tls": "1", "tls_type": "cert", "cafile": ""})
        x.assert_code(422)

    def test_mqtt_pub_deletion(self):
        x = self.delete(PUB_GENERAL_URL)
        x.assert_error("Validation", "Section deletion is not allowed", ResponseCodes.NO_DELETE.val())
    def test_mqtt_pub_creation(self):
        x = self.post_data(PUB_URL, {})
        x.assert_error("Validation", "Section creation is not allowed", ResponseCodes.NO_CREATE.val())

    def test_require_enable_dependecy(self):
        with self.subTest("clear confing"):
            x = self.put_data(PUB_GENERAL_URL, AVAILABLE_OPTS).assert_code(200)

        with self.subTest("check dependecy"):
            modems = get_modems(self)
            if len(modems) > 1:
                x = self.put_data(PUB_GENERAL_URL, {
                    "enabled": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt_pub", ["remote_addr", "remote_port", "modem_id"]))
                x = self.put_data(PUB_GENERAL_URL, {
                    "enabled": "1",
                    "tls": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt_pub", ["remote_addr", "remote_port", "tls_type", "modem_id"]))
                x = self.put_data(PUB_GENERAL_URL, {
                    "enabled": "1",
                    "tls": "1",
                    "tls_type": "psk"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt_pub", ["remote_addr", "remote_port", "psk", "identity", "modem_id"]))
                x = self.put_data(PUB_GENERAL_URL, {
                    "enabled": "1",
                    "tls": "1",
                    "tls_type": "cert"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt_pub", ["remote_addr", "remote_port", "cafile", "modem_id"]))
            else:
                x = self.put_data(PUB_GENERAL_URL, {
                    "enabled": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt_pub", ["remote_addr", "remote_port"]))
                x = self.put_data(PUB_GENERAL_URL, {
                    "enabled": "1",
                    "tls": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt_pub", ["remote_addr", "remote_port", "tls_type"]))
                x = self.put_data(PUB_GENERAL_URL, {
                    "enabled": "1",
                    "tls": "1",
                    "tls_type": "psk"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt_pub", ["psk", "remote_addr", "remote_port", "identity"]))
                x = self.put_data(PUB_GENERAL_URL, {
                    "enabled": "1",
                    "tls": "1",
                    "tls_type": "cert"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "mqtt_pub", ["remote_addr", "remote_port", "cafile"]))