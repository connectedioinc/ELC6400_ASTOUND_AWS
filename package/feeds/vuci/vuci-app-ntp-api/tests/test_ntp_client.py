from response_codes import ResponseCodes
import utility_integration as util
import sys
import random
import response_codes as codes
from utils.general_api import get_modems, delete_all

from utils.ssh import open_ssh_connection
import response_codes as codes

RC = codes.ResponseCodes
sys.path.append("../../../../tests")
RC = codes.ResponseCodes
BASE_URL = "/date_time/ntp/client/config"
OPTIONS_URL = "/date_time/ntp/client/timezones/options"
SERVERS_URL = "/date_time/ntp/time_servers/config"
ALWAYS_AVAILABLE_OPTIONS = {"enabled": "",
                            "zoneName": "",
                            "timezone": "",
                            "freq": "",
                            "current_system_time": "",
                            "force": "",
                            "save": "",
                            "count": "",
                            "interval": ""
                            }


class test_ntp_client(util.WrapTest):
    servers_hostnames = []
    def setUp(self) -> None:
        x = self.get(BASE_URL + "/ntpclient")
        x.assert_code(200)
        self.original_section = x.resp.json()["data"]

    def tearDown(self) -> None:
        cfg = {}
        for opt in ALWAYS_AVAILABLE_OPTIONS:
            cfg[opt] = self.original_section.get(opt) or ""
        for opt in self.original_section:
            cfg[opt] = self.original_section.get(opt) or ""
        del cfg["timezone"]  # readonly option
        del cfg["current_system_time"]
        del cfg["id"]

        x = self.put_data(BASE_URL + "/ntpclient", cfg)
        x.assert_code(200)

    def save_ntp_servers(self):
        ids = []
        x = self.get(SERVERS_URL)
        if len(x.resp.json()["data"]) > 0:
            for server in x.resp.json()["data"]:
                if "hostname" in server:
                    self.servers_hostnames.append({
                        "hostname": server["hostname"]
                    })
                    ids.append(server["id"])
            x = self.delete_data(SERVERS_URL, ids)
            x.assert_code(200)
    
    def apply_ntp_servers(self):
        for server in self.servers_hostnames:
            x = self.post_data(SERVERS_URL, server)
            x.assert_code(201)

    def test_ntp_time_zone_validation(self):
        x = self.get(OPTIONS_URL)
        x.assert_code(200)
        timezones = x.resp.json()["data"]["timezones"]

        # checking only 10 random timezones, because checking all timezones takes over a minute
        selected_timezones = random.choices(timezones, k=10)
        for tz in selected_timezones:
            x = self.put_data(BASE_URL + "/ntpclient", {"zoneName": tz})
            x.assert_code(200)
            s = x.resp.json()["data"]
            self.assertEqual(s["zoneName"], tz)

        x = self.put_data(BASE_URL + "/ntpclient", {"zoneName": "invalid_zonename"})
        x.assert_code(422)

    def test_ntp_time_zone_custom_options(self):
        # "zoneName" option
        x = self.put_data(BASE_URL + "/ntpclient", {"zoneName": "America/Asuncion"})
        x.assert_code(200)
        self.assertEqual(x.json["data"]["zoneName"], "America/Asuncion")
        self.assertEqual(x.json["data"]["timezone"], "<-03>3")
        with open_ssh_connection() as ssh:
            res = ssh.send_cmd("cat /etc/TZ")
            self.assertEqual(res.strip(), "<-03>3")
            res = ssh.send_cmd("grep \"option timezone '<-03>3\" /etc/config/system &> /dev/null ; echo $?")
            self.assertEqual(res.strip(), "0")
            res = ssh.send_cmd("grep \"option zoneName 'America/Asuncion'\" /etc/config/system &> /dev/null ; echo $?")
            self.assertEqual(res.strip(), "0")

        # "freq" option
        x = self.put_data(BASE_URL + "/ntpclient", {"freq": "123"})
        x.assert_code(200)
        self.assertEqual(x.json["data"]["freq"], "123")
        self.assertEqual(self.get_section("ntpclient", "ntpdrift")["values"]["freq"], "123")

        # gps options
        x = self.get("/system/device/status")
        x.assert_code(200)
        hwinfo = x.json["data"]["board"]["hwinfo"]
        if hwinfo.get("gps"):
            gps_enabled = None
            with self.subTest("get gps cfg"):
                x = self.get("/gps/global")
                gps_enabled = x.json["data"].get("enabled")

            with self.subTest("test gps options"):
                x = self.put_data(BASE_URL + "/ntpclient", {"gps_sync": "1", "gps_interval": "300", })
                x.assert_code(200)
                self.assertEqual(x.json["data"]["gps_sync"], "1")
                self.assertEqual(x.json["data"]["gps_interval"], "300")
                gps_s = self.get_section("gps", "gpsd")["values"]
                self.assertEqual(gps_s["enabled"], "1")
                if gps_enabled != "1":
                    self.assertDictEqual(x.json["messages"][0], {"code": 2, "message": "GPS has been enabled", "source": "gps_sync"})

                x = self.put_data(BASE_URL + "/ntpclient", {"gps_sync": "0", "gps_interval": "", })
                x.assert_code(200)
                self.assertEqual(x.json["data"]["gps_sync"], "0")

            with self.subTest("reset gps cfg"):
                x = self.put_data("/gps/global", {"enabled": gps_enabled or ""})
                x.assert_code(200)
        else:
            x = self.put_data(BASE_URL + "/ntpclient", {"gps_sync": "1", "gps_interval": "300", })
            x.assert_code(422)


        # mobile options
        modems = get_modems(self)
        if len(modems) > 0:
            x = self.put_data(BASE_URL + "/ntpclient", {"sync_enabled": "1", "tmz_sync_enabled": "1", "failover": "10"})
            x.assert_code(200)
            x = self.put_data(BASE_URL + "/ntpclient", {"sync_enabled": "", "tmz_sync_enabled": "", "failover": ""})
            x.assert_code(200)
        else:
            x = self.put_data(BASE_URL + "/ntpclient", {"sync_enabled": "1", "tmz_sync_enabled": "1", "failover": "10"})
            x.assert_code(422)


    def test_ntp_client_deletion(self):
        x = self.delete(BASE_URL + "/ntpclient")
        x.assert_error("Validation", "Section deletion is not allowed", ResponseCodes.NO_DELETE.val())

    def test_ntp_client_creation(self):
        x = self.post_data(BASE_URL, {})
        x.assert_error("Validation", "Section creation is not allowed", ResponseCodes.NO_CREATE.val())

    def test_ntp_client_custom_validation(self):
        ntp_servers = []
        general_data = {}
        modems = get_modems(self)

        if len(modems) > 0:
            general_data = {
                "enabled" : "0",
                "sync_enabled": ""
            }
        else:
            general_data = {
                "enabled" : "0"
            }

        x = self.put_data(BASE_URL + "/ntpclient", general_data)
        x.assert_code(200)

        with self.subTest("delete all ntp servers"):
            x = self.get(SERVERS_URL)
            x.assert_code(200)

            for server in x.resp.json()["data"]:
                if "hostname" in server:
                    ntp_servers.append(server)

            delete_all(self, SERVERS_URL)

        with self.subTest("check validation"):
            general_data["enabled"] = "1"
            # Checks when there is no server at all
            x = self.put_data(BASE_URL + "/ntpclient", general_data)
            if len(modems) > 0:
                x.assert_error("Validation", "Service does not work without enabled 'sync_enabled' or at least one 'ntpserver'.", RC.INVALID_OPT.val())
            else:
                x.assert_error("Validation", "Service does not work without at least one 'ntpserver' instance configured.", RC.INVALID_OPT.val())

            # Checks when a single server is created but without a "hostname" value
            server_sid = None
            x = self.post_data(SERVERS_URL, {})
            server_sid = x.resp.json()['data']['id']
            x.assert_code(201)

            if server_sid != None:
                x = self.put_data(BASE_URL + "/ntpclient", general_data)
                if len(modems) > 0:
                    x.assert_error("Validation", "Service does not work without enabled 'sync_enabled' or at least one 'ntpserver'.", RC.INVALID_OPT.val())
                else:
                    x.assert_error("Validation", "Service does not work without at least one 'ntpserver' instance configured.", RC.INVALID_OPT.val())

                x = self.delete(f"{SERVERS_URL}/{server_sid}")
                x.assert_code(200)

            # Checks whether the "sync_enabled" option is enabled, if so then it does not require servers
            if len(modems) > 0:
                general_data["sync_enabled"] = "1"
                x = self.put_data(BASE_URL + "/ntpclient", general_data)
                x.assert_code(200)

        if len(ntp_servers) > 0:
            with self.subTest("revert ntp servers"):
                self.put_data(BASE_URL + "/ntpclient", {"enabled": "0"})
                delete_all(self, SERVERS_URL)
                for server in ntp_servers:
                    x = self.post_data(SERVERS_URL, {"hostname": server["hostname"]})
                    x.assert_code(201)
                self.put_data(BASE_URL + "/ntpclient", {"enabled": "1"})
