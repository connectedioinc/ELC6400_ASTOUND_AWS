import copy
import json
from os import system
import subprocess
import time
import pexpect
from response_codes import ResponseCodes
import utility_integration as util
from utils.general_api import del_key
from utils.ssh import get_custom_ssh, get_ssh
Env = util.Env

# WARNGING: password can change in setUpClass method and during tests
TAP_PASSWORD = "Kaunastlt1"

# can change it setUpClass, later used to reset the device to original password
ORIGINAL_TAP_PASSWORD = "admin01"

# Pw to change to after pairing
TAP_PASSWORD_CHANGE = "Kaunastlt1"

# Used to reset changed password
PW_CHANGED = False

TAP_IP = "192.168.1.3"

GROUPS_CFG_URL = "/site_manager/groups/config/"
DEV_CFG_URL = "/site_manager/devices/config/"
ALL_DEV_STATUS_URL = "/site_manager/devices/status"
STATUS_FULL_URL = "/site_manager/devices/status_full"
PAIR_DEV_URL = "/site_manager/devices/actions/pair"
UNPAIR_DEV_URL = "/site_manager/devices/actions/unpair"

DEVMAN_PERIODIC_REBOOT_URL = "/site_manager/auto_reboot/reboot_scheduler/config/"
PERIODIC_REBOOT_URL = "/auto_reboot/periodic/config/"
DEVMAN_PING_REBOOT_URL = "/site_manager/auto_reboot/ping_wget/config/"
PING_REBOOT_URL = "/auto_reboot/ping/config/"
DEVMAN_WIFI_IFACES_URL = "/site_manager/wireless/interfaces/config/"
WIFI_IFACES_URL = "/wireless/interfaces/config/"
DEVMAN_WIFI_DEVICES_URL = "/site_manager/wireless/devices/all/config/"
WIFI_DEVICES_URL = "/wireless/devices/config/"
DEVMAN_INTERFACES_URL = "/site_manager/interfaces/config/"
INTERFACES_URL = "/interfaces/config/"
NTP_URL = "/administration/ntp/client/config/general"


REFRESH_TOKEN_EXP_SECONDS_DEFAULT = 60 * 60 * 24 * 365 * 2 # 2 years
CERT_FILE = "/etc/ssl/certs/tlt-pairing.crt"

ERR_CODES = {
    "MDNS_ERR": 1,
    "DUPLICATE_MAC": 2,
    "DEVICE_NOT_FOUND": 3,
    "CERTIFICATE_INVALID": 4,
    "DEVICE_UNREACHABLE": 5,
    "DEVICE_NOT_PAIRED": 6,
    "CURL_ERROR": 7,
    "USER_NOT_FOUND": 8,
    "NEW_PW_NEEDED": 9,
    "PW_DOESNT_MATCH": 10,
    "BULK_ERROR": 11,
    "AUTH_ERROR": 12,
    "DEVMAN_ERR": 13,
    "REQUEST_FAILED": 14,
    "OLD_DEVICE_FOR_GROUP": 15,
}
ERR_STR = {
    "MDNS_ERR": "mdns-scan error.",
    "DUPLICATE_MAC": "Duplicate MAC detected. Someone might be trying to impersonate the device.",
    "DEVICE_NOT_FOUND": "Device with the provided MAC was not found.",
    "CERTIFICATE_INVALID": "AP device's certificate changed - someone might be trying to impersonate the device. Ensure that you trust this device and re-pair it.",
    "DEVICE_UNREACHABLE": "Device is unreachable or doesn't exist.",
    "DEVICE_NOT_PAIRED": "Device is not paired.",
    "CURL_ERROR": "Unexpected curl error. Check curl_code for more information.",
    "USER_NOT_FOUND": "User with the selected username not found.",
    "NEW_PW_NEEDED": "New password is needed. Please setup new password (use 'password_change' and 'password_change_confirm' options).",
    "PW_DOESNT_MATCH": "Passwords do not match ('password_change' and 'password_change_confirm' options).",
    "BULK_ERROR": "Bulk request error.",
    "AUTH_ERROR": "Device returned authorization error.",
    "DEVMAN_ERR": "Site manager daemon error.",
    "REQUEST_FAILED": "Device request failed.",
    "OLD_DEVICE_FOR_GROUP": "Device's firmware doesn't support groups. Please pair the device without adding it to a group and update it's firmware.",
}

