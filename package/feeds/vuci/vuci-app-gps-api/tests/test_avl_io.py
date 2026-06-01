import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest

class GPSAVLIO(WrapTest):
    url = "/gps/avl/io_rules/config"

    def test_basic_crud(self):
        self.crud_test(self.url, {
            ".type": "input"
        }, {
            "enabled": "1",
            ".type": "input",
            "io_name": "din1",
            "priority": "security",
            "event": "both",
        })
