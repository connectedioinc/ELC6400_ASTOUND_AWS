import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.ssh import open_ssh_connection, send_cmd
from utils.general_api import get_hwinfo, generate_require_error_messages, get_modems
from utils.mobile_utilities import get_io_pins, enable_scheduler_general, create_scheduler_instance, delete_scheduler_instance, disable_sms_rules, enable_sms_rules
import json
import response_codes as codes

RC = codes.ResponseCodes

class CallUtilities(WrapTest):
    url_general = "/call_utilities/global"
    url_action = "/call_utilities/rules/options"
    url_rules = "/call_utilities/rules/config"
    url_scheduler = "/io/scheduler/config"
    pins = []
    scheduler_instances = []

    @classmethod
    def setUpClass(cls):
        cls.output_gpio_pins, cls.output_relay_pins = get_io_pins()

    def save_scheduler_instances(self):
        x = self.get(self.url_scheduler)
        disabled_scheduler_data = []
        for instance in x.resp.json()["data"]:
            self.scheduler_instances.append({
                "id": instance["id"],
                "enabled": instance["enabled"]
            })
            disabled_scheduler_data.append({
                "id": instance["id"],
                "enabled": "0"
            })
        if len(disabled_scheduler_data) > 0:
            self.put_data(self.url_scheduler, disabled_scheduler_data)

    def revert_scheduler_instances(self):
        if len(self.scheduler_instances) > 0:
            self.put_data(self.url_scheduler, self.scheduler_instances)

    def test_call_general(self):
        actions = ["reject", "ignore", "answer"]

        with self.subTest("Clear section"):
            x = self.put_data(self.url_general, {
                "action": "reject",
                "line_close_time": ""
            })
            x.assert_data({
                "action": "reject",
            }, 200)

        with self.subTest("Check all actions"):
            for action in actions:
                if action == "answer":
                    x = self.put_data(self.url_general, {
                        "action": action,
                        "line_close_time": "5"
                    })
                    x.assert_data({
                        "action": action,
                        "line_close_time": "5",
                    }, 200)
                else:
                    x = self.put_data(self.url_general, {
                        "action": action,
                    })
                    x.assert_data({
                        "action": action,
                    }, 200)

    def test_call_rules_action(self):
        actions = ["reboot", "send_status", "mobile"]
        hwinfo = get_hwinfo(self)
        
        if hwinfo["ios"]:
            actions.append("dout")

        if hwinfo["wifi"]:
            actions.append("wifi")

        if len(self.output_relay_pins) >= 1:
            actions.append("relay")

        x = self.get(self.url_action)
        self.assertListEqual(x.json["data"]["actions"], actions)

    def test_call_rules_pin_option(self):
        if not get_hwinfo(self)["ios"]:
            self.skipTest("for this test need pin in device")
        
        with self.subTest("Check 'pin' option with all gpio pins"):
            if len(self.output_gpio_pins) > 0:
                x = self.post_data(self.url_rules, {
                    "action": "dout",
                    "value": "0"
                })
                sid = x.resp.json()['data']['id']
                x.assert_data({
                    "value": "0",
                    ".type": "rule",
                    "action": "dout",
                    "id": sid,
                    "allowed_phone": "all"
                }, 201)

                for pin in self.output_gpio_pins:
                    x = self.put_data(f'{self.url_rules}/{sid}', {
                        "pin": pin
                    })
                    x.assert_data({
                        ".type": "rule",
                        "action": "dout",
                        "value": "0",
                        "pin": pin,
                        "id": sid,
                        "allowed_phone": "all"
                    }, 200)

                x = self.delete(f'{self.url_rules}/{sid}')
                x.assert_data({
                    "id": sid
                })

        with self.subTest("Check 'pin' option with all relay pins"):
            if len(self.output_relay_pins) > 0:
                x = self.post_data(self.url_rules, {
                    "action": "relay",
                    "value": "0"
                })
                sid = x.resp.json()['data']['id']
                x.assert_data({
                    "value": "0",
                    ".type": "rule",
                    "action": "relay",
                    'allowed_phone': 'all',
                    "id": sid
                }, 201)

                for pin in self.output_relay_pins:
                    x = self.put_data(f'{self.url_rules}/{sid}', {
                        "pin": pin,
                        "value": "0"
                    })
                    x.assert_data({
                        ".type": "rule",
                        "action": "relay",
                        "value": "0",
                        "pin": pin,
                        "id": sid,
                        "allowed_phone": "all"
                    }, 200)

                x = self.delete(f'{self.url_rules}/{sid}')
                x.assert_data({
                    "id": sid
                })
        
    def test_call_rules_pin_using_scheduler(self):
        disabled_sms_rules = []
        if not get_hwinfo(self)["ios"]:
            self.skipTest("for this test need pin in device")

        with self.subTest("Disable all scheduler instances and save them"):
            self.save_scheduler_instances()

        with self.subTest("Disable all SMS rules"):
            disabled_sms_rules.extend(disable_sms_rules(self))

        enable_scheduler_general(self)

        if len(self.output_gpio_pins) > 0:

            with self.subTest("Create scheduler instance"):
                scheduler_sid = create_scheduler_instance(self, 1, self.output_gpio_pins[0])

            with self.subTest("Create call utilities instance"):
                x = self.post_data(self.url_rules, {
                    "enabled": "1",
                    "action": "dout",
                    "pin": self.output_gpio_pins[0]
                })
                x.assert_error("enabled", f"Unable to enable. Output scheduler instance with '{self.output_gpio_pins[0]}' pin is enabled", 1)

            with self.subTest("Delete scheduler instance"):
                delete_scheduler_instance(self, scheduler_sid)

        if len(self.output_relay_pins) > 0:
            with self.subTest("Create scheduler instance"):
                scheduler_sid = create_scheduler_instance(self, 1, self.output_relay_pins[0])

            with self.subTest("Create call utilities instance"):
                x = self.post_data(self.url_rules, {
                    "enabled": "1",
                    "action": "relay",
                    "pin": self.output_relay_pins[0]
                })
                x.assert_error("enabled", f'Unable to enable. Output scheduler instance with \'{self.output_relay_pins[0]}\' pin is enabled', 1)

            with self.subTest("Delete scheduler instance"):
                delete_scheduler_instance(self, scheduler_sid)

        with self.subTest("Enable all SMS rules"):
            enable_sms_rules(self, disabled_sms_rules)

        with self.subTest("Revert scheduler instances 'enabled' option values"):
            self.revert_scheduler_instances()

    def test_enable_require_dependecy(self):
        sid = None
        modems = get_modems(self)
        with self.subTest("create section"):
            x = self.post_data(self.url_rules, {})
            x.assert_code(201)
            sid = x.resp.json()['data']['id']

        with self.subTest("check dependecy"):
            x = self.put_data(f"{self.url_rules}/{sid}", {
                "enabled": "1",
                "allowed_phone": ""
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["action", "allowed_phone"]))
            x = self.put_data(f"{self.url_rules}/{sid}", {
                "enabled": "1",
                "allowed_phone": "single"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["action", "tel"]))
            x = self.put_data(f"{self.url_rules}/{sid}", {
                "enabled": "1",
                "allowed_phone": "group"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["action", "group"]))

            if len(self.output_gpio_pins) > 0:
                x = self.put_data(f"{self.url_rules}/{sid}", {
                    "enabled": "1",
                    "action": "dout"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["value", "pin"]))

            if len(self.output_relay_pins) > 0:
                x = self.put_data(f"{self.url_rules}/{sid}", {
                    "enabled": "1",
                    "action": "relay"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["value", "pin"]))
                x = self.put_data(f"{self.url_rules}/{sid}", {
                    "enabled": "1",
                    "action": "send_status"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["message"]))
        
        with self.subTest("delete section"):
            x = self.delete(f"{self.url_rules}/{sid}")
            x.assert_data({
                "id": sid
            })
