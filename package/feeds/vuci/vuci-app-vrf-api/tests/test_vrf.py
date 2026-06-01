import response_codes as codes
from utils.general_api import is_package_installed, delete_all
import utility_integration as util
import sys
sys.path.append("../../../../tests")

RC = codes.ResponseCodes


class test_vrf(util.WrapTest):
    url = "/vrf/config"
    url_vrf_global = "/vrf/global"
    url_gre = "/gre/config"
    sid = None
    sid_gre = None
    bridge = None
    options = {
        "enabled": "0",
        "table": "123",
    }

    def setUp(self):
        if not is_package_installed(self, "vrf"):
            self.skipTest("VRF package is not installed")
        else:
            for dev in self.get("/basic/network/devices/status").resp.json()["data"]:
                if "type" in dev and dev["type"] == "bridge":
                    self.bridge = dev
                    break

    def tearDown(self):
        delete_all(self, self.url)

    def test_vrf_base_functionality(self):
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, self.options)
            self.sid = x.resp.json()["data"]["id"]
            response_options = self.options.copy()
            response_options[".type"] = "interface"
            response_options["id"] = self.sid
            response_options["name"] = self.sid
            x.assert_data(response_options, 201)
        with self.subTest("edit_configuration"):
            edit_options = {
                "enabled": "0",
                "table": "321",
                "name": "test",
                "link": [self.bridge["name"]]
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            edit_options[".type"] = "interface"
            edit_options["id"] = self.sid
            x.assert_data(edit_options, 200)
        with self.subTest("edit_configuration_bridge_port"):
            edit_options = {
                "link": [self.bridge["bridge-members"][0]]
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            x.assert_code(422)
        with self.subTest("edit_configuration_reserved_table"):
            edit_options = {
                "table": "254"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            x.assert_error("table", "253-255 range is reserved for the default routing tables", 103)
        with self.subTest("check_multiple_put_response"):
            additional_options = {
                "enabled": "0",
                "table": "1234",
            }
            additional_sid = self.post_data(self.url, additional_options).resp.json()["data"]["id"]
            get_data = self.get(self.url).resp.json()["data"]
            x = self.put_data(self.url, get_data)
            x.assert_data(get_data)
            x = self.delete(self.url + "/" + additional_sid)
            x.assert_data({
                "id": additional_sid
            })
        if is_package_installed(self, "gre"):
            with self.subTest("add_gre_tunnel"):
                options = {
                    "id": "test_gre",
                    "enabled": "1",
                    "df": "0",
                    "mtu": "1476",
                    "proto": "gre"
                }
                x = self.post_data(self.url_gre, options)
                self.sid_gre = x.resp.json()["data"]["id"]
                options[".type"] = "interface"
                x.assert_data(options, 201)
            with self.subTest("edit_configuration_gre_tunnel"):
                edit_options = {
                    "enabled": "0",
                    "table": "321",
                    "name": "test",
                    "link": [f"gre4-{self.sid_gre}"]
                }
                x = self.put_data(self.url + "/" + self.sid, edit_options)
                edit_options[".type"] = "interface"
                edit_options["id"] = self.sid
                x.assert_data(edit_options, 200)
            with self.subTest("delete_gre_tunnel"):
                x = self.delete(self.url_gre + "/" + self.sid_gre)
                x.assert_data({
                    "id": self.sid_gre
                })
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
        with self.subTest("check_global_settings"):
            global_data = {
                "tcp_l3mdev": "1",
                "udp_l3mdev": "1"
            }

            x = self.put_data(self.url_vrf_global, global_data)
            x.assert_data(global_data, 200)

            global_data["tcp_l3mdev"] = "0"
            global_data["udp_l3mdev"] = "0"
            x = self.put_data(self.url_vrf_global, global_data)
            x.assert_data(global_data, 200)
