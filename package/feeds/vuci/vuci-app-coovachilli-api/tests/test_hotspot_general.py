import sys
from utils.ssh import get_ssh, assert_process_starts
import response_codes as codes
import utility_integration as util
from utils.general_api import is_package_installed
import time
sys.path.append("../../../../tests")

RC = codes.ResponseCodes

ERROR_CODES = {
	"SUBNET_EXISTS": 1,
	"INCORRECT_FILE": 2,
	"NOT_EXISTS_FILE": 4,
}

class test_hotspot(util.WrapTest):
    url_firewall_rules = "/firewall/traffic_rules/config"
    url_firewall_zones = "/firewall/zones/config"
    url_wireless = "/wireless/interfaces/config"
    url_general = "/hotspot"
    url = f"{url_general}/config"


    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()


    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()


    def setUp(self):
        if not is_package_installed(self, "hotspot"):
            self.skipTest("Hotspot package is not installed")


    def create_interface(self, ifname: str, name: str = "lanhs", enabled: str = "1"):
        self.ssh.send_cmd(f"ip link add {ifname} type ifb")
        self.ssh.send_cmd(f"ip link {ifname} up")
        response = self.post_data("/interfaces/config", {
            "name": name,
            "area_type": "lan",
            "ifname": [ ifname ],
            "enabled": enabled,
            "ipaddr": "192.168.123.123",
            "bridge": "1",
            "delegate": "1",
            "force_link": "1"
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]


    def delete_interface(self, id: str, ifname: str):
        self.delete(f"/interfaces/config/{id}").assert_code(200)
        self.ssh.send_cmd(f"ip link delete {ifname}")


    def create_config(self, mode: str = "local", network: str = "lan", options = None):
        data = {
            "mode": mode,
            "network": network
        }
        if options:
            data.update(options)

        response = self.post_data(self.url, data)
        response.assert_code(201)
        return response.resp.json()["data"]["id"]


    def delete_config(self, id: str):
        self.delete(f"{self.url}/{id}").assert_code(200)


    def test_crud_basic(self):
        self.crud_test(self.url, {
            "uamport": "3990",
            "withchallenge": "1",
            "mode": "local",
            "success": "uam",
            "uamlogoutip": "1.0.0.0",
            "enabled": "0",
            ".type": "chilli",
            "network": "lan",
            "radiusauthport": "1812",
            "radiusacctport": "1813",
            "protocol": "http",
            "landingpage": "int",
            "dns2": "8.8.4.4",
            "dns1": "8.8.8.8",
            "mac_blocking": "0",
            "noc2c": "1",
            "radiusrequiremessageauth": "1"
        }, {
            "uamport": "4990",
            "withchallenge": "1",
            "mode": "local",
            "success": "uam",
            "uamlogoutip": "1.1.1.0",
            "enabled": "0",
            ".type": "chilli",
            "network": "lan",
            "radiusauthport": "1912",
            "radiusacctport": "1913",
            "protocol": "http",
            "landingpage": "int",
            "dns2": "8.8.4.4",
            "dns1": "1.1.1.1",
            "mac_blocking": "0",
            "noc2c": "1",
            "radiusrequiremessageauth": "1"
        }, ["net", "uamlisten"])


    def test_validations(self):
        with self.subTest("uamlisten_validation"):
            x = self.post_data(self.url, {
                "network": "lan",
                "uamlisten": "::1234:5678"
            })
            x.assert_error("uamlisten", "IPv4 addresses are accepted. E.g. 192.168.1.1 .", RC.INVALID_OPT.val())

            x = self.post_data(self.url, {
                "network": "lan",
                "net": "192.168.5.1/24",
                "uamlisten": "192.168.6.254"
            })
            x.assert_error("uamlisten", "IP Address should be in the range of Hotspot network", RC.INVALID_OPT.val())
        with self.subTest("net_validation"):
            x = self.post_data(self.url, {
                "network": "lan",
                "net": "random_text"
            })
            x.assert_error("net", "IPv4 addresses with netmask are accepted. E.g. 192.168.1.1/24 .", RC.INVALID_OPT.val())

            x = self.post_data(self.url, {
                "network": "lan",
                "net": "192.168.5.1/12"
            })
            x.assert_error("net", "Netmask must be from 16 to 30", RC.INVALID_OPT.val())
        with self.subTest("array_validation"):
            check_options = ["net", "uamlisten"]
            for option in check_options:
                x = self.post_data(self.url, {
                    "network": "lan",
                    "enabled": "1",
                    option: ["test1", "test2"]
                })
                x.assert_error(option, "Option does not accept an array", RC.INVALID_OPT.val())
        with self.subTest("enabled_validation"):
            x = self.get("/interfaces/config")
            x.assert_code(200)

            lan_ip = None
            for section in x.resp.json()["data"]:
                if section["id"] == "lan":
                    lan_ip = section["ipaddr"]
                    break

            x = self.post_data(self.url, {
                "network": "lan",
                "enabled": "1",
                "net": f"{lan_ip}/24",
            })
            x.assert_error("enabled", "To enable the hotspot please create at least one user when authentication is set to local users.", RC.INVALID_OPT.val())

            x = self.post_data(self.url, {
                "network": "lan",
                "enabled": "1",
                "net": f"{lan_ip}/24",
                "mode": "mac_auth",
            })
            x.assert_error("lan", "Hotspot network subnet is already being used by lan interface.", 1)


    def test_base_functionality(self):
        sid = None
        with self.subTest("create_interface"):
            sid = self.create_config()
        with self.subTest("instance_limitation"):
            hs_sections = []
            iface_sections = []
            limit_count = self.ssh.send_cmd("cat /etc/chilli/limit").strip()
            for _ in range(int(limit_count)):
                x = self.post_data("/interfaces/config", {
                    "area_type": "lan"
                })
                x.assert_code(201)
                iface = x.resp.json()["data"]["name"]
                iface_sections.insert(0, x.resp.json()["data"]["id"])
                x = self.post_data(self.url, {
                    "network": iface
                })
                if x.resp.status_code == 201:
                    hs_sections.insert(0, x.resp.json()["data"]["id"])
            for val in hs_sections:
                self.delete(f"{self.url}/{val}").assert_code(200)
            for val in iface_sections:
                self.delete(f"/interfaces/config/{val}").assert_code(200)
            x.assert_error("Validation", f"Only {limit_count} {'instances' if int(limit_count) > 1 else 'instance'} can be created.", 5)
        with self.subTest("enable_local_users_validation"):
            x = self.put_data(f"{self.url}/{sid}", {
                "enabled": "1"
            })
            x.assert_error(
                "enabled",
                "To enable the hotspot please create at least one user when authentication is set to local users.",
                RC.INVALID_OPT.val()
            )
        with self.subTest("enable_network_validation"):
            x = self.put_data(f"{self.url}/{sid}", {
                "enabled": "1",
                "mode": "mac_auth",
                "net": f"{util.Env().ip}/24",
                "uamlisten": util.Env().ip
            })
            x.assert_error(
                "lan",
                "Hotspot network subnet is already being used by lan interface.",
                ERROR_CODES["SUBNET_EXISTS"]
            )
        with self.subTest("ip_range_validation"):
            x = self.put_data(f"{self.url}/{sid}", {
                "net": "192.168.5.0/24",
                "uamlisten": "192.168.6.254"
            })
            x.assert_error(
                "uamlisten",
                "IP Address should be in the range of Hotspot network",
                RC.INVALID_OPT.val()
            )
            x = self.put_data(f"{self.url}/{sid}", {
                "net": "192.168.0.0/20",
                "uamlisten": "192.168.6.254"
            })
            x.assert_data({
                ".type": "chilli",
                "landingpage": "int",
                "mode": "local",
                "protocol": "http",
                "success": "uam",
                "dns1": "8.8.8.8",
                "dns2": "8.8.4.4",
                "enabled": "0",
                "id": sid,
                "network": "lan",
                "radiusacctport": "1813",
                "radiusauthport": "1812",
                "net": "192.168.0.0/20",
                "uamlisten": "192.168.6.254",
                "uamlogoutip": "1.0.0.0",
                "uamport": "3990",
                "withchallenge": "1",
                "mac_blocking": "0",
                "noc2c": "1",
                "radiusrequiremessageauth": "1"
            })
        with self.subTest("uamdomainfile_validation"):
            x = self.put_data(f"{self.url}/{sid}", {
                "uamdomainfile": "test\nab c",
            })
            x.assert_error(
                "uamdomainfile",
                "Domain names are accepted. E.g. example.com .",
                RC.INVALID_OPT.val()
            )
        with self.subTest("userscripts_validation"):
            x = self.put_data(f"{self.url}/{sid}", {
                "conup": "test"
            })
            x.assert_error("conup", "File content must start with #!/bin/sh", RC.INVALID_OPT.val() )
            x = self.put_data(f"{self.url}/{sid}", {
                "condown": "test"
            })
            x.assert_error("condown", "File content must start with #!/bin/sh", RC.INVALID_OPT.val() )
            x = self.put_data(f"{self.url}/{sid}", {
                "usersignup": "test"
            })
            x.assert_error("usersignup", "File content must start with #!/bin/sh", RC.INVALID_OPT.val() )
        with self.subTest("delete_interface"):
            self.delete_config(sid)


    def test_process_running(self):
        x = self.get(self.url_wireless)
        if not x.resp.status_code == 200:
            self.skipTest("Requires wireless")

        sid = None
        with self.subTest("enable_instance"):
            with assert_process_starts(self, "chilli"):
                sid = self.create_config("mac_auth", x.resp.json()["data"][0]["wifi_id"], {"enabled": "1"})
        with self.subTest("check_status"):
            x = self.get(f"{self.url_general}/status")
            x.assert_data({
                "enabled": "1"
            }, 200, ["rx_bytes", "tx_bytes"])
        with self.subTest("check_firewall_zone"):
            x = self.get(self.url_firewall_zones)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "hotspot":
                    found = True
                    self.assertEqual(section["input"], "REJECT")
                    self.assertEqual(section["output"], "ACCEPT")
                    self.assertEqual(section["forward"], "REJECT")
            if not found:
                self.fail("Firewall zone is not created")
        with self.subTest("check_firewall_rule"):
            x = self.get(self.url_firewall_rules)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "Hotspot_input":
                    found = True
                    self.assertEqual(section["target"], "ACCEPT")
                    self.assertEqual(section["src"], "hotspot")
                    self.assertEqual(section["dest_port"], ['53', '67', '68', '81', '444', '1813', '3990', '1812', '3991'])
                    self.assertEqual(section["enabled"], "1")
            if not found:
                self.fail("Firewall rule is not created")
        with self.subTest("delete_instance"):
            self.delete_config(sid)
        with self.subTest("deleted_firewall_zone"):
            x = self.get(self.url_firewall_zones)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "hotspot":
                    found = True
            if found:
                self.fail("Firewall zone is not deleted")
        with self.subTest("deleted_firewall_rule"):
            x = self.get(self.url_firewall_rules)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "Hotspot_input":
                    found = True
            if found:
                self.fail("Firewall rule is not deleted")


    def test_configuration_profiles(self):
        with self.subTest("check_profiles"):
            res = self.ssh.send_cmd("ls -l /etc/chilli/configs/ | awk '{print $9}'")
            for profile in res.strip().split("\r\n"):
                x = self.get(f"{self.url_general}/options/{profile}")
                x.assert_code(200)


    def test_mac_blocking(self):
        sid = None
        with self.subTest("create_instance"):
            sid = self.create_config()
        with self.subTest("enable_mac_blocking"):
            res = self.ssh.send_cmd("uci get ip_blockd.ip_blockd.enable_mac_filter")
            if res.strip() != "0":
                self.fail("Mac filter already set to '1'")

            x = self.put_data(f"{self.url}/{sid}", {
                "mac_blocking": "1"
            })

            x.assert_data({
                "protocol":"http",
                "uamport":"3990",
                "withchallenge":"1",
                "radiusrequiremessageauth":"1",
                "mode":"local",
                "uamlogoutip":"1.0.0.0",
                "enabled":"0",
                "network":"lan",
                "radiusauthport":"1812",
                "radiusacctport":"1813",
                ".type":"chilli",
                "id":sid,
                "success":"uam",
                "noc2c":"1",
                "dns2":"8.8.4.4",
                "mac_blocking":"1",
                "dns1":"8.8.8.8",
                "landingpage":"int"
            }, 200, ["uamlisten", "net"])

            res = self.ssh.send_cmd("uci get ip_blockd.ip_blockd.enable_mac_filter")
            if res.strip() != "1":
                self.fail("IP Block configuration did not update")
        with self.subTest("delete_instance"):
            self.delete_config(sid)

            res = self.ssh.send_cmd("uci get ip_blockd.ip_blockd.enable_mac_filter")
            if res.strip() != "0":
                self.fail("IP Block configuration did not update")


    def find_session_current(self, client_ip: str, timeout: int = 60):
        for _ in range(timeout):
            try:
                info = self.ssh.ubus_call("chilli", "list")
                if len(info.get("sessions", [])) > 0:
                    matching_session = next(
                        (
                            session
                            for session in info.get("sessions", [])
                            if session.get("ipAddress") == client_ip
                        ),
                        None,
                    )
                    if not matching_session is None:
                        return matching_session
            except:
                pass
            time.sleep(1)
        return None


    def find_last_session_history(self, client_ip: str, iface_mac: str = None):
        x = self.get(f"{self.url_general}/user_management/status")
        x.assert_code(200)

        data = x.resp.json().get("data", [])
        if len(data) == 0:
            return None

        matching_session = next(
            (
                session
                for session in reversed(data)
                if session.get("ipAddress") == client_ip and (iface_mac is None or session.get("macAddress") == iface_mac)
            ),
            None,
        )
        return matching_session


    def create_session(self, iface_sid: str, client_ip: str, timeout=60):
        session = None
        for _ in range(timeout):
            self.ssh.send_cmd(f"udhcpc -i br-{iface_sid} -t 1 -n -r {client_ip}")
            session = self.find_session_current(client_ip)
            if not session is None:
                return
            time.sleep(1)

        self.assertIsNotNone(session)
        self.assertFalse(session.get("clientState"))


    def auth_session(self, client_ip: str, method: str = "login", success: bool = True, username: str = None, password: str = None):
        cmd = f"chilli_query {method} ip {client_ip}"
        if username:
            cmd += f" username {username}"
        if password:
            cmd += f" password {password}"
        self.ssh.send_cmd(cmd)

        session = self.find_session_current(client_ip)
        self.assertIsNotNone(session)
        self.assertTrue(session.get("clientState") == success)

        session = self.find_last_session_history(client_ip)
        self.assertIsNotNone(session)
        self.assertTrue(session.get("clientState") == success)


    def logout_session(self, mac: str):
        x = self.post_data(f"{self.url_general}/user_management/actions/logout_user", {
            "macaddress": mac
        })
        x.assert_code(200)


    def check_chilli_up(self, timeout=60):
        for _ in range(timeout):
            if self.ssh.send_cmd("pgrep /usr/sbin/chilli").strip() != "":
                return True
            time.sleep(1)
        return False


    def get_expected_session_parameters(self, iface_sid, username, new_limits = None):
        if new_limits is None:
            new_limits = self.get_group_config_first_section()
        return {
            "idleTimeout": int(new_limits.get("defidletimeout", "0")),
            "sessionTimeout": int(new_limits.get("defsessiontimeout", "0")),
            "maxInputOctets": int(new_limits.get("downloadlimit", "0")) * 1_000_000,
            "maxOutputOctets": int(new_limits.get("uploadlimit", "0")) * 1_000_000,
            "maxDwBandwidth": int(new_limits.get("downloadbandwidth", "0")) * 1_000_000,
            "maxUpBandwidth": int(new_limits.get("uploadbandwidth", "0")) * 1_000_000,
            "userName": username
        }


    def assert_session_parameters(self, session, expected_values):
        for key, expected in expected_values.items():
            self.assertEqual(session.get("session", {}).get(key, 0), expected, f"{key} mismatch.")


    def wait_for_file(self, filepath, timeout=60):
        for _ in range(timeout):
            if self.ssh.send_cmd(f"test -e {filepath}; echo $?").strip() == "0":
                return True
            time.sleep(1)
        return False


    def get_iface_mac(self, iface_sid):
        return self.ssh.send_cmd(f"cat /sys/class/net/br-{iface_sid}/address").strip().replace(":", "-").upper()


    def get_logs_last_entry(self):
        x = self.get(f"{self.url_general}/logs/status")
        x.assert_code(200)
        data = x.resp.json().get("data", [])
        self.assertGreater(len(data), 0, "The 'data' field in the response is empty or missing.")
        return data[-1]


    def get_group_config_first_section(self):
        x = self.get(f"{self.url_general}/groups/config")
        x.assert_code(200)

        data = x.resp.json().get("data", [])
        self.assertGreater(len(data), 0, "The 'data' field in the response is empty or missing.")
        return data[0]


    def get_group_id(self):
        section = self.get_group_config_first_section()
        group_id = section.get("id")
        self.assertIsNotNone(group_id, "Group ID not found in configuration.")
        return group_id


    def setup_auth_test(self, auth_mode):
        client_ip = "192.168.2.1"
        user_sid = None
        username = None
        password = None

        if auth_mode == "local":
            username = "test"
            password = "test"

        if username and password:
            x = self.post_data(f"{self.url_general}/users/config", {
                "username": username,
                "password": password
            })
            x.assert_code(201)
            user_sid = x.resp.json()["data"]["id"]

        iface_sid = self.create_interface("hsiface", "lanhs")
        self.assertIsNotNone(iface_sid, "Failed to create interface.")
        time.sleep(10)

        cfg_sid = self.create_config(auth_mode, "lanhs", {
            "enabled": "1",
            "conup": "#!/bin/sh\ntouch /tmp/hs_session_up",
            "condown": "#!/bin/sh\ntouch /tmp/hs_session_down",
            "net": "192.168.2.0/24",
            "uamlisten": "192.168.2.254"
        })
        self.assertTrue(self.check_chilli_up(), "Chilli service is not running.")

        if auth_mode == "mac_auth":
            username = self.get_iface_mac(iface_sid)

        data = {
            "iface_sid": iface_sid,
            "cfg_sid": cfg_sid,
            "user_sid": user_sid,
            "client_ip": client_ip,
            "username": username,
            "password": password
        }
        return data


    def setup_session_creation(self, auth_mode, data):
        self.assertTrue(self.check_chilli_up(), "Chilli service is not running.")

        self.create_session(data.get("iface_sid"), data.get("client_ip"))

        if data.get("username") and data.get("password"):
            invalid_creds = [("test", "wrong_pass"), ("wrong_user", "test")]
            for invalid_username, invalid_password in invalid_creds:
                with self.subTest(f"{auth_mode}_invalid_login_{invalid_username}_{invalid_password}"):
                    self.auth_session(data.get("client_ip"), "login", False, invalid_username, invalid_password)

        with self.subTest(f"{auth_mode}_valid_login"):
            self.ssh.send_cmd("rm -f /tmp/hs_session_up")
            self.auth_session(data.get("client_ip"), "login", True, data.get("username"), data.get("password"))
            self.assertTrue(self.wait_for_file("/tmp/hs_session_up"), "Conup script not executed after login.")

        with self.subTest(f"{auth_mode}_after_login_check_logs"):
            mac = self.get_iface_mac(data.get("iface_sid"))
            entry = self.get_logs_last_entry()

            self.assertEqual(entry.get("mac"), mac)
            self.assertEqual(entry.get("ip"), data.get("client_ip"))
            self.assertEqual(entry.get("username"), data.get("username"))
            self.assertEqual(entry.get("session"), "1")


    def setup_limit_changes(self, auth_mode, data):
        group_id = self.get_group_id()
        new_limits = {
            "defidletimeout": "200",
            "defsessiontimeout": "300",
            "downloadlimit": "200",
            "uploadlimit": "300",
            "downloadbandwidth": "10",
            "uploadbandwidth": "15"
        }

        with self.subTest(f"{auth_mode}_check_session_parameters_initial"):
            session = self.find_session_current(data.get("client_ip"))
            self.assertIsNotNone(session, "Session should exist but was not found.")
            self.assert_session_parameters(session, self.get_expected_session_parameters(data.get("iface_sid"), data.get("username")))

        with self.subTest(f"{auth_mode}_change_limits"):
            x = self.put_data(f"{self.url_general}/groups/config/{group_id}", new_limits)
            x.assert_code(200)
            time.sleep(5)

            session = self.find_session_current(data.get("client_ip"))
            self.assertIsNone(session, "Session should terminate after limit changes.")
            self.assertTrue(self.check_chilli_up(), "Chilli service is not running after limit changes.")

            self.create_session(data.get("iface_sid"), data.get("client_ip"))
            self.auth_session(data.get("client_ip"), "login", True, data.get("username"), data.get("password"))
            time.sleep(10)

        with self.subTest(f"{auth_mode}_check_session_parameters_after_limit_change"):
            session = self.find_session_current(data.get("client_ip"))
            self.assertIsNotNone(session, "Session not found after re-login.")

            expected_values = self.get_expected_session_parameters(data.get("iface_sid"), data.get("username"), new_limits)
            self.assert_session_parameters(session, expected_values)

        with self.subTest(f"{auth_mode}_verify_download_tc_rules"):
            iface = "br-" + data.get("iface_sid")
            addr = data.get("client_ip")
            class_id = f"1{addr.split('.')[-1]}"
            speed = f"{new_limits.get('downloadbandwidth')}Mbit"

            class_cmd = f"tc class show dev {iface}"
            class_output = self.ssh.send_cmd(class_cmd)
            self.assertIn(f"class htb 1:{class_id}", class_output, "Expected class not found in `tc`.")

            filter_cmd = f"tc filter show dev {iface}"
            filter_output = self.ssh.send_cmd(filter_cmd)

            hex_addr = "".join([f"{int(octet):02x}" for octet in addr.split(".")])
            self.assertIn(f"match {hex_addr}/ffffffff", filter_output, "Expected filter rule not found in `tc`.")
            self.assertIn(f"flowid 1:{class_id}", filter_output, "Expected flowid not found in `tc`.")

        with self.subTest(f"{auth_mode}_verify_upload_tc_rules"):
            iface = "br-" + data.get("iface_sid")
            addr = data.get("client_ip")
            class_id = f"1{addr.split('.')[-1]}"
            speed = f"{new_limits.get('uploadbandwidth')}Mbit"
            virtual = "ifb0"

            class_cmd = f"tc class show dev {virtual}"
            class_output = self.ssh.send_cmd(class_cmd)
            self.assertIn(f"class htb 2:{class_id}", class_output, "Expected upload class not found in `tc`.")

            filter_cmd = f"tc filter show dev {virtual}"
            filter_output = self.ssh.send_cmd(filter_cmd)

            hex_addr = "".join([f"{int(octet):02x}" for octet in addr.split(".")])
            self.assertIn(f"match {hex_addr}/ffffffff", filter_output, "Expected upload filter rule not found in `tc`.")
            self.assertIn(f"flowid 2:{class_id}", filter_output, "Expected upload flowid not found in `tc`.")

            ingress_cmd = f"tc filter show dev {iface} egress"
            ingress_output = self.ssh.send_cmd(ingress_cmd)
            self.assertIn(f"mirred (Egress Redirect to device {virtual})", ingress_output, "Ingress mirroring not configured correctly.")

    def setup_auth_endpoint_checks(self, auth_mode, data):
        with self.subTest(f"{auth_mode}_session_exists_check"):
            session = self.find_last_session_history(data.get("client_ip"))
            self.assertIsNotNone(session)
            self.assertTrue(session.get("clientState"))

        with self.subTest(f"{auth_mode}_logout_check"):
            mac = self.get_iface_mac(data.get("iface_sid"))
            self.logout_session(mac)

            session = self.find_last_session_history(data.get("client_ip"))
            self.assertIsNotNone(session)
            self.assertFalse(session.get("clientState"))

            # Login to continue tests
            self.auth_session(data.get("client_ip"), "login", True, data.get("username"), data.get("password"))


    def cleanup_auth_test(self, auth_mode, data):
        with self.subTest(f"{auth_mode}_logout_session"):
            self.ssh.send_cmd("rm -f /tmp/hs_session_down")
            self.auth_session(data.get("client_ip"), "logout", False)
            self.assertTrue(self.wait_for_file("/tmp/hs_session_down"), "Condown script not executed after logout.")

        with self.subTest(f"{auth_mode}_after_logout_check_logs"):
            mac = self.get_iface_mac(data.get("iface_sid"))
            entry = self.get_logs_last_entry()

            self.assertEqual(entry.get("mac"), mac)
            self.assertEqual(entry.get("ip"), data.get("client_ip"))
            self.assertEqual(entry.get("username"), data.get("username"))
            self.assertEqual(entry.get("session"), "0")

        with self.subTest(f"{auth_mode}_delete_instance"):
            self.delete_config(data.get("cfg_sid"))
            time.sleep(3)
            self.delete_interface(data.get("iface_sid"), "hsiface")

        with self.subTest(f"{auth_mode}_restore_limits"):
            group_id = self.get_group_id()
            x = self.put_data(f"{self.url_general}/groups/config/{group_id}", {
                "defidletimeout": "",
                "defsessiontimeout": "",
                "downloadlimit": "",
                "uploadlimit": "",
                "downloadbandwidth": "",
                "uploadbandwidth": ""
            })
            x.assert_code(200)

        with self.subTest(f"{auth_mode}_check_session_history"):
            session = self.find_last_session_history(data.get("client_ip"))
            self.assertIsNotNone(session, "Session history not found.")
            self.assertFalse(session.get("clientState"), "Session history indicates session is still active.")

        if data.get("user_sid"):
            with self.subTest(f"{auth_mode}_delete_user"):
                self.delete(f"{self.url_general}/users/config/{data.get('user_sid')}").assert_code(200)


    def test_authentication(self):
        for auth_mode in ["mac_auth", "local"]:
            with self.subTest(f"test_{auth_mode}_authentication"):
                data = self.setup_auth_test(auth_mode)
                self.setup_session_creation(auth_mode, data)
                self.setup_limit_changes(auth_mode, data)
                self.setup_auth_endpoint_checks(auth_mode, data)
                self.cleanup_auth_test(auth_mode, data)
