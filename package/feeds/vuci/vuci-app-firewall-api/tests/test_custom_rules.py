import sys
sys.path.append("../../../../tests")
import utility_integration as util

class test_firewall_custom_rules(util.WrapTest):
    url = "/firewall/custom_rules"
    sid = "general"
    default_data = {
        ".type": "defaults",
        "custom_rules": "# This file is interpreted as shell script.\n# Put your custom iptables rules here, they will\n# be executed with each firewall (re-)start.\n\n# Internal uci firewall chains are flushed and recreated on reload, so\n# put custom rules into the root chains e.g. INPUT or FORWARD or into the\n# special user chains, e.g. input_wan_rule or postrouting_lan_rule.\n"
    }

    def test_firewall_custom_rules_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url + "/config/" + self.sid)
            get_response = self.default_data.copy()
            get_response["id"] = self.sid
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            edit_data = {
                ".type": "defaults",
                "custom_rules": "test"
            }
            x = self.put_data(self.url + "/config/" + self.sid, edit_data)
            edit_data["id"] = self.sid
            x.assert_data(edit_data)
        with self.subTest("return_configuration_to_default"):
            x = self.post(self.url + "/actions/reset", None)
            self.default_data.pop(".type")
            x.assert_data(self.default_data)
