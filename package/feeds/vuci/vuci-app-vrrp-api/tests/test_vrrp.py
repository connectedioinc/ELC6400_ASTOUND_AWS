import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed, delete_all
import response_codes as codes

RC = codes.ResponseCodes

class test_vrrp(util.WrapTest):
    url = "/vrrp/config"
    firewall_url = "/firewall/traffic_rules/config"
    sid = "new_vrrp"
    options = {
        "id": sid,
        "enabled": "1",
        "virtual_mac": "1",
        "virtual_id": "15",
        "priority": "2",
        "delay": "3",
        "interface": "lan",
        "virtual_ip": ["192.168.1.5", "192.168.1.6"],
        "ping_enabled": "1",
        "host": "8.8.8.8",
        "interval": "10",
        "time_out": "11",
        "packet_size": "15",
        "ping_attempts": "19",
        "retry": "21"
    }

    def setUp(self):
        if not is_package_installed(self, "vrrp"):
            self.skipTest("VRRP package is not installed")

    def tearDown(self):
        delete_all(self, self.url)

    def test_vrrp_base_functionality(self):
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, self.options)
            response_options = self.options.copy()
            response_options[".type"] = "vrrpd"
            x.assert_data(response_options, 201)
        with self.subTest("edit_configuration"):
            edit_options = {
                "enabled": "1",
                "virtual_mac": "0",
                "virtual_id": "11",
                "priority": "3",
                "delay": "4",
                "interface": "wan",
                "virtual_ip": ["192.168.1.4"],
                "ping_enabled": "1",
                "host": "1.1.1.1",
                "interval": "11",
                "time_out": "12",
                "packet_size": "16",
                "ping_attempts": "20",
                "retry": "22"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            edit_options[".type"] = "vrrpd"
            edit_options["id"] = self.sid
            x.assert_data(edit_options, 200)
        with self.subTest("check_firewall_vrrp_rule_creation"):
            x = self.get(self.firewall_url)
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == "Allow-VRRP-WAN":
                    found = True
                    self.assertEqual(section['enabled'], "1")
                    self.assertEqual(section['proto'], ["112"])
                    self.assertEqual(section['family'], "ipv4")
                    self.assertListEqual(section['dest_ip'], ["224.0.0.18"])
                    self.assertEqual(section['target'], "ACCEPT")
                    self.assertEqual(section['utc_time'], "0")
                    self.assertIn("priority", section, "`priority` option is missing from `Allow-VRRP-WAN` traffic rule")

            if not found:
                self.fail("Firewall VRRP rule is not created")
        with self.subTest("create_configuration_with_same_virtual_id"):
            x = self.post_data(self.url, {
                "id": "vrrp1",
                "virtual_id": "11"
            })
            x.assert_code(422)
            x.assert_error("virtual_id", "Instance with the virtual_id exists", RC.INVALID_OPT.val())
        with self.subTest("create_configuration_with_same_interface"):
            x = self.post_data(self.url, {
                "id": "vrrp1",
                "interface": "wan"
            })
            x.assert_code(422)
            x.assert_error("interface", "interface already in use", RC.INVALID_OPT.val())
        with self.subTest("create_configuration_with_not_existing_interface"):
            x = self.post_data(self.url, {
                "id": "vrrp1",
                "interface": "bla-bla"
            })
            x.assert_code(422)
            x.assert_error("interface", "invalid interface", RC.INVALID_OPT.val())
        with self.subTest("enable_ping_without_enabling_configuration"):
            x = self.put_data(self.url + "/" + self.sid, {
                "enabled": "0",
                "ping_enabled": "1"
            })
            x.assert_code(422)
            x.assert_error("ping_enabled", "Cannot enable check connection without enabling vrrp section", RC.INVALID_OPT.val())
        with self.subTest("enable_ping_without_host"):
            x = self.put_data(self.url + "/" + self.sid, {
                "enabled": "1",
                "host": ""
            })
            x.assert_code(422)
            x.assert_error("ping_enabled", "Missing required option: host", RC.INVALID_OPT.val())
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
        with self.subTest("check_firewall_vrrp_rule_after_config_delete"):
            x = self.get(self.firewall_url)
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == "Allow-VRRP-WAN":
                    found = True 

            if found:
                self.fail("Firewall VRRP rule is not deleted")
