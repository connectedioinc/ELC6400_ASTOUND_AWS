import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import whitespace_symbols

class OPCUAServer(WrapTest):
    url = "/opcua/server/config"

    def create_config(self):
        resp = self.post_data(self.url, {
            "enabled": "0",
            ".type": "server",
            "timeout": "5000",
            "url": "http://foobar.com/TEST",
            "name": "test_test"
        })
        resp.assert_code(201)
        return resp.json["data"]["id"]

    def delete_config(self, id: str):
        resp = self.delete(f"{self.url}/{id}")
        resp.assert_code(200)

    def test_basic_crud(self):
        self.crud_test(self.url, {
            "enabled": "0",
            ".type": "server",
            "timeout": "5000",
            "url": "http://foobar.com/TEST",
            "name": "test_test"
        }, {
            "enabled": "1",
            ".type": "server",
            "timeout": "10",
            "url": "http://example.com",
            "name": "test_test"
        })

    def test_deny_whitespace_in_url(self):
        id = self.create_config()

        for symbol in whitespace_symbols:
            resp = self.put_data(f"{self.url}/{id}", {
                "url": "http://example.com" + symbol
            })
            resp.assert_code(422)

        self.delete_config(id)
