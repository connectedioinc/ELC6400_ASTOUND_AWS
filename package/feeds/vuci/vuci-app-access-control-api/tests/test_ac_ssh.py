import response_codes as codes
import utility_integration as util
from utils.general_api import is_package_installed
import sys

sys.path.append("../../../../tests")

class test_access_control_ssh(util.WrapTest):
    def test_access_control_ssh_base_functionaliy(self):
        base_url = "/access_control/ssh/config"
        with self.subTest("configure_section"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1",
                "wan_access":"1",
                "port":"420",
                "wan_port":"420",
                "ssh_keys":"testKeys",
                "enable_key_ssh":"1"
            })
            x.assert_data({
                ".type":"dropbear",
                "enabled":"1",
                "wan_access":"1",
                "port":"420",
                "wan_port":"420",
                "ssh_keys":"testKeys",
                "enable_key_ssh":"1",
                "password_auth":"1",
                "id":"general"
            })
        with self.subTest("single_get"):
            x = self.get(base_url + "/general")
            x.assert_data({
                ".type":"dropbear",
                "enabled":"1",
                "wan_access":"1",
                "port":"420",
                "wan_port":"420",
                "ssh_keys":"testKeys",
                "enable_key_ssh":"1",
                "password_auth":"1",
                "id":"general"
            })
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            x.assert_data([{
                ".type":"dropbear",
                "enabled":"1",
                "wan_access":"1",
                "port":"420",
                "wan_port":"420",
                "ssh_keys":"testKeys",
                "enable_key_ssh":"1",
                "password_auth":"1",
                "id":"general"
            }])
        with self.subTest("clear_configuration"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1",
                "wan_access":"0",
                "port":"22",
                "wan_port":"",
                "enable_key_ssh":"",
                "ssh_keys":""
            })
            x.assert_data({
                "id":"general",
                ".type":"dropbear",
                "enabled":"1",
                "enable_key_ssh":"0",
                "password_auth":"1",
                "wan_access":"0",
                "port":"22",
                "wan_port":"22"
            })
        with self.subTest("test_ac_ssh_deletion"):
            x = self.delete(base_url)
            x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
        with self.subTest("test_ac_ssh_creation"):
            x = self.post_data(base_url, {})
            x.assert_error("Validation", "Section creation is not allowed", 108, None, None)
        with self.subTest("duplicate_default_https_port"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1",
                "wan_access":"",
                "port":"443",
                "enable_key_ssh":"",
                "ssh_keys":""
            })
            x.assert_error("Validation", "Port is already in use", 113, None, None)
        with self.subTest("duplicate_default_http_port"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1",
                "wan_access":"",
                "port":"80",
                "enable_key_ssh":"",
                "ssh_keys":""
            })
            x.assert_error("Validation", "Port is already in use", 113, None, None)
        with self.subTest("duplicate_default_telnet_port"):
            if not is_package_installed(self, "telnet"):
                self.skipTest("Telnet package is not installed")
            x = self.put_data(base_url + "/general", {
                "enabled":"1",
                "wan_access":"",
                "port":"23",
                "enable_key_ssh":"",
                "ssh_keys":""
            })
            x.assert_error("Validation", "Port is already in use", 113, None, None)
        with self.subTest("empty_port"):
            if not is_package_installed(self, "telnet"):
                self.skipTest("Telnet package is not installed")
            x = self.put_data(base_url + "/general", {
                "port":"",
            })
            x.assert_error("port", "Option can not be empty", 103, None, None)

