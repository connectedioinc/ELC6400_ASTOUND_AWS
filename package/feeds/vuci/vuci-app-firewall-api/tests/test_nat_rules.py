import sys
sys.path.append("../../../../tests/")
import utility_integration as util
import response_codes as codes

RC = codes.ResponseCodes

class test_firewall_nat_rules(util.WrapTest):
    url = "/firewall/nat_rules/config"
    nat_name = "new_nat"
    sid = None

    def test_firewall_nat_rules_base_functionality(self):
        with self.subTest("create_configuration"):
            new_data = {
                "enabled": "0",
                "name": self.nat_name,
                "proto": ["tcp"],
                "src": "lan",
                "src_ip": ["1.1.1.1"],
                "src_port": ["66"],
                "dest": "lan",
                "dest_ip": "1.1.1.2",
                "dest_port": "67",
                "src_dip": "1.1.1.3",
                "src_dport": "68",
                "extra": "abc",
                "weekdays": ["Mon", "Tue", "Wed"],
                "monthdays": ["5", "6", "7"],
                "start_time": "12:00:52",
                "stop_time": "13:11:23",
                "start_date": "2018-01-31",
                "stop_date": "2050-01-05",
                "utc_time": "0",
                "priority": "1"
            }
            x = self.post_data(self.url, new_data)
            response_data = x.resp.json()["data"]
            self.sid = response_data["id"]
            new_data["id"] = self.sid
            new_data[".type"] = response_data[".type"]
            new_data["target"] = response_data["target"]
            x.assert_data(new_data, 201)
        with self.subTest("create_configuration_with_same_priority"):
            priority = "1"
            x = self.post_data(self.url, {"priority": priority, "src_dip": "1.1.1.5"})
            x.assert_code(422)
            x.assert_error("priority", f'Priority \'{priority}\' is already used for the \'{self.nat_name}\' rule', RC.INVALID_OPT.val(), priority, x.resp.json()["errors"][0]["section"])
        with self.subTest("create_configuration_without src_dip"):
            x = self.post_data(self.url, {"priority": "2"})
            x.assert_code(422)
            x.assert_error("target", "Missing required option: src_dip", RC.INVALID_OPT.val(), None, x.resp.json()["errors"][0]["section"])
        with self.subTest("edit_configuration_with_wrong_stop_date"):
            stop_date = "2018-01-30"
            x = self.put_data(f'{self.url}/{self.sid}', {"stop_date": stop_date})
            x.assert_code(422)
            x.assert_error("stop_date", "The provided date cannot be earlier than the current date. ", RC.INVALID_OPT.val(), stop_date, self.sid)
        with self.subTest("edit_configuration_with_wrong_start_date"):
            start_date = "2051-01-05"
            x = self.put_data(f'{self.url}/{self.sid}', {"start_date": start_date})
            x.assert_code(422)
            x.assert_error("start_date", "Start date cannot be higher than stop date. ", RC.INVALID_OPT.val(), start_date, self.sid)
        with self.subTest("create_configuration_with_same_name"):
            new_data = {
                "enabled": "0",
                "name": self.nat_name,
                "proto": ["tcp"],
                "src": "lan",
                "src_ip": ["1.1.1.1"],
                "src_port": ["66"],
                "dest": "lan",
                "dest_ip": "1.1.1.2",
                "dest_port": "67",
                "src_dip": "1.1.1.3",
                "src_dport": "68",
                "extra": "abc",
                "weekdays": ["Mon", "Tue", "Wed"],
                "monthdays": ["5", "6", "7"],
                "start_time": "12:00:52",
                "stop_time": "13:11:23",
                "start_date": "2018-01-31",
                "stop_date": "2050-01-05",
                "utc_time": "0",
                "priority": "3"
            }
            x = self.post_data(self.url, new_data)
            x.assert_code(422)
            x.assert_error("name", f'Configuration with name \'{self.nat_name}\' already exists', RC.INVALID_OPT.val(), self.nat_name, x.resp.json()["errors"][0]["section"])
        with self.subTest("create_empty_configuration"):
            new_data = {
                "priority": "2",
                "src_dip": "1.1.1.10"
            }
            x = self.post_data(self.url, new_data)
            response_data = x.resp.json()["data"]
            new_data["id"] = response_data["id"]
            new_data[".type"] = response_data[".type"]
            new_data["target"] = response_data["target"]
            new_data["proto"] = ["all"]
            new_data["utc_time"] = "0"
            new_data["enabled"] = "0"
            x.assert_data(new_data, 201)
            self.delete(f"{self.url}/{new_data['id']}").assert_data({"id": new_data['id']})
        with self.subTest("create_empty_configuration_with_src_dport"):
            new_data = {
                "priority": "2",
                "src_dip": "1.1.1.10",
                "src_dport": "71"
            }
            x = self.post_data(self.url, new_data)
            response_data = x.resp.json()["data"]
            new_data["id"] = response_data["id"]
            new_data[".type"] = response_data[".type"]
            new_data["target"] = response_data["target"]
            new_data["proto"] = ["tcp", "udp"]
            new_data["utc_time"] = "0"
            new_data["enabled"] = "0"
            x.assert_data(new_data, 201)
            self.delete(f"{self.url}/{new_data['id']}").assert_data({"id": new_data['id']})
        with self.subTest("edit_configuration"):
            edit_data = {
                "enabled": "0",
                "name": "testas",
                "proto": ["tcp", "udp"],
                "src": "lan",
                "src_ip": ["1.1.1.0"],
                "src_port": ["67"],
                "dest": "lan",
                "dest_ip": "1.1.1.6",
                "dest_port": "68",
                "src_dip": "1.1.1.4",
                "src_dport": "69",
                "extra": "fsg",
                "weekdays": ["Mon", "Tue"],
                "monthdays": ["5", "6"],
                "start_time": "12:00:55",
                "stop_time": "13:11:20",
                "start_date": "2018-01-30",
                "stop_date": "2050-01-04",
                "utc_time": "1",
                "priority": "1"
            }
            x = self.put_data(f'{self.url}/{self.sid}', edit_data)
            response_data = x.resp.json()["data"]
            edit_data["id"] = self.sid
            edit_data[".type"] = response_data[".type"]
            edit_data["target"] = response_data["target"]
            x.assert_data(edit_data)
        with self.subTest("delete_configuration"):
            self.delete(f"{self.url}/{self.sid}").assert_data({"id": self.sid})
