import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed

class test_qos_classification(util.WrapTest):
    url = "/qos/rules/config"
    options_url = "/qos/rules/options"
    sid = None
    default_classications = [
        {
            ".type": "classify",
            "target": "Priority",
            "ports": "22,53",
            "id": "cfg018143"
        },
        {
            ".type": "classify",
            "ports": "20,21,25,80,110,443,993,995",
            "id": "cfg028143",
            "target": "Normal",
            "proto": "tcp"
        },
        {
            ".type": "classify",
            "target": "Express",
            "ports": "5190",
            "id": "cfg038143"
        }
    ]

    @util.skip_device("TSW")
    def setUp(self):
        if not is_package_installed(self, "qos"):
            self.skipTest("QoS package is not installed")

    @util.skip_device("TSW")
    def test_qos_classification_functionality(self):
        with self.subTest("get_default_configuration"):
            x = self.get(self.url)
            x.assert_data(self.default_classications)
        with self.subTest("get_options"):
            classes = [
                "Priority",
                "Express",
                "Normal",
                "Bulk"
            ]
            x = self.get(self.options_url)
            x.assert_code(200)
            x = x.resp.json()["data"]
            self.assertEqual(x["classes"], classes)
        with self.subTest("create_configuration"):
            post_options = {
                "target": "Bulk",
                "srchost": "192.168.5.55",
                "dsthost": "192.168.6.66",
                "proto": "tcp",
                "ports": "10,11,12,13"
            }
            x = self.post_data(self.url, post_options)
            self.sid = x.resp.json()["data"]["id"]
            post_options["id"] = self.sid
            post_options[".type"] = "classify"
            x.assert_data(post_options, 201)
        with self.subTest("edit_configuration"):
            edit_options = {
                "target": "Express",
                "srchost": "192.168.4.44",
                "dsthost": "192.168.7.77",
                "proto": "udp",
                "ports": "14,15,16,17"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            edit_options["id"] = self.sid
            edit_options[".type"] = "classify"
            x.assert_data(edit_options)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
