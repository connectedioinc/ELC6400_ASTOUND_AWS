import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all, must_have_serial_device

@must_have_serial_device
class ModbusTCPOverSerial(WrapTest):
    url = "/modbus/tcp_over_serial/config"
    url_no_cfg = "/modbus/tcp_over_serial"

    def setUp(self):
        delete_all(self, self.url)

    def create_config(self):
        body = {
            "enabled": "0",
            "flowcontrol": "none",
            "device": self.serial_device,
            "crc_enabled": "0",
            "server_id_config": "single",
            "stopbits": "1",
            "name": "testing",
            "baudrate": "9600",
            "databits": "8",
            "parity": "none"
        }
        response = self.post_data(self.url, body)
        response.assert_data(body, 201, ["id", ".type"])
        return response.resp.json()["data"]["id"]

    def delete_config(self, id: str):
        self.delete(f"{self.url}/{id}").assert_code(200)

    def add_filter(self, id: str, src: str, ips: [str]):
        response = self.post_data(f"{self.url_no_cfg}/{id}/filters/config", {
            "src": src, "src_ip": ips
        })
        response.assert_code(201)
        return response.resp.json()["data"]

    def list_rules(self, id: str):
        response = self.get(f"{self.url_no_cfg}/{id}/filters/config")
        response.assert_code(200)
        return response.resp.json()["data"]

    def test_basic_crud(self):
        self.crud_test(self.url, {
            "enabled": "0",
            ".type": "modbus",
            "name": "testing",
            "device": self.serial_device,
        }, {
            "enabled": "0",
            ".type": "modbus",
            "flowcontrol": "none",
            "device": self.serial_device,
            "crc_enabled": "0",
            "server_id_config": "single",
            "stopbits": "1",
            "name": "testing",
            "baudrate": "9600",
            "databits": "8",
            "parity": "none"
        })

    def test_basic_filters_crud(self):
        id = self.create_config()

        self.crud_test(f"{self.url_no_cfg}/{id}/filters/config", {
            "enabled": "0",
            "src": "lan",
            ".type": "rule"
        }, {
            "enabled": "1",
            "src": "lan",
            "src_ip": [ "1.1.1.1", "2.2.2.2" ],
            ".type": "rule"
        })

    def test_deleting_filters(self):
        id = self.create_config()

        self.add_filter(id, "lan", ["1.1.1.1", "2.2.2.2"])
        self.add_filter(id, "wan", ["3.3.3.3", "4.4.4.4"])
        self.delete_config(id)

        id = self.create_config()
        rules = self.list_rules(id)
        self.assertEqual(len(rules), 0)
