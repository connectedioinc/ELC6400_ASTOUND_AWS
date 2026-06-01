import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest

class GPSNMEA(WrapTest):
    url = "/gps/nmea/config/general"
    rules_url = "/gps/nmea/rules/config"

    def setUp(self):
        if not self.has_gps():
            self.skipTest("device doesn't have gps")

    def has_gps(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        return board["hwinfo"]["gps"]

    def update_config(self, data: dict):
        response = self.put_data(self.url, data)
        response.assert_code(200)
        return response.resp.json()["data"]

    def get_rules(self):
        response = self.get(self.rules_url)
        response.assert_code(200)
        return response.resp.json()["data"]

    def test_basic_update(self):
        with self.subTest("'hostname' is required when enabling"):
            self.put_data(self.url, {
                "enable": "1"
            }).assert_code(422)

        self.put_data(self.url, {
            "enabled": "0",
            "type": "ram",
            "con_contain": "0",
            "send_prefix": "none",
            "collecting_enabled": "0",
            "collecting_location": "/mnt/foo",
            "proto": "tcp",
            "port": "8500",
            "sentences_max": "5000"
        }).assert_data({
            "enabled": "0",
            "type": "ram",
            "con_contain": "0",
            "id": "general",
            "send_prefix": "none",
            "collecting_enabled": "0",
            "collecting_location": "/mnt/foo",
            "proto": "tcp",
            ".type": "section",
            "port": "8500",
            "sentences_max": "5000"
        })

    def test_update_collecting(self):
        config = self.update_config({
            "collecting_enabled": "1",
            "collecting_location": "/mnt/foobar",
        })
        self.assertEqual(config["collecting_enabled"], "1")
        self.assertEqual(config["collecting_location"], "/mnt/foobar")

        config = self.update_config({
            "collecting_enabled": "0"
        })
        self.assertEqual(config["collecting_enabled"], "0")
        self.assertEqual(config["collecting_location"], "/mnt/foobar")

    def test_basic_rule_update(self):
        for rule in self.get_rules():
            url = f"{self.rules_url}/{rule['id']}"
            self.put_data(url, {
                "collecting_enabled": "1",
                "forwarding_enabled": "1",
                "collecting_interval": "123",
                "forwarding_interval": "456",
            }).assert_data({
                ".type": rule[".type"],
                "id": rule["id"],
                "collecting_enabled": "1",
                "forwarding_enabled": "1",
                "collecting_interval": "123",
                "forwarding_interval": "456",
            })

            del rule["id"]
            self.put_data(url, rule).assert_code(200)
