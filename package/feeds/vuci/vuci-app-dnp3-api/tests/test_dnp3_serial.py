import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all, must_have_serial_device

@must_have_serial_device
class DNP3Serial(WrapTest):
    url = "/dnp3/serial"
    cfg_url = f"{url}/config"

    def setUp(self):
        delete_all(self, self.cfg_url)

    def create_config(self, device: str):
        response = self.post_data(self.cfg_url, {
            "name": "testing",
            "device": device
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def set_local_address(self, id: str, address: str):
        return self.put_data(f"{self.cfg_url}/{id}", { "local_addr": address })

    def set_device(self, id: str, device: str):
        return self.put_data(f"{self.cfg_url}/{id}", { "device": device })

    def test_basic_crud(self):
        self.crud_test(self.cfg_url, {
            "parity": "none",
            ".type": "serial_client",
            "flowcontrol": "none",
            "device": self.serial_device,
            "stopbits": "1",
            "name": "testing",
            "baudrate": "9600",
            "databits": "8"
        }, {
            ".type": "serial_client",
            "baudrate": "9600",
            "databits": "8",
            "enabled": "0",
            "flowcontrol": "none",
            "integrity_period": "60",
            "local_addr": "1",
            "name": "testing",
            "parity": "none",
            "remote_addr": "10",
            "save_to_flash": "0",
            "device": self.serial_device,
            "stopbits": "1",
            "time_duration": "1",
            "timeout": "60"
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
        delete_all(self, self.cfg_url)

        with self.subTest("Edge case"):
            if len(self.serial_devices) <= 1:
                self.skipTest("requires another serial device")
            other_device = self.serial_devices[1]

            config1 = self.create_config(self.serial_device)
            config2 = self.create_config(other_device)

            self.set_local_address(config1, "3").assert_code(200)
            self.set_local_address(config2, "3").assert_code(200)

            self.set_device(config2, self.serial_device).assert_code(422)
        delete_all(self, self.cfg_url)

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

    def test_basic_requests_crud(self):
        config = self.create_config(self.serial_device)

        self.crud_test(f"{self.url}/{config}/requests/config", {
            ".type": "instance",
            "name": "foobarbaz"
        }, {
            ".type": "instance",
            "name": "foobarbazbez",
            "data_type": "3",
            "enabled": "1",
            "index": "1",
            "count": "10"
        })
