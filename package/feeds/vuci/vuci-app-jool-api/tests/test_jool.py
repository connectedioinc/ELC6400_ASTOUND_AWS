from utils.general_api import is_package_installed
import utility_integration as util
import sys
sys.path.append("../../../../tests")

class test_jool(util.WrapTest):
    url_global = "/jool/global"
    url = "/jool/rules/config"
    sid = None
    default_global_options = {
        "enabled": "0"
    }

    def setUp(self):
        if not is_package_installed(self, "jool"):
            self.skipTest("Jool package is not installed")

    def test_jool_functionality(self):
        with self.subTest("edit_configuration_global"):
            edit_options = {
                "enabled": "0",
                "interface": "lan"
            }
            x = self.put_data(self.url_global, edit_options)
            x.assert_data(edit_options)
        with self.subTest("add_configuration"):
            add_options = {
                "enabled": "0"
            }
            x = self.post_data(self.url, add_options)
            self.sid = x.resp.json()["data"]["id"]
            add_options[".type"] = "jool"
            add_options["id"] = self.sid
            add_options["src"] = "lan"
            x.assert_data(add_options, 201)
        with self.subTest("edit_configuration"): 
            rule_edit_options = {
                "enabled": "1",
                ".type": "jool",
                "src": "*",
                "name": "test",
                "proto": ["tcp", "udp"],
                "src_ipv6": ["fe80::21e:42ff:fe40:5b38"],
                "dest_ipv6": ["fe80::21e:42ff:fe40:5b37"],
                "dest_ipv4": ["192.168.1.180"],
                "src_port": ["8080"],
                "dest_port": ["80"]
            }
            x = self.put_data(self.url + "/" + self.sid, rule_edit_options)
            rule_edit_options["id"] = self.sid
            x.assert_data(rule_edit_options)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
        with self.subTest("reset_configuration"):
            default = self.default_global_options.copy()
            default["interface"] = ""
            x = self.put_data(self.url_global, default)
            x.assert_data(self.default_global_options)


