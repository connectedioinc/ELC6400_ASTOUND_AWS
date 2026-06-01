import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_static_leases_ipv4(util.WrapTest):
    url = "/dhcp/static_leases/ipv4/config"
    sid = None

    @util.skip_device("TAP")
    def test_static_leases_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()
            self.assertIn("success", get_response)
            self.assertIn("data", get_response)
        with self.subTest("create_configuration"):
            x = self.post_data(self.url, {})
            self.sid = x.resp.json()["data"]["id"]
            x.assert_data({
                "id": self.sid,
                ".type": "host"
            }, 201)
        with self.subTest(f"edit_configuration"):
            put_data = {
                ".type": "host",
                "name": "example.com",
                "mac": "DA:FE:B3:D2:09:2D",
                "ip": "192.168.1.100"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            x.assert_data(put_data)
        with self.subTest(f"create_configuration_existing_mac_lowercase"):
            x = self.post_data(self.url, {
                ".type": "host",
                "name": "example2.com",
                "mac": "da:fe:b3:d2:09:2d",
                "ip": "192.168.1.101"
            })
            x.assert_error(
                "mac", "MAC already in use", 103, None, None)
        with self.subTest(f"create_configuration_existing_ip_address"):
            x = self.post_data(self.url, {
                ".type": "host",
                "name": "example3.com",
                "mac": "db:fe:b3:d2:09:2d",
                "ip": "192.168.1.100"
            })
            x.assert_error(
                "ip", "IP already in use", 103, None, None)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
