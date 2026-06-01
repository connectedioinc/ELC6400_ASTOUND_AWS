import sys
sys.path.append("../../../../tests/")
import utility_integration as util
from utils.general_api import is_package_installed

class test_firewall_dmz(util.WrapTest):
    url = "/dmz/config"
    port_forwards_url = "/firewall/port_forwards/config"
    sid = "general"
    default_data = {
        ".type": "defaults",
        "enabled": "0"
    }

    def test_firewall_dmz_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url + "/" + self.sid)
            get_response = self.default_data.copy()
            get_response["id"] = self.sid
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                ".type": "defaults",
                "enabled": "1",
                "host_ip": "192.168.1.5",
                "proto": [
                    "tcp",
                    "udp"
                ],
                "port_range": "50-55"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            x.assert_data(put_data)
        with self.subTest("get_configuration_check_port_forwards"):
            forwards_lookup = {
                "dmz_http": {
                    ".type": "redirect",
                    "name": "dmz_http",
                    "proto": ["tcp"],
                    "src": "wan",
                    "src_dport": "80",
                    "reflection": "1",
                    "enabled": "0"
                },
                "dmz_https": {
                    ".type": "redirect",
                    "name": "dmz_https",
                    "proto": ["tcp"],
                    "src": "wan",
                    "src_dport": "443",
                    "reflection": "1",
                    "enabled": "0"
                },
                "dmz_ssh": {
                    ".type": "redirect",
                    "name": "dmz_ssh",
                    "proto": ["tcp"],
                    "src": "wan",
                    "src_dport": "22",
                    "reflection": "1",
                    "enabled": "0"
                },
                "dmz_dhcp": {
                    ".type": "redirect",
                    "name": "dmz_dhcp",
                    "proto": ["udp"],
                    "src": "wan",
                    "src_dport": "68",
                    "reflection": "1",
                    "enabled": "1"
                },
                "dmz_fw": {
                    ".type": "redirect",
                    "name": "dmz_fw",
                    "proto": ["tcp", "udp"],
                    "src": "wan",
                    "src_dport": "50-55",
                    "dest": "dmz",
                    "dest_ip": "192.168.1.5",
                    "reflection": "1",
                    "enabled": "1"
                }
            }
            if is_package_installed(self, "snmp"):
                forwards_lookup["dmz_snmp"] = {
                    ".type": "redirect",
                    "name": "dmz_snmp",
                    "proto": ["udp"],
                    "src": "wan",
                    "src_dport": "161",
                    "reflection": "1",
                    "enabled": "0"
                }
            x = self.get(self.port_forwards_url)
            forwards = x.resp.json()["data"]
            for fwd in forwards:
                forwards_lookup[fwd["name"]]["priority"] = fwd["priority"]
            for fwd in forwards:
                del fwd["id"]
                for key in fwd:
                    self.assertEqual(fwd[key], forwards_lookup[fwd["name"]][key])
        with self.subTest("return_configuration_to_default"):
            default = {
                ".type": "defaults",
                "enabled": "0",
                "host_ip": "",
                "proto": "",
                "port_range": ""
            }
            x = self.put_data(self.url + "/" + self.sid, default)
            self.default_data["id"] = self.sid
            x.assert_data(self.default_data)
        with self.subTest("delete_zone_and_port_forward"):
            x = self.get("/firewall/zones/config")
            for section in x.resp.json()["data"]:
                if section["name"] == "dmz":
                    self.delete(f"/firewall/zones/config/{section['id']}").assert_data({"id":section["id"]})
            x = self.get(self.port_forwards_url)
            for section in x.resp.json()["data"]:
                if section["name"] == "dmz_fw":
                    self.delete(f"{self.port_forwards_url}/{section['id']}").assert_data({"id":section["id"]})


    def test_firewall_dmz_deletion(self):
        x = self.delete(self.url + "/" + self.sid)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    def test_firewall_dmz_creation(self):
        x = self.post_data(self.url, {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)
