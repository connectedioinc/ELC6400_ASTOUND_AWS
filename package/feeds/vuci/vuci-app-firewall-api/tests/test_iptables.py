import sys
sys.path.append("../../../../tests")
import utility_integration as util

class test_firewall_iptables(util.WrapTest):
    url = "/firewall/iptables"

    def test_firewall_iptables_status_functionality(self):
        with self.subTest("get_ipv4_status"):
            x = self.get(self.url + "/ipv4/status")
            resp = x.resp.json()
            x.assert_code(200)
            self.assertIn("success", resp)
            self.assertIn("data", resp)
        with self.subTest("get_ipv6_status"):
            x = self.get(self.url + "/ipv6/status")
            resp = x.resp.json()
            x.assert_code(200)
            self.assertIn("success", resp)
            self.assertIn("data", resp)

    def test_firewall_iptables_reset_functionality(self):
        with self.subTest("reset_ipv4"):
            x = self.post(self.url + "/ipv4/actions/reset", {})
            x.assert_code(200)
            self.assertEqual(x.resp.json()["success"], True)
        with self.subTest("reset_ipv6"):
            x = self.post(self.url + "/ipv6/actions/reset", {})
            x.assert_code(200)
            self.assertEqual(x.resp.json()["success"], True)
