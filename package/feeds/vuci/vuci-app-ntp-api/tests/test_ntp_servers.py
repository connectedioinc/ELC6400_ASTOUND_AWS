import utility_integration as util
import sys
from utils.general_api import get_modems, delete_all
import response_codes as codes
sys.path.append("../../../../tests")
BASE_URL = "/date_time/ntp/time_servers/config"
GENERAL_URL = "/date_time/ntp/client/config"
RC = codes.ResponseCodes

class test_ntp_servers(util.WrapTest):
    servers_hostnames = []

    def test_ntp_servers_custom_validation(self):
        ntp_servers = []
        general_data = {}
        modems = get_modems(self)

        general_data = {
            "enabled" : "0"
        }
        if len(modems) > 0: general_data["sync_enabled"] = ""

        x = self.put_data(GENERAL_URL + "/ntpclient", general_data)
        x.assert_code(200)

        with self.subTest("delete all ntp servers"):
            x = self.get(BASE_URL)
            x.assert_code(200)

            for server in x.resp.json()["data"]:
                if "hostname" in server:
                    ntp_servers.append(server)

            delete_all(self, BASE_URL)

        with self.subTest("check validation"):
            sid = None
            empty_server_sid = None
            x = self.post_data(BASE_URL, {"hostname": "test.com"})
            sid = x.resp.json()['data']['id']
            x.assert_code(201)

            x = self.post_data(BASE_URL, {})
            empty_server_sid = x.resp.json()['data']['id']
            x.assert_code(201)

            general_data["enabled"] = "1"
            x = self.put_data(f"{GENERAL_URL}/ntpclient", general_data)
            x.assert_code(200)

            x = self.delete(f"{BASE_URL}/{sid}")
            if len(modems) > 0:
                x.assert_error("Validation", "Service does not work without enabled 'sync_enabled' or at least one 'ntpserver'.", RC.INVALID_OPT.val())
            else:
                x.assert_error("Validation", "Service does not work without at least one 'ntpserver' instance configured.", RC.INVALID_OPT.val())

            x = self.delete(f"{BASE_URL}/{empty_server_sid}")
            x.assert_code(200)

            x = self.delete(f"{BASE_URL}/{sid}")
            if len(modems) > 0:
                x.assert_error("Validation", "Service does not work without enabled 'sync_enabled' or at least one 'ntpserver'.", RC.INVALID_OPT.val())
            else:
                x.assert_error("Validation", "Service does not work without at least one 'ntpserver' instance configured.", RC.INVALID_OPT.val())

            if len(modems) > 0:
                general_data["sync_enabled"] = "1"
                x = self.put_data(GENERAL_URL + "/ntpclient", general_data)
                x.assert_code(200)
                x = self.delete(f"{BASE_URL}/{sid}")
                x.assert_code(200)

        if len(ntp_servers) > 0:
            with self.subTest("revert ntp servers"):
                self.put_data(GENERAL_URL + "/ntpclient", {"enabled": "0"})
                delete_all(self, BASE_URL)
                for server in ntp_servers:
                    x = self.post_data(BASE_URL, {"hostname": server["hostname"]})
                    x.assert_code(201)
                self.put_data(GENERAL_URL + "/ntpclient", {"enabled": "1"})
