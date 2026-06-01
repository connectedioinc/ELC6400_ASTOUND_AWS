import sys
sys.path.append("../../../../tests/")
import utility_integration as util

class test_firewall_port_scan(util.WrapTest):
    url = "/attack_prevention/port_scan/config"
    sid = "general"
    default_data = {
        ".type": "defaults",
        "syn_fin": "0",
        "nmap_fin": "0",
        "syn_rst": "0",
        "null_flags": "0",
        "x_max": "0"
    }

    def test_firewall_port_scan_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url + "/" + self.sid)
            get_response = self.default_data.copy()
            get_response["id"] = self.sid
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                ".type": "defaults",
                "port_scan": "1",
                "hitcount": "11",
                "seconds": "15",
                "syn_fin": "1",
                "syn_rst": "1",
                "x_max": "1",
                "nmap_fin": "1",
                "null_flags": "1"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            x.assert_data(put_data)
        with self.subTest("return_configuration_to_default"):
            default = {
                ".type": "defaults",
                "port_scan": "",
                "hitcount": "",
                "seconds": "",
                "syn_fin": "",
                "syn_rst": "",
                "x_max": "",
                "nmap_fin": "",
                "null_flags": ""
            }
            x = self.put_data(self.url + "/" + self.sid, default)
            self.default_data["id"] = self.sid
            x.assert_data(self.default_data)

    def test_firewall_port_scan_deletion(self):
        x = self.delete(self.url + "/" + self.sid)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    def test_firewall_port_scan_creation(self):
        x = self.post_data(self.url, {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)
