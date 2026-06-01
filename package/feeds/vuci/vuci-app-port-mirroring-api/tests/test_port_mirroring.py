import sys
sys.path.append("../../../../tests")
import utility_integration as util

class test_port_mirroring(util.WrapTest):
    url_general = "/port_mirroring/config/general"
    sid = "general"
    default_data = {
        "mirror_monitor_port": "disabled"
    }

    @util.skip_device("RUTM")
    def test_port_mirroring_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url_general)
            get_response = self.default_data.copy()
            get_response["id"] = self.sid
            get_response[".type"] = "switch"
            x.assert_data(get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                "mirror_source_port": "2",
                "enable_mirror_rx": "1",
                "enable_mirror_tx": "1",
                "mirror_monitor_port": "1"
            }
            x = self.put_data(self.url_general, put_data)
            put_data["id"] = self.sid
            put_data[".type"] = "switch"
            x.assert_data(put_data)
        with self.subTest("return_configuration_to_default"):
            x = self.put_data(self.url_general, self.default_data)
            self.default_data["id"] = self.sid
            self.default_data[".type"] = "switch"
            x.assert_data(self.default_data)

    @util.skip_device("RUTM")
    def test_port_mirroring_deletion(self):
        x = self.delete(self.url_general)
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)

    @util.skip_device("RUTM")
    def test_port_mirroring_creation(self):
        x = self.post_data(self.url_general, {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)