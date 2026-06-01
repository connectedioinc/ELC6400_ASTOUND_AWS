from utils.ssh import open_ssh_connection, is_process_running, is_process_stopped
from utility_integration import WrapTest
from utils.general_api import generate_require_error_messages, get_modems
import sys
sys.path.append("../../../../tests")

class Cumulocity(WrapTest):
    cumulocity_url = "/cumulocity/config/cumulocity"
    cot_url = "/cloud_of_things/config/cloudofthings"
    
    base_data = {
        "enabled": "0",
        ".type": "iot",
        "interval": "69",
        "server": "test.com",
        "port": "8000",
        "qos": "1",
        "keepalive": "60"
    }
    empty_base_data = {
        "enabled": "",
        ".type": "iot",
        "interval": "",
        "server": "",
        "port": "",
        "qos": "",
        "keepalive": ""
    }
    cumulocity_data = {
        **base_data,
        "ssl": "1",
    }

    cot_data = {
        **base_data,
    }

    enable_cumulocity_data = {
        **empty_base_data,
        "enabled": "1",
        "ssl": ""
    }

    empty_cumulocity_data = {
        **empty_base_data,
        "ssl": "",
    }

    enable_cot_data = {
        **empty_base_data,
        "enabled": "1",
    }

    empty_cot_data = {
        **empty_base_data,
    }

    def tearDown(self):
        self.put_data(self.cumulocity_url, self.empty_cumulocity_data).assert_code(200)
        self.put_data(self.cot_url, self.empty_cot_data).assert_code(200)

    def test_cumulocity_update(self):
        x = self.put_data(self.cumulocity_url, self.cumulocity_data)
        x.assert_data(self.cumulocity_data, skippable_options=["id"])

    def test_enable_cot(self):
        with self.subTest("set_to_empty_values"):
            x = self.put_data(self.cumulocity_url, self.empty_cumulocity_data)
            x.assert_data({
                "id": "cumulocity",
                ".type": "iot"
            }, 200)
        
        with self.subTest("set_to_enable_values"):
            x = self.put_data(self.cumulocity_url, self.enable_cumulocity_data)    
            self.assertListEqual(x.json["errors"], generate_require_error_messages('enabled', "cumulocity", ["server", "interval"]))

    def test_cot_update(self):
        x = self.put_data(self.cot_url, self.cot_data)
        x.assert_data(self.cot_data, skippable_options=["id"])

    def test_enable_cot(self):
        with self.subTest("set_to_empty_values"):
            x = self.put_data(self.cot_url, self.empty_cot_data)
            x.assert_data({
                "id": "cloudofthings",
                ".type": "iot"
            }, 200)
        
        with self.subTest("set_to_enable_values"):
            x = self.put_data(self.cot_url, self.enable_cot_data)
            self.assertListEqual(x.json["errors"], generate_require_error_messages('enabled', "cloudofthings", ["server", "interval"]))

    def test_check_process_cumulocity_cot(self):
        md = get_modems(self)
        if len(md) > 0:
            if md[0]["pinstate_id"] != 1:
                self.skipTest("SIM must be inserted for this test")

        with open_ssh_connection() as ssh:
            self.put_data(self.cumulocity_url, self.cumulocity_data)

            self.assertTrue(is_process_stopped(ssh, "cmStreamApp"), "Expected 'cmStreamApp' not to be running")

            self.cumulocity_data["enabled"] = "1"
            self.put_data(self.cumulocity_url, self.cumulocity_data)

            self.assertTrue(is_process_running(ssh, "cmStreamApp"), "Expected 'cmStreamApp' to be running")

            self.cumulocity_data["enabled"] = "0"
            self.put_data(self.cumulocity_url, self.cumulocity_data)

            self.put_data(self.cot_url, self.cot_data)

            self.assertTrue(is_process_stopped(ssh, "cmStreamApp"), "Expected 'cmStreamApp' not to be running")

            self.cot_data["enabled"] = "1"
            self.put_data(self.cot_url, self.cot_data)

            self.assertTrue(is_process_running(ssh, "cmStreamApp"), "Expected 'cmStreamApp' to be running")

            self.cot_data["enabled"] = "0"
            self.put_data(self.cot_url, self.cot_data)
            