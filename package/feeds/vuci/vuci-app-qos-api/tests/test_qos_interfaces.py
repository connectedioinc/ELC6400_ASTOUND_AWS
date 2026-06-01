import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import is_package_installed

class test_qos_interfaces(util.WrapTest):
    url = "/qos/interfaces/config"
    sid = "lan"
    default_data = {
        "enabled": "0",
        "upload": "128",
        "download": "1024",
    }

    @util.skip_device("TSW")
    def setUp(self):
        if not is_package_installed(self, "qos"):
            self.skipTest("QoS package is not installed")

    @util.skip_device("TSW")
    def test_qos_interfaces_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url + "/" + self.sid)
            get_response = self.default_data.copy()
            get_response[".type"] = "interface"
            get_response["id"] = self.sid
            get_response["name"] = self.sid
            x.assert_data(get_response)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
        with self.subTest("create_configuration"):
            post_options = {
                "id": self.sid,
                "enabled": "0",
                "upload": "200",
                "download": "250",
                "overhead": "0"
            }
            x = self.post_data(self.url, post_options)
            post_options["name"] = self.sid
            post_options[".type"] = "interface"
            x.assert_data(post_options, 201)
        with self.subTest("edit_configuration"):
            edit_options = {
                "enabled": "1",
                "upload": "400",
                "download": "500",
                "overhead": "1"
            }
            x = self.put_data(self.url + "/" + self.sid, edit_options)
            edit_options[".type"] = "interface"
            edit_options["id"] = self.sid
            edit_options["name"] = self.sid
            x.assert_data(edit_options)
        with self.subTest("edit_to_default_options"):
            self.default_data["overhead"] = ""
            x = self.put_data(self.url + "/" + self.sid, self.default_data)
            put_response = self.default_data.copy()
            put_response.pop("overhead")
            put_response[".type"] = "interface"
            put_response["id"] = self.sid
            put_response["name"] = self.sid
            x.assert_data(put_response)
