import sys
import json
from utils.ssh import get_ssh
import response_codes as codes
import utility_integration as util
sys.path.append("../../../../tests")

RC = codes.ResponseCodes


class test_hotspot2(util.WrapTest):
    original_data = []

    @classmethod
    def setUpClass(cls) -> None:
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    url = "/hotspot2/config"
    wireless_url = "/wireless/interfaces/config"

    def prepare_data(self, data, remove = []):
        if self.original_data == []:
            x = self.get(self.url)
            x.assert_code(200)
            self.original_data = x.resp.json()["data"]
        new_data = []
        return_data = []
        for i in range(len(self.original_data)):
            new_data.append({**{
                ".type": self.original_data[i][".type"],
                "id": self.original_data[i]["id"]
            }, **data})
            combined_data = {**self.original_data[i], **data}
            for value in remove:
                combined_data.pop(value, None)
            return_data.append(combined_data)
        return (new_data, return_data)

    def setUp(self):
        board = json.loads(self.ssh.send_cmd("cat /etc/board.json"))
        if not "wifi" in board["hwinfo"] or ("wifi" in board["hwinfo"] and board["hwinfo"]["wifi"] != True):
            self.skipTest("Wifi is not supported")

    def tearDown(self):
        data, return_data = self.prepare_data({
            "access_network_type": "",
            "roaming_consortium": "",
            "venue_group": "",
            "venue_type": "",
            "interworking": "0"
        }, [ "bssid" ])
        x = self.put_data(self.url, data)
        x.assert_data(self.original_data, 200, [ "bssid" ])

    def test_hotspot_base_functionality(self):
        wireless_data = []
        with self.subTest("get_wifi_ifaces"):
            x = self.get(self.wireless_url)
            x.assert_code(200)
            wireless_data = x.resp.json()["data"]
        with self.subTest("get_hotspot_config"):
            x = self.get(self.url)
            x.assert_code(200)
            self.original_data = x.resp.json()["data"]
            for i in range(len(wireless_data)):
                self.assertEqual(
                    wireless_data[i]["ssid"], self.original_data[i]["ssid"])
                self.assertEqual(
                    wireless_data[i]["id"], self.original_data[i]["id"])

    def test_option_access_network_type(self):
        with self.subTest("valid_access_network_type"):
            for type in [
                "0",  # Private network
                "1",  # Private network with guest access
                "2",  # Chargeable public network
                "3",  # Free public network
                "4",  # Personal device network
                "5",  # Emergency services only network
                "14"  # Test or experimental
            ]:
                data, return_data = self.prepare_data({
                    "access_network_type": type
                }, [ "bssid" ])
                x = self.put_data(self.url, data)
                x.assert_data(return_data, 200, [ "bssid" ])
        with self.subTest("invalid_access_network_type"):
            data, return_data = self.prepare_data({
                "access_network_type": "25"
            })
            x = self.put_data(self.url, data)
            x.assert_error(
                "access_network_type", "Must be one of the following values [0, 1, 2, 3, 4, 5, 14].", RC.INVALID_OPT.val())

    def test_option_roaming_consortium(self):
        with self.subTest("valid_roaming_consortium"):
            data, return_data = self.prepare_data({
                "roaming_consortium": ["111111", "11111111", "1111111111"]
            })
            x = self.put_data(self.url, data)
            x.assert_data(return_data)
        with self.subTest("invalid_roaming_consortium"):
            data, return_data = self.prepare_data({
                "roaming_consortium": ["111", "11111", "11"]
            })
            x = self.put_data(self.url, data)
            x.assert_error(
                "roaming_consortium at index 1", "Only specific length values are accepted (6, 8, 10)", RC.INVALID_OPT.val())

    def test_option_venue(self):
        with self.subTest("venue_type_without_group"):
            data, return_data = self.prepare_data({
                "venue_type": "10"
            })
            x = self.put_data(self.url, data)
            x.assert_error("venue_type", "Venue group not set.",
                           RC.INVALID_OPT.val())
        with self.subTest("valid_venue_type_group"):
            data, return_data = self.prepare_data({
                "venue_group": "10",
                "venue_type": "4"
            })
            x = self.put_data(self.url, data)
            x.assert_data(return_data)
        with self.subTest("venue_type_not_exists"):
            data, return_data = self.prepare_data({
                "venue_group": "2",
                "venue_type": "20"
            })
            x = self.put_data(self.url, data)
            x.assert_error(
                "venue_type", "Must be one of the following values [0, 1, 2, 3, 4, 6, 7, 8, 9].", RC.INVALID_OPT.val())

    def test_option_interworking(self):
        with self.subTest("interworking"):
            data, return_data = self.prepare_data({
                "interworking": "1"
            })
            x = self.put_data(self.url, data)
            x.assert_data(return_data)
            for i in range(len(self.original_data)):
                self.assertTrue(self.ssh.send_cmd(
                    "uci get wireless." + self.original_data[i]["id"] + ".hs20").strip() == "1")

    def test_deletion(self):
        x = self.delete(self.url)
        x.assert_error(
            "Validation", "Section deletion is not allowed", 111, None, None)

    def test_creation(self):
        x = self.post_data(self.url, {})
        x.assert_error(
            "Validation", "Section creation is not allowed", 108, None, None)
