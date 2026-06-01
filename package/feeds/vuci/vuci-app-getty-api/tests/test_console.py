import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all, must_have_serial_device
from utils.ssh import open_ssh_connection, is_process_running, is_process_stopped
from time import sleep

@must_have_serial_device
class Console(WrapTest):
    url = "/console/config"

    def setUp(self):
        delete_all(self, self.url)

    def create_config(self):
        res = self.post_data(self.url, {
            "parity": "even",
            "flowcontrol": "xon/xoff",
            "device": self.serial_device,
            "stopbits": "2",
            "name": "testing",
            "baudrate": "9600",
            "databits": "6",
            "enabled": "1"
        })
        res.assert_code(201)
        return res.resp.json()["data"]["id"]

    def delete_config(self, id: str):
        res = self.delete(f"{self.url}/{id}")
        res.assert_code(200)

    def test_crud_basic(self):
        self.crud_test(self.url, {
            "enabled": "0",
            ".type": "console",
            "name": "testing",
            "baudrate": "9600",
            "databits": "8",
            "device": self.serial_device,
            "stopbits": "1"
        }, {
            "parity": "even",
            ".type": "console",
            "flowcontrol": "xon/xoff",
            "device": self.serial_device,
            "stopbits": "2",
            "name": "testing",
            "id": "1",
            "baudrate": "9600",
            "databits": "6",
            "enabled": "1"
        })

    def test_process_running(self):
        with open_ssh_connection() as ssh:
            config = self.create_config()
            self.assertTrue(is_process_running(ssh, "getty"), "Expeced getty to be running")

            self.delete_config(config)
            self.assertTrue(is_process_stopped(ssh, "getty"), "Expected getty not be to running")
