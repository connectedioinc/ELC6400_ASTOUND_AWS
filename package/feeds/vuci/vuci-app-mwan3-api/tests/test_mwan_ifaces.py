import utility_integration as util
import response_codes as codes
from utils.general_api import is_package_installed
import sys
sys.path.append("../../../../tests")

RC = codes.ResponseCodes


class test_mwan_interfaces(util.WrapTest):
    url = "/failover/interfaces/config"
    net_iface_url = "/interfaces/config"
    default_data = []
    sid = "wan"
    test_iface_sid = None
    mobile = None
    dual_sim = None

    def setUp(self):
        if not is_package_installed(self, "mwan"):
            self.skipTest("MWAN3 package is not installed")
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        self.mobile = self.has_mobile(board)
        self.dual_sim = self.has_dual_sim(board)

        # Create dummy iface
        x = self.post_data(self.net_iface_url, {"area_type": "wan"})
        self.test_iface_sid = x.resp.json()["data"]["id"]
        x.assert_code(201)

        # Delete automatically created mwan3 iface
        x = self.delete(self.url + "/" + self.test_iface_sid)
        x.assert_data({
            "id": self.test_iface_sid
        })

    def has_mobile(self, board):
        return board["hwinfo"]["mobile"]

    def has_dual_sim(self, board):
        return board["hwinfo"]["dual_sim"]

    def test_mwan_ifaces_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()["data"]
            self.default_data = get_response
            res = 1
            if self.mobile and self.dual_sim:
                res = 3
            elif self.mobile:
                res = 2
            self.assertEqual(res, len(get_response))
        with self.subTest("edit_configuration_ping_ipv4"):
            put_data = {
                ".type": "interface",
                "enabled": "1",
                "count": "65000",
                "down": "65000",
                "track_method": "ping",
                "family": "ipv4",
                "flush_conntrack": ["connected", "disconnected", "ifup", "ifdown"],
                "interval": "65000",
                "reliability": "2",
                "track_ip": ["100.100.100.100", "25.10.25.10"],
                "up": "65000"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["name"] = self.sid
            put_data["network_type"] = "wired"
            x.assert_data(put_data)
        with self.subTest("edit_configuration_ping_ipv6"):
            put_data = {
                ".type": "interface",
                "enabled": "1",
                "count": "1",
                "down": "1",
                "track_method": "ping",
                "family": "ipv6",
                "flush_conntrack": ["connected", "disconnected", "ifup", "ifdown"],
                "interval": "1",
                "reliability": "1",
                "track_ip": ["::1"],
                "up": "1"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["name"] = self.sid
            put_data["network_type"] = "wired"
            x.assert_data(put_data)
        with self.subTest("edit_configuration_wget"):
            put_data = {
                ".type": "interface",
                "enabled": "1",
                "count": "100",
                "down": "100",
                "track_method": "wgetping",
                "family": "",
                "flush_conntrack": ["connected", "disconnected", "ifup", "ifdown"],
                "interval": "60",
                "reliability": "1",
                "track_ip": ["google.lt", "google.com"],
                "up": "60"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["name"] = self.sid
            put_data["network_type"] = "wired"
            del put_data["family"]
            x.assert_data(put_data)
        with self.subTest("reset_configuration"):
            default = self.default_data.copy()
            default_wan = next(d for d in default if d["id"] == self.sid)
            default_wan["flush_conntrack"] = ""
            del default_wan["id"]
            del default_wan["name"]
            del default_wan["network_type"]
            x = self.put_data(self.url + "/" + self.sid, default_wan)
            default_wan["id"] = self.sid
            default_wan["name"] = self.sid
            default_wan["network_type"] = "wired"
            del default_wan["flush_conntrack"]
            x.assert_data(default_wan)
        with self.subTest("post_configuration"):
            post_data = {
                "id": self.test_iface_sid,
            }
            default_data = {
                "id": self.test_iface_sid,
                "enabled": "0",
                ".type": "interface",
                "track_ip": ["1.1.1.1", "8.8.8.8"],
                "up": "3",
                "reliability": "1",
                "track_method": "ping",
                "name": self.test_iface_sid,
                "count": "1",
                "interval": "3",
                "family": "ipv4",
                "down": "3",
                "network_type": "-"
            }
            x = self.post_data(self.url, post_data)
            x.assert_data(default_data, 201)
        with self.subTest("post_configuration_no_id"):
            x = self.post_data(self.url, {})
            x.assert_error("id", "'id' is required.", 113)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.test_iface_sid)
            x.assert_data({
                "id": self.test_iface_sid
            })

            # Delete dummy iface also
            x = self.delete(self.net_iface_url + "/" + self.test_iface_sid)
            x.assert_data({
                "id": self.test_iface_sid
            })