class test_device_pairing(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        global TAP_PASSWORD
        global ORIGINAL_TAP_PASSWORD
        msg = "TAP device connected to controller device is needed for this test, skipping."
        if subprocess.run(["ping", "-c", "1", TAP_IP], capture_output=True).returncode != 0:
            return cls.skipTest(cls, msg)
        else:
            x = Env.http.request("GET", f"http://{TAP_IP}/api/info")
            if "TAP" not in x.json()["data"]["device_name"]:
                return cls.skipTest(cls, msg)
        cls.ssh = get_ssh()

        # try multiple common passwords to get tap ssh access
        try:
            cls.tap_ssh = get_custom_ssh(TAP_IP, TAP_PASSWORD, timeout=2)
            ORIGINAL_TAP_PASSWORD = TAP_PASSWORD
        except pexpect.pxssh.ExceptionPxssh as e:
            if e.value == "password refused":
                try:
                    cls.tap_ssh = get_custom_ssh(TAP_IP, "admin01", timeout=2)
                    TAP_PASSWORD = "admin01"
                    ORIGINAL_TAP_PASSWORD = TAP_PASSWORD
                except pexpect.pxssh.ExceptionPxssh as e:
                    if e.value == "password refused":
                        cls.tap_ssh = get_custom_ssh(TAP_IP, Env.password, timeout=2)
                        TAP_PASSWORD = Env.password
                        ORIGINAL_TAP_PASSWORD = TAP_PASSWORD
                    else:
                        raise e
            else:
                raise e

        cls.time_synced = False
        tap_time = int(cls.ssh.send_cmd("date +%s").strip())
        pc_time = int(time.time())
        if tap_time == pc_time or tap_time == pc_time - 1:
            cls.time_synced = True


    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()
        cls.tap_ssh.logout()

    def wait_for_network_reload(self):
        print("WAITING")
        while system("ping -c 1 " + TAP_IP) != 0:
            print("WAITING")
            pass # wait for network reload

    def pairing_response_tests(self, x, tap_device, ip_hostname, exp = None):
        x.assert_code(200)
        self.assertEqual(x.json["data"]["firmware_version"], self.tap_ssh.send_cmd("cat /etc/version").strip())
        self.assertEqual(x.json["data"]["mac"], tap_device["mac"])
        self.assertEqual(x.json["data"]["custom_name"], "TAPKE")
        self.assertIn("TAP", x.json["data"]["hostname"])
        self.assertIn("TAP", x.json["data"]["devicename"])

        if self.time_synced:
            pc_time = int(time.time())
            paired_at = int(x.json["data"]["paired_at"])
            self.assertAlmostEqual(pc_time, paired_at, delta=4) # 4 second deviation allowed
        self.assertEqual(int(x.json["data"]["paired_at"]) + (exp or REFRESH_TOKEN_EXP_SECONDS_DEFAULT), int(x.json["data"]["expires_at"]))

        platform = self.ssh.send_cmd("uci get devman_devices."+x.json["data"]["id"]+".platform").strip()
        self.assertTrue("TAP1" in platform or "TAP2" in platform)
        # self.assertEqual("1", self.ssh.send_cmd(f"""grep '{ip_hostname}' /etc/hosts | wc -l""").strip())

    def test_all_device_status_unpaired(self):
        x = self.get(ALL_DEV_STATUS_URL)
        x.assert_code(200)
        self.assertEqual(len(x.json["data"]), 1)

        tap_device = x.json["data"][0]
        self.assertEqual(tap_device["mac"].replace(":", ""), self.tap_ssh.send_cmd("mnf_info -m").strip())
        self.assertIn(tap_device["ip"][len(tap_device["ip"]) - 1], self.tap_ssh.send_cmd("ubus call network.interface.dhcp status"))
        self.assertEqual(tap_device["online"], True)
        self.assertEqual(tap_device["paired"], False)
        # self.assertEqual(tap_device["https_port"], int(self.tap_ssh.send_cmd("uci get uhttpd.main.listen_https").strip()))
        # self.assertNotIn("firmware_status", tap_device)

    def test_device_pairing(self):
        global TAP_PASSWORD, PW_CHANGED
        x = self.get(ALL_DEV_STATUS_URL)
        x.assert_code(200)
        self.assertEqual(len(x.json["data"]), 1)

        tap_device = x.json["data"][0]
        tap_ip = tap_device["ip"][len(tap_device["ip"]) - 1]
        tap_id = None
        tap_hostname = "Teltonika" + tap_device["mac"].replace(":", "")
        ip_hostname = tap_ip + " " + tap_hostname
        tap_7_4 = None

        with self.subTest("test invalid inputs"):
            x = self.post_data(PAIR_DEV_URL, {
                "mac": "FF:FF:FF:FF:FF:FF",
                "custom_name": "TAPKE"
            })
            x.assert_error("mac", ERR_STR["DEVICE_UNREACHABLE"], ERR_CODES["DEVICE_UNREACHABLE"])

            x = self.post_data(PAIR_DEV_URL, {
                "mac": tap_device["mac"],
                "custom_name": "TAPKE",
                "password": "invalid_pass"
            })
            x.assert_error("authorization", ERR_STR["AUTH_ERROR"], ERR_CODES["AUTH_ERROR"])

            x = self.post_data(PAIR_DEV_URL, {
                "mac": tap_device["mac"],
                "sfghsf": "Shsh",
                "custom_name": "TAPKE"
            })
            x.assert_error("sfghsf", "Invalid option", ResponseCodes.INVALID_OPT.val())

            x = self.post_data(PAIR_DEV_URL, {
                "mac": tap_device["mac"],
                "username": "weong",
                "password": "bonk",
                "custom_name": "TAPKE"
            })
            x.assert_error("authorization", ERR_STR["AUTH_ERROR"], ERR_CODES["AUTH_ERROR"])

            if TAP_PASSWORD == "admin01":
                x = self.post_data(PAIR_DEV_URL, {
                    "mac": tap_device["mac"],
                    "custom_name": "TAPKE",
                    "expiration_time": "3000"
                })
                x.assert_error("password_change", ERR_STR["NEW_PW_NEEDED"], ERR_CODES["NEW_PW_NEEDED"])

            x = self.post_data(PAIR_DEV_URL, {
                "mac": tap_device["mac"],
                "custom_name": "TAPKE",
                "expiration_time": "3000",
                "password": TAP_PASSWORD,
                "password_change": "Kaunastlt1",
                "password_change_confirm": "Kaunastlt2"
            })
            x.assert_error("password_change", ERR_STR["PW_DOESNT_MATCH"], ERR_CODES["PW_DOESNT_MATCH"])

        with self.subTest("test valid input - pair"):
            x = None
            if TAP_PASSWORD == "admin01":
                x = self.post_data(PAIR_DEV_URL, {
                    "mac": tap_device["mac"],
                    "custom_name": "TAPKE",
                    "expiration_time": "3000",
                    "password_change": "Kaunastlt1",
                    "password_change_confirm": "Kaunastlt1"
                })
                x.assert_code(200)
                PW_CHANGED = True
                TAP_PASSWORD = "Kaunastlt1"
            else:
                x = self.post_data(PAIR_DEV_URL, {
                    "mac": tap_device["mac"],
                    "password": TAP_PASSWORD,
                    "custom_name": "TAPKE",
                    "expiration_time": "3000"
                })
            self.pairing_response_tests(x, tap_device, ip_hostname, 3000)
            tap_7_4 = "_R_00.07.04" in x.json["data"]["firmware_version"]
            tap_id = x.json["data"]["id"]

        if tap_7_4:
            group_id = None
            with self.subTest("create group"):
                x = self.post_data(GROUPS_CFG_URL, {})
                group_id = x.json["data"]["id"]

            with self.subTest("test 7.4 device can't be added to group"):
                x = self.post_data(PAIR_DEV_URL, {
                    "mac": tap_device["mac"],
                    "password": TAP_PASSWORD,
                    "custom_name": "TAPKE",
                    "group": group_id
                })
                x.assert_error("group", ERR_STR["OLD_DEVICE_FOR_GROUP"], ERR_CODES["OLD_DEVICE_FOR_GROUP"])

                x = self.put_data(GROUPS_CFG_URL + group_id, { "devices": [tap_id] })
                x.assert_error("devices", "This device does not support groups. Please update it's firmware.", ERR_CODES["OLD_DEVICE_FOR_GROUP"])

            with self.subTest("delete group"):
                self.delete(GROUPS_CFG_URL + group_id).assert_code(200)

        with self.subTest("test paired device list"):
            x = self.get(DEV_CFG_URL)
            devname = self.tap_ssh.send_cmd("uci get system.system.routername").strip()
            if "uci:" in devname: # option was renamed in 7.5 from routername to devicename
                devname = self.tap_ssh.send_cmd("uci get system.system.devicename").strip()
            
            x.assert_data([{
                "mac": tap_device["mac"],
                "id": "1",
                "custom_name": "TAPKE",
                "devicename": devname,
                "hostname": self.tap_ssh.send_cmd("uci get system.system.hostname").strip(),
                "sync_ntp": "1",
            }], 200, [".type", "expires_at", "device_name", "paired_at"])
            self.assertIn("TAP", x.json["data"][0]["devicename"])

        with self.subTest("test if requests work when TAP IP is changed"):
            new_ip = "192.168.1.151" if tap_ip == "192.168.1.150" else "192.168.1.150"
            self.ssh.send_cmd(f"uci set devman_devices.{tap_id}.ip4addr='{new_ip}' && uci commit")
            x = self.get(STATUS_FULL_URL + "/" + tap_id)
            x.assert_code(200)

        with self.subTest("test pair default exp time"):
            x = self.post_data(PAIR_DEV_URL, {
                "mac": tap_device["mac"],
                "password": TAP_PASSWORD,
                "custom_name": "TAPKE"
            })
            self.assertEqual(int(x.json["data"]["paired_at"]) + REFRESH_TOKEN_EXP_SECONDS_DEFAULT, int(x.json["data"]["expires_at"]))
            self.pairing_response_tests(x, tap_device, ip_hostname)

        with self.subTest("test pairing when TAP IP changed"):
            # mock IP change
            # repeat twice to later check if loaded certificate is not being duplicated
            for i in range(2):
                new_ip_hostname = ("192.168.1.151" if tap_ip == "192.168.1.150" else "192.168.1.150") + " " + tap_hostname
                # self.ssh.send_cmd(f"sed -i 's/{ip_hostname}/{new_ip_hostname}/g' /etc/hosts")

                x = self.post_data(PAIR_DEV_URL, {
                    "mac": tap_device["mac"],
                    "password": TAP_PASSWORD,
                    "custom_name": "TAPKE"
                })
                self.pairing_response_tests(x, tap_device, ip_hostname)

        with self.subTest("test if loaded certificate is not being duplicated in certs file"):
            cert_file_content = self.ssh.send_cmd("cat " + CERT_FILE)
            certs = cert_file_content.split("-----BEGIN CERTIFICATE-----")
            certs.pop(0)
            for i, cert1 in enumerate(certs):
                for j, cert2 in enumerate(certs):
                    if i == j:
                        continue
                    self.assertNotEqual(cert1, cert2, "\nDuplicate certificates detected!")

        with self.subTest("test if cert file is created properly"):
            self.ssh.send_cmd("rm " + CERT_FILE)
            x = self.post_data(PAIR_DEV_URL, {
                "mac": tap_device["mac"],
                "password": TAP_PASSWORD,
                "custom_name": "TAPKE"
            })
            self.pairing_response_tests(x, tap_device, ip_hostname)

        if not tap_7_4:
            with self.subTest("change jwt expiration time"):
                self.tap_ssh.send_cmd("uci set jwt.general.expiration=2 && uci commit && /etc/init.d/uhttpd restart")
                self.tap_ssh.prompt()

        with self.subTest("test refresh token functionality"):
            exp_time = 14
            x = self.post_data(PAIR_DEV_URL, {
                "mac": tap_device["mac"],
                "password": TAP_PASSWORD,
                "custom_name": "TAPKE",
                "expiration_time": str(exp_time)
            })
            paired_at = time.time()
            self.pairing_response_tests(x, tap_device, ip_hostname, exp_time)

            dev_id = x.json["data"]["id"]
            old_jwt = None
            old_refresh = None
            if not tap_7_4:
                old_jwt = self.ssh.send_cmd(f"uci get devman_devices.{dev_id}.jwt").strip()
                old_refresh = self.ssh.send_cmd(f"uci get devman_devices.{dev_id}.refresh_token").strip()

            time.sleep(2)
            x = self.get(STATUS_FULL_URL)
            x.assert_code(200)

            # test if tokens got automatically refreshed
            if not tap_7_4:
                new_jwt = self.ssh.send_cmd(f"uci get devman_devices.{dev_id}.jwt").strip()
                new_refresh = self.ssh.send_cmd(f"uci get devman_devices.{dev_id}.refresh_token").strip()
                self.assertNotEqual(old_jwt, new_jwt)
                self.assertNotEqual(old_refresh, new_refresh)

            # test if tokens are expired
            while paired_at + exp_time > time.time():
                # wait until token expires
                time.sleep(1)
                pass
            x = self.get(STATUS_FULL_URL)
            x.assert_code(422)

            x = self.post_data(PAIR_DEV_URL, {
                "mac": tap_device["mac"],
                "password": TAP_PASSWORD,
                "custom_name": "TAPKE",
                "expiration_time": "3"
            })
            self.pairing_response_tests(x, tap_device, ip_hostname, 3)

            # test if tokens are expired
            time.sleep(4)
            x = self.get(STATUS_FULL_URL)
            x.assert_code(422)

        if not tap_7_4:
            with self.subTest("reset jwt expiration time"):
                self.tap_ssh.send_cmd("uci set jwt.general.expiration='' && uci commit && /etc/init.d/uhttpd restart")
                self.tap_ssh.prompt()

        with self.subTest("test unpairing - invalid data"):
            x = self.post_data(UNPAIR_DEV_URL, {
                "mac": "FF:FF:FF:FF:FF:FF"
            })

            x.assert_code(404)
            x.assert_error("mac", ERR_STR["DEVICE_NOT_PAIRED"], ERR_CODES["DEVICE_NOT_PAIRED"], "FF:FF:FF:FF:FF:FF")

        with self.subTest("test unpairing - valid data"):
            x = self.post_data(UNPAIR_DEV_URL, {
                "mac": tap_device["mac"],
            })
            x.assert_code(200)
            x.assert_data({
                "mac": tap_device["mac"],
            })

        with self.subTest("reset tap password if it was changed"):
            if PW_CHANGED:
                self.tap_ssh.send_cmd(f"(echo '{ORIGINAL_TAP_PASSWORD}'; sleep 1; echo '{ORIGINAL_TAP_PASSWORD}') | passwd admin >/dev/null 2>&1")
                self.tap_ssh.send_cmd(f"(echo '{ORIGINAL_TAP_PASSWORD}'; sleep 1; echo '{ORIGINAL_TAP_PASSWORD}') | passwd root >/dev/null 2>&1")
                PW_CHANGED = False

    def test_devman_config_setting(self):
        global PW_CHANGED, TAP_PASSWORD
        x = self.get(ALL_DEV_STATUS_URL)
        self.tap_device = x.json["data"][0]
        self.tap_id = None
        self.tap_7_4 = None
        orig_timezone = None

        with self.subTest("set test ntp timezone"):
            x = self.get(NTP_URL)
            x.assert_code(200)
            orig_timezone = x.json["data"]["zoneName"]            
            self.put_data(NTP_URL, { "zoneName": "Africa/Douala" }).assert_code(200)

        with self.subTest("pair test device"):
            x = None
            if TAP_PASSWORD == "admin01":
                x = self.post_data(PAIR_DEV_URL, {
                    "mac": self.tap_device["mac"],
                    "custom_name": "TAPKE",
                    "expiration_time": "3000",
                    "password_change": "Kaunastlt1",
                    "password_change_confirm": "Kaunastlt1"
                })
                x.assert_code(200)
                PW_CHANGED = True
                TAP_PASSWORD = "Kaunastlt1"
            else:
                x = self.post_data(PAIR_DEV_URL, {
                    "mac": self.tap_device["mac"],
                    "password": TAP_PASSWORD,
                    "custom_name": "TAPKE",
                    "expiration_time": "3000"
                })
            self.tap_7_4 = "_R_00.07.04" in x.json["data"]["firmware_version"]
            self.tap_id = x.json["data"]["id"]

        if self.tap_7_4:
            self.put_data(NTP_URL, { "zoneName": orig_timezone }).assert_code(200)
            self.skipTest("Only 7.5 devices supported")

        time.sleep(2)
        with self.subTest("test device status response"):
            x = self.get(ALL_DEV_STATUS_URL)
            x.assert_code(200)

            dev = copy.deepcopy(x.json["data"][0])
            del_key(dev, "mac")
            del_key(dev, "ipv6")
            del_key(dev, "firmware_status")
            del_key(dev, "expires_at")
            del_key(dev, "id")
            del_key(dev, "firmware_status_str")
            del_key(dev, "ip")
            del_key(dev, "paired_at")
            del_key(dev, "hostname")
            del_key(dev, "devicename")
            del_key(dev, "firmware_version")
            del_key(dev, "device_type")
            del_key(dev, "latest_firmware")
            self.assertEqual(dev, {
                "duplicated": False,
                "online": True,
                "paired": True,
                "custom_name": "TAPKE"
            })

            dev = copy.deepcopy(x.json["data"][0])
            self.assertIn("mac", dev)
            self.assertIn("ipv6", dev)
            self.assertIn("firmware_status", dev)
            self.assertIn("expires_at", dev)
            self.assertIn("id", dev)
            self.assertIn("firmware_status_str", dev)
            self.assertIn("ip", dev)
            self.assertIn("paired_at", dev)
            self.assertIn("hostname", dev)
            self.assertIn("devicename", dev)
            self.assertIn("firmware_version", dev)
            self.assertIn("device_type", dev)

        print("AYOOOOO")
        time.sleep(4)

        with self.subTest("test if ntp timezone is set in tap"):
            x = self.tap_ssh.send_cmd(f"api get {NTP_URL}")
            res = json.loads(x)
            self.assertEqual(res["http_body"]["data"]["zoneName"], "Africa/Douala")

        with self.subTest("reset ntp timezone"):
            self.put_data(NTP_URL, { "zoneName": orig_timezone }).assert_code(200)
            time.sleep(2)

        with self.subTest("test if ntp timezone is reset in tap"):
            x = self.tap_ssh.send_cmd(f"api get {NTP_URL}")
            res = json.loads(x)
            self.assertEqual(res["http_body"]["data"]["zoneName"], orig_timezone)



        with self.subTest("test ping reboot"):
            self.ping_reboot_tests()

# TODO: wireless fails because devman doesn't send all options
        with self.subTest("test wireless interfaces"):
            self.wireless_interfaces_tests()

# TODO: wireless fails because devman doesn't send all options
        with self.subTest("test wireless devices"):
            self.wireless_devices_tests()

# TODO: fails because devman doesnt set all options
        with self.subTest("test network interfaces"):
            self.network_interfaces_tests()

# TODO: test if everything is cleared when unpairing device

        with self.subTest("unpair test device"):
            x = self.post_data(UNPAIR_DEV_URL, {
                "mac": self.tap_device["mac"],
            })
            x.assert_code(200)
            x.assert_data({
                "mac": self.tap_device["mac"],
            })


        with self.subTest("reset tap password if it was changed"):
            if PW_CHANGED:
                self.tap_ssh.send_cmd(f"(echo '{ORIGINAL_TAP_PASSWORD}'; sleep 1; echo '{ORIGINAL_TAP_PASSWORD}') | passwd admin >/dev/null 2>&1")
                self.tap_ssh.send_cmd(f"(echo '{ORIGINAL_TAP_PASSWORD}'; sleep 1; echo '{ORIGINAL_TAP_PASSWORD}') | passwd root >/dev/null 2>&1")
                PW_CHANGED = False

    def periodic_reboot_tests(self):
        self.devman_config_test(DEVMAN_PERIODIC_REBOOT_URL, PERIODIC_REBOOT_URL,
            {
                "enable": "0",
                "action": "1",
                "period": "week",
                "time": [
                    "11:11"
                ],
                "month_day": [
                    "1"
                ],
                "months": [
                    "1"
                ],
                "force_last": "0",
                "dm_device_id": [
                    self.tap_id
                ]
            },
            {
                "enable": "0",
                "action": "1",
                "period": "month",
                "time": [
                    "12:12"
                ],
                "month_day": [
                    "2"
                ],
                "months": [
                    "2"
                ],
                "force_last": "1",
                "dm_device_id": [
                    self.tap_id
                ]
            }
        )

    def ping_reboot_tests(self):
        self.devman_config_test(DEVMAN_PING_REBOOT_URL, PING_REBOOT_URL,
            {
                "dm_device_id": [
                    self.tap_id
                ],
                "enable": "0",
                "type": "ping",
                "action": "1",
                "time": "5",
                "retry": "1",
                "time_out": "1",
                "packet_size": "1",
                "interface": "1",
                "ip_type": "ipv4"
            },
            {
                "dm_device_id": [
                    self.tap_id
                ],
                "enable": "0",
                "type": "wget",
                "action": "1",
                "time": "5",
                "retry": "1",
                "time_out": "2",
                "packet_size": "1",
                "interface": "1",
                "ip_type": "ipv4"
            }
        )

    def wireless_interfaces_tests(self):
        post_section = {
            "dm_device_id": [
                self.tap_id
            ],
            "id": "string",
            "enabled": "0",
            "device": [
                "radio0"
            ],
            "ssid": "string",
            "network": "5",
            # "hidden": "0",
            "wmm": "0",
            "encryption": "none",
            # "cipher": "auto",
            # "key": "stringst",
            # "auth_server": "1.2.3.4",
            # "auth_port": "12356",
            # "auth_secret": "string",
            # "acct_server": "1.2.3.4",
            # "acct_port": "23545",
            # "acct_secret": "string",
            # "ieee80211r": "0",
            # "nasid": "string",
            # "mobility_domain": "afaf",
            # "reassociation_deadline": "5000",
            # "ft_over_ds": "0",
            # "password": "string",
            # "macfilter": "allow",
            # "maclist": [
            #     "ff:Ff:Ff:ff:ff:ff"
            # ],
            # "isolate": "0",
            "short_preamble": "1",
            # "dtim_period": "55",
            # "wpa_group_rekey": "2",
            # "skip_inactivity_poll": "0",
            # "max_inactivity": "20",
            # "max_listen_interval": "15",
            "disassoc_low_ack": "1"
        }
        put_section = {
            "dm_device_id": [
                self.tap_id
            ],
            "id": "string",
            "enabled": "0",
            "device": [
                "radio0"
            ],
            "ssid": "string",
            "network": "5",
            # "hidden": "0",
            "wmm": "0",
            "encryption": "none",
            # "cipher": "auto",
            # "key": "stringst",
            # "auth_server": "1.2.3.4",
            # "auth_port": "12356",
            # "auth_secret": "string",
            # "acct_server": "1.2.3.4",
            # "acct_port": "23545",
            # "acct_secret": "string",
            # "ieee80211r": "0",
            # "nasid": "string",
            # "mobility_domain": "afaf",
            # "reassociation_deadline": "5000",
            # "ft_over_ds": "0",
            # "password": "string",
            # "macfilter": "allow",
            # "maclist": [
            #     "ff:Ff:Ff:ff:ff:ff"
            # ],
            # "isolate": "0",
            "short_preamble": "1",
            # "dtim_period": "55",
            # "wpa_group_rekey": "2",
            # "skip_inactivity_poll": "0",
            # "max_inactivity": "20",
            # "max_listen_interval": "15",
            "disassoc_low_ack": "1"
        }
        if "TAP100" in self.tap_device["hostname"]:
            del_key(post_section, "device")
            del_key(put_section, "device")
        self.devman_config_test(DEVMAN_WIFI_IFACES_URL, WIFI_IFACES_URL, post_section, put_section)

    def wireless_devices_tests(self):
        x = self.get(DEVMAN_WIFI_DEVICES_URL)
        print(x.json)
        devman_wifi_dev = x.json["data"].pop()
        section = {
            "use_global_settings": "0",
            # "enabled": "0",
            "channel": "5",
            "htmode": "HT40",
            "hwmode": "n",
            "country": "AU",
            "txpower": "50",
            # "legacy_rates": "0",
            # "distance": "50",
            # "frag": "300",
            # "rts": "2000",
            # "noscan": "0",
            # "beacon_int": "50",
            # "acs_exclude_dfs": "0"
        }
        section["id"] = devman_wifi_dev["id"]

        print(devman_wifi_dev)
        devman_section = None
        with self.subTest("edit devman wifi device"):
            x = self.put_data(DEVMAN_WIFI_DEVICES_URL, [section])
            print(x.json)
            devman_section = x.json["data"][0]
            x.assert_code(200)
            time.sleep(4)

        with self.subTest("check if device was edited in tap"):
            x = self.tap_ssh.send_cmd(f"api get {WIFI_DEVICES_URL}{devman_wifi_dev['radio_id']}")
            res = json.loads(x)
            del_key(res["http_body"]["data"], ".type")
            del_key(res["http_body"]["data"], "id")

            s = copy.deepcopy(devman_section)
            del_key(s, "use_global_settings")
            del_key(s, "dm_device_id")
            del_key(s, "radio_id")
            del_key(s, ".type")
            del_key(s, "id")
            self.assertEqual(res["http_body"]["data"], s)

        with self.subTest("reset wifi device to original config"):
            for key in section:
                if key not in devman_wifi_dev:
                    devman_wifi_dev[key] = ""
            if devman_wifi_dev["channel"] == "" or devman_wifi_dev["channel"] == "0": devman_wifi_dev["channel"] = "auto"
            del_key(devman_wifi_dev, "radio_id")
            del_key(devman_wifi_dev, "dm_device_id")
            print("devman_wifi_dev")
            print(devman_wifi_dev)
            x = self.put_data(DEVMAN_WIFI_DEVICES_URL, [devman_wifi_dev])
            print(x.json)
            x.assert_code(200)
            time.sleep(4)

    def network_interfaces_tests(self):
        x = self.get(DEVMAN_INTERFACES_URL)
        devman_iface = x.json["data"].pop()

        section = {
            "mode": "static+dhcp",
            "netmask": "255.255.255.0",
            "dns": [
                "1.1.1.1",
                "2.2.2.2"
            ],
        }
        section["id"] = devman_iface["id"]

        edited_s = None
        with self.subTest("edit devman interface"):
            x = self.put_data(DEVMAN_INTERFACES_URL, [section])
            x.assert_code(200)
            edited_s = x.json["data"][0]
            time.sleep(5)
            self.wait_for_network_reload()
        
        with self.subTest("check if the interface is edited in tap"):
            x = self.tap_ssh.send_cmd(f"api get {INTERFACES_URL}{devman_iface['interface_id']}")
            res = json.loads(x)

            del_key(edited_s, ".type")
            del_key(edited_s, "dm_device_id")
            del_key(edited_s, "interface_id")
            del_key(edited_s, "id")
            del_key(res["http_body"]["data"], ".type")
            del_key(res["http_body"]["data"], "id")

            print(res["http_body"]["data"])
            print(edited_s)
            self.assertEqual(res["http_body"]["data"], edited_s)


        with self.subTest("reset devman interface to original cfg"):
            s = copy.deepcopy(devman_iface)            
            del_key(s, ".type")
            del_key(s, "dm_device_id")
            del_key(s, "interface_id")
            for key in section:
                if key not in s:
                    s[key] = ""

            x = self.put_data(DEVMAN_INTERFACES_URL, [s])
            x.assert_code(200)
            edited_s = x.json["data"][0]
            time.sleep(5)
            self.wait_for_network_reload()

            x = self.tap_ssh.send_cmd(f"api get {INTERFACES_URL}{devman_iface['interface_id']}")
            res = json.loads(x)

            del_key(res["http_body"]["data"], ".type")
            del_key(res["http_body"]["data"], "id")
            del_key(edited_s, "id")
            del_key(edited_s, ".type")
            del_key(edited_s, "dm_device_id")
            del_key(edited_s, "interface_id")

            print(res["http_body"]["data"])
            print(edited_s)
            # TODO: fails because devman doesnt set all options
            self.assertEqual(res["http_body"]["data"], edited_s)

    def devman_config_test(self, DEVMAN_URL, TAP_URL, section_post, section_put):
        sid = None

        with self.subTest("create section"):
            x = self.post_data(DEVMAN_URL, section_post)
            print(x.json)
            del_key(section_post, "dm_device_id")
            sid = x.json["data"]["id"]
            time.sleep(2)

        with self.subTest("check if section is created in child device"):
            x = self.tap_ssh.send_cmd(f"api get {TAP_URL}{sid}")
            res = json.loads(x)
            del_key(res["http_body"]["data"], ".type")
            del_key(res["http_body"]["data"], "ft_psk_generate_local")
            section_post["id"] = sid
            self.assertEqual(res["http_body"]["data"], section_post)

        with self.subTest("edit section"):
            section_put["id"] = sid
            x = self.put_data(DEVMAN_URL, [section_put])
            print(x.json)
            x.assert_code(200)
            time.sleep(2)

        with self.subTest("check if section is edited in child device"):
            x = self.tap_ssh.send_cmd(f"api get {TAP_URL}{sid}")
            res = json.loads(x)
            print(res)
            del_key(res["http_body"]["data"], ".type")
            del_key(res["http_body"]["data"], "ft_psk_generate_local")
            del_key(section_put, "dm_device_id")
            self.assertEqual(res["http_body"]["data"], section_put)

        with self.subTest("delete section"):
            x = self.delete(DEVMAN_URL + sid)
            x.assert_code(200)
            time.sleep(2)

        with self.subTest("check if section is deleted in child device"):
            x = self.tap_ssh.send_cmd(f"api get {TAP_URL}{sid}")
            res = json.loads(x)
            self.assertEqual(res["http_code"], 404)
