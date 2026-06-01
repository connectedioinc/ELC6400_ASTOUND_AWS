import response_codes as codes
import utility_integration as util
import sys

sys.path.append("../../../../tests")

class test_access_control_cli(util.WrapTest):
    def test_access_control_cli_base_functionality(self):
        base_url = "/access_control/cli/config"
        with self.subTest("configure_section"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1",
                "wan_access":"1",
                "port":"4100-4240",
                "wan_port":"4100-4240",
                "shell_limit":"6"
            })
            x.assert_data({
                "id":"general",
                ".type":"status",
                "enabled":"1",
                "wan_access":"1",
                "port":"4100-4240",
                "wan_port":"4100-4240",
                "shell_limit":"6"
            })
        with self.subTest("single_get"):
            x = self.get(base_url + "/general")
            x.assert_data({
                "id":"general",
                ".type":"status",
                "enabled":"1",
                "wan_access":"1",
                "port":"4100-4240",
                "wan_port":"4100-4240",
                "shell_limit":"6"
            })
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            x.assert_data([{
                "id":"general",
                ".type":"status",
                "enabled":"1",
                "wan_access":"1",
                "port":"4100-4240",
                "wan_port":"4100-4240",
                "shell_limit":"6"
            }])
        with self.subTest("clear_configuration"):
            x = self.put_data(base_url + "/general", {
                "wan_access":"",
                "shell_limit":"5",
                "port":"4200-4220",
                "wan_port":"",
            })
            x.assert_data({
                "id":"general",
                ".type":"status",
                "enabled":"1",
                "port":"4200-4220",
                "wan_port":"4200-4220",
                "shell_limit":"5"
            })
        with self.subTest("test_ac_cli_deletion"):
            x = self.delete(base_url)
            x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
        with self.subTest("test_ac_cli_creation"):
            x = self.post_data(base_url, {})
            x.assert_error("Validation", "Section creation is not allowed", 108, None, None)
        with self.subTest("test_duplicate_http_port"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1",
                "wan_access":"1",
                "port":"79-120",
                "shell_limit":"6"
            })
            x.assert_error("Validation", "Port is already in use", 113, None, None)
        with self.subTest("test_duplicate_ssh_port"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1",
                "wan_access":"1",
                "port":"1-22",
                "shell_limit":"6"
            })
            x.assert_error("Validation", "Port is already in use", 113, None, None)
        with self.subTest("test_empty_port"):
            x = self.put_data(base_url + "/general", {
                "port":"",
                "shell_limit":"6"
            })
            x.assert_error("port", "Option can not be empty", 103, None, None)
