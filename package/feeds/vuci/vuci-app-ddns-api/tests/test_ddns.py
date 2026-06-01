import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes
from utils.ssh import get_ssh
from time import sleep

RC = codes.ResponseCodes

class test_ddns(util.WrapTest):
    base_url = "/ddns"

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()
        providers = cls.ssh.send_cmd('cat /etc/ddns/services | awk \'/^[^#]/ {gsub(/"/, " "); print $1, $2}\'').strip()
        cls.providers = dict(x.split(" ") for x in providers.split("\r\n"))

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def test_ddns_base_functionality(self):
        with self.subTest("create_section"):
            x = self.post_data(self.base_url + "/config", {
                "enabled": "0",
                "service_name": "dyn.com",
                "domain": "yourhost.example.com",
                "lookup_host": "yourhost.example.com",
                "password": "your_password",
                "use_https": "0",
                "id": "testDns",
                "ip_source": "network",
                "username": "your_username",
                "check_interval": "10,minutes",
                "force_interval": "10,hours",
                "interface": "wan"
            })
            x.assert_data({
                "enabled": "0",
                ".type": "service",
                "service_name": "dyn.com",
                "domain": "yourhost.example.com",
                "lookup_host": "yourhost.example.com",
                "password": "your_password",
                "use_https": "0",
                "id": "testDns",
                "ip_source": "network",
                "username": "your_username",
                "check_interval": "10,minutes",
                "force_interval": "10,hours",
                "interface": "wan"
            }, 201)
        with self.subTest("update_section"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "enabled": "1",
                "interface": "wan",
                "domain": "example.com",
                "lookup_host": "example.com",
                "password": "pass",
                "username": "username",
                "check_interval": "15,minutes",
                "force_interval": "5,hours",
            })
            x.assert_data({ 
                "enabled": "1",
                ".type": "service",
                "service_name": "dyn.com",
                "domain": "example.com",
                "lookup_host": "example.com",
                "password": "pass",
                "use_https": "0",
                "id": "testDns",
                "ip_source": "network",
                "username": "username",
                "check_interval": "15,minutes",
                "force_interval": "5,hours",
                "interface": "wan"
            })
            self.assertIn({
                "message": "DNS rebind protection is enabled. It is recommended to disable rebind protection when using DDNS in a private network.",
                "code": 1
                }, x.json["messages"])
        with self.subTest("check_rebind_protection_on"):
            x = self.get("/dns/config")
            resp = x.resp.json()
            rebind_protection = resp["data"][0]["rebind_protection"]
            self.assertEqual(rebind_protection, "1")
        with self.subTest("get_section"):
            x = self.get(self.base_url + "/config/testDns")
            x.assert_data({ 
                "enabled": "1",
                ".type": "service",
                "service_name": "dyn.com",
                "domain": "example.com",
                "lookup_host": "example.com",
                "password": "pass",
                "use_https": "0",
                "id": "testDns",
                "ip_source": "network",
                "username": "username",
                "check_interval": "15,minutes",
                "force_interval": "5,hours",
                "interface": "wan"
            })
        with self.subTest("missing_service_name"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "service_name": ""
            })
            x.assert_error("enabled", "missing required option: update_url or service_name", RC.INVALID_OPT.val())
        with self.subTest("cloudflare_missing_authentication_type"):
            if not "cloudflare.com-v4" in self.providers:
                self.skipTest("No cloudflare provider")
            x = self.put_data(self.base_url + "/config/testDns", {
                "service_name": "cloudflare.com-v4"
            })
            x.assert_error("enabled", "missing required option: cloudflare_authentication_type", RC.INVALID_OPT.val())
        with self.subTest("invalid_username_email"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "cloudflare_authentication_type": "emailAPI",
                "interface": "wan"
            })
            x.assert_error("username", "A valid email address is accepted. E.g. example@domain.com", RC.INVALID_OPT.val())
        with self.subTest("empty_username_email"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "cloudflare_authentication_type": "emailAPI",
                "interface": "wan",
                "username": ""
            })
            x.assert_data({ 
                "enabled": "1",
                ".type": "service",
                "cloudflare_authentication_type": "emailAPI",
                "service_name": "dyn.com",
                "domain": "example.com",
                "lookup_host": "example.com",
                "password": "pass",
                "use_https": "0",
                "id": "testDns",
                "ip_source": "network",
                "check_interval": "15,minutes",
                "force_interval": "5,hours",
                "interface": "wan",
            })
        with self.subTest("check_bearer_username"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "cloudflare_authentication_type": "bearer",
                "interface": "wan"
            })
            x.assert_data({ 
                "enabled": "1",
                ".type": "service",
                "cloudflare_authentication_type": "bearer",
                "service_name": "dyn.com",
                "domain": "example.com",
                "lookup_host": "example.com",
                "password": "pass",
                "use_https": "0",
                "id": "testDns",
                "ip_source": "network",
                "check_interval": "15,minutes",
                "force_interval": "5,hours",
                "interface": "wan",
                "username": "Bearer",
            })
        with self.subTest("invalid_service_name"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "service_name": "invalid.com"
            })
            if (x.json["errors"][0]["error"] and x.json["errors"][0]["source"] == "service_name" and
                not "Must be one of the following values" in x.json["errors"][0]["error"]):
                self.assertFalse(x.resp.status_code, "Expected error message that 'service_name' option is invalid.")
        with self.subTest("invalid_check_interval"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "check_interval": "1,minute",
            })
            x.assert_error(
                "check_interval",
                "Option is invalid, accepted format: 'time_amount,time_unit' ('time_unit' can be 'seconds', 'minutes' or 'hours')",
                RC.INVALID_OPT.val()
            )

            x = self.put_data(self.base_url + "/config/testDns", {
                "check_interval": "1.minute",
            })
            x.assert_error(
                "check_interval",
                "Option is invalid, accepted format: 'time_amount,time_unit' ('time_unit' can be 'seconds', 'minutes' or 'hours')",
                RC.INVALID_OPT.val()
            )

            x = self.put_data(self.base_url + "/config/testDns", {
                "check_interval": "0,minutes",
            })
            x.assert_error(
                "check_interval",
                "Value must be an integer and range of the value must be from 5 to 600000.",
                RC.INVALID_OPT.val()
            )
        with self.subTest("invalid_force_interval"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "force_interval": "1,minute",
            })
            x.assert_error(
                "force_interval",
                "Option is invalid, accepted format: 'time_amount,time_unit' ('time_unit' can be 'minutes', 'hours' or 'days')",
                RC.INVALID_OPT.val()
            )

            x = self.put_data(self.base_url + "/config/testDns", {
                "force_interval": "1.minute",
            })
            x.assert_error(
                "force_interval",
                "Option is invalid, accepted format: 'time_amount,time_unit' ('time_unit' can be 'minutes', 'hours' or 'days')",
                RC.INVALID_OPT.val()
            )

            x = self.put_data(self.base_url + "/config/testDns", {
                "force_interval": "0,minutes",
            })
            x.assert_error(
                "force_interval",
                "Value must be an integer and range of the value must be from 5 to 600000.",
                RC.INVALID_OPT.val()
            )

            x = self.put_data(self.base_url + "/config/testDns", {
                "force_interval": "5,minutes",
            })
            x.assert_error(
                "force_interval",
                "Force interval must be greater or equal to Check Interval",
                RC.INVALID_OPT.val()
            )
        with self.subTest("invalid_check_interval_force_interval"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "check_interval": "5,minutes",
                "force_interval": "4,minutes"
            })
            x.assert_error(
                "check_interval",
                "Force interval must be greater or equal to Check Interval",
                RC.INVALID_OPT.val()
            )

            x = self.put_data(self.base_url + "/config/testDns", {
                "check_interval": 1,
                "force_interval": "10,minutes"
            })
            x.assert_error(
                "check_interval",
                "Value must be a string",
                RC.INVALID_OPT.val()
            )

            x = self.put_data(self.base_url + "/config/testDns", {
                "check_interval": "5,minutes",
                "force_interval": 1
            })
            x.assert_error(
                "force_interval",
                "Value must be a string",
                RC.INVALID_OPT.val()
            )
        with self.subTest("check_empty_check_interval_force_interval"):
            x = self.put_data(self.base_url + "/config/testDns", {
                "check_interval": "",
                "force_interval": ""
            })
            x.assert_data({
                "enabled": "1",
                ".type": "service",
                "cloudflare_authentication_type": "bearer",
                "service_name": "dyn.com",
                "domain": "example.com",
                "lookup_host": "example.com",
                "password": "pass",
                "use_https": "0",
                "id": "testDns",
                "ip_source": "network",
                "username": "Bearer",
                "interface": "wan"
            })
        with self.subTest("delete_section"):
            x = self.delete(self.base_url + "/config/testDns")
            x.assert_data({
                "id": "testDns"
            })

    def test_ddns_actions(self):
        with self.subTest("enable_ddns"):
            x = self.put_data(self.base_url + "/config/myddns", {
                "enabled": "1"
            })
            x.assert_code(200)
        with self.subTest("get_status_enabled"):
            x = self.get(self.base_url + "/status/myddns")
            attempt_limit=30
            attempt_count=0
            while not x.resp.json()["data"]["is_up"] and attempt_count < attempt_limit:
                x = self.get(self.base_url + "/status/myddns")
                attempt_count += 1
                sleep(3)

            x.assert_data({
                "datenext": "_neverupdated_",
                "datelast": "_never_",
                "datelaststat": "Never",
                "iface": "IPv4 / wan",
                "section": "myddns",
                "is_up": True,
                "lookup": "yourhost.example.com"
            })
        with self.subTest("disable_ddns"):
            x = self.put_data(self.base_url + "/config/myddns", {
                "enabled": "0"
            })
            x.assert_code(200)
        with self.subTest("get_status"):
            x = self.get(self.base_url + "/status/myddns")
            attempt_limit=30
            attempt_count=0
            while x.resp.json()["data"]["is_up"] and attempt_count < attempt_limit:
                x = self.get(self.base_url + "/status/myddns")
                attempt_count += 1
                sleep(3)
            x.assert_data({
                "datenext": "_neverupdated_",
                "datelast": "_never_",
                "datelaststat": "Never",
                "iface": "IPv4 / wan",
                "section": "myddns",
                "is_up": False,
                "lookup": "yourhost.example.com"
            })
        with self.subTest("get_status_invalid_section"):
            x = self.get(self.base_url + "/status/test")
            x.assert_error("URL", "Section not found.", RC.INVALID_SECTION.val())
        with self.subTest("get_status_all"):
            x = self.get(self.base_url + "/status")
            x.assert_data([{
                "datenext": "_neverupdated_",
                "datelast": "_never_",
                "datelaststat": "Never",
                "iface": "IPv4 / wan",
                "section": "myddns",
                "is_up": False,
                "lookup": "yourhost.example.com"
            }])
        with self.subTest("check_options_service_providers"):
            x = self.get(self.base_url + "/options")
            resp = x.resp.json()["data"]
            info = resp["service_providers"]

            for key, value in info.items():
                self.assertTrue(value == self.providers[key], key)
        with self.subTest("check_options_env_info"):
            x = self.get(self.base_url + "/options")
            resp = x.resp.json()["data"]
            info = resp["env_info"]

            ssh_env_info = {
                "has_hostip": self.ssh.send_cmd("which hostip >/dev/null 2>&1; echo $?").strip() == "0",
                "has_fetch": self.ssh.send_cmd("which uclient-fetch >/dev/null 2>&1; echo $?").strip() == "0",
                "has_curl": self.ssh.send_cmd("which curl >/dev/null 2>&1; echo $?").strip() == "0",
                "has_curlssl": self.ssh.send_cmd('$(which curl) -V 2>&1 | grep "Protocols:" | grep -qF "https"; echo $?').strip() != "0",
                "has_wgetssl": self.ssh.send_cmd("which wget-ssl >/dev/null 2>&1; echo $?").strip() == "0",
                "has_fetchssl": self.ssh.send_cmd("ls /lib/libustream-ssl.so >/dev/null 2>&1; echo $?").strip() == "0",
                "has_bbwget": self.ssh.send_cmd('$(which wget) -V 2>&1 | grep -iqF "busybox"; echo $?').strip() == "0",
                "has_nslookup": self.ssh.send_cmd('$(which nslookup) localhost 2>&1 | grep -qF "(null)"; echo $?').strip() != "0",
                "has_bindhost": self.ssh.send_cmd('which host >/dev/null 2>&1; echo $?').strip() == "0" or
                                self.ssh.send_cmd('which khost >/dev/null 2>&1; echo $?').strip() == "0" or
                                self.ssh.send_cmd('which drill >/dev/null 2>&1; echo $?').strip() == "0",
                "has_ipv6": self.ssh.send_cmd("ls /proc/net/ipv6_route >/dev/null 2>&1; echo $?").strip() == "0" and
                            self.ssh.send_cmd("ls /usr/sbin/ip6tables >/dev/null 2>&1; echo $?").strip() == "0",
                "has_cacerts": self.ssh.send_cmd("ls /etc/ssl/certs/ca-certificates.crt >/dev/null 2>&1; echo $?").strip() == "0",
            }

            ssh_env_info["has_ssl"] = True if ssh_env_info["has_wgetssl"] or ssh_env_info["has_curlssl"] or (ssh_env_info["has_fetch"] and ssh_env_info["has_fetchssl"]) else False
            ssh_env_info["has_proxy"] = True if ssh_env_info["has_wgetssl"] or ssh_env_info["has_curlssl"] or ssh_env_info["has_fetch"] or ssh_env_info["has_bbwget"] else False
            ssh_env_info["has_forceip"] = True if ssh_env_info["has_wgetssl"] or ssh_env_info["has_curlssl"] or ssh_env_info["has_fetch"] else False
            ssh_env_info["has_bindnet"] = True if ssh_env_info["has_curl"] or ssh_env_info["has_wgetssl"] else False
            ssh_env_info["has_dnsserver"] = True if ssh_env_info["has_bindhost"] or ssh_env_info["has_hostip"] or ssh_env_info["has_nslookup"] else False

            for key, value in ssh_env_info.items():
                self.assertTrue(value == info[key], key)
