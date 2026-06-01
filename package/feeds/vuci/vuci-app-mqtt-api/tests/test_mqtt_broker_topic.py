import utility_integration as util
import sys
sys.path.append("../../../../tests")

BRIDGE_URL = "/mqtt/bridge/config"
TOPICS_URL = lambda sid: f"/mqtt/bridge/{sid}/topics/config"

class test_mqtt_broker_topic(util.WrapTest):

    def test_mqtt_broker_topic_crud(self):
        bridge_sid = None
        with self.subTest("create bridge section"):
            x = self.post_data(BRIDGE_URL, {"connection_name": "LLLol"})
            x.assert_code(201)
            bridge_sid = x.json["data"]["id"]

        with self.subTest("main test"):
            self.crud_test(TOPICS_URL(bridge_sid), {"topic": "gdsfgsdfg",
                                                    ".type": "topic",
                                                    "direction": "both",
                                                    "qos": "1"},
                                                    {"topic": "ggghb",
                                                    ".type": "topic",
                                                    "direction": "in",
                                                    "qos": "2"})

        with self.subTest("delete bridge section"):
            x = self.delete(f"{BRIDGE_URL}/{bridge_sid}")
            x.assert_code(200)

    def test_mqtt_broker_topic_custom_validations(self):
        br_sid = None
        with self.subTest("create bridge section"):
            x = self.post_data(BRIDGE_URL, {"connection_name": "LLLol"})
            x.assert_code(201)
            br_sid = x.json["data"]["id"]

        with self.subTest("test parent section exists validation"):
            x = self.post_data(TOPICS_URL("ggg"), {"topic": "testtt123"})
            x.assert_code(404)

        with self.subTest("test parent section correct type validation"):
            x = self.post_data(TOPICS_URL(br_sid), {"topic": "testtt123"})
            x.assert_code(201)
            topic_sid = x.json["data"]["id"]

            x = self.post_data(TOPICS_URL(topic_sid), {"topic": "testtfdt123"})
            x.assert_code(404)

        with self.subTest("test topic validation"):
            x = self.post_data(TOPICS_URL(br_sid), {"topic": "testtt123"})
            x.assert_code(422)

        with self.subTest("delete bridge section"):
            x = self.delete(f"{BRIDGE_URL}/{br_sid}")
            x.assert_code(200)
