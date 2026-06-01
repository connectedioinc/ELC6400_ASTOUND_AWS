import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest

class GPSHTTPS(WrapTest):
    url = "/gps/https/config/general"
    tavl_url = "/gps/https/tavl_rules/config"

    def setUp(self):
        if not self.has_gps():
            self.skipTest("device doesn't have gps")

    def has_gps(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        return board["hwinfo"]["gps"]

    def list_tavls(self):
        response = self.get(self.tavl_url)
        response.assert_code(200)
        return response.resp.json()["data"]

    def update_tavl(self, id: str, data: dict):
        self.put_data(f"{self.tavl_url}/{id}", data)

    def test_basic_update(self):
        self.put_data(self.url, {
            "enabled": "1",
            "hostname": "1.2.3.4",
            "interval": "1234"
        }).assert_data({
            ".type": "section",
            "enabled": "1",
            "hostname": "1.2.3.4",
            "id": "general",
            "interval": "1234"
        })

    def test_update_tavl(self):
        for tavl in self.list_tavls():
            id = tavl["id"]

            tavl["enabled"] = "1"
            self.put_data(f"{self.tavl_url}/{id}", {
                "enabled": "1"
            }).assert_data(tavl)

            tavl["enabled"] = "0"
            self.put_data(f"{self.tavl_url}/{id}", {
                "enabled": "0"
            }).assert_data(tavl)
