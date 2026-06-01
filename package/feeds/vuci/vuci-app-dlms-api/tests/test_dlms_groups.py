import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all
from time import sleep

class DLMS(WrapTest):
    url_groups = "/dlms/cosem_group/config"
    url_no_cfg_groups = "/dlms/cosem_group"

    def setUp(self):
        delete_all(self, self.url_groups)

    def get_full_body(self):
        return {
            ".type": "cosem_group",
            "name": "test",
            "interval": "1",
            "enabled": "1",
        }

    def create_config(self):
        body = self.get_full_body()
        response = self.post_data(self.url_groups, body)
        response.assert_data(body, 201, ["id", ".type"])
        return response.resp.json()["data"]["id"]

    def delete_config(self, id: str):
        self.delete(f"{self.url_groups}/{id}").assert_code(200)

    def test_basic_crud(self):
        self.crud_test(self.url_groups, {
            ".type": "cosem_group",
            "name": "test",
            "interval": "20",
        }, self.get_full_body())

    def list_cosem(self, id: str):
        response = self.get(f"{self.url_no_cfg_groups}/{id}/cosem/config")
        response.assert_code(200)
        return response.resp.json()["data"]

    def add_cosem(self, id: str, name: str):
        response = self.post_data(f"{self.url_no_cfg_groups}/{id}/cosem/config", {
            "name": name
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def test_basic_cosem_crud(self):
        id = self.create_config()

        self.crud_test(f"{self.url_no_cfg_groups}/{id}/cosem/config", {
            ".type": "cosem",
            "obis": "14",
            "cosem_id": "1"
        }, {
            ".type": "cosem",
            "obis": "14",
            "cosem_id": "1"
        })

    def test_delete_devices(self):
        """
            All related cosem should be deleted, when deleting the configuration
        """
        id = self.create_config()

        self.add_cosem(id, "test_cosem_1")
        self.add_cosem(id, "test_cosem_2")
        self.add_cosem(id, "test_cosem_3")
        self.delete_config(id)

        id = self.create_config()
        requests = self.list_cosem(id)
        self.assertEqual(len(requests), 0)
