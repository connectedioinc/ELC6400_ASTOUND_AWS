import sys
sys.path.append("../../../../tests/")
import utility_integration as util
import response_codes as codes

RC = codes.ResponseCodes

class test_firewall_zones(util.WrapTest):
    url = "/firewall/zones/config"
    zone_name = "new_zone"
    lan_zone = "2"
    sid = None

    def test_firewall_zones_base_functionality(self):
        with self.subTest("create_configuration"):
            new_data = {
                "name": self.zone_name,
                "input": "ACCEPT",
                "output": "DROP",
                "forward": "REJECT",
                "masq": "1",
                "masq6": "1",
                "mtu_fix": "1",
                "network": ["testas"],
                "family": "ipv4",
                "masq_src": ["255.255.0.0/4"],
                "masq_dest": ["255.255.255.0/24"],
                "conntrack": "1",
                "log": "1",
                "helper": ["amanda", "Q.931", "tftp"],
                "log_limit": "10/minute",
                "out": ["lan"],
                "in": ["lan"]
            }
            x = self.post_data(self.url, new_data)
            response_data = x.resp.json()["data"]
            self.sid = response_data["id"]
            new_data["id"] = self.sid
            new_data[".type"] = response_data[".type"]
            x.assert_data(new_data, 201)
        with self.subTest("create_configuration_with_used_interface"):
            new_data = {
                "name": "testzone2",
                "input": "ACCEPT",
                "output": "DROP",
                "forward": "REJECT",
                "masq": "1",
                "masq6": "1",
                "mtu_fix": "1",
                "network": ["testas"],
                "family": "ipv4",
                "masq_src": ["255.255.0.0/4"],
                "masq_dest": ["255.255.255.0/24"],
                "conntrack": "1",
                "log": "1",
                "helper": ["amanda", "Q.931", "tftp"],
                "log_limit": "10/minute",
                "out": ["lan"],
                "in": ["lan"]
            }
            x = self.post_data(self.url, new_data)
            x.assert_code(422)
            x.assert_error("network", "Interface can only be assigned to a single firewall zone", RC.INVALID_OPT.val())
        with self.subTest("create_configuration_with_same_name"):
            new_data = {
                "name": self.zone_name,
                "input": "ACCEPT",
                "output": "DROP",
                "forward": "REJECT",
                "masq": "1",
                "masq6": "1",
                "mtu_fix": "1",
                "network": ["testas2"],
                "family": "ipv4",
                "masq_src": ["255.255.0.0/4"],
                "masq_dest": ["255.255.255.0/24"],
                "conntrack": "1",
                "log": "1",
                "helper": ["amanda", "Q.931", "tftp"],
                "log_limit": "10/minute",
                "out": ["lan"],
                "in": ["lan"]
            }
            x = self.post_data(self.url, new_data)
            x.assert_code(422)
            x.assert_error("name", f'Configuration with name \'{self.zone_name}\' already exists', RC.INVALID_OPT.val(), self.zone_name, x.resp.json()["errors"][0]["section"])
        with self.subTest("create_configuration_with_same_name"):
            name = "asdfghjklzxc"
            new_data = {
                "name": name,
                "input": "ACCEPT",
                "output": "DROP",
                "forward": "REJECT",
                "masq": "1",
                "masq6": "1",
                "mtu_fix": "1",
                "network": ["testas2"],
                "family": "ipv4",
                "masq_src": ["255.255.0.0/4"],
                "masq_dest": ["255.255.255.0/24"],
                "conntrack": "1",
                "log": "1",
                "helper": ["amanda", "Q.931", "tftp"],
                "log_limit": "10/minute",
                "out": ["lan"],
                "in": ["lan"]
            }
            x = self.post_data(self.url, new_data)
            x.assert_code(422)
            x.assert_error("name", "Provided value is too long. Is 12 characters, but can be up to 11 characters", RC.INVALID_OPT.val(), name, x.resp.json()["errors"][0]["section"])
        with self.subTest("create_empty_configuration"):
            x = self.post_data(self.url, {})
            response_data = x.resp.json()["data"]
            created_data = {
                "name": "newzone",
                "input": "REJECT",
                "output": "ACCEPT",
                "forward": "REJECT",
                "masq": "0",
                "masq6": "0",
                "mtu_fix": "0",
                "conntrack": "0",
                "log": "0",
                "id": response_data["id"],
                ".type": response_data[".type"]
            }
            x.assert_data(created_data, 201)
            self.delete(f"{self.url}/{response_data['id']}").assert_data({"id": response_data['id']})
        with self.subTest("edit_configuration"):
            edit_data = {
                "name": self.zone_name,
                "input": "DROP",
                "output": "ACCEPT",
                "forward": "REJECT",
                "masq": "",
                "masq6": "",
                "mtu_fix": "",
                "network":  "",
                "family": "ipv6",
                "masq_src": ["255.255.255.0/24"],
                "masq_dest": ["255.255.0.0/4"],
                "conntrack": "",
                "log": "",
                "helper": ["RAS"],
                "log_limit": "20/second",
                "out": "",
                "in": ""
            }
            x = self.put_data(f'{self.url}/{self.sid}', edit_data)
            response_data = x.resp.json()["data"]
            edit_data["id"] = self.sid
            edit_data[".type"] = response_data[".type"]
            edit_data["masq"] = "0"
            edit_data["masq6"] = "0"
            edit_data["mtu_fix"] = "0"
            edit_data["conntrack"] = "0"
            edit_data["log"] = "0"
            edit_data.pop("network")
            edit_data.pop("out")
            edit_data.pop("in")
            x.assert_data(edit_data)
        with self.subTest("multiple_configuration_move_zone"):
            x = self.put_data(self.url, [
                {
                    "id": self.lan_zone,
                    "network": []
                },
                {
                    "id": self.sid,
                    "network": ["lan"]
                }
            ])
            x.assert_code(200)

            y = self.put_data(self.url, [
                {
                    "id": self.lan_zone,
                    "network": ["lan"]
                },
                {
                    "id": self.sid,
                    "network": []
                }
            ])
            y.assert_code(200)
        
        with self.subTest("multiple_configuration_validate_duplicate_interface"):
            x = self.put_data(self.url, [
                {
                    "id": self.lan_zone,
                    "network": ["lan"]
                },
                {
                    "id": self.sid,
                    "network": ["lan"]
                }
            ])
            x.assert_error("network", "Interface can only be assigned to a single firewall zone", RC.INVALID_OPT.val())
                    
        with self.subTest("delete_configuration"):
            self.delete(f"{self.url}/{self.sid}").assert_data({"id": self.sid})
