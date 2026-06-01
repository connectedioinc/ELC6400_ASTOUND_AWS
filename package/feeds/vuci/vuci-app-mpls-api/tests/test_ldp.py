from utils.general_api import is_package_installed
import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_ldp(util.WrapTest):
    url = "/mpls/ldp/global"
    ldp_options = {
        "enabled": "1",
        "ifname": [
            "br-lan"
        ],
        "router_id": "192.168.1.1",
        "transport_address": "192.168.1.1"
    }

    def setUp(self):
        if not is_package_installed(self, "mpls"):
            self.skipTest("MPLS package is not installed")

    def tearDown(self):
        empty_options = {
            "enabled": "0",
            "ifname": [],
            "router_id": "",
            "transport_address": ""
        }
        self.post_data(self.url, empty_options)

    def test_ldp_base_functionality(self):
        with self.subTest("edit_configuration"):
            x = self.put_data(self.url, self.ldp_options)
            x.assert_data(self.ldp_options, 200)
        with self.subTest("check_ifname_require"):
            self.ldp_options["ifname"] = []
            x = self.put_data(self.url, self.ldp_options)
            x.assert_error("enabled", "Missing required option: ifname", 103)
        with self.subTest("check_bridged_device_validation"):
            lan_resp = self.get("/interfaces/config/lan")
            bridged_dev = lan_resp.resp.json()["data"]["ifname"][0]
            self.ldp_options["ifname"] = [ bridged_dev ]
            x = self.put_data(self.url, self.ldp_options)
            x.assert_error("Validation", f"Physical interface '{bridged_dev}' is used in 'br-lan' bridge, you need to remove it first", 103)
