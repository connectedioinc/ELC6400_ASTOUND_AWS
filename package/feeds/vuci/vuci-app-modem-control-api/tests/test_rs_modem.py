import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import delete_all, must_have_serial_device
from utils.ssh import assert_process_starts
from time import sleep

@must_have_serial_device
class RSModem(WrapTest):
    url = "/modem_control/config"

    def setUp(self):
        delete_all(self, self.url)

    def test_basic_crud(self):
        self.crud_test(self.url, {
            "device": self.serial_device,
            "name": "testing",
            ".type": "modem"
        }, {
            ".type": "modem",
            "baudrate": "9600",
            "ctl_mode": "partial",
            "databits": "8",
            "device": self.serial_device,
            "enabled": "1",
            "flowcontrol": "none",
            "name": "testing",
            "parity": "none",
            "stopbits": "1",
            "start_up_msg": ["test", "test2"]
        })

    def test_check_process(self):
        """
            Check if sodog process is running after enabling a configuration
        """
        self.post_data(self.url, {
            "enabled": "0"
        })
        with assert_process_starts(self, "socat"):
            self.post_data(self.url, {
                "baudrate": "9600",
                "ctl_mode": "partial",
                "databits": "8",
                "device": self.serial_device,
                "enabled": "1",
                "flowcontrol": "none",
                "name": "testing",
                "parity": "none",
                "stopbits": "1",
                "start_up_msg": ["test", "test2"]
            })
