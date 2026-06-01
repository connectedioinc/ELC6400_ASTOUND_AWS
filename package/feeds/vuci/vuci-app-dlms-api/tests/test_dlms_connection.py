import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all, must_have_serial_device
from time import sleep
@must_have_serial_device
class DLMS(WrapTest):
    url_connections = "/dlms/connections/config"
        
    def setUp(self):
        delete_all(self, self.url_connections)

    def get_full_body(self):
        return {
            ".type": "connection",
            "name": "TEST",
            "port": "50",
            "address": "1.1.1.1",
            "connection_type": "0"
        }

    def create_config(self):
        body = self.get_full_body()
        response = self.post_data(self.url_connections, body)
        response.assert_data(body, 201, ["id", ".type"])
        return response.resp.json()["data"]["id"]

    def delete_config(self, id: str):
        self.delete(f"{self.url_connections}/{id}").assert_code(200)

    def test_basic_crud(self):
        self.crud_test(self.url_connections, {
            ".type": "connection",
            "name": "TEST",
            "port": "80",
        }, self.get_full_body())
  
    def test_basic_serial_crud(self):
        self.crud_test(self.url_connections, {
            ".type": "connection",
            "connection_type": "1",
            "baudrate": "9600",
            "databits": "8",
            "device": self.serial_device,
            "flowcontrol": "none",
            "name": "test",
            "parity": "none",
            "stopbits": "1"
        }, {
            ".type": "connection",
            "connection_type": "1",
            "baudrate": "9600",
            "databits": "8",
            "device": self.serial_device,
            "flowcontrol": "none",
            "name": "test",
            "parity": "none",
            "stopbits": "1"
        })

    def list_devices(self, id: str):
        response = self.get(f"{self.url_connections}/{id}/devices")
        response.assert_code(200)
        return response.resp.json()["data"]

    def add_devices(self, id: str, name: str):
        response = self.post_data(f"{self.url_connections}/{id}/devices", {
            "name": name
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def test_basic_devices_crud(self):
        id = self.create_config()

        self.crud_test(f"{self.url_connections}/{id}/devices", {
            ".type": "physical_device",
            "access_security": "0",
            "client_addr": "16",
            "interface": "0",
            "log_server_addr": "0",
            "server_addr": "1",
            "transport_security": "0"
        }, {
            ".type": "physical_device",
            "access_security": "0",
            "client_addr": "16",
            "interface": "0",
            "log_server_addr": "0",
            "server_addr": "1",
            "transport_security": "0"
        })

    def test_delete_devices(self):
        """
            All related devices should be deleted, when deleting the configuration
        """
        id = self.create_config()

        self.add_devices(id, "test_device_1")
        self.add_devices(id, "test_device_2")
        self.add_devices(id, "test_device_3")
        self.delete_config(id)

        id = self.create_config()
        requests = self.list_devices(id)
        self.assertEqual(len(requests), 0)