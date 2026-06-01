import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all, must_have_serial_device
from utils.ssh import assert_process_starts
from utils.modbus import stop_modbus_server

@must_have_serial_device
class ModbusSerialServer(WrapTest):
    url = "/modbus/server/serial/config"

    def setUp(self):
        delete_all(self, self.url)

    def get_full_body(self):
        return {
            "parity": "none",
            ".type": "rtu_device",
            "flowcontrol": "none",
            "device": self.serial_device,
            "stopbits": "1",
            "enabled": "0",
            "name": "testing",
            "clientregs": "0",
            "baudrate": "9600",
            "databits": "8",
            "device_id": "1"
        }

    def create_config(self):
        body = self.get_full_body()
        response = self.post_data(self.url, body)
        response.assert_data(body, 201, ["id", ".type"])
        return response.resp.json()["data"]["id"]

    def delete_config(self, id: str):
        self.delete(f"{self.url}/{id}").assert_code(200)

    def test_basic_crud(self):
        self.crud_test(self.url, {
            ".type": "rtu_device",
            "name": "testing",
            "device": self.serial_device,
            "device_id": "1"
        }, self.get_full_body())

    def test_process_running(self):
        stop_modbus_server(self)

        id = self.create_config()
        with assert_process_starts(self, "modbus_server"):
            self.put_data(f"{self.url}/{id}", {
                "enabled": "1"
            }).assert_code(200)
