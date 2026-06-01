from response_codes import ResponseCodes
import utility_integration as util
from utils.general_api import generate_require_error_messages
import sys
sys.path.append("../../../../tests")
BASE_URL = "/date_time/ntpd/config"
NTP_SERVER_URL = "/date_time/ntp/server/config/general"
AVAILABLE_OPTS = {"enabled": "",
                  "file_flag": "",
                  "config_file": "",
                  "server": "",
                  "enable_server": ""}


class test_ntpd(util.WrapTest):
    def test_ntpd_enabled_validation(self):
        default_cfg = None
        with self.subTest("get ntpd cfg"):
            x = self.get(BASE_URL + "/ntp")
            x.assert_code(200)
            default_cfg = x.json["data"]
            for opt in AVAILABLE_OPTS:
                default_cfg[opt] = default_cfg.get(opt) or ""
            del default_cfg["id"]

        with self.subTest("disable ntpd"):
            x = self.put_data(BASE_URL + "/ntp", {"enabled": "0"})
            x.assert_code(200)

        with self.subTest("main test"):
            ntp_serv_enabled = None
            with self.subTest("enable ntp server"):
                x = self.get(NTP_SERVER_URL)
                ntp_serv_enabled = x.json["data"]["enabled"]
                if ntp_serv_enabled != "1":
                    x = self.put_data(NTP_SERVER_URL, {"enabled": "1"})
                    x.assert_code(200)

            with self.subTest("test ntpd enabled validation"):
                x = self.put_data(BASE_URL + "/ntp", {"enabled": "1"})
                x.assert_code(422)

            with self.subTest("disable ntp server"):
                x = self.put_data(NTP_SERVER_URL, {"enabled": "0"})
                x.assert_code(200)

            with self.subTest("reset ntp server cfg"):
                x = self.put_data(NTP_SERVER_URL, {"enabled": ntp_serv_enabled or ""})
                x.assert_code(200)

        with self.subTest("reset ntpd cfg"):
            x = self.put_data(BASE_URL + "/ntp", default_cfg)
            x.assert_code(200)

    def test_ntpd_deletion(self):
        x = self.delete(BASE_URL + "/ntp")
        x.assert_error("Validation", "Section deletion is not allowed", ResponseCodes.NO_DELETE.val())

    def test_ntpd_creation(self):
        x = self.post_data(BASE_URL, {})
        x.assert_error("Validation", "Section creation is not allowed", ResponseCodes.NO_CREATE.val())

    def test_enable_require_depedency(self):
        with self.subTest("clear config"):
            x = self.put_data(BASE_URL + "/ntp",{
                "enabled": "",
                "file_flag": "",
                "config_file": "",
                "server": "",
                "enable_server": "",
            }).assert_code(200)

        with self.subTest("check depedency"):
            x = self.put_data(BASE_URL + "/ntp",{
                "enabled": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "ntp", ["server"]))
            x = self.put_data(BASE_URL + "/ntp",{
                "enabled": "1",
                 "file_flag": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "ntp", ["config_file"]))