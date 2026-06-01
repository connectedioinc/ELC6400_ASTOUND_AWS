import sys
import utility_integration as util
import response_codes as codes
from utils.general_api import is_package_installed
sys.path.append("../../../../tests")
import unittest

class troubleshoot(util.WrapTest):

    base_url = "/troubleshoot"
    def test_troubleshoot_base_functionality(self):
        if not is_package_installed(self, "tcpdump"):
            self.skipTest("tcpdump package is not installed")
        
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        interface = "eth1" if "dsa" in board["hwinfo"] else "eth0"

        with self.subTest("multiple_get"):
            x = self.get(self.base_url + "/config")
            x.assert_data([{
                "id":"general",
                ".type":"system",
                "tcp_dump":"0",
            }])
        with self.subTest("single_get"):
            x = self.get(self.base_url + "/config/general")
            x.assert_data({
                "id":"general",
                ".type":"system",
                "tcp_dump":"0",
            })
        with self.subTest("modify_troubleshoot"):
            x = self.put_data(self.base_url + "/config/general", {
                "tcp_dump":"1",
                "tcp_dump_interface":interface,
                "tcp_dump_filter":"arp",
                "tcp_inout":"inout",
                "tcp_mount":"/tmp",
                "tcp_host":"8.8.8.8",
                "tcp_port":"80"
            })
            x.assert_data({
                "id":"general",
                ".type":"system",
                "tcp_dump":"1",
                "tcp_dump_interface":interface,
                "tcp_dump_filter":"arp",
                "tcp_inout":"inout",
                "tcp_mount":"/tmp",
                "tcp_host":"8.8.8.8",
                "tcp_port":"80"
            })
        with self.subTest("get_modified"):
            x = self.get(self.base_url + "/config/general")
            x.assert_data({
                "id":"general",
                ".type":"system",
                "tcp_dump":"1",
                "tcp_dump_interface":interface,
                "tcp_dump_filter":"arp",
                "tcp_inout":"inout",
                "tcp_mount":"/tmp",
                "tcp_host":"8.8.8.8",
                "tcp_port":"80"
            })
        with self.subTest("return_configuration"):
            x = self.put_data(self.base_url + "/config/general", {
                "tcp_dump":"",
                "tcp_dump_interface":"",
                "tcp_dump_filter":"",
                "tcp_inout":"",
                "tcp_mount":"",
                "tcp_host":"",
                "tcp_port":""
            })
            x.assert_data({
                "id":"general",
                ".type":"system",
                "tcp_dump": "0",
            })

    def test_log_gets(self):
        with self.subTest("test_kernel_log"):
            x = self.get(self.base_url + "/kernel/status")
            x.assert_code(200)
        with self.subTest("test_system_log"):
            x = self.get(self.base_url + "/system/status")
            x.assert_code(200)

    def test_troubleshoot_deletion(self):
        x = self.delete(self.base_url + "/config")
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
    def test_troubleshoot_creation(self):
        x = self.post_data(self.base_url + "/config", {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)