import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import whitespace_symbols

class OPCUAValueGroupValues(WrapTest):
    url = "/opcua/group/{}/values/config"
    parent_url = "/opcua/group/config"

    server_node_url = "/opcua/server/{}/nodes/config"
    server_url = "/opcua/server/config"

    def create_config(self, url: str, config: dict):
        resp = self.post_data(url, config)
        resp.assert_code(201)
        return resp.json["data"]["id"]

    def delete_config(self, url, id: str):
        resp = self.delete(f"{url}/{id}")
        resp.assert_code(200)

    def setUp(self):
        self.parent = self.create_config(self.parent_url, {
            "enabled": "0",
            "midfix": ",",
            "fail_mode": "0",
            "period": "60",
            "postfix": "}",
            "name": "testy_testy_value_group",
            "scheduling_type": "0",
            "replacement": "nil",
            "prefix": "{"
        })
        self.server = self.create_config(self.server_url, {
            "enabled": "0",
            "timeout": "5000",
            "url": "http://example.com/TEST",
            "name": "testy_testy_server"
        })
        self.server_node = self.create_config(self.server_node_url.format(self.server), {
            "name": "testy_testy_server_node",
            "type": "0",
            "ns": "1",
            "node_id": "1"
        })

    def tearDown(self):
        self.delete_config(self.parent_url, self.parent)
        self.delete_config(self.server_node_url.format(self.server), self.server_node)
        self.delete_config(self.server_url, self.server)

    def test_basic_crud(self):
        self.crud_test(self.url.format(self.parent), {
            ".type": "value_"+self.parent,
            "name": "testy_value"
        }, {
            "enabled": "0",
            ".type": "value_"+self.parent,
            "name": "testy_value",
            "server_node": self.server_node,
            "postfix": ",,",
            "prefix": "{{",
            "replacement": "}}",
        })

    def test_deny_whitespace(self):
        id = self.create_config(self.url.format(self.parent), {
            "enabled": "0",
            ".type": "value_"+self.parent,
            "name": "testy_value",
            "server_node": self.server_node,
        })
        for field in ["prefix", "midfix", "postfix"]:
            for symbol in whitespace_symbols:
                resp = self.put_data(f"{self.url}/{id}", {
                    field: symbol
                })
                resp.assert_code(422)
        self.delete_config(self.url.format(self.parent), id)
