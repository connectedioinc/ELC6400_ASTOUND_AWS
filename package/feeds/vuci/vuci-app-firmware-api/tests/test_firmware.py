import sys
import utility_integration as util
from utils.ssh import get_ssh
from datetime import datetime
import response_codes as codes
import json
import pytz
sys.path.append("../../../../tests")

class test_firmware(util.WrapTest):
    @classmethod
    def setUpClass(cls) -> None:
        cls.ssh = get_ssh()
        res = cls.ssh.send_cmd("ping -c 1 1.1.1.1 &> /dev/null ; echo $?")
        cls.internet_connection = res.strip() == "0"
        cls.ssh.send_cmd("rm -f /tmp/dfota_status.json &> /dev/null")
        cls.ssh.send_cmd("/sbin/rut_fota -i &> /dev/null")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def check_firmware_version(self, current_firmware, response, expected, version_variable="version", size_variable="size"):
        # There is some firmware in FOTA, check if at least for the same target
        if response[version_variable] and response[version_variable] != expected[version_variable]:
            target = current_firmware.split("_")[0]
            expected_target = response[version_variable].split("_")[0]
            self.assertEqual(target, expected_target, f"Firmware {version_variable} should match current firmware target")
            self.assertTrue(int(response[size_variable]) > 0, f"Firmware {size_variable} should be greater than 0")
        else:
            self.assertEqual(expected[version_variable], response[version_variable])
            self.assertEqual(expected[size_variable], response[size_variable])

    modems = []
    base_url = "/firmware"
    
    def test_firmware_base_functionality(self):
        kernel = ""
        version = ""
        build_date = ""
        time_zone = ""
        dual_modem = False

        with self.subTest("get_info"):
            kernel = self.ssh.send_cmd("uname -r").strip()
            version = self.ssh.send_cmd("cat /etc/version").strip()
            build_date = int(self.ssh.send_cmd("cat /etc/firmware-date").strip())
            x = self.get("/date_time/ntp/client/config")
            time_zone = x.resp.json()["data"][0]["zoneName"]
            build_date = str(datetime.fromtimestamp(build_date).astimezone(pytz.timezone(time_zone)).strftime("%Y-%m-%d %H:%M:%S"))
            available_modems = self.ssh.send_cmd("ubus list gsm.modem* 2> /dev/null")

            x = self.get("/system/device/status")
            dual_modem = x.resp.json()["data"]["board"]["hwinfo"]["dual_modem"]
            added_modem_ids = set()

            for available_modem in available_modems.splitlines():
                info = json.loads(self.ssh.send_cmd("ubus call " + available_modem.strip() + " info") or "{}")
                single_modem = {}
                modem_id = info.get("usb_id")
    
                if modem_id and modem_id not in added_modem_ids:
                    if dual_modem:
                        single_modem["type"] = "Primary modem" if info["primary"] == True else "Secondary modem"
                    else:
                        single_modem["type"] = "Internal modem" if info["builtin"] == True else "External modem"
                    single_modem["version"] = info["cache"]["firmware"]
                    single_modem["id"] = modem_id
                    self.modems.append(single_modem)
                    added_modem_ids.add(modem_id)
            if "modems" in x.resp.json()["data"]["board"]:
                for modem in x.resp.json()["data"]["board"]["modems"]:
                    single_modem = {}
                    modem_id = modem["id"]
                    if modem_id not in added_modem_ids:
                        if dual_modem:
                            single_modem["type"] = "Primary modem" if modem.get("primary") == True else "Secondary modem"
                        else:
                            single_modem["type"] = "Internal modem" if modem.get("builtin") == True else "External modem"
                        single_modem["version"] = "N/A"
                        single_modem["id"] = modem["id"]
                        self.modems.append(single_modem)
                        added_modem_ids.add(modem_id)
        with self.subTest("get_fw_info"):
            x = self.get(self.base_url + "/device/status")
            x.assert_data({
                "kernel_version":kernel,
                "version":version,
                "build_date":build_date
            })
        with self.subTest("get_modems_info"):
            x = self.get(self.base_url + "/modem/status")
            resp = x.resp.json()
            self.assertEqual(self.modems, resp["data"]["modems"])

    def test_firmware_upload_fw(self):
        x = self.get("/system/device/status")
        if not "RUTX" in x.resp.json()["data"]["static"]["model"]:
            self.skipTest("Not supported")

        with self.subTest("upload_fw"):
            x = self.send_file(self.base_url + "/actions/upload_device_firmware", "files/RUTX_FW.bin")
            x.assert_data({
                "valid": "1",
                "passwd_warning": "0",
                "authorized": "1",
                "message_code": "0",
                "size": "22.98 MB",
                "newer": "0",
                "allow_backup": "0",
                "sha256": "e0803aa221d9683756d092a9297aea00834f6aa470cb64158277503b976dcf6b",
                "md5": "967b54b584b35cd6eeba44d5cc6022f6",
                "fw_version": "RUTX_R_00.07.04.1",
                "hw_support": "1"
            })
        with self.subTest("verify_fw"):
            x = self.post(self.base_url + "/actions/verify", None)
            x.assert_data({
                "valid": "1",
                "sha256": "e0803aa221d9683756d092a9297aea00834f6aa470cb64158277503b976dcf6b",
                "passwd_warning": "0",
                "authorized": "1",
                "md5": "967b54b584b35cd6eeba44d5cc6022f6",
                "message_code": "0",
                "size": "22.98 MB",
                "newer": "0",
                "allow_backup": "0",
                "fw_version": "RUTX_R_00.07.04.1",
                "hw_support": "1"
            })
        with self.subTest("delete_fw"):
            x = self.post(self.base_url + "/actions/delete_device_firmware")
            x.assert_data({
                "response":"Device firmware deleted successfully."
            })
        with self.subTest("delete_non_existent_fw"):
            x = self.post(self.base_url + "/actions/delete_device_firmware")
            x.assert_error("Firmware Delete", "Firmware file not found in the device.", 7)
        with self.subTest("try_to_upgrade"):
            x = self.post_data(self.base_url + "/actions/upgrade", {
                "keep_settings":"1"
            })
            x.assert_error("Upgrade", "Firmware file not found in the device.", 3)
        with self.subTest("try_modem_fw"):
            x = self.post(self.base_url + "/actions/delete_modem_firmware")
            x.assert_error("Request", "Modem firmware upgrade from file is not supported on this device.", 8)

    def test_firmware_downloads(self):
        if self.internet_connection:
            with self.subTest("check_device_update"):
                x = self.get(self.base_url + "/device/updates/status")
                expected = {
                    "stable_version": "newest",
                    "stable_size": "0",
                    "version":"newest",
                    "size":"0"
                }
                response = x.resp.json()["data"]["device"]
                current_firmware = self.ssh.send_cmd("cat /etc/version").strip()
                self.check_firmware_version(current_firmware, response, expected)
                self.check_firmware_version(current_firmware, response, expected, "stable_version", "stable_size")
            with self.subTest("check_device_download_status"):
                x = self.get(self.base_url + "/device/progress/status")
                x.assert_data({
                    "percents":"100",
                    "process":"succeeded"
                })
        else:
            with self.subTest("check_device_update"):
                x = self.get(self.base_url + "/device/updates/status")
                x.assert_error(None, "No internet connection.", 15)
            with self.subTest("check_device_download_status"):
                x = self.get(self.base_url + "/device/progress/status")
                x.assert_data({
                    "percents":"0",
                    "process":"failed"
                })

        with self.subTest("download_device_update"):
            x = self.post(self.base_url + "/actions/fota_download", None)
            if self.internet_connection:
                if x.resp.status_code == 422:
                    x.assert_error("Download", "No update is available.", 7)
                else:
                    x.assert_code(200)
            else:
                x.assert_error(None, "No internet connection.", 15)

    @util.skip_emulator()
    def test_modem_firmware_downloads(self):
        if self.internet_connection:
            with self.subTest("check_modem_update"):
                x = self.get(self.base_url + "/modem/updates/status")
                response = []
                for modem in self.modems:
                    response.append({
                        "id": modem["id"],
                        "update_exists":"0"
                    })
                self.assertEqual(response, x.resp.json()["data"]["modems"])
            with self.subTest("check_modem_download_status"):
                x = self.get(self.base_url + "/modem/progress/status")
                response = []
                for modem in self.modems:
                    response.append({
                        "forced":"0",
                        "status":"failed",
                        "id": modem["id"],
                        "error":"No update found!",
                        "error_code":"170",
                    })
                self.assertEqual("failed", x.resp.json()["data"]["status"])
                self.assertEqual(response, x.resp.json()["data"]["modems"])
        else:
            with self.subTest("check_modem_update"):
                x = self.get(self.base_url + "/modem/updates/status")
                x.assert_error(None, "No internet connection.", 15)
            with self.subTest("check_modem_download_status"):
                x = self.get(self.base_url + "/modem/progress/status")
                x.assert_code(204)

    ## add tests for modem FW.
