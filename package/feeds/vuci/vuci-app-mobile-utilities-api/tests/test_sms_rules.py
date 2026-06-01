import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
import response_codes as codes
from utils.ssh import open_ssh_connection, send_cmd
from utils.general_api import get_hwinfo, get_modems, get_board, generate_require_error_messages, get_sim_count
from utils.mobile_utilities import disable_sms_rules, enable_scheduler_general, disable_scheduler_general, get_io_pins, delete_scheduler_instance, enable_sms_rules, create_scheduler_instance
import json
import operator

RC = codes.ResponseCodes

def dateSort(x):
    return x['date']

class SMSRules(WrapTest):
    url_sms_rules = "/sms_utilities/rules/config"
    url_scheduler = "/io/scheduler/config"
    output_gpio_pins, output_relay_pins = get_io_pins()
    scheduler_instances = []

    def save_scheduler_instances(self):
        x = self.get(self.url_scheduler)
        self.scheduler_instances.extend(x.resp.json()["data"])
        for instance in self.scheduler_instances:
            if "enabled" in instance and instance["enabled"] == "1":
                x = self.put_data(self.url_scheduler + "/" + instance["id"], {
                    "enabled": "0"
                })

    def revert_scheduler_instances(self):
        for instance in self.scheduler_instances:
            if "enabled" in instance and instance["enabled"] == "1":
                x = self.put_data(self.url_scheduler + "/" + instance["id"], {
                    "enabled": "1"
                })

    def test_get_actions(self):
        actions = [
            "reboot",
            "send_status",
            "vpnstatus",
            "mobile",
            "change_mobile_settings",
            "reset_conn",
            "list_of_profile",
            "vpn",
            "change_profile",
            "ssh_access",
            "web_access",
            "ip_unblock",
            "firstboot",
            "userdefaults",
            "fw_upgrade",
            "monitoring_status",
            "uci",
            "rms_status",
            "rms_action",
            "rms_connect",
            "more",
            "exec",
            "config_reload",
            "api"
        ]
        hwinfo = get_hwinfo(self)

        for modem in get_modems(self):
            if modem["sim_count"] > 1:
                actions.append("switch_sim")
                break

        if "ios" in hwinfo and hwinfo["ios"]:
            actions.append("io_set")

        if "gps" in hwinfo and hwinfo["gps"]:
            actions.append("gps")
            actions.append("gps_coordinates")

        if "wifi" in hwinfo and hwinfo["wifi"]:
            actions.append("wifi")

        with open_ssh_connection() as ssh:
            cmd_response = send_cmd(ssh, "ls /etc/config/quota_limit &> /dev/null ; echo $?").strip()
            if cmd_response == "0":
                actions.append("data_usage_reset")
                actions.append("data_limit")

            cmd_response = send_cmd(ssh, "ls /etc/config/etherwake &> /dev/null ; echo $?").strip()

            board = get_board(self)
            lan = board.get("network", {}).get("lan", {}).get("device") or board.get("network", {}).get("lan", {}).get("ports")
            if "ethernet" in hwinfo and hwinfo["ethernet"] and cmd_response == "0" and lan:
                actions.append("wol")

        x = self.get("/sms_utilities/rules/options")
        response_actions = x.resp.json()["data"]["actions"]
        response_actions.sort()
        actions.sort()
        self.assertListEqual(response_actions, actions)


    def test_custom(self):

        with self.subTest("Check 'smstext' option validation"):
            x = self.post_data(self.url_sms_rules, {
                "smstext": "smsTextTest"
            })
            sid = x.resp.json()['data']['id']
            x.assert_code(201)
            x = self.post_data(self.url_sms_rules, {
                "smstext": "smsTextTest"
            })
            x.assert_error("smstext", "Such SMS text already exists", RC.INVALID_OPT.val())
            x = self.delete(f'{self.url_sms_rules}/{sid}')
            x.assert_data({
				"id": sid
			})

        with self.subTest("Check 'password' option"):
            x = self.post_data(self.url_sms_rules, {
                "authorization": "no",
                "password": "TestPsw69"
            })
            x.assert_error("password", "authorization must be set to 'local'.", RC.INVALID_OPT.val())

            x = self.post_data(self.url_sms_rules, {})
            sid = x.resp.json()['data']['id']
            x.assert_data({
                "authorization": "password",
                "allowed_phone": "all",
                ".type": "rule",
                "id": sid
            }, 201)

            x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                "authorization": "local",
            })
            x.assert_data({
                ".type": "rule",
                "allowed_phone": "all",
                "id": sid,
                "password:set": "0",
                "authorization": "local"
            }, 200)

            x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                "authorization": "local",
                "password": "TestPsw69"
            })
            x.assert_data({
                "password:set": "1",
                ".type": "rule",
                "allowed_phone": "all",
                "id": sid,
                "authorization": "local"
            }, 200)

            x = self.delete(f'{self.url_sms_rules}/{sid}')
            x.assert_data({
				"id": sid
			})

        with self.subTest("Check 'script' option"):
            x = self.post_data(self.url_sms_rules, {
                "action": "exec",
                "script": "TestScript"
            })
            x.assert_error("script", "Script must start with #!/bin/sh and a newline.", RC.INVALID_OPT.val())

    def test_sms_rules_pin_using_scheduler(self):
        disabled_sms_rules = []

        if not get_hwinfo(self)["ios"]:
            self.skipTest("For this test need pin in device")

        with self.subTest("Disable all scheduler instances and save them"):
            self.save_scheduler_instances()

        with self.subTest("Disable all SMS rules"):
            disabled_sms_rules.extend(disable_sms_rules(self))

        enable_scheduler_general(self)

        if len(self.output_gpio_pins) > 0:
            with self.subTest("Create scheduler instance"):
                scheduler_sid = create_scheduler_instance(self, 1, self.output_gpio_pins[0])

            with self.subTest("Create call utilities instance"):
                x = self.post_data(self.url_sms_rules, {
                    "enabled": "1",
                    "action": "io_set",
                    "io": self.output_gpio_pins[0]
                })
                x.assert_error("enabled", f"Unable to enable. Output scheduler instance with '{self.output_gpio_pins[0]}' pin is enabled", 103)

            with self.subTest("Delete scheduler instance"):
                delete_scheduler_instance(self, scheduler_sid)

        with self.subTest("Enable all SMS rules"):
            enable_sms_rules(self, disabled_sms_rules)

        with self.subTest("Revert scheduler instances 'enabled' option values"):
            self.revert_scheduler_instances()

    def test_check_require_enable_dependecy(self):
        sid = None
        disabled_sms_rules = []
        if_need_wol_check = False
        hwinfo = get_hwinfo(self)

        with self.subTest("Check if wol have to be in actions"):
            hwinfo = get_hwinfo(self)
            with open_ssh_connection() as ssh:
                cmd_response = send_cmd(ssh, "ls /etc/config/etherwake &> /dev/null ; echo $?").strip()
                if "ethernet" in hwinfo and hwinfo["ethernet"] and cmd_response == "0" and "eth0" in get_board(self)["network"]["lan"]["device"] :
                    if_need_wol_check = True

        with self.subTest("Disable all scheduler instances and save them"):
            self.save_scheduler_instances()
            disable_scheduler_general(self)

        with self.subTest("Disable all SMS rules"):
            disabled_sms_rules.extend(disable_sms_rules(self))
        
        with self.subTest("create instance"):
            x = self.post_data(self.url_sms_rules, {})
            sid = x.resp.json()['data']['id']
            x.assert_code(201)

        with self.subTest("check dependecy"):
            x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                "enabled": "1",
                "authorization": "",
                "allowed_phone": ""
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["authorization", "allowed_phone", "smstext", "action"]))
            x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                "enabled": "1",
                "authorization": "local",
                "allowed_phone": ""
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["password", "allowed_phone", "smstext", "action"]))
            x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                "enabled": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "action"]))
            x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                "enabled": "1",
                "allowed_phone": "single"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "action", "tel"]))
            x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                "enabled": "1",
                "allowed_phone": "group"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "action", "group"]))
            x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                "enabled": "1",
                "action": "exec"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "script"]))

            if len(self.output_gpio_pins) > 0 or len(self.output_relay_pins) > 0:
                x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                    "enabled": "1",
                    "action": "io_set",
                    "value": ""
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "io", "value"]))
                x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                    "enabled": "1",
                    "action": "io_set",
                    "timeout": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "seconds", "io", "value"]))

            if len(get_modems(self)) > 1:
                all_actions = [
                    "send_status",
                    "vpnstatus",
                    "list_of_profile",
                    "monitoring_status",
                    "uci",
                    "data_limit",
                    "rms_status",
                    "more",
                    "ip_unblock",
                    "change_mobile_settings",
                    "mobile",
                ]
                if "gps" in hwinfo and hwinfo["gps"]:
                    all_actions.append("gps_coordinates")
                if if_need_wol_check:
                    all_actions.append("wol")
                for action in all_actions:
                    required_options = ["smstext"]
                    x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                        "enabled": "1",
                        "action": action
                    })
                    if action == "send_status":
                        required_options.append("message")
                    if action == "wol":
                        required_options.append("mac")
                    if action == "mobile":
                        required_options.append("value")
                    self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, required_options))
                x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                    "enabled": "1",
                    "action": "reboot",
                    "status_sms": "1"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "message"]))
            elif len(get_modems(self)) == 1:
                all_actions = [
                    "reboot",
                    "send_status",
                    "vpnstatus",
                    "list_of_profile",
                    "monitoring_status",
                    "uci",
                    "rms_status"
                ]
                if "gps" in hwinfo and hwinfo["gps"]:
                    all_actions.append("gps_coordinates")
                for action in all_actions:
                    required_options = ["smstext", "to_number"]
                    x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                        "enabled": "1",
                        "to_other_phone": "1",
                        "action": action
                    })
                    if action == "send_status":
                        required_options.append("message")
                    self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, required_options))
                if if_need_wol_check:
                    x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                        "enabled": "1",
                        "action": "wol"
                    })
                    self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "mac"]))
                x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                    "enabled": "1",
                    "action": "change_mobile_settings"
                })
                if get_sim_count(self) > 1:
                    self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "simcard"]))
                elif get_sim_count(self) == 1:
                    self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext"]))
                x = self.put_data(f'{self.url_sms_rules}/{sid}', {
                    "enabled": "1",
                    "action": "send_status"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["smstext", "message"]))

        with self.subTest("delete instance"):
            x = self.delete(f'{self.url_sms_rules}/{sid}')
            x.assert_data({
				"id": sid
			})

        with self.subTest("Enable all SMS rules"):
            enable_sms_rules(self, disabled_sms_rules)

        with self.subTest("Revert scheduler instances 'enabled' option values"):
            self.revert_scheduler_instances()