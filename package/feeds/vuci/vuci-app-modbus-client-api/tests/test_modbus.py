import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all
from utils.ssh import assert_process_starts
from time import sleep
from utils.modbus import stop_modbus_client

class ModbusTCPClient(WrapTest):
    url = "/modbus/client/tcp"
    cfg_url = f"{url}/config"

    def setUp(self):
        delete_all(self, self.cfg_url)

    def create_config(self, name: str, ip_addr: str = "1.1.1.1"):
        response = self.post_data(self.cfg_url, {
            "delay": "0",
            "enabled": "1",
            "frequency": "period",
            "name": name,
            "period": "10",
            "port": "502",
            "reconnect": "0",
            "dev_ipaddr": ip_addr,
            "skip_on_many_tmos": "1",
            "server_id": "1",
            "timeout": "5"
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def update_config(self, id: str, data: dict):
        response = self.put_data(f"{self.cfg_url}/{id}", data)
        response.assert_code(200)
        return response.resp.json()["data"]

    def update_alarm(self, id: str, alarm: str, data: dict):
        response = self.put_data(f"{self.url}/{id}/alarms/config/{alarm}", data)
        response.assert_code(200)
        return response.resp.json()["data"]

    def delete_config(self, id: str):
        self.delete(f"{self.cfg_url}/{id}").assert_code(200)

    def list_requests(self, id: str):
        response = self.get(f"{self.url}/{id}/requests/config")
        response.assert_code(200)
        return response.resp.json()["data"]

    def add_request(self, id: str, name: str):
        response = self.post_data(f"{self.url}/{id}/requests/config", {
            "name": name
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def add_alarm(self, id: str):
        response = self.post_data(f"{self.url}/{id}/alarms/config", { })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def test_basic_crud(self):
        self.crud_test(self.cfg_url, {
            "port": "502",
            ".type": "tcp_server",
            "server_id": "1",
            "period": "10"
        }, {
            ".type": "tcp_server",
            "delay": "0",
            "dev_ipaddr": "1.1.1.1",
            "enabled": "1",
            "frequency": "period",
            "name": "testing",
            "period": "10",
            "port": "502",
            "reconnect": "0",
            "skip_on_many_tmos": "1",
            "server_id": "1",
            "timeout": "5"
        })

    def test_basic_requests_crud(self):
        id = self.create_config("testing")

        self.crud_test(f"{self.url}/{id}/requests/config", {
            ".type": f"request_{id}",
            "name": "test_request"
        }, {
            ".type": f"request_{id}",
            "data_type": "hex",
            "enabled": "1",
            "first_reg": "12",
            "name": "test_request",
            "function": "15",
            "no_brackets": "0",
            "reg_count": "09"
        })

    def test_delete_requests(self):
        """
            All related requests should be deleted, when deleting the configuration
        """
        id = self.create_config("testing")

        self.add_request(id, "test_request_1")
        self.add_request(id, "test_request_2")
        self.add_request(id, "test_request_3")
        self.delete_config(id)

        id = self.create_config("testing")
        requests = self.list_requests(id)
        self.assertEqual(len(requests), 0)

    def test_required_options(self):
        id = self.create_config("testing")
        # TODO: Add `dev_ipaddr`, to list of required options when frontend is fully on API.
        for option in ["port", "server_id"]:
            with self.subTest(option):
                self.put_data(f"{self.cfg_url}/{id}", {
                    option: ""
                }).assert_code(422)

    def test_send_test_request(self):
        id = self.create_config("testing", "127.0.0.1")
        self.put_data("/modbus/server/tcp/config/general", {
            ".type": "modbus",
            "allow_ra": "0",
            "clientregs": "0",
            "device_id": "1",
            "enabled": "1",
            "keepconn": "1",
            "md_data_type": "0",
            "port": "502",
            "timeout": "0"
        })
        sleep(2)
        self.put_data(f"/modbus/client/config/general", { "enabled": "1" }).assert_code(200)
        response = self.post_data(f"{self.url}/{id}/requests/actions/test_request", {
            "data_type": "32bit_uint1234",
            "dev_ipaddr": "127.0.0.1",
            "first_reg": "2",
            "function": "3",
            "no_brackets": "0",
            "port": "502",
            "reg_count": "2",
            "server_id": "1",
            "timeout": "5"
        })
        self.assertRegex(response.resp.json()["data"]["result"], r"^\[\d+\]$")

    def test_basic_alarms_crud(self):
        id = self.create_config("testing")

        self.crud_test(f"{self.url}/{id}/alarms/config", {
            ".type": f"alarm_{id}",
        }, {
            "action": "2",
            "register": "1",
            "modbus_reg_count": "1",
            "modbus_id": "1",
            "f_code": "1",
            "actionfrequency": "0",
            "enabled": "0",
            ".type": f"alarm_{id}",
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
        id = self.create_config("testing")

        self.crud_test(f"{self.url}/{id}/alarms/config", {
            ".type": f"alarm_{id}",
        }, {
            ".type": "alarm_1",
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

    def test_delete_alarms(self):
        """
            All related requests should be deleted, when deleting the configuration
        """
        id = self.create_config("testing")

        self.add_alarm(id)
        self.add_alarm(id)
        self.add_alarm(id)
        self.delete_config(id)

        id = self.create_config("testing")
        requests = self.list_requests(id)
        self.assertEqual(len(requests), 0)
