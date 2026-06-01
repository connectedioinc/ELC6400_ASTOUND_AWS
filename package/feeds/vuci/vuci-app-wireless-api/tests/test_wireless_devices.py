import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_wireless_devices(util.WrapTest):
    url = "/wireless/devices/config"
    url_global = "/wireless/devices/global"
    wifi = False
    dual_band = False
    default_data = [
        {
            "enabled": "1",
            ".type": "wifi-device",
            "country": "US",
            "id": "radio0",
            "legacy_rates": "0",
            "hwmode": "n",
            "txpower": "100",
            "channel": "auto",
            "htmode": "HT20"
        },
        {
            "enabled": "1",
            ".type": "wifi-device",
            "country": "US",
            "id": "radio1",
            "hwmode": "ac",
            "txpower": "100",
            "channel": "auto",
            "htmode": "VHT80",
            "acs_exclude_dfs": "1"
        }
    ]

    def setUp(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        if not self.supports_wifi(board):
            self.skipTest("Device doesn't support Wi-Fi")
        self.dual_band = self.supports_dual_band()

    def supports_wifi(self, board):
        return board["hwinfo"]["wifi"]

    def supports_dual_band(self):
        response = self.get(self.url)
        data = response.resp.json()["data"]
        return len(data) > 1

    def test_wireless_devices_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            get_response = x.resp.json()["data"]
            default = self.default_data.copy()
            if not self.dual_band:
                default.pop()
            self.assertEqual(default, get_response)
        with self.subTest("edit_configuration"):
            put_data = [
                {
                    "enabled": "0",
                    ".type": "wifi-device",
                    "country": "US",
                    "id": "radio0",
                    "legacy_rates": "1",
                    "hwmode": "n",
                    "txpower": "25",
                    "channel": "11",
                    "htmode": "HT40",
                    "beacon_int": "300",
                    "distance": "100",
                    "frag": "256",
                    "rts": "100",
                    "noscan": "1"
                },
                {
                    "enabled": "0",
                    ".type": "wifi-device",
                    "country": "US",
                    "id": "radio1",
                    "hwmode": "ac",
                    "txpower": "50",
                    "channel": "124",
                    "htmode": "VHT40",
                    "beacon_int": "600",
                    "distance": "50",
                    "frag": "300",
                    "rts": "200",
                    "noscan": "1",
                    "acs_exclude_dfs": "0"
                }
            ]
            if not self.dual_band:
                put_data.pop()
            x = self.put_data(self.url, put_data)
            put_data[0]["tx_power"] = x.resp.json()["data"][0]["tx_power"]
            if self.dual_band:
                put_data[1]["tx_power"] = x.resp.json()["data"][1]["tx_power"]
            x.assert_data(put_data)
        with self.subTest("edit_configuration_disallowed_channel_5g"):
            if not self.dual_band:
                self.skipTest("Dual band device is required for this test")
            put_data = {
                "hwmode": "ac",
                "channel": "165",
                "htmode": "VHT40"
            }
            x = self.put_data(self.url + "/radio1", put_data)
            x.assert_error(
                "channel", "165 channel is not supported on 40 MHz width. Maximum allowed value is 161.", 103, None, None)
        with self.subTest("edit_configuration_allowed_channel_5g"):
            if not self.dual_band:
                self.skipTest("Dual band device is required for this test")
            put_data = {
                "hwmode": "ac",
                "channel": "165",
                "htmode": "VHT20"
            }
            x = self.put_data(self.url + "/radio1", put_data)
            x.assert_code(200)
        with self.subTest("edit_configuration_check_channel_migration_2g_and_location"):
            x = self.put_data(self.url_global, { "country": "JP", "location": "outdoor" })
            x.assert_data({ "country": "JP", "location": "outdoor" })
            x = self.put_data(self.url + "/radio0", { "channel": "13" })
            x.assert_code(200)
            x = self.put_data(self.url_global, { "country": "US", "location": "any" })
            x.assert_data({ "country": "US", "location": "any" })
            self.assertEqual(x.resp.json()["messages"][0]["message"], "Channel 13 is not available in the US regulatory domain for radio0 and has been auto-adjusted to 11.")
        with self.subTest("reset_configuration"):
            params = ["beacon_int", "distance", "frag", "rts", "noscan", "txpower"]
            default = self.default_data.copy()
            if not self.dual_band:
                default.pop()
            for d in default:
                for p in params:
                    d[p] = ""
                d["txpower"] = ""

            x = self.put_data(self.url, default)
            for d in default:
                for p in params:
                    del d[p]
                d["txpower"] = "100"
            x.assert_data(default)

    def test_wireless_devices_deletion(self):
        x = self.delete(self.url)
        x.assert_error(
            "Validation", "Section deletion is not allowed", 111, None, None)

    def test_wireless_devices_creation(self):
        x = self.post_data(self.url, {})
        x.assert_error(
            "Validation", "Section creation is not allowed", 108, None, None)
