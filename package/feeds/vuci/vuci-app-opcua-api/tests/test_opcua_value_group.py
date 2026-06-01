import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import whitespace_symbols

class OPCUAValueGroup(WrapTest):
    url = "/opcua/group/config"

    def create_config(self):
        resp = self.post_data(self.url, {
            ".type": "value_group",
            "name": "testy_value_group",
            "period": "60",
        })
        resp.assert_code(201)
        return resp.json["data"]["id"]

    def delete_config(self, id: str):
        resp = self.delete(f"{self.url}/{id}")
        resp.assert_code(200)

    def delete_config(self, id: str):
        resp = self.delete(f"{self.url}/{id}")
        resp.assert_code(200)

    def test_basic_crud(self):
        self.crud_test(self.url, {
            ".type": "value_group",
            "name": "testy_value_group"
        }, {
            "enabled": "0",
            ".type": "value_group",
            "midfix": ";",
            "fail_mode": "0",
            "period": "60",
            "postfix": "}",
            "name": "testy_value_group",
            "scheduling_type": "0",
            "replacement": "nil",
            "prefix": "{"
        })

    def test_deny_whitespace(self):
        id = self.create_config()
        for field in ["prefix", "midfix", "postfix"]:
            for symbol in whitespace_symbols:
                resp = self.put_data(f"{self.url}/{id}", {
                    field: symbol
                })
                resp.assert_code(422)
        self.delete_config(id)
