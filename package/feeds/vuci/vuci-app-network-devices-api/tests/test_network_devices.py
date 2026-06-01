import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_network_devices_base(util.WrapTest):
    url = "/network/devices/config"

    def test_network_devices_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()
            self.assertIn("success", get_response)
            self.assertIn("data", get_response)

    def test_network_devices_deletion(self):
        x = self.delete(self.url)
        x.assert_error(
            "Validation", "Section deletion is not allowed", 111, None, None)

    def test_network_devices_creation(self):
        x = self.post_data(self.url, {})
        x.assert_error(
            "Validation", "Section creation is not allowed", 108, None, None)

    def test_network_devices_edit(self):
        x = self.put_data(self.url, {})
        x.assert_error(
            "Validation", "Section edit is not allowed", 119, None, None)


class test_network_devices_bridge(util.WrapTest):
    url = "/network/devices/bridge/config"
    sid = None

    def test_network_devices_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()
            self.assertIn("success", get_response)
            self.assertIn("data", get_response)
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, {"ports": ["test1", "test2"]})
            self.sid = x.resp.json()["data"]["id"]
            x.assert_data({
                "id": self.sid,
                "name": self.sid,
                ".type": "device",
                "type": "bridge",
                "ports": ["test1", "test2"]
            }, 201)
        with self.subTest(f"edit_configuration"):
            put_data = {
                ".type": "device",
                "ports": ["updated1", "updated2"],
                "macaddr": "DA:FE:B3:D2:09:2D"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["name"] = self.sid
            put_data["type"] = "bridge"
            x.assert_data(put_data)
        with self.subTest(f"edit_configuration_disallowed_type"):
            put_data = {
                ".type": "device",
                "type": "ethernet"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            x.assert_error(
                "type", "Option is readonly", 103, None, None)
        with self.subTest(f"edit_configuration_disallowed_name"):
            put_data = {
                ".type": "device",
                "name": "test1"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            x.assert_error(
                "name", "Option is readonly", 103, None, None)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
