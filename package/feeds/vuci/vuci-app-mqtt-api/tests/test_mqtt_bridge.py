import utility_integration as util
import sys
import time
from utils.general_api import generate_require_error_messages
from utils.ssh import open_ssh_connection, send_cmd
sys.path.append("../../../../tests")

BRIDGE_URL = "/mqtt/bridge/config"
TOPICS_URL = lambda sid: f"/mqtt/bridge/{sid}/topics/config"

class test_mqtt_bridge(util.WrapTest):
    sid = None

    def test_mqtt_bridge_crud(self):
        self.crud_test(BRIDGE_URL, {"client_enabled": "0",
                        "connection_name": "80085",
                        "bridge_protocol_version": "mqttv31",
                        "remote_addr": "1.1.1.1",
                        "remote_port": "55",
                        "use_remote_tls": "1",
                        "device_brg_files": "",
                        "bridge_cafile": "",
                        "bridge_certfile": "",
                        "bridge_keyfile": "",
                        "bridge_tls_version": "tlsv1",
                        "bridge_alpn": "manoalpnas",
                        "use_bridge_login": "1",
                        "remote_clientid": "s1fgh61",
                        "remote_username": "adfg ad56gf",
                        "remote_password": "set",
                        "try_private": "1",
                        "cleansession": "1",
                        "notifications": "1",
                        "notifications_local": "1",
                        "keepalive_interval": "456",
                        ".type": "bridge"},
                       {"client_enabled": "0",
                        "connection_name": "80085",
                        "bridge_protocol_version": "mqttv31",
                        "remote_addr": "1.1.1.1",
                        "remote_port": "55",
                        "use_remote_tls": "1",
                        "device_brg_files": "",
                        "bridge_cafile": "",
                        "bridge_certfile": "",
                        "bridge_keyfile": "",
                        "bridge_tls_version": "tlsv1",
                        "bridge_alpn": "manoalpnas",
                        "use_bridge_login": "1",
                        "remote_clientid": "djdgfhjd",
                        "remote_username": "hhg hgh",
                        "remote_password": "set",
                        "try_private": "0",
                        "cleansession": "0",
                        "notifications": "0",
                        "notifications_local": "0",
                        "keepalive_interval": "222",
                        ".type": "bridge"})

    def test_mqtt_bridge_custom_option_validations(self):
        sid = None
        topic_sid = None
        self.get(BRIDGE_URL) # for autoskip

        with self.subTest("create test section"):
            x = self.post_data(BRIDGE_URL, {"connection_name": "LLLol", "remote_addr": "1.1.1.1"})
            x.assert_code(201)
            sid = x.json["data"]["id"]

        with self.subTest("main test"):
            # "connection_name" option
            x = self.post_data(BRIDGE_URL, {"connection_name": "LLLol"})
            x.assert_code(422)

            # "client_enabled" option
            x = self.put_data(f"{BRIDGE_URL}/{sid}", {"client_enabled": "1"})
            x.assert_code(422)
            x = self.post_data(f"{BRIDGE_URL}", {"client_enabled": "1", "connection_name": "danfhjik"})
            x.assert_code(422)

            # test topics
            with self.subTest("create topic"):
                x = self.post_data(f"{TOPICS_URL(sid)}", {"topic": "le_topic"})
                x.assert_code(201)
                topic_sid = x.json["data"]["id"]

            with self.subTest("test topic related options"):
                x = self.put_data(f"{BRIDGE_URL}/{sid}", {"client_enabled": "1"})
                x.assert_code(200)

                x = self.put_data(f"{BRIDGE_URL}/{sid}", {"connection_name": "danfhjik"})
                x.assert_code(200)

                x = self.put_data(f"{BRIDGE_URL}/{sid}", {"client_enabled": "1"})
                x.assert_code(200)

                x = self.put_data(f"{BRIDGE_URL}/{sid}", {"connection_name": "gdfg", "client_enabled": "1"})
                x.assert_code(200)


        with self.subTest("delete test section"):
            x = self.delete(f"{BRIDGE_URL}/{sid}")
            x.assert_code(200)

        if sid != None:
            with self.subTest("test if related topic was deleted"):
                with open_ssh_connection() as ssh:
                    res = send_cmd(ssh, "grep \"option connection_name 'LLLol'\" /etc/config/mosquitto ; echo $?")
                    self.assertEqual(res.strip(), "1")

    def test_require_enable_dependecy(self):
        sid = None
        with self.subTest("create test section"):
            x = self.post_data(BRIDGE_URL, {"connection_name": "LLLol"})
            x.assert_code(201)
            sid = x.json["data"]["id"]

        with self.subTest("create topic"):
                x = self.post_data(f"{TOPICS_URL(sid)}", {"topic": "le_topic"})
                x.assert_code(201)

        with self.subTest("check dependecy"):
            x = self.put_data(f"{BRIDGE_URL}/{sid}", {
                "client_enabled": "1",
                "remote_port": "",
                "bridge_protocol_version": "",
                "remote_addr": ""
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("client_enabled", sid, ["bridge_protocol_version", "remote_addr", "remote_port"]))
            x = self.put_data(f"{BRIDGE_URL}/{sid}", {
                "client_enabled": "1",
                "use_remote_tls": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("client_enabled", sid, ["remote_addr", "bridge_cafile", "bridge_tls_version"]))
            x = self.put_data(f"{BRIDGE_URL}/{sid}", {
                "client_enabled": "1",
                "use_bridge_login": "1",
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("client_enabled", sid, ["remote_addr", "remote_clientid"]))

        with self.subTest("delete test section"):
            x = self.delete(f"{BRIDGE_URL}/{sid}")
            x.assert_code(200)
