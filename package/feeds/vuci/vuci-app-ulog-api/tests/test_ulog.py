import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.ssh import open_ssh_connection, is_process_running, is_process_stopped, send_cmd
from utils.general_api import is_package_installed, generate_require_error_messages
import response_codes as codes

RC = codes.ResponseCodes

class Ullog(WrapTest):
    url_interfaces = "/interfaces/config"
    url_ulog_settings = "/ulog/config/global"
    url_ulog_options = "/ulog/available_interfaces/options"
    url_ulog_ftp = "/ulog/ftp/config"
    url_ulog_status = "/ulog/status"

    ulog_ftp_config = {
        "host": "1.1.1.1",
        "username": "username",
        "password": "pswd",
        "port": "420",
        "remote_file_path": "/blatatata/ratatata/",
        "extra_name_info": "none",
        "custom_string": "customString",
        "fixed": "0",
        "hours": "4",
        "minutes": "20",
        "interval": "1",
        "weekdays": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
        ".type": "server"
    }

    ulog_ftp_empty_config = {
        "host": "",
        "username": "",
        "password": "",
        "port": "",
        "remote_file_path": "",
        "extra_name_info": "",
        "custom_string": "",
        "fixed": "",
        "hours": "",
        "minutes": "",
        "interval": "",
        "weekdays": ""
    }

    def test_networks_options(self):
        with open_ssh_connection() as ssh:
            with self.subTest("main test"):
                options = []

                x = self.get(self.url_interfaces)
                x.assert_code(200)

                for interface in x.resp.json()["data"]:
                    if "ifname" in interface and ("eth0" in interface["ifname"] or "rndis0" in interface["ifname"] or
                    "ecm0" in interface["ifname"] or "br-lan" in interface["ifname"] or "wlan" in interface["ifname"] or "eth0.1" in interface["ifname"]):
                        options.append(interface["id"])

                res1 = ssh.send_cmd(f"ls -1 /usr/local/usr/lib/opkg/info/coova-chilli.control &> /dev/null ; echo $?")
                res2 = ssh.send_cmd(f"ls -1 /usr/lib/opkg/info/coova-chilli.control &> /dev/null ; echo $?")
                if res1.strip() == "0" or res2.strip() == "0":            
                    options.append("hotspot")

                x = self.get(self.url_ulog_options)
                x.assert_code(200)
                
                response = x.resp.json()["data"]["network"]
                response.sort()
                options.sort()

                self.assertListEqual(response, options)

    def test_ulog_ftp(self):
        x = self.get(self.url_ulog_ftp)
        x.assert_code(200)
        sid = x.resp.json()["data"][0]["id"]

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", self.ulog_ftp_config)
        self.ulog_ftp_config.update({"id": sid})
        self.ulog_ftp_config.update({"enabled": "1"})
        x.assert_data(self.ulog_ftp_config)

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "/test"
        })
        x.assert_error("remote_file_path", "Value should end with a slash ('/' or '\\').", RC.INVALID_OPT.val())

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "test"
        })
        x.assert_error("remote_file_path", "Value should end with a slash ('/' or '\\').", RC.INVALID_OPT.val())

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "/test\\"
        })
        x.assert_error("remote_file_path", "Only one type of slash ('/' or '\\') can be used in a value.", RC.INVALID_OPT.val())

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "\\test/"
        })
        x.assert_error("remote_file_path", "Only one type of slash ('/' or '\\') can be used in a value.", RC.INVALID_OPT.val())

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "\\test\\\\"
        })
        x.assert_error("remote_file_path", "Value can not contain more than one consecutive slash.", RC.INVALID_OPT.val())

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "test\\\\"
        })
        x.assert_error("remote_file_path", "Value can not contain more than one consecutive slash.", RC.INVALID_OPT.val())

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "test//"
        })
        x.assert_error("remote_file_path", "Value can not contain more than one consecutive slash.", RC.INVALID_OPT.val())

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "/test//"
        })
        x.assert_error("remote_file_path", "Value can not contain more than one consecutive slash.", RC.INVALID_OPT.val())

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "/test/"
        })
        self.ulog_ftp_config["remote_file_path"] = "/test/"
        x.assert_data(self.ulog_ftp_config)

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
            "remote_file_path": "\\test\\"
        })
        self.ulog_ftp_config["remote_file_path"] = "\\test\\"
        x.assert_data(self.ulog_ftp_config)

        x = self.put_data(self.url_ulog_settings, {
            "enabled": "0"
        })
        x.assert_code(200)

        x = self.put_data(f"{self.url_ulog_ftp}/{sid}", self.ulog_ftp_empty_config)
        x.assert_code(200)

    def test_ulog_file(self):
        self.get(self.url_ulog_status) # for autoskip

        file_path = self.get_section("ulogd", "emu1")["values"]["file"]
        log_file_text = "TestTestTestTest"
        with open_ssh_connection() as ssh:
            send_cmd(ssh, "rm " + file_path)
            send_cmd(ssh, f'echo \'{log_file_text}\' > {file_path}')
            send_cmd(ssh, "chown ulogd:ulogd " + file_path)
        
        x = self.get(self.url_ulog_status)
        x.assert_code(200)
        traffic_log = x.resp.json()["data"]["traffic_log"]
        
        self.assertEqual(traffic_log, (log_file_text+"\n"))

    def test_check_process(self):
        x = self.put_data(self.url_ulog_settings, {
            "enabled": "0"
        })
        x.assert_code(200)

        with open_ssh_connection() as ssh:
            self.assertTrue(is_process_stopped(ssh, "ulogd"), "Expected 'ulogd' not to be running")
            x = self.get(self.url_ulog_ftp)
            x.assert_code(200)
            sid = x.resp.json()["data"][0]["id"]
            x = self.put_data(f"{self.url_ulog_ftp}/{sid}", self.ulog_ftp_config)
            x.assert_code(200)
            x = self.put_data(self.url_ulog_settings, {
                "enabled": "1"
            })
            x.assert_code(200)

            self.assertTrue(is_process_running(ssh, "ulogd"), "Expected 'ulogd' to be running")

    def test_require_dependecy(self):
        sid = None

        with self.subTest("get ftp settings sid"):
            x = self.get(self.url_ulog_ftp)
            x.assert_code(200)
            sid = x.resp.json()["data"][0]["id"]

        with self.subTest("set ftp settings"):
            x = self.put_data(f"{self.url_ulog_ftp}/{sid}", self.ulog_ftp_config)
            x.assert_code(200)

        with self.subTest("enable ulog"):
            x = self.put_data(self.url_ulog_settings, {
                "enabled": "1"
            })
            x.assert_code(200)

        with self.subTest("check dependecy"):
            x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
                "host": "",
                "port": "", 
                "extra_name_info": "",
                "fixed": "",
                "weekdays": ""
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages('enabled', sid, ['host', 'port', 'extra_name_info', 'fixed', 'weekdays']))
            x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
                "fixed": "1",
                "hours": "",
                "minutes": ""
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages('enabled', sid, ['hours', 'minutes']))
            x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
                "fixed": "0",
                "interval": ""
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages('enabled', sid, ['interval']))
            x = self.put_data(f"{self.url_ulog_ftp}/{sid}", {
                "extra_name_info": "custom",
                "custom_string": ""
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages('enabled', sid, ['custom_string']))