import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes
from utils.general_api import must_have_serial_device, delete_all
from typing import Union

@must_have_serial_device
class Overip(util.WrapTest):
    base_url = "/overip/config"
    url = "/overip"

    def setUp(self):
        delete_all(self, self.base_url)

    def create_tcp_server(self, device: str):
        response = self.post_data(self.base_url, {
            "device": device,
            "mode": "server",
            "remove_all_zeros": "1",
            "raw": "0",
            "protocol": "0",
        })
        response.assert_code(201)
        return response.resp.json()["data"]

    def create_tcp_client(self, device: str):
        response = self.post_data(self.base_url, {
            ".type": "overip",
            "device": device,
            "mode": "client",
            "remove_all_zeros": "1",
            "protocol": "0",
            "raw": "0",
            "always_reconnect": "1",
            "address_connect": ["1.1.1.1:12"],
            "keepalive_enabled": "1",
            "keepalive_interval": "11",
            "keepalive_probes": "22",
            "keepalive_time": "31",
            "read_duration": "20",
            "recon_interval": "21",
            "timeout": "301"
        })
        response.assert_code(201)
        return response.resp.json()["data"]

    def delete_config(self, id: str):
        response = self.delete_data(f"{self.base_url}/{id}")
        response.assert_code(200)
        return response

    def set_enabled_config(self, id: str, enabled: bool):
        response = self.put_data(f"{self.base_url}/{id}", {
            "enabled": "1" if enabled else "0"
        })
        response.assert_code(200)
        return response

    def has_error(self, response, expected_error: str):
        if response.resp.status_code != 422: return False

        json = response.resp.json()
        if "errors" in json:
            for err in json["errors"]:
                if err["error"] == expected_error:
                    return True
        return False

    def set_mode_config(self, id: str, mode: Union["client", "server", "bidirect"]):
        response = self.put_data(f"{self.base_url}/{id}", {
            "mode": mode
        })
        if self.has_error(response, "Missing required option: address_connect"):
            response = self.put_data(f"{self.base_url}/{id}", {
                "mode": mode,
                "address_connect": ["11.22.33.44:36"]
            })
        response.assert_code(200)
        return response

    def add_ip_filter(self, server: str, src: str, ips: [str]):
        response = self.post_data(f"{self.url}/{server}/filters/config", {
            "src_ip": ips,
            "src": src
        })
        response.assert_code(201)
        return response.resp.json()["data"]

    def delete_all_ip_filters(self, server: str):
        return delete_all(self, f"{self.url}/{server}/filters/config")

    def list_ip_filters(self, server: str):
        response = self.get(f"{self.url}/{server}/filters/config")
        response.assert_code(200)
        return response.resp.json()["data"]

    def assert_ip_filters_enabled(self, id: str, enabled: bool):
        if enabled:
            for ip_filter in self.list_ip_filters(id):
                self.assertEqual(ip_filter["enabled"], "1", f"Expected ip filter '{ip_filter['id']}' on '{id}' to be enabled")
        else:
            for ip_filter in self.list_ip_filters(id):
                self.assertEqual(ip_filter["enabled"], "0", f"Expected ip filter '{ip_filter['id']}' on '{id}' to be disabled")


    def test_crud_basic(self):
        self.crud_test(self.base_url, {
            ".type": "overip",
            "device": self.serial_device
        }, {
            ".type": "overip",
            "device": self.serial_device,
            "enabled": "1",
            "name": "foobarbaz",
            "baudrate": "9600",
            "parity": "even",
            "stopbits": "1",
            "databits": "6",
            "stopbits": "2",
            "flowcontrol": "rts/cts",
        })

    def test_crud_rs232(self):
        device = None
        for dev in self.serial_devices:
            if "rs232" in dev:
                device = dev
                break

        if not device:
            self.skipTest("requires rs232 serial device")

        self.crud_test(self.base_url, {
            ".type": "overip",
            "device": device
        }, {
            ".type": "overip",
            "device": device,
            "cd_enable": "1",
            "dsr_enable": "1",
            "cd_invert": "1",
            "dsr_invert": "1",
        })

    def test_crud_udp_server(self):
        self.crud_test(self.base_url, {
            ".type": "overip",
            "device": self.serial_device
        }, {
            ".type": "overip",
            "device": self.serial_device,
            "mode": "server",
            "remove_all_zeros": "1",
            "raw": "0",
            "protocol": "1",
            "udp_client_count": "5",
            "predefined_address": ["1.1.1.1:14", "5.5.5.5:25"]
        })

    def test_crud_tcp_server(self):
        self.crud_test(self.base_url, {
            ".type": "overip",
            "device": self.serial_device
        }, {
            ".type": "overip",
            "device": self.serial_device,
            "mode": "server",
            "remove_all_zeros": "1",
            "raw": "0",
            "protocol": "0",
            "read_duration": "10",
            "tcp_echo_enabled": "1",
            "max_clients": "16",
            "always_reconnect": "1"
        })

    def test_crud_tcp_client(self):
        self.crud_test(self.base_url, {
            ".type": "overip",
            "device": self.serial_device
        }, {
            ".type": "overip",
            "device": self.serial_device,
            "mode": "client",
            "remove_all_zeros": "1",
            "protocol": "0",
            "raw": "0",
            "always_reconnect": "1",
            "address_connect": ["1.1.1.1:12"],
            "keepalive_enabled": "1",
            "keepalive_interval": "11",
            "keepalive_probes": "22",
            "keepalive_time": "31",
            "read_duration": "20",
            "recon_interval": "21",
            "timeout": "301"
        })

    def test_crud_udp_client(self):
        self.crud_test(self.base_url, {
            ".type": "overip",
            "device": self.serial_device
        }, {
            ".type": "overip",
            "device": self.serial_device,
            "mode": "client",
            "remove_all_zeros": "1",
            "protocol": "1",
            "raw": "0",
            "address_connect": ["1.1.1.1:12"],
            "timeout": "301",
            "read_duration": "20"
        })

    def test_crud_ip_filters(self):
        tcp_server = self.create_tcp_server(self.serial_device)["id"]

        self.crud_test(f"{self.url}/{tcp_server}/filters/config", {
            ".type": "rule",
            "enabled": "0",
            "src": "lan"
        }, {
            ".type": "rule",
            "enabled": "0",
            "src_ip": ["1.1.1.1"],
            "src": "lan"
        })

        self.crud_test(f"{self.url}/{tcp_server}/filters/config", {
            ".type": "rule",
            "enabled": "0",
            "src": "wan"
        }, {
            ".type": "rule",
            "enabled": "0",
            "src_ip": ["2.2.2.2"],
            "src": "wan"
        })

    def test_ip_filters_change_mode(self):
        """
            IP filters should not be removed when switching between server and client
        """
        cfg_id = self.create_tcp_server(self.serial_device)["id"]

        self.add_ip_filter(cfg_id, "lan", ["1.2.3.4"])
        self.add_ip_filter(cfg_id, "wan", ["5.6.7.8"])
        ip_filters = self.list_ip_filters(cfg_id)
        self.set_mode_config(cfg_id, "client")
        self.assertEqual(self.list_ip_filters(cfg_id), ip_filters)

    def test_ip_filters_change_mode_enabled(self):
        """
            When switching from a server to a client, any enabled ip filters must be disabled
        """
        cfg_id = self.create_tcp_server(self.serial_device)["id"]

        self.add_ip_filter(cfg_id, "lan", ["1.2.3.4"])
        self.add_ip_filter(cfg_id, "wan", ["5.6.7.8"])
        self.set_enabled_config(cfg_id, True)
        self.assert_ip_filters_enabled(cfg_id, True)
        self.set_mode_config(cfg_id, "client")
        self.assert_ip_filters_enabled(cfg_id, False)

    def test_ip_filters_client(self):
        """
            IP filters created for a client should allways be disabled regardless if client is enabled
        """
        tcp_client = self.create_tcp_client(self.serial_device)["id"]

        self.add_ip_filter(tcp_client, "lan", ["1.2.3.4"])
        self.add_ip_filter(tcp_client, "wan", ["5.6.7.8"])

        self.assert_ip_filters_enabled(tcp_client, False)
        self.set_enabled_config(tcp_client, True)
        self.assert_ip_filters_enabled(tcp_client, False)

    def test_ip_filters_default_enable(self):
        """
            When create a ip filter on a disabled server, default to disabled
            When create a ip filter on an enabled server, default to enabled
        """
        tcp_server = self.create_tcp_server(self.serial_device)["id"]

        self.set_enabled_config(tcp_server, True)
        with self.subTest("when server is enabled"):
            self.add_ip_filter(tcp_server, "lan", ["1.2.3.4"])
            self.add_ip_filter(tcp_server, "wan", ["5.6.7.8"])
            self.assert_ip_filters_enabled(tcp_server, True)
            self.delete_all_ip_filters(tcp_server)

        self.set_enabled_config(tcp_server, False)
        with self.subTest("when server is disabled"):
            self.add_ip_filter(tcp_server, "lan", ["1.2.3.4"])
            self.add_ip_filter(tcp_server, "wan", ["5.6.7.8"])
            self.assert_ip_filters_enabled(tcp_server, False)
            self.delete_all_ip_filters(tcp_server)

    def test_ip_filters_change_enabled(self):
        """
            When enabling a sever, all filters associated with it should become enabled,
            When disabling a server, all filters become disabled
        """
        tcp_server = self.create_tcp_server(self.serial_device)["id"]

        self.add_ip_filter(tcp_server, "lan", ["1.2.3.4"])
        self.add_ip_filter(tcp_server, "wan", ["5.6.7.8"])

        self.assert_ip_filters_enabled(tcp_server, False)

        self.set_enabled_config(tcp_server, True)
        self.assert_ip_filters_enabled(tcp_server, True)

        self.set_enabled_config(tcp_server, False)
        self.assert_ip_filters_enabled(tcp_server, False)

    def find_traffic_rule_by_id(self, id: str):
        traffic_rules = self.get("/firewall/traffic_rules/config")
        traffic_rules.assert_code(200)
        traffic_rules = traffic_rules.json["data"]
        for i in range(len(traffic_rules)):
            if traffic_rules[i]["id"] == id:
                return (i, traffic_rules[i])

    def test_ip_filter_default_highest_priority(self):
        tcp_server = self.create_tcp_server(self.serial_device)["id"]

        filter_id = self.add_ip_filter(tcp_server, "lan", ["1.2.3.4"])["id"]
        i, traffic_rule = self.find_traffic_rule_by_id(filter_id)
        self.assertIsNotNone(traffic_rule)

        self.assertEqual(traffic_rule["priority"], "1")
        self.assertEqual(i, 0)
