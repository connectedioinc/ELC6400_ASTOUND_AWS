from response_codes import ResponseCodes
import utility_integration as util
import sys

from utils.ssh import open_ssh_connection
sys.path.append("../../../../tests")
BASE_URL = "/date_time/ntp/server/config"
NTPD_URL = "/date_time/ntpd/config/ntp"


class test_ntp_server(util.WrapTest):
    def test_ntp_server_ntpd_enabled_error(self):
        x = self.get(NTPD_URL) # auto skips if ntpd is not installed
        x.assert_code(200)

        ntpd_enabled = x.json["data"].get("enabled")

        x = self.put_data(BASE_URL + "/general", {"enabled": "1"})
        if ntpd_enabled == "1":
            x.assert_code(422)
        else:
            x.assert_code(200)

        x = self.put_data(BASE_URL + "/general", {"enabled": "0"})
        x.assert_code(200)

    def test_ntp_server_deletion(self):
        x = self.delete(BASE_URL + "/general")
        x.assert_error("Validation", "Section deletion is not allowed", ResponseCodes.NO_DELETE.val())

    def test_ntp_server_creation(self):
        x = self.post_data(BASE_URL, {})
        x.assert_error("Validation", "Section creation is not allowed", ResponseCodes.NO_CREATE.val())

    def test_ntp_server_installed_checking(self):
        with open_ssh_connection() as ssh:
            with self.subTest("hide original cfg"):
                ssh.send_cmd("mv /etc/config/ntpserver /etc/config/ntpserver.old")

            with self.subTest("test_ntp_server_installed_checking"):
                api_url = util.Env.get_api_url()
                response = util.Env.http.request("GET", f"{api_url}{BASE_URL}")

                self.assertDictEqual(response.json()["errors"][0], {
                    "source": "Request",
                    "error": "Service does not exist in device",
                    "code": 122
                })

            with self.subTest("reset original cfg"):
                ssh.send_cmd("mv /etc/config/ntpserver.old /etc/config/ntpserver")