import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_static_leases_ipv6(util.WrapTest):
    url = "/dhcp/static_leases/ipv6/config"
    sid = None

    @util.skip_device("TAP")
    def setUp(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        if "switch" in board["hwinfo"] and board["hwinfo"]["switch"]:
            self.skipTest("DHCPv6 is not supported on switch devices")

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
                "duid": "00041e45bf1523747e47d62dddfdfaa28be9",
                "hostid": "c3b"
            }
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            x.assert_data(put_data)
        with self.subTest(f"create_configuration_incorrect_duid_format"):
            x = self.post_data(self.url, {
                ".type": "host",
                "name": "example.com",
                "duid": "zzzzzzzzzz",
                "hostid": "c3c"
            })
            x.assert_error(
                "duid", "Duid is not a hexadecimal string", 103, None, None)
        with self.subTest(f"create_configuration_existing_duid"):
            x = self.post_data(self.url, {
                ".type": "host",
                "name": "example.com",
                "duid": "00041e45bf1523747e47d62dddfdfaa28be9",
                "hostid": "c3c"
            })
            x.assert_error(
                "duid", "Duid is already in use", 103, None, None)
        with self.subTest(f"create_configuration_incorrect_hostid_format"):
            x = self.post_data(self.url, {
                ".type": "host",
                "name": "example.com",
                "duid": "bdb5ec46511e434d857c9c548b4ff677",
                "hostid": "zzz"
            })
            x.assert_error(
                "hostid", "Hostid is not a hexadecimal string", 103, None, None)
        with self.subTest(f"create_configuration_existing_hostid"):
            x = self.post_data(self.url, {
                ".type": "host",
                "name": "example.com",
                "duid": "bdb5ec46511e434d857c9c548b4ff677",
                "hostid": "c3b"
            })
            x.assert_error(
                "hostid", "Hostid is already in use", 103, None, None)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + self.sid)
            x.assert_data({
                "id": self.sid
            })
