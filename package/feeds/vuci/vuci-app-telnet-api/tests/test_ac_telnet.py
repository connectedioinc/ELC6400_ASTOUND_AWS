import response_codes as codes
import utility_integration as util
import sys

sys.path.append("../../../../tests")

class test_access_control_telnet(util.WrapTest):
    def test_access_control_telnet_base_functionality(self):
        base_url = "/access_control/telnet/config"
        with self.subTest("configure_section"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1",
                "wan_access":"1",
                "port":"25"
            })
            x.assert_data({
                "id":"general",
                ".type":"telnetd",
                "enabled":"1",
                "wan_access":"1",
                "port":"25"
            })
        with self.subTest("single_get"):
            x = self.get(base_url + "/general")
            x.assert_data({
                "id":"general",
                ".type":"telnetd",
                "enabled":"1",
                "wan_access":"1",
                "port":"25"
            })
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            x.assert_data([{
                "id":"general",
                ".type":"telnetd",
                "enabled":"1",
                "wan_access":"1",
                "port":"25"
            }])
        with self.subTest("clear_configuration"):
            x = self.put_data(base_url + "/general", {
                "enabled":"0",
                "wan_access":"",
                "port":"23"
            })
            x.assert_data({
                "id":"general",
                ".type":"telnetd",
                "enabled":"0",
                "port":"23"
            })
        with self.subTest("test_ac_telnet_deletion"):
            x = self.delete(base_url)
            x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
        with self.subTest("test_ac_telnet_creation"):
            x = self.post_data(base_url, {})
            x.assert_error("Validation", "Section creation is not allowed", 108, None, None)
        with self.subTest("test_duplicate"):
            x = self.put_data(base_url + "/general", {
                "enabled":"0",
                "wan_access":"",
                "port":"80"
            })
            x.assert_error("Validation", "Port is already in use", 113, None, None)