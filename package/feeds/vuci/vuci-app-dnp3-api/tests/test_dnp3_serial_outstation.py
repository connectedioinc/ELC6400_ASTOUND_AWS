import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all, must_have_serial_device

@must_have_serial_device
class DNP3SerialOutstation(WrapTest):
    url = "/dnp3/serial_outstation/config"

    def setUp(self):
        delete_all(self, self.url)

    def create_config(self, device: str):
        response = self.post_data(self.url, {
            "device": device,
            ".type": "dnp3_serial_outstation",
            "name": "testing"
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def set_local_address(self, id: str, address: str):
        return self.put_data(f"{self.url}/{id}", { "local_addr": address })

    def set_device(self, id: str, device: str):
        return self.put_data(f"{self.url}/{id}", { "device": device })

    def test_basic_crud(self):
        self.crud_test(self.url, {
            "device": self.serial_device,
            ".type": "dnp3_serial_outstation",
            "name": "testing"
        }, { "parity": "none",
            "local_addr": "1",
            "flowcontrol": "none",
            "device": self.serial_device,
            "stopbits": "1",
            ".type": "dnp3_serial_outstation",
            "remote_addr": "2",
            "name": "testing",
            "baudrate": "9600",
            "databits": "8",
            "enabled": "1",
            "unsolicited_enabled": "0"
        })

    def test_disallow_conflicting_addresses(self):
        """
            Multiple configurations with the same device, should not be allowed to use the same local address
        """

        with self.subTest("Edge case"):
            config1 = self.create_config(self.serial_device)
            config2 = self.create_config(self.serial_device)

            self.set_local_address(config1, "3").assert_code(200)
            self.set_local_address(config2, "3").assert_code(422)
        delete_all(self, self.url)

        with self.subTest("Edge case"):
            if len(self.serial_devices) <= 1:
                self.skipTest("requires another serial device")
            other_device = self.serial_devices[1]

            config1 = self.create_config(self.serial_device)
            config2 = self.create_config(other_device)

            self.set_local_address(config1, "3").assert_code(200)
            self.set_local_address(config2, "3").assert_code(200)

            self.set_device(config2, self.serial_device).assert_code(422)
        delete_all(self, self.url)

    def test_allow_overlapping_addresses(self):
        """
            Multiple configurations without the same device, can have the same local address
        """
        if len(self.serial_devices) <= 1:
            self.skipTest("requires another serial device")
        other_device = self.serial_devices[1]

        config1 = self.create_config(self.serial_device)
        config2 = self.create_config(other_device)

        self.set_local_address(config1, "3").assert_code(200)
        self.set_local_address(config2, "3").assert_code(200)
