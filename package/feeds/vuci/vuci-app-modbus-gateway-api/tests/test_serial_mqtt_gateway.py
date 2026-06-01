import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all, must_have_serial_device

@must_have_serial_device
class MQTTSerialGateway(WrapTest):
    url = "/modbus/serial_gateway/config"

    def setUp(self):
        delete_all(self, self.url)

    def test_basic_crud(self):
        self.crud_test(self.url, {
            "device": self.serial_device,
            ".type": "rtu_device",
            "id": "testing"
        }, {
            "parity": "none",
            ".type": "rtu_device",
            "flowcontrol": "none",
            "device": self.serial_device,
            "stopbits": "1",
            "baudrate": "9600",
            "databits": "8",
            "id": "testing",
            "enabled": "1"
        })
