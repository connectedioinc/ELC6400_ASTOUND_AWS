import sys
import utility_integration as util
sys.path.append("../../../../tests")


class test_leases_status_ipv6(util.WrapTest):
    url = "/dhcp/leases/ipv6/status"

    @util.skip_device("TAP")
    def setUp(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        if "switch" in board["hwinfo"] and board["hwinfo"]["switch"]:
            self.skipTest("DHCPv6 is not supported on switch devices")

    @util.skip_device("TAP")
    def test_leases_status(self):
        x = self.get(self.url)
        x.assert_code(200)
        data = x.resp.json()["data"]
        for d in data:
            for key in ["expires", "ipv6addr", "hostname", "duid", "interface"]:
                self.assertIn(key, d)
