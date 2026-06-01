import sys
import utility_integration as util
import response_codes as codes
from utils.ssh import open_ssh_connection, get_ssh
import re
import unittest
from time import sleep
sys.path.append("../../../../tests")

@unittest.skip("Skipping as tests are moved to itests, leaving for reference.")
class troubleshoot_logging_settings(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def test_troubleshoot_logging_remote_functionality(self):
        base_url = "/logging/config"

        with self.subTest("legacy_compatibility"):
            x = self.put_data(base_url + "/general", {
                "log_proto":"udp",
                "log_ip":"127.0.0.1",
                "log_port": "555",
                })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size": "128",
                "log_type": "circular",
                "log_proto": "udp",
                "remote_logger": [
                    "127.0.0.1:555,udp"
                    ],
                "log_ip": "127.0.0.1",
                "id": "general",
                ".type": "global",
                "log_port": "555"
                })

            x = self.put_data(base_url + "/general", {
                "log_proto":"",
                "log_ip":"",
                "log_port": "",
                })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size": "128",
                "log_type": "circular",
                "id": "general",
                ".type": "global",
                })

            x = self.put_data(base_url + "/general", {
                "remote_logger": [
                    "192.168.1.1:444,tcp"
                    ],
                })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size": "128",
                "log_type": "circular",
                "log_proto": "tcp",
                "remote_logger": [
                    "192.168.1.1:444,tcp"
                    ],
                "log_ip": "192.168.1.1",
                "id": "general",
                ".type": "global",
                "log_port": "444"
                })

        with self.subTest("log_server_validations"):
            x = self.put_data(base_url + "/general", {
                "remote_logger": [
                    "[fdc0:3435:a720::1]:333,tcp",
                    "[fdc0:3435:a720::2]:444,udp",
                ],
                })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size": "128",
                "log_type": "circular",
                "id": "general",
                ".type": "global",
                "remote_logger": [
                    "[fdc0:3435:a720::1]:333,tcp",
                    "[fdc0:3435:a720::2]:444,udp",
                ],
                "log_ip": "fdc0:3435:a720::1",
                "log_port": "333",
                "log_proto": "tcp",
                })

            x = self.put_data(base_url + "/general", {
                "remote_logger": [
                    "example.com:444,udp",
                ],
                })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size": "128",
                "log_type": "circular",
                "id": "general",
                ".type": "global",
                "remote_logger": [
                    "example.com:444,udp",
                ],
                "log_ip": "example.com",
                "log_port": "444",
                "log_proto": "udp",
                })
            x = self.put_data(base_url + "/general", {
                "remote_logger": [
                    "[fdc0:3435:a720::1]:333,tcp",
                    "[fdc0:3435:a720::2]:444,udp",
                    "example.com:555,udp",
                    "test.com:111,tcp"
                ],
                })
            x.assert_error("Validation", "Up to 3 remote log servers can be used.", codes.ResponseCodes.UCI_CREATE_ERROR.val())

            x = self.put_data(base_url + "/general", {
                "remote_logger": [
                    "fdc0:3435:a720::1:333,tcp",
                    "[fdc0:3435:a720::2]:444,udp",
                    "example.com:555,udp",
                    "test.com:111,tcp"
                ],
                })
            x.assert_error("remote_logger at index 1", "An IPv4 or IPv6 address or domain name with a port is required E.g 192.168.1.1:80", codes.ResponseCodes.INVALID_OPT.val())
            x = self.put_data(base_url + "/general", { "remote_logger": [ ]})
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size": "128",
                "log_type": "circular",
                "id": "general",
                ".type": "global",
                "log_hostname": "",
                "log_ip": "",
                "log_port": "",
                "log_proto": ""
                })
        with self.subTest("return_configuration"):
            x = self.put_data(base_url + "/general", {
                "size":"128",
                "log_type":"circular",
                "log_compress":"",
                "log_hostname":"",
                "remote_logger":[]
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size":"128",
                "log_hostname": "",
                "log_ip": "",
                "log_port": "",
                "log_proto": "",
                "log_type":"circular",
                "id":"general",
                ".type":"global",
            })

    def test_troubleshoot_logging_base_functionality(self):
        base_url = "/logging/config"
        with self.subTest("single_get"):
            x = self.get(base_url + "/general")
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size":"128",
                "log_type":"circular",
                "id":"general",
                ".type":"global",
            })
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            x.assert_data([
                {
                    'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                    "size":"128",
                    "log_type":"circular",
                    "id":"general",
                    ".type":"global",
                }
            ])
        with self.subTest("modify_logging_settings"):
            x = self.put_data(base_url + "/general", {
                "size":"256",
                "log_proto":"udp",
                "log_type":"file",
                "log_compress":"1"
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size":"256",
                "log_proto":"udp",
                "log_type":"file",
                "id":"general",
                ".type":"global",
                "log_file":"/usr/local/var/log/messages",
                "log_compress":"1",
            })
        with self.subTest("get_modified"):
            x = self.get(base_url + "/general")
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size":"256",
                "log_proto":"udp",
                "log_type":"file",
                "id":"general",
                ".type":"global",
                "log_compress":"1",
                "log_file":"/usr/local/var/log/messages"
            })
        with self.subTest("test_hostname"):
            x = self.put_data(base_url, [
            {
                "id": "general",
                ".type": "global",
                "size": "128",
                "log_hostname": "1",
                "log_ip": "",
                "log_port": "",
                "log_compress":"",
                "log_type": "circular",
                "remote_logger": [
                    "192.168.1.1:444,tcp",
                    "192.168.1.2:444,udp",
                ],
            }
            ])
            x.assert_data([
                {
                    'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                    "size": "128",
                    "log_type": "circular",
                    "log_hostname": "1",
                    "remote_logger": [
                        "192.168.1.1:444,tcp",
                        "192.168.1.2:444,udp"
                    ],
                    "log_ip": "192.168.1.1",
                    "log_port": "444",
                    "log_proto": "tcp",
                    "id": "general",
                    ".type": "global",
                }
            ])
        with self.subTest("return_configuration"):
            x = self.put_data(base_url + "/general", {
                "size":"128",
                "log_type":"circular",
                "log_compress":"",
                "log_hostname":"",
                "remote_logger":[]
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size":"128",
                "log_hostname": "",
                "log_ip": "",
                "log_port": "",
                "log_proto": "",
                "log_type":"circular",
                "id":"general",
                ".type":"global",
            })

    def test_troubleshoot_logging_delete_log_file(self):
        base_url = "/logging/"
        with self.subTest("create_logfile"):
            self.ssh.send_cmd("mkdir -p /usr/local/var/log")
            self.ssh.send_cmd("touch /usr/local/var/log/messages")
        with self.subTest("delete_log_file_success"):
            x = self.post(base_url + "actions/delete_log")
            x.assert_data({
                "message":"Log file deleted."
            })
        with self.subTest("delete_log_file_failed"):
            x = self.post(base_url + "actions/delete_log")
            x.assert_error("Request", "Log file is not found.", codes.ResponseCodes.INCORRECT_REQUEST.val())

    def test_troubleshoot_log_rotation(self):
        base_url = "/logging/config"
        with self.subTest("enable_log_rotation"):
            x = self.put_data(base_url + "/general", {
                "size": "10",
                "log_type": "file",
                ".type": "global",
                "log_compress": "0",
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size": "10",
                "log_type": "file",
                "id": "general",
                "log_file": "/usr/local/var/log/messages",
                ".type": "global",
                "log_compress": "0"
            })
        with self.subTest("check_log_rotation"):
            with open_ssh_connection(timeout=300) as ssh:
                attempt_limit = 30
                attempt_count = 0

                while attempt_count < attempt_limit and ssh.send_cmd("test -e /usr/local/var/log/messages; echo $?").strip() != "0":
                    attempt_count += 1
                    sleep(3)

                ssh.send_cmd(
                    "count=0; while [ $count -lt 2050 ]; do logger \"Counter: $count\"; count=$((count + 1)); done"
                )

                attempt_count = 0
                while attempt_count < attempt_limit:
                    files = ssh.send_cmd("ls /usr/local/var/log/messages*").split("\n")
                    files = [re.sub(r'\x1b\[[0-9;]*m', '', file).strip() for file in files if file.strip()]
                    file_list = []
                    for file in files:
                        file_list.extend(file.split())

                    if len(file_list) == 13 and all(file.startswith("/usr/local/var/log/messages") for file in file_list):
                        break

                    attempt_count += 1
                    sleep(3)

                self.assertEqual(len(file_list), 13)
                for file in file_list:
                    self.assertTrue(file.startswith("/usr/local/var/log/messages"))
        with self.subTest("check_logread_output"):
            x = self.get("/troubleshoot/system/status")
            x.assert_data({""})
        with self.subTest("return_configuration"):
            x = self.post("/logging/actions/delete_log")
            x.assert_data({
                "message":"Log file deleted."
            })
            x = self.put_data(base_url + "/general", {
                "size":"128",
                "log_type":"circular",
                "remote_logger": [],
                "log_compress":"",
                "log_hostname":"",
                "log_proto":""
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "size":"128",
                "log_hostname": "",
                "log_ip": "",
                "log_port": "",
                "log_type":"circular",
                "id":"general",
                ".type":"global",
            })
    def test_troubleshoot_logging_deletion(self):
        x = self.delete("/logging/config")
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
    def test_troubleshoot_logging_creation(self):
        x = self.post_data("/logging/config", {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)
    def test_log_buffer_limit(self):
        base_url = "/logging/config"
        with self.subTest("log_buffer_limit"):
            x = self.put_data(base_url + "/general", {
                "log_buffer_size":"87692000001",
                "log_type":"file",
                "size":"200",
                "log_compress": "0"
            })
            x.assert_error("log_buffer_size", "Not enough flash space on the device.", 104)
        with self.subTest("log_buffer_limit"):
            x = self.put_data(base_url + "/general", {
                "log_buffer_size":"87692000001",
                "log_type":"circular",
            })
            x.assert_error("log_buffer_size", "Not enough RAM space on the device.", 105)
    def test_log_option(self):
        base_url = "/logging/config/general"
        with self.subTest("log_type_option"):
            x = self.put_data(base_url, {
                "log_type": "files"
            })
            x.assert_error("log_type","Must be one of the following values [circular, file].", 103)
    def test_size_option(self):
        base_url = "/logging/config/general"
        with self.subTest("file_logging"):
            x = self.put_data(base_url, {
                "size": "100",
                "log_type": "file",
                "log_compress": "0"
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "id":"general",
                "log_type":"file",
                ".type":"global",
                "size":"100",
                'log_compress': '0',
                'log_file': '/usr/local/var/log/messages',
            })
        with self.subTest("circular_logging"):
            x = self.put_data(base_url, {
                "size": "300",
                "log_type": "circular"
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "log_type":"circular",
                "id":"general",
                ".type":"global",
                "size":"300",
                'log_compress': '0',
            })
        with self.subTest("circular_logging"):
            x = self.put_data(base_url, {
                "size": ""
            })
            x.assert_data({
                "log_type":"circular",
                "id":"general",
                ".type":"global",
                "size":"300",
                'log_compress': '0',
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
            })
        with self.subTest("size_validation_error"):
            x = self.put_data(base_url, {
                "size": "test",
                "log_type": "file",
                "log_compress": "0"
            })
            x.assert_error("size", "Value must be a valid unsigned integer", codes.ResponseCodes.INVALID_OPT.val())

            x = self.put_data(base_url, {
                "size": "test",
            })
            x.assert_error("size", "Value must be a valid unsigned integer", codes.ResponseCodes.INVALID_OPT.val())
        with self.subTest("return_configuration"):
            x = self.put_data(base_url, {
                "size":"128",
                "log_type":"circular",
            })
            x.assert_data({
                "id": "general",
                'log_compress': '0',
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                ".type": "global",
                "log_type":"circular",
                "size": "128"
            })
    def test_deprecated_options(self):
        base_url = "/logging/config"
        with self.subTest("log_buffer"):
            x = self.put_data(base_url + "/general", {
                "log_buffer_size": "128",
                "log_size": "200",
                "log_type": "circular",
                ".type": "global",
                "log_compress": "0",
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "id":"general",
                ".type":"global",
                "log_type":"circular",
                ".type":"global",
                "size":"128",
                'log_compress': '0',
            })
        with self.subTest("log_buffer_validation_error"):
            x = self.put_data(base_url + "/general", {
                "log_buffer_size": "test",
                "log_type": "file",
                "log_compress": "0"
            })
            x.assert_error("log_buffer_size", "Value must be a valid unsigned integer", codes.ResponseCodes.INVALID_OPT.val())

            x = self.put_data(base_url + "/general", {
                "log_buffer_size": "test",
            })
            x.assert_error("log_buffer_size", "Value must be a valid unsigned integer", codes.ResponseCodes.INVALID_OPT.val())
        with self.subTest("log_size"):
            x = self.put_data(base_url + "/general", {
                "log_buffer_size": "120",
                "log_size": "400",
                "log_type": "file",
                ".type": "global",
                "log_compress": "0",
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                "id":"general",
                ".type":"global",
                "log_type":"file",
                "size":"400",
                'log_compress': '0',
                'log_file': '/usr/local/var/log/messages',
            })
        with self.subTest("log_size_array"):
            x = self.put_data(base_url + "/general", {
                "log_buffer_size": "100",
                "log_size": ["10", "20"],
                "log_type": "file"
            })
            x.assert_error("log_size","Option does not accept an array", codes.ResponseCodes.INVALID_OPT.val())
        with self.subTest("log_size_empty"):
            x = self.put_data(base_url + "/general", {
                "log_buffer_size":"500",
                "log_type": "file",
                "log_compress": "1"
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                ".type": "global",
                "log_type": "file",
                "log_file": "/usr/local/var/log/messages",
                "id": "general",
                "log_compress": "1",
                "size": "500"
            })
        with self.subTest("size_empty"):
            x = self.put_data(base_url + "/general", {
                "log_buffer_size":"128",
                "log_size":"128",
                "size": "",
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                ".type": "global",
                "log_type": "file",
                "log_file": "/usr/local/var/log/messages",
                "id": "general",
                "log_compress": "1",
                "size": "128"
            })
        with self.subTest("return_configuration"):
            x = self.put_data(base_url + "/general", {
                "size":"128",
                "log_type":"circular",
                'log_compress': '0'
            })
            x.assert_data({
                'log_levels': ['0', '1', '2', '3', '4', '5', '6'],
                ".type": "global",
                "id": "general",
                'log_compress': '0',
                "log_type":"circular",
                "size": "128"
            })
