import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed, delete_all

class test_udprelay(util.WrapTest):
    url = "/udprelay/config"

    def setUp(self):
        if not is_package_installed(self, "udp_broadcast_relay"):
            self.skipTest("UDPRelay package is not installed")

    def tearDown(self):
        delete_all(self, self.url)

    def test_udprelay_base_functionality(self):
        sid = ""
        with self.subTest("create_configuration"):
            options = {
                "enabled": "1",
                "port": "65535",
                "interfaces": ["lan"],
                "interface_mark": "lan"
            }
            x = self.post_data(self.url, options)
            sid = x.resp.json()['data']['id']
            options[".type"] = "general"
            options["id"] = sid
            x.assert_data(options, 201)
        with self.subTest("edit_configuration"):
            edit_options = {
                "enabled": "0",
                "port": "65534",
                "interfaces": [],
                "interface_mark": ""
            }
            x = self.put_data(self.url + "/" + sid, edit_options)
            edit_options[".type"] = "general"
            edit_options["id"] = sid
            edit_options.pop("interfaces")
            edit_options.pop("interface_mark")
            x.assert_data(edit_options, 200)
