import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from time import sleep

class Ethernet(WrapTest):
    url = "/opcua/destination_server/config/general"

    def test_basic_update(self):
        self.put_data(self.url, {
            "enabled": "1",
            "port": "50"
        }).assert_data({
            ".type": "opcua_server",
            "id": "general",
            "enabled": "1",
            "port": "50"
        })

    def test_disallow_post(self):
        self.post(self.url, {}) \
            .assert_error("Validation", "Section creation is not allowed", 108)

    def test_disallow_delete(self):
        self.delete(self.url) \
            .assert_error("Validation", "Section deletion is not allowed", 111)