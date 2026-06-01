import sys
sys.path.append("../../../../tests/")
import utility_integration as util

class test_firewall_http_attack_prevention(util.WrapTest):
    url = "/attack_prevention/http/config"
    sid = "general"
    default_data = {
        ".type": "rule",
        "http_limit": "0"
    }

    def test_firewall_http_attack_prevention_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url + "/" + self.sid)
            get_response = self.default_data.copy()
            get_response["id"] = self.sid
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                ".type": "rule",
                "http_limit": "1",
                "period": "hour",
                "limit": "100",
                "limit_burst": "99"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            x.assert_data(put_data)
        with self.subTest("return_configuration_to_default"):
            default = self.default_data.copy()
            default["http_limit"] = ""
            default["period"] = ""
            default["limit"] = ""
            default["limit_burst"] = ""
            x = self.put_data(self.url + "/" + self.sid, default)
            self.default_data["id"] = self.sid
            x.assert_data(self.default_data)

    def test_firewall_http_attack_prevention_deletion(self):
        x = self.delete(self.url + "/" + self.sid)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    def test_firewall_http_attack_prevention_creation(self):
        x = self.post_data(self.url, {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)
