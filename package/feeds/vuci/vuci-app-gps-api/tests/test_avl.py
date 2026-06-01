import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.ssh import open_ssh_connection, is_process_running, is_process_stopped
from time import sleep

class GPSAVL(WrapTest):
    url = "/gps/avl/config/general"
    secondary_url = "/gps/avl/secondary_rules/config"
    main_url = "/gps/avl/main_rules/config"
    tavl_url = "/gps/avl/tavl_rules/config"

    def update_config(self, data: dict):
        response = self.put_data(self.url, {
            "con_cont": "1",
            "enabled": "1",
            "hostname": "1.2.3.4",
            "port": "9876",
            "proto": "tcp",
            "send_retry": "1",
            "static_navigation": "1"
        })
        response.assert_code(200)
        return response.resp.json()["data"]

    def list_tavls(self):
        response = self.get(self.tavl_url)
        response.assert_code(200)
        return response.resp.json()["data"]

    def set_enabled(self, enabled: bool):
        response = self.put_data(self.url, {
            "enabled": "1" if enabled else "0"
        })
        response.assert_code(200)
        return response.resp.json()["data"]

    def test_process_running(self):
        with open_ssh_connection() as ssh:
            self.set_enabled(False)
            self.assertTrue(is_process_stopped(ssh, "avl"), "Expected avl to not be running")

            self.set_enabled(True)
            self.assertTrue(is_process_running(ssh, "avl"), "Expected avl to be running")

    def test_basic_update(self):
        self.put_data(self.url, {
            "con_cont": "1",
            "enabled": "1",
            "hostname": "1.2.3.4",
            "port": "9876",
            "proto": "tcp",
            "send_retry": "1",
            "static_navigation": "1"
        }).assert_data({
            ".type": "section",
            "con_cont": "1",
            "enabled": "1",
            "hostname": "1.2.3.4",
            "id": "general",
            "port": "9876",
            "proto": "tcp",
            "send_retry": "1",
            "static_navigation": "1"
        })

    def test_update_main_rule(self):
        main_rule = self.get(self.main_url).resp.json()["data"][0]
        main_rule_id = main_rule["id"]
        self.put_data(f"{self.main_url}/{main_rule_id}", {
            "saved_records": "12",
            "collect_period": "99",
            "distance": "55",
            "priority": "panic",
            "send_period": "66",
            "angle": "49",
            "accuracy": "5",
        }).assert_data({
            ".type": "section",
            "saved_records": "12",
            "collect_period": "99",
            "id": main_rule_id,
            "distance": "55",
            "priority": "panic",
            "send_period": "66",
            "angle": "49",
            "accuracy": "5",
        })

        put_request = main_rule.copy()
        del put_request["id"]
        resp = self.put_data(f"{self.main_url}/{main_rule_id}", put_request)
        resp.assert_data(main_rule)

    def test_crud_secondary_rules(self):
        self.crud_test(self.secondary_url, {
            ".type": "avl_rule",
            "priority": "low",
            "din_status": "low",
            "wan_status": "wired"
        }, {
            ".type": "avl_rule",
            "angle": "45",
            "collect_period": "6",
            "din_status": "both",
            "distance": "123",
            "enabled": "1",
            "ignore": "0",
            "io_name": "din1",
            "io_type": "gpio",
            "priority": "low",
            "saved_records": "23",
            "send_period": "45",
            "wan_status": "wired",
            "accuracy": "5"
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
