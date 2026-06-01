import sys
sys.path.append("../../../../tests")
import utility_integration as util

class test_firewall_nat_offloading(util.WrapTest):
    url_global = "/nat_offloading/global"
    default_data = {
        "flow_offloading": "1"
    }

    def setUp(self):
        if not self.supports_nat_offloading():
            self.skipTest("Device doesn't support nat offloading")
        self.dsa = self.suppports_hw_nat()
        self.xfrm_offload = self.suppports_xfrm_offload()

    def supports_nat_offloading(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        return board["hwinfo"]["nat_offloading"]

    def suppports_hw_nat(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        return board["hwinfo"]["hw_nat"]

    def suppports_xfrm_offload(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        return board["hwinfo"]["xfrm-offload"]

    def test_firewall_nat_offloading_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url_global)
            default = self.default_data.copy()
            if self.dsa:
                default["flow_offloading_hw"] = "1"
            if self.xfrm_offload:
                default["flow_offloading_xfrm"] = "0"
            x.assert_data(default)
        with self.subTest("edit_configuration"):
            put_data = {
                "flow_offloading": "0"
            }
            if self.dsa:
                put_data["flow_offloading_hw"] = "0"
            if self.xfrm_offload:
                put_data["flow_offloading_xfrm"] = "0"
            x = self.put_data(self.url_global, put_data)
            x.assert_data(put_data)
        with self.subTest("reset_configuration"):
            if self.dsa:
                self.default_data["flow_offloading_hw"] = "1"
            if self.xfrm_offload:
                self.default_data["flow_offloading_xfrm"] = "0"
            x = self.put_data(self.url_global, self.default_data)
            x.assert_data(self.default_data)

    def test_firewall_nat_offloading_deletion(self):
        x = self.delete(self.url_global)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    def test_firewall_nat_offloading_creation(self):
        x = self.post_data(self.url_global, {})
        x.assert_error("Request", "POST not implemented", 100, None, None)
