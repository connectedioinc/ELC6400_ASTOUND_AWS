import utility_integration as util
import response_codes as codes
from utils.general_api import is_package_installed
import sys
sys.path.append("../../../../tests")

RC = codes.ResponseCodes


class test_mwan_rules(util.WrapTest):
    url = "/failover/rules/config"
    default_data = [{
        ".type": "rule",
        "use_policy": "mwan_default",
        "id": "default_rule",
        "name": "default_rule",
        "priority": "1",
        "dest_ip": ["0.0.0.0/0"]
    }]
    sid = None

    def setUp(self):
        if not is_package_installed(self, "mwan"):
            self.skipTest("MWAN3 package is not installed")

    def test_mwan_policies_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()["data"]
            self.assertEqual(self.default_data, get_response)
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, {})
            self.sid = x.resp.json()["data"]["id"]
            x.assert_data({
                "id": self.sid,
                "name": self.sid,
                ".type": "rule",
                "proto": "all",
                "priority": "2",
                "sticky": "0"
            }, 201)
        for proto in ["all", "icmp", "esp", "tcp", "udp"]:
            with self.subTest(f"edit_configuration_proto_{proto}"):
                put_data = {
                    ".type": "rule",
                    "proto": proto,
                    "name": self.sid,
                    "dest_ip": ["0.0.0.0/0", "1.1.10.10"],
                    "src_ip": ["1.1.1.1/24", "10.10.10.10"],
                    "sticky": "1",
                    "timeout": "300",
                    "use_policy": "default"
                }
                if proto == "tcp" or proto == "udp":
                    put_data["src_port"] = "80"
                    put_data["dest_port"] = "80"
                x = self.put_data(self.url + "/" + self.sid, put_data)
                put_data["id"] = self.sid
                put_data["priority"] = "2"
                x.assert_data(put_data)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
