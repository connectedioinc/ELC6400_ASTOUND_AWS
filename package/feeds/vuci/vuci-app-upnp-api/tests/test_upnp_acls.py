import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import is_package_installed
import response_codes as codes

RC = codes.ResponseCodes

class test_upnp_acls(WrapTest):
    base_url = "/upnp/acls/config"

    def setUp(self):
        if not is_package_installed(self, "upnp"):
            self.skipTest("UPNP package is not installed")

    def test_basic_crud(self):
        self.crud_test(self.base_url, {
            ".type": "perm_rule",
            "comment": "Test rule",
            "ext_ports": "5-10",
            "int_addr": "0.0.0.0/0",
            "int_ports": "5-10",
            "action": "allow"
        }, {
            ".type": "perm_rule",
            "comment": "Test rule",
            "ext_ports": "10-20",
            "int_addr": "0.0.0.0/1",
            "int_ports": "10-20",
            "action": "deny"
        })
    def test_ports(self):
        with self.subTest("single_port"):
            x = self.post_data(self.base_url, {
                ".type": "perm_rule",
                "ext_ports": "2000",
                "int_ports": "2000",
                "action": "deny"
            })
            x.assert_data({
                ".type": "perm_rule",
                "ext_ports": "2000",
                "int_ports": "2000",
                "action": "deny"
            }, 201, ["id"])
            id = x.json["data"]["id"]
            x = self.delete(self.base_url + "/" + id)
            x.assert_code(200)
        with self.subTest("multiple_port_invalid"):
            x = self.post_data(self.base_url, {
                ".type": "perm_rule",
                "int_ports": "1-",
                "action": "deny"
            })
            x.assert_error("int_ports", "Values between 1 and 65535 are accepted.", RC.INVALID_OPT.val())