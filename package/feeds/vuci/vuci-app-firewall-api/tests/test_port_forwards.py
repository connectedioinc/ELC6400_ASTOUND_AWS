import sys
sys.path.append("../../../../tests/")
import utility_integration as util
import response_codes as codes

RC = codes.ResponseCodes

class test_firewall_port_forwards(util.WrapTest):
    url = "/firewall/port_forwards/config"
    forward_name = "new_forward"
    sid = None

    def test_firewall_port_forwards_base_functionality(self):
        with self.subTest("create_configuration"):
            new_data = {
                "enabled": "0",
                "name": self.forward_name,
                "proto": ["tcp"],
                "src": "lan",
                "src_mac": ["AA:AA:AA:BB:BB:BB"],
                "src_ip": ["1.1.1.1"],
                "src_port": ["66"],
                "dest": "lan",
                "dest_ip": "1.1.1.2",
                "dest_port": "67",
                "src_dip": "1.1.1.3",
                "src_dport": "68",
                "reflection": "1",
                "extra": "abc",
                "priority": "1"
            }
            x = self.post_data(self.url, new_data)
            response_data = x.resp.json()["data"]
            self.sid = response_data["id"]
            new_data["id"] = self.sid
            new_data[".type"] = response_data[".type"]
            x.assert_data(new_data, 201)
        with self.subTest("create_configuration_with_same_priority"):
            priority = "1"
            x = self.post_data(self.url, {"priority": priority})
            x.assert_code(422)
            x.assert_error("priority", f'Priority \'{priority}\' is already used for the \'{self.forward_name}\' rule', RC.INVALID_OPT.val(), priority, x.resp.json()["errors"][0]["section"])
        with self.subTest("create_configuration_with_same_name"):
            new_data = {
                "enabled": "0",
                "name": self.forward_name,
                "proto": ["tcp"],
                "src": "lan",
                "src_mac": ["AA:AA:AA:BB:BB:BB"],
                "src_ip": ["1.1.1.1"],
                "src_port": ["66"],
                "dest": "lan",
                "dest_ip": "1.1.1.2",
                "dest_port": "67",
                "src_dip": "1.1.1.3",
                "src_dport": "68",
                "reflection": "1",
                "extra": "abc",
                "priority": "2"
            }
            x = self.post_data(self.url, new_data)
            x.assert_code(422)
            x.assert_error("name", f'Configuration with name \'{self.forward_name}\' already exists', RC.INVALID_OPT.val(), self.forward_name, x.resp.json()["errors"][0]["section"])
        with self.subTest("create_empty_configuration"):
            new_data = {
                "priority": "2"
            }
            x = self.post_data(self.url, new_data)
            response_data = x.resp.json()["data"]
            new_data["id"] = response_data["id"]
            new_data[".type"] = response_data[".type"]
            new_data["src"] = "wan"
            new_data["dest"] = "lan"
            new_data["enabled"] = "0"
            new_data["proto"] = ["tcp", "udp"]
            new_data["reflection"] = "1"
            x.assert_data(new_data, 201)
            self.delete(f"{self.url}/{new_data['id']}").assert_data({"id": new_data['id']})
        with self.subTest("edit_configuration"):
            edit_data = {
                "enabled": "0",
                "name": self.forward_name,
                "proto": ["tcp"],
                "src": "wan",
                "src_mac": ["AA:AA:AA:BB:BB:CC"],
                "src_ip": ["1.1.1.2"],
                "src_port": ["67"],
                "dest": "lan",
                "dest_ip": "1.1.1.4",
                "dest_port": "67",
                "src_dip": "1.1.1.8",
                "src_dport": "62",
                "reflection": "0",
                "extra": "dfgfh",
                "priority": "1"
            }
            x = self.put_data(f'{self.url}/{self.sid}', edit_data)
            response_data = x.resp.json()["data"]
            edit_data["id"] = self.sid
            edit_data[".type"] = response_data[".type"]
            x.assert_data(edit_data)
        with self.subTest("delete_configuration"):
            self.delete(f"{self.url}/{self.sid}").assert_data({"id": self.sid})
