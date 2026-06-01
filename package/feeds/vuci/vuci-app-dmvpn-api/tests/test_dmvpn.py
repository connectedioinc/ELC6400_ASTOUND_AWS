import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.vpn import firewall_must_be_clean

class DMVPN(util.WrapTest):
    url = "/dmvpn/config"

    def test_clean_firewall(self):
        id = "tester"
        with firewall_must_be_clean(self):
            self.post_data(self.url, { "id": id })
            self.put_data(f"{self.url}/{id}", { "enabled": "1" })
            self.delete(f"{self.url}/{id}")
