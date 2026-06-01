import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all, must_have_serial_device
from utils.ssh import assert_process_starts
from utils.modbus import stop_modbus_client, stop_modbus_server

@must_have_serial_device
class ModbusSerialClient(WrapTest):
    url = "/modbus/client/serial"
    cfg_url = f"{url}/config"
    servers_url = f"{url}/servers"
    servers_cfg_url = f"{url}/servers/config"

    def setUp(self):
        delete_all(self, self.cfg_url)

    def create_config(self):
        body = {
            "parity": "none",
            "flowcontrol": "none",
            "device": self.serial_device,
            "stopbits": "1",
            "name": "testing",
            "baudrate": "9600",
            "databits": "8",
            "enabled": "0"
        }
        response = self.post_data(self.cfg_url, body)
        response.assert_data(body, 201, ["id", ".type"])
        return response.resp.json()["data"]["id"]

    def add_server(self, client: str):
        body = {
            "skip_on_many_tmos": "1",
            "timeout": "1",
            "server_id": "1",
            "period": "10",
            "name": "testing_server",
            "enabled": "0",
            "rtu_device": client,
            "frequency": "period"
        }
        response = self.post_data(self.servers_cfg_url, body)
        response.assert_data(body, 201, ["id", ".type"])
        return response.resp.json()["data"]["id"]

    def set_service_enabled(self, enabled: bool):
        response = self.put_data(f"/modbus/client/config/general", {
            "enabled": "1" if enabled else "0"
        })
        response.assert_code(200)
        return response

    def set_enabled(self, id: str, enabled: bool):
        response = self.put_data(f"{self.cfg_url}/{id}", {
            "enabled": "1" if enabled else "0"
        })
        response.assert_code(200)
        return response

    def set_server_enabled(self, id: str, enabled: bool):
        response = self.put_data(f"{self.servers_cfg_url}/{id}", {
            "enabled": "1" if enabled else "0"
        })
        response.assert_code(200)
        return response

    def update_server(self, id: str, data: dict):
        response = self.put_data(f"{self.servers_cfg_url}/{id}", data)
        response.assert_code(200)
        return response.resp.json()["data"]

    def list_servers(self, client: str):
        response = self.get(self.servers_cfg_url)
        response.assert_code(200)
        servers = []
        for server in response.resp.json()["data"]:
            if server["rtu_device"] == client:
                servers.append(server)
        return servers

    def delete_config(self, id: str):
        self.delete(f"{self.cfg_url}/{id}").assert_code(200)

    def delete_server(self, id: str):
        self.delete(f"{self.servers_cfg_url}/{id}").assert_code(200)

    def add_request(self, id: str, name: str):
        response = self.post_data(f"{self.servers_url}/{id}/requests/config", {
            "name": name
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def list_requests(self, id: str):
        response = self.get(f"{self.servers_url}/{id}/requests/config")
        response.assert_code(200)
        return response.resp.json()["data"]

    def add_alarm(self, id: str):
        response = self.post_data(f"{self.servers_url}/{id}/alarms/config", { })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def update_alarm(self, id: str, alarm: str, data: dict):
        response = self.put_data(f"{self.servers_url}/{id}/alarms/config/{alarm}", data)
        response.assert_code(200)
        return response.resp.json()["data"]

    def test_basic_crud(self):
        self.crud_test(self.cfg_url, {
            "device": self.serial_device,
            ".type": "rtu_device",
            "name": "testing",
        }, {
            "parity": "none",
            ".type": "rtu_device",
            "flowcontrol": "none",
            "device": self.serial_device,
            "stopbits": "1",
            "name": "testing",
            "baudrate": "9600",
            "databits": "8",
            "enabled": "0"
        })

    def test_process_running(self):
        stop_modbus_server(self)
        stop_modbus_client(self)

        self.set_service_enabled(False)
        with assert_process_starts(self, "modbus_client"):
            self.set_service_enabled(True)

    def test_deleting_servers(self):
        id = self.create_config()

        self.add_server(id)
        self.add_server(id)
        self.add_server(id)
        self.delete_config(id)

        id = self.create_config()
        servers = self.list_servers(id)
        self.assertEqual(len(servers), 0)

    def test_basic_requests_crud(self):
        id = self.create_config()
        server_id = self.add_server(id)

        self.crud_test(f"{self.servers_url}/{server_id}/requests/config", {
            ".type": f"request_{server_id}",
            "name": "test_request"
        }, {
            ".type": f"request_{server_id}",
            "data_type": "hex",
            "enabled": "1",
            "first_reg": "12",
            "name": "test_request",
            "function": "15",
            "no_brackets": "0",
            "reg_count": "09"
        })

    def test_delete_requests(self):
        with self.subTest("when deleting server", cleanup = True):
            id = self.create_config()
            server_id = self.add_server(id)
            self.add_request(server_id, "test_request_1")
            self.add_request(server_id, "test_request_2")
            self.add_request(server_id, "test_request_3")
            self.delete_server(server_id)

            server_id = self.add_server(id)
            requests = self.list_requests(server_id)
            self.assertEqual(len(requests), 0)

        with self.subTest("when client server"):
            id = self.create_config()
            server_id = self.add_server(id)
            self.add_request(server_id, "test_request_1")
            self.add_request(server_id, "test_request_2")
            self.add_request(server_id, "test_request_3")
            self.delete_config(id)

            id = self.create_config()
            server_id = self.add_server(id)
            requests = self.list_requests(server_id)
            self.assertEqual(len(requests), 0)

    def test_basic_alarms_crud(self):
        id = self.create_config()
        server_id = self.add_server(id)

        self.crud_test(f"{self.servers_url}/{server_id}/alarms/config", {
            ".type": f"alarm_{server_id}",
        }, {
            "action": "2",
            "register": "1",
            "modbus_reg_count": "1",
            "modbus_id": "1",
            "f_code": "1",
            "actionfrequency": "0",
            "enabled": "0",
            ".type": f"alarm_{server_id}",
            "modbus_timeout": "5",
            "redundancy_protection": "0",
            "modbus_function": "5",
            "modbus_first_reg": "1",
            "data_type": "16bit_int_hi_first",
            "condition": "1",
            "modbus_data_type": "bool",
            "modbus_port": "52",
            "modbus_ip_addr": "1.1.1.1"
        })

    def test_alarm_root_ca(self):
        id = self.create_config()
        server_id = self.add_server(id)

        self.crud_test(f"{self.servers_url}/{server_id}/alarms/config", {
            ".type": f"alarm_{server_id}",
        }, {
            ".type": f"alarm_{server_id}",
            "action": "3",
            "actionfrequency": "0",
            "client_id": "",
            "condition": "8",
            "data_type": "32bit_uint1234",
            "enabled": "1",
            "f_code": "3",
            "host": "0.0.0.0",
            "json": "{\"TS\":\"%ts\", \"data\":\"%rv\"}",
            "keepalive": "60",
            "port": "8883",
            "qos": "0",
            "redundancy_protection": "0",
            "register": "2",
            "tls_enabled": "0",
            "topic": "modbus",
            "use_tls_root_ca": "1",
            "value": "0"
        })
