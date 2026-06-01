import sys
sys.path.append("../../../../tests/")
import utility_integration as util
import response_codes as codes

RC = codes.ResponseCodes

class test_firewall_traffic_rules(util.WrapTest):
    url = "/firewall/traffic_rules/config"
    rule_name = "new_rule"
    rule_priority = None
    sid = None

    def test_firewall_traffic_rules_base_functionality(self):
        with self.subTest("create_configuration"):
            new_data = {
                "enabled": "0",
                "name": self.rule_name,
                "family": "ipv4",
                "proto": ["tcp", "udp"],
                "icmp_type": ["echo-reply", "redirect", "address-mask-reply"],
                "src": "lan",
                "src_mac": ["AA:AA:AA:BB:BB:BB"],
                "src_ip": ["1.1.1.1"],
                "src_port": ["66"],
                "dest_local": "lan",
                "dest": "lan",
                "dest_ip": ["1.1.1.2"],
                "dest_port": ["67"],
                "target": "MARK",
                "set_dscp": "14",
                "set_mark": "FF",
                "match": "FWMARK",
                "dscp": "20",
                "mark": "FF",
                "extra": "asdf",
                "weekdays": ["Mon", "Tue", "Wed"],
                "monthdays": ["5", "6", "7"],
                "start_time": "12:00:52",
                "stop_time": "13:11:23",
                "start_date": "2018-01-31",
                "stop_date": "2050-01-05",
                "utc_time": "0"
            }
            x = self.post_data(self.url, new_data)
            response_data = x.resp.json()["data"]
            self.sid = response_data["id"]
            self.rule_priority = response_data["priority"]
            new_data["id"] = self.sid
            new_data["priority"] = self.rule_priority
            new_data[".type"] = response_data[".type"]
            x.assert_data(new_data, 201)
        with self.subTest("create_configuration_with_same_priority"):
            x = self.post_data(self.url, {"priority": self.rule_priority})
            x.assert_code(422)
            x.assert_error("priority", f'Priority \'{self.rule_priority}\' is already used for the \'{self.rule_name}\' rule', RC.INVALID_OPT.val(), self.rule_priority, x.resp.json()["errors"][0]["section"])
        with self.subTest("create_configuration_with_same_name"):
            new_data = {
                "enabled": "0",
                "name": self.rule_name,
                "family": "ipv4",
                "proto": ["tcp", "udp"],
                "icmp_type": ["echo-reply", "redirect", "address-mask-reply"],
                "src": "lan",
                "src_mac": ["AA:AA:AA:BB:BB:BB"],
                "src_ip": ["1.1.1.1"],
                "src_port": ["66"],
                "dest_local": "lan",
                "dest": "lan",
                "dest_ip": ["1.1.1.2"],
                "dest_port": ["67"],
                "target": "MARK",
                "set_dscp": "14",
                "set_mark": "FF",
                "match": "FWMARK",
                "dscp": "20",
                "mark": "FF",
                "extra": "asdf",
                "weekdays": ["Mon", "Tue", "Wed"],
                "monthdays": ["5", "6", "7"],
                "start_time": "12:00:52",
                "stop_time": "13:11:23",
                "start_date": "2018-01-31",
                "stop_date": "2050-01-05",
                "utc_time": "0"
            }
            x = self.post_data(self.url, new_data)
            x.assert_code(422)
            x.assert_error("name", f'Configuration with name \'{self.rule_name}\' already exists', RC.INVALID_OPT.val(), self.rule_name, x.resp.json()["errors"][0]["section"])
        with self.subTest("edit_wrong_set_mark_value"):
            set_mark = "AAbb1475"
            x = self.put_data(f"{self.url}/{self.sid}", {"set_mark": set_mark})
            x.assert_code(422)
            x.assert_error("set_mark", "Provided value is too long. Is 8 characters, but can be up to 7 characters", RC.INVALID_OPT.val(), set_mark, self.sid)
        with self.subTest("edit_wrong_mark_value"):
            mark = "FFdd4159"
            x = self.put_data(f"{self.url}/{self.sid}", {"mark": mark})
            x.assert_code(422)
            x.assert_error("mark", "Provided value is too long. Is 8 characters, but can be up to 7 characters", RC.INVALID_OPT.val(), mark, self.sid)
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
        with self.subTest("create_empty_configuration"):
            x = self.post_data(self.url, {})
            response_data = x.resp.json()["data"]
            created_data = {
                "enabled": "0",
                "proto": ["tcp", "udp"],
                "target": "ACCEPT",
                "utc_time": "0",
                "id": response_data["id"],
                "priority": response_data["priority"],
                ".type": response_data[".type"]
            }
            x.assert_data(created_data, 201)
            self.delete(f"{self.url}/{response_data['id']}").assert_data({"id": response_data['id']})
        with self.subTest("edit_configuration"):
            edit_data = {
                "enabled": "0",
                "name": self.rule_name,
                "family": "",
                "proto": ["tcp"],
                "icmp_type": ["address-mask-reply"],
                "src": "lan",
                "src_mac": ["AA:AA:AA:BB:BB:BC"],
                "src_ip": ["1.1.1.2"],
                "src_port": ["76"],
                "dest_local": "lan",
                "dest": "lan",
                "dest_ip": ["1.1.1.8"],
                "dest_port": ["63"],
                "target": "ACCEPT",
                "set_dscp": "28",
                "set_mark": "FE",
                "match": "DSCP",
                "dscp": "34",
                "mark": "FE",
                "extra": "abc",
                "weekdays": ["Wed"],
                "monthdays": ["5"],
                "start_time": "14:00:52",
                "stop_time": "16:11:23",
                "start_date": "2016-01-31",
                "stop_date": "2051-01-05",
                "utc_time": "1",
                "period": "hour",
                "limit": "100",
                "limit_burst": "99"
            }
            x = self.put_data(f'{self.url}/{self.sid}', edit_data)
            response_data = x.resp.json()["data"]
            edit_data["id"] = self.sid
            edit_data["priority"] = self.rule_priority
            edit_data[".type"] = response_data[".type"]
            edit_data.pop("family")
            x.assert_data(edit_data)
        with self.subTest("delete_configuration"):
            self.delete(f"{self.url}/{self.sid}").assert_data({"id": self.sid})
        with self.subTest("check_limit_period_ICMPv6_rule"):
            x = self.get(self.url + "/10")
            response_data = x.resp.json()["data"]
            self.assertEqual(response_data["period"], "second")

