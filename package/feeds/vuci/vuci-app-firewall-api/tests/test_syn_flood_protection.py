import sys
sys.path.append("../../../../tests/")
import utility_integration as util

class test_firewall_syn_flood_protection(util.WrapTest):
    url = "/attack_prevention/syn_flood/config"
    sid = "general"
    default_data = {
        ".type": "defaults",
        "syn_flood": "1",
        "synflood_burst": "50",
        "tcp_syncookies": "1",
        "synflood_rate": "25"
    }

    def test_firewall_syn_flood_protection_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url + "/" + self.sid)
            get_response = self.default_data.copy()
            get_response["id"] = self.sid
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                ".type": "defaults",
                "syn_flood": "0",
                "synflood_burst": "51",
                "tcp_syncookies": "0",
                "synflood_rate": "26"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            x.assert_data(put_data)
        with self.subTest("return_configuration_to_default"):
            default = {
                ".type": "defaults",
                "syn_flood": "1",
                "synflood_burst": "",
                "tcp_syncookies": "",
                "synflood_rate": ""
            }
            x = self.put_data(self.url + "/" + self.sid, default)
            self.default_data["id"] = self.sid
            x.assert_data(self.default_data)

    def test_firewall_syn_flood_protection_deletion(self):
        x = self.delete(self.url + "/" + self.sid)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    def test_firewall_syn_flood_protection_creation(self):
        x = self.post_data(self.url, {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)
