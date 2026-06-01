import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed, delete_all
import response_codes as codes

RC = codes.ResponseCodes

class test_sqm(util.WrapTest):
    url = "/sqm/config"
    sid = "new_sqm"
    options = {
        "id": sid,
        "enabled": "1",
        "interface": "br-lan",
        "download": "10000",
        "upload": "10000",
        "qdisc": "cake",
        "script": "layer_cake.qos"
    }

    def setUp(self):
        if not is_package_installed(self, "sqm"):
            self.skipTest("SQM package is not installed")

    def tearDown(self):
        delete_all(self, self.url)

    def test_sqm_base_functionality(self):
        with self.subTest("get_options"):
            x = self.get("/sqm/options")
            qdisc_options = {
                "fq_codel": [
                    "simple.qos",
                    "simplest.qos",
                    "simplest_tbf.qos"
                ],
                "cake": [
                    "layer_cake.qos",
                    "piece_of_cake.qos"
                ]
            }
            x.assert_data(qdisc_options, 200)
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, self.options)
            response_options = self.options.copy()
            response_options[".type"] = "queue"
            x.assert_data(response_options, 201)
        with self.subTest("edit_configuration"):
            edit_options = {
                "enabled": "0",
                "interface": "eth1",
                "download": "32132",
                "upload": "32132",
                "qdisc": "fq_codel",
                "script": "simplest.qos"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            edit_options[".type"] = "queue"
            edit_options["id"] = self.sid
            x.assert_data(edit_options, 200)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
