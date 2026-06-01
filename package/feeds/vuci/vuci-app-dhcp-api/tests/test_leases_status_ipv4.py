import sys
import utility_integration as util
sys.path.append("../../../../tests")


class test_leases_status_ipv4(util.WrapTest):
    url = "/dhcp/leases/ipv4/status"

    @util.skip_device("TAP")
    def test_leases_status(self):
        x = self.get(self.url)
        x.assert_code(200)
        data = x.resp.json()["data"]
        for d in data:
            for key in ["expires", "ipaddr", "hostname", "macaddr", "interface"]:
                self.assertIn(key, d)
