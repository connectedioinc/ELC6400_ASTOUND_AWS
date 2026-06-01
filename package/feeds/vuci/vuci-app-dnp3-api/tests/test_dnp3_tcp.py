import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all
from utils.ssh import open_ssh_connection, is_process_running
from time import sleep

class DNP3TCP(WrapTest):
    url = "/dnp3/tcp"
    cfg_url = f"{url}/config"

    def setUp(self):
        delete_all(self, self.cfg_url)

    def create_config(self, ip: str, port: str):
        response = self.post_data(self.cfg_url, {
            "ip": ip,
            "port": port,
            "name": "testing",
            "integrity_period": "22",
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def set_local_address(self, id: str, address: str):
        return self.put_data(f"{self.cfg_url}/{id}", { "local_addr": address })

    def set_ip(self, id: str, ip: str):
        return self.put_data(f"{self.cfg_url}/{id}", { "ip": ip })

    def set_port(self, id: str, port: str):
        return self.put_data(f"{self.cfg_url}/{id}", { "port": port })

    def test_basic_crud(self):
        self.crud_test(self.cfg_url, {
            ".type": "tcp_client"
        }, {
            "enabled": "1",
            "local_addr": "10",
            "timeout": "33",
            "ip": "1.1.1.1",
            "remote_addr": "11",
            "save_to_flash": "1",
            ".type": "tcp_client",
            "port": "20001",
            "integrity_period": "22",
            "name": "foo"
        })

    def test_disallow_conflicting_addresses(self):
        """
            Multiple configurations with the same IP and PORT, should not be allowed to use the same local address
        """

        with self.subTest("Edge case"):
            config1 = self.create_config("1.1.1.1", "11")
            config2 = self.create_config("1.1.1.1", "11")

            self.set_local_address(config1, "3").assert_code(200)
            self.set_local_address(config2, "3").assert_code(422)
        delete_all(self, self.cfg_url)

        with self.subTest("Edge case"):
            config1 = self.create_config("1.1.1.1", "11")
            config2 = self.create_config("1.1.1.1", "22")

            self.set_local_address(config1, "3").assert_code(200)
            self.set_local_address(config2, "3").assert_code(200)

            self.set_port(config2, "11").assert_code(422)
        delete_all(self, self.cfg_url)

        with self.subTest("Edge case"):
            config1 = self.create_config("1.1.1.1", "11")
            config2 = self.create_config("2.2.2.2", "11")

            self.set_local_address(config1, "3").assert_code(200)
            self.set_local_address(config2, "3").assert_code(200)

            self.set_ip(config1, "2.2.2.2").assert_code(422)
        delete_all(self, self.cfg_url)

    def test_allow_overlapping_addresses(self):
        """
            Multiple configurations without the same IP and PORT, can have the same local address
        """

        with self.subTest("when port is different"):
            config1 = self.create_config("1.1.1.1", "11")
            config2 = self.create_config("1.1.1.1", "22")

            self.set_local_address(config1, "3").assert_code(200)
            self.set_local_address(config2, "3").assert_code(200)
        delete_all(self, self.cfg_url)

        with self.subTest("when ip is different"):
            config1 = self.create_config("1.1.1.1", "11")
            config2 = self.create_config("2.2.2.2", "11")

            self.set_local_address(config1, "3").assert_code(200)
            self.set_local_address(config2, "3").assert_code(200)
        delete_all(self, self.cfg_url)

        with self.subTest("when ip and port is different"):
            config1 = self.create_config("1.1.1.1", "11")
            config2 = self.create_config("2.2.2.2", "22")

            self.set_local_address(config1, "3").assert_code(200)
            self.set_local_address(config2, "3").assert_code(200)
        delete_all(self, self.cfg_url)

    def test_basic_requests_crud(self):
        config = self.create_config("1.1.1.1", "11")

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

    def test_send_test_request(self):
        self.post_data(self.cfg_url, {
            "enabled": "0",
            "ip": "127.0.0.1",
            "name": "testing",
            "port": "20000",
            "local_addr": "20",
            "remote_addr": "10",
            "save_to_flash": "0",
            "timeout": "60",
            "integrity_period": "60"
        }).assert_code(201)
        self.put_data("/dnp3/outstation/config/general", {
            "enabled": "1",
            "local_addr": "10",
            "remote_addr": "20",
            "port": "20000",
            "protocol": "tcp",
            "allow_ra": "0",
            "unsolicited_enabled": "0"
        }).assert_code(200)
        with open_ssh_connection() as ssh:
            self.assertTrue(is_process_running(ssh, "dnp3_outstation"), "Expected 'dnp3_outstation' to be running")
        response = self.post_data(f"{self.url}/actions/test_request", {
            "count": "0",
            "data_type": "20",
            "index": "0",
            "ip": "127.0.0.1",
            "local_addr": "20",
            "name": "test",
            "port": "20000",
            "remote_addr": "10",
            "timeout": "60"
        })
        response.assert_code(200)
        json = response.resp.json()
        self.assertIn("data", json)
        self.assertIn("data", json["data"])
        data = json["data"]["data"][0].split(", ")
        self.assertEqual(data[2], "'COUNTER'")
        self.assertEqual(len(data), 5)
