import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all

class DLMS(WrapTest):
    url = "/dlms/config/general"
    url_connections = "/dlms/connections/config"
    url_groups = "/dlms/cosem_group/config"

    def test_disallow_post(self):
        self.post(self.url, {}) \
            .assert_error("Validation", "Section creation is not allowed", 108)

    def test_disallow_delete(self):
        self.delete(self.url) \
            .assert_error("Validation", "Section deletion is not allowed", 111)

    def setUp(self):
        delete_all(self, self.url_connections)

    def get_full_body(self):
        return {
            ".type": "connection",
            "name": "TEST",
            "port": "50",
            "address": "1.1.1.1",
            "connection_type": "0"
        }

    def create_config(self):
        body = self.get_full_body()
        response = self.post_data(self.url_connections, body)
        response.assert_data(body, 201, ["id", ".type"])
        return response.resp.json()["data"]["id"]

    def delete_config(self, id: str):
        self.delete(f"{self.url_connections}/{id}").assert_code(200)

    def test_basic_crud(self):
        self.crud_test(self.url_connections, {
            ".type": "connection",
            "name": "TEST",
            "port": "80",
        }, self.get_full_body())
