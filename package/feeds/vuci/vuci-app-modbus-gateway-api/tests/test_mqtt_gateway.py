import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest

class MQTTGateway(WrapTest):
    url = "/modbus/gateway/config/general"

    def test_basic_update(self):
        self.put_data(self.url, {
            "client_id": "42",
            "enabled": "1",
            "host": "127.0.0.1",
            "keepalive": "5",
            "pass": "jenkins",
            "port": "1883",
            "request": "request",
            "response": "response",
            "tls": "0",
            "qos": "0",
            "user": "bobby"
        }).assert_data({
            ".type": "gateway",
            "id": "general",
            "client_id": "42",
            "enabled": "1",
            "host": "127.0.0.1",
            "keepalive": "5",
            "pass": "jenkins",
            "port": "1883",
            "request": "request",
            "response": "response",
            "tls": "0",
            "qos": "0",
            "user": "bobby"
        })

    def test_disallow_post(self):
        self.post(self.url, {}) \
            .assert_error("Validation", "Section creation is not allowed", 108)

    def test_disallow_delete(self):
        self.delete(self.url) \
            .assert_error("Validation", "Section deletion is not allowed", 111)
