import base64
import io
from utils.io_utils import get_all_io_pins, get_first_out_in_pin_ids
import utility_integration as util
from utils.ssh import open_ssh_connection, send_cmd
from utils.general_api import get_modems
import sys
sys.path.append("../../../../tests")
BASE_URL = "/io/juggler/operations/config"
CONDITIONS_URL = "/io/juggler/conditions/config"
INPUTS_URL = "/io/juggler/inputs/config"
EMAIL_GROUP_URL = "/recipients/email_users/config"
PHONE_GROUPS_URL = "/recipients/phone_groups/config"
TEST_SCRIPT_FILE = "/tmp/test_io_action_script"
ACTION_LIMIT = 10


class test_io_juggler_action(util.WrapTest):
    pins = None

    @classmethod
    def setUpClass(cls):
        cls.pins = get_all_io_pins()
        cls.in_pin, cls.out_pin = get_first_out_in_pin_ids()

    def create_email(self):
        x = self.post_data(EMAIL_GROUP_URL, {
            "name": "test",
            "secure_conn": "1",
            "smtp_ip": "example.com",
            "smtp_port": "123",
            "credentials": "1",
            "username": "test",
            "password": "test",
            "senderemail": "example@teltonika.lt"
        })
        x.assert_code(201)
        return x.resp.json()["data"]["id"]

    def del_email(self, email_sid):
        x = self.delete(f"{EMAIL_GROUP_URL}/{email_sid}")
        x.assert_code(200)

    def create_phone_group(self):
        x = self.post_data(PHONE_GROUPS_URL, {
            "name": "test",
            "tel": [
                "+37061234567"
            ]
        })
        x.assert_code(201)
        return x.resp.json()["data"]["id"]

    def del_phone_group(self, phone_sid):
        x = self.delete(f"{PHONE_GROUPS_URL}/{phone_sid}")
        x.assert_code(200)

    def create_condition(self):
        x = self.post_data(CONDITIONS_URL, {"type": "minute", "ui_timetype": "0",
                                        "value": "10", "ui_name": "lul"})
        x.assert_code(201)
        return x.resp.json()["data"]["id"]

    def del_condition(self, cond_sid):
        x = self.delete(f"{CONDITIONS_URL}/{cond_sid}")
        x.assert_code(200)

    def test_script_file_deletion(self):
        if not self.in_pin:
            self.skipTest("Test requires input pin")

        with open_ssh_connection() as ssh:
            sid = None
            with self.subTest("setup test"):
                send_cmd(ssh, "touch " + TEST_SCRIPT_FILE)
                send_cmd(ssh, "chown juggler:juggler " + TEST_SCRIPT_FILE)
                x = self.post_data(BASE_URL, {
                                   "ui_name": self.in_pin, "ui_file_path": "path", "type": "script", "path": TEST_SCRIPT_FILE})
                x.assert_code(201)
                sid = x.resp.json()["data"]["id"]

            with self.subTest("test if file is left correctly after changing type"):
                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "reboot"})
                x.assert_code(200)
                res = send_cmd(
                    ssh, f"ls {TEST_SCRIPT_FILE} &> /dev/null ; echo $?")
                self.assertEqual(res.strip(), "0")

            with self.subTest("test if file is left correctly after clearing 'path' option"):
                modems = get_modems(self)
                payload = {
                    "type": "script",
                    "ui_file_path": "path",
                    "path": TEST_SCRIPT_FILE
                }
                if len(modems) > 1:
                    payload.update({"info_modem_id": modems[0]["id"]})
                x = self.put_data(f"{BASE_URL}/{sid}", payload)
                x.assert_code(200)

                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "http",
                                  "ui_file_path": "", "path": "", "post": "1", "url": "asdasd.com"})
                x.assert_code(200)

                res = send_cmd(
                    ssh, f"ls {TEST_SCRIPT_FILE} &> /dev/null ; echo $?")
                self.assertEqual(res.strip(), "0")

            with self.subTest("test if file is deleted correctly after changing type"):
                f = io.StringIO("file content\n")
                x = self.send_file(f"{BASE_URL}/{sid}", f, "upload")
                x.assert_code(200)
                uploaded_file_path = x.resp.json()["data"]["path"]

                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "script",
                                  "ui_file_path": "upload", "upload": uploaded_file_path})
                x.assert_code(200)

                # TODO: broken right now because of api-core (self.get still points to original function in option_logic.lua file even if it is overrided)
                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "reboot"})
                x.assert_code(200)

                res = send_cmd(
                    ssh, f"ls {uploaded_file_path} &> /dev/null ; echo $?")
                self.assertEqual(res.strip(), "1")

            with self.subTest("test if file is deleted correctly after clearing 'upload' option"):
                f = io.StringIO("file content\n")
                x = self.send_file(f"{BASE_URL}/{sid}", f, "upload")
                x.assert_code(200)
                uploaded_file_path = x.resp.json()["data"]["path"]

                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "script",
                                  "ui_file_path": "upload", "upload": uploaded_file_path})
                x.assert_code(200)

                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "script",
                                  "ui_file_path": "path", "path":  TEST_SCRIPT_FILE})
                x.assert_code(200)

                res = send_cmd(
                    ssh, f"ls {uploaded_file_path} &> /dev/null ; echo $?")
                self.assertEqual(res.strip(), "1")

            with self.subTest("teardown test"):
                self.delete(f"{BASE_URL}/{sid}")
                res = send_cmd(ssh, "rm " + TEST_SCRIPT_FILE)

    def test_io_juggler_action_crud(self):
        if not self.out_pin:
            self.skipTest("Required pin doesn't exist.")
        email_sid = None
        with self.subTest("create test sections"):
            email_sid = self.create_email()

        with self.subTest("main test"):
            self.crud_test(BASE_URL, {
                ".type": "action",
                "ui_name": "testtt123",
                "type": "reboot",
                "subject": "",
                "post": "0",
                "url": "",
                "verify": "",
                "ui_params": "",
                "text": "",
                "params": "",
                "headers": "",
                "delay": "",
                "info_modem_id": "",
                "send_modem_id": "",
                "ui_recipient_format": "single",
                "phone": "+37061234567",
                "phone_group": "",
                "rms_on": "",
                "wifi_on": "",
                "dest": self.out_pin,
                "revert": "",
                "maintain": "",
                "invert": "0",
                "ui_mirroring": "0",
                "state": "",
                "copy": "",
                "email_group": "test",
                "recipients": ["example@teltonika.com"],
                "ui_file_path": "",
                "upload": "",
                "path": "",
                "arguments": "",
                "profile": "default",
                "flip": "",
                "target": "",
                "conditions": ""
            },
            {
                ".type": "action",
                "ui_name": "testtt123",
                "type": "reboot",
                "subject": "",
                "post": "0",
                "url": "",
                "verify": "",
                "ui_params": "",
                "text": "",
                "params": "",
                "headers": "",
                "delay": "",
                "info_modem_id": "",
                "send_modem_id": "",
                "ui_recipient_format": "single",
                "phone": "+37061234567",
                "phone_group": "",
                "rms_on": "",
                "wifi_on": "",
                "dest": self.out_pin,
                "revert": "",
                "maintain": "",
                "invert": "0",
                "ui_mirroring": "0",
                "state": "",
                "copy": "",
                "email_group": "test",
                "recipients": ["example@teltonika.com"],
                "ui_file_path": "",
                "upload": "",
                "path": "",
                "arguments": "",
                "profile": "default",
                "flip": "",
                "target": "",
                "conditions": ""
            })

        with self.subTest("delete test sections"):
            self.del_email(email_sid)

    def test_io_juggler_action_custom_option_validation(self):
        if not self.out_pin:
            self.skipTest("Output I/O pin is required for this test")
        sid = None
        email_sid = None
        phone_sid = None
        cond_sid = None
        with self.subTest("create test section"):
            phone_sid = self.create_phone_group()
            email_sid = self.create_email()
            cond_sid = self.create_condition()

            x = self.post_data(BASE_URL, {"ui_name": "testtt123",
                                          "type": "reboot",
                                          "subject": "",
                                          "post": "0",
                                          "url": "",
                                          "verify": "",
                                          "ui_params": "",
                                          "text": "",
                                          "params": "",
                                          "headers": "",
                                          "delay": "",
                                          "info_modem_id": "",
                                          "send_modem_id": "",
                                          "ui_recipient_format": "single",
                                          "phone": "+37061234567",
                                          "phone_group": "",
                                          "rms_on": "",
                                          "wifi_on": "",
                                          "dest": self.out_pin,
                                          "revert": "",
                                          "maintain": "",
                                          "invert": "",
                                          "ui_mirroring": "",
                                          "state": "",
                                          "copy": "",
                                          "email_group": "test",
                                          "recipients": ["example@teltonika.com"],
                                          "ui_file_path": "",
                                          "upload": "",
                                          "path": "",
                                          "arguments": "",
                                          "profile": "default",
                                          "flip": "",
                                          "target": "",
                                          "conditions": "", })
            x.assert_code(201)
            sid = x.resp.json()["data"]["id"]

        with self.subTest("main test"):
            dest_opts = []
            copy_opts = []
            for pin in self.pins:
                if (pin["type"] == "gpio" and (pin["direction"] == "out" or pin["bi_dir"] == "1")) or pin["type"] == "relay":
                    dest_opts.append(pin["id"])
                if (pin["type"] == "gpio" and (pin["direction"] != "out" or pin["bi_dir"] == "1")) or pin["type"] == "relay" or pin["type"] == "dwi":
                    copy_opts.append(pin["id"])

            # "ui_name" option
            x = self.post_data(
                BASE_URL, {"ui_name": "testtt123", "type": "reboot"})
            x.assert_code(422)

            # "type" option
            x = self.get("/system/device/status")
            board = x.resp.json()["data"]["board"]
            type_options = ["email", "dout", "http",
                            "script", "reboot", "profile", "rms"]
            modems = get_modems(self)
            if len(modems) > 0:
                type_options.append("sms")
                for md in modems:
                    if md["sim_count"] > 1:
                        type_options.append("sim_switch")
                        break
            if board["hwinfo"]["wifi"]:
                type_options.append("wifi")
            for tp in type_options:
                sid2 = None
                x = self.post_data(BASE_URL, {"type": tp, "ui_name": "test123456789"})
                x.assert_code(201)
                sid2 = x.resp.json()["data"]["id"]
                x = self.delete(f"{BASE_URL}/{sid2}")
                x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "invalid_type"})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "reboot"})
            x.assert_code(200)

            # "text" option
            text = "nlkjnabnjad54679a87fgvadfvb809rt24t5h"
            x = self.put_data(f"{BASE_URL}/{sid}", {"text": text})
            x.assert_code(200)
            self.assertEqual(x.resp.json()["data"]["text"], text)
            with open_ssh_connection() as ssh:
                res = send_cmd(ssh, f"uci get event_juggler.{sid}.text")
                self.assertEqual(res.strip(), text)

            # "info_modem_id" "send_modem_id" options
            if len(modems) > 1:
                for md in modems:
                    x = self.put_data(
                        f"{BASE_URL}/{sid}", {"info_modem_id": md["id"], "send_modem_id": md["id"]})
                    x.assert_code(200)
            elif len(modems) == 1:
                x = self.put_data(
                    f"{BASE_URL}/{sid}", {"info_modem_id": modems[0]["id"], "send_modem_id": modems[0]["id"]})
                x.assert_code(200)
            x = self.put_data(
                f"{BASE_URL}/{sid}", {"info_modem_id": "ggg", "send_modem_id": "ggg"})
            x.assert_code(422)

            # "phone_group" option
            x = self.put_data(f"{BASE_URL}/{sid}", {"phone_group": "test"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"phone_group": "adfhadh"})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "sms", "ui_recipient_format": "group", "phone_group": ""})
            x.assert_code(422)

            # "dest" option
            for opt in dest_opts:
                x = self.put_data(f"{BASE_URL}/{sid}", {"dest": opt})
                x.assert_code(200)
                self.assertEqual(x.resp.json()["data"]["dest"], opt)
            for pin in self.pins:
                if pin["id"] not in dest_opts:
                    x = self.put_data(f"{BASE_URL}/{sid}", {"dest": pin["id"]})
                    x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"dest": "adhadhdfh"})
            x.assert_code(422)

            # "copy" option
            for opt in copy_opts:
                x = self.put_data(f"{BASE_URL}/{sid}", {"copy": opt})
                x.assert_code(200)
                self.assertEqual(x.resp.json()["data"]["copy"], opt)
            for pin in self.pins:
                if pin["id"] not in copy_opts:
                    x = self.put_data(f"{BASE_URL}/{sid}", {"copy": pin["id"]})
                    x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"copy": "adhadhdfh"})
            x.assert_code(422)

            # "email_group" option
            x = self.put_data(f"{BASE_URL}/{sid}", {"email_group": "test"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"email_group": "hsfnsfng"})
            x.assert_code(422)

            # "profile" option
            x = self.put_data(f"{BASE_URL}/{sid}", {"profile": "default"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"profile": "hsfnsfng"})
            x.assert_code(422)

            # "conditions" option
            x = self.put_data(f"{BASE_URL}/{sid}", {"conditions": ["lul"]})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"conditions": ["lul", "pepa"]})
            x.assert_code(422)
            action_section = self.get_section("event_juggler", sid)["values"]
            cond_section = self.get_section("event_juggler", cond_sid)["values"]
            self.assertEqual(action_section["conditions"][0], cond_section[".name"])


            # "target" option
            x = self.get("/sim_cards/config")
            body = x.resp.json()
            if "data" in body and len(body["data"]) > 0:
                for sim in body["data"]:
                    x = self.put_data(f"{BASE_URL}/{sid}", {"target": sim["position"]})
                    x.assert_code(200)
                x = self.put_data(f"{BASE_URL}/{sid}", {"target": "ggg"})
                x.assert_code(422)

        with self.subTest("delete test section"):
            x = self.delete(f"{BASE_URL}/{sid}")
            x.assert_code(200)
            self.del_email(email_sid)
            self.del_phone_group(phone_sid)
            self.del_condition(cond_sid)

    def test_iojuggler_action_custom_requires(self):
        sid = None
        with self.subTest("create test section"):
            x = self.post_data(BASE_URL, {"ui_name": f"tester20", "type": "reboot"})
            x.assert_code(201)
            sid = x.resp.json()["data"]["id"]

        with self.subTest("main test"):
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "email", "email_group": ""})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "email", "recipients": ""})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "dout", "dest": ""})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "http", "post": ""})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "profile", "profile": ""})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "sms", "ui_recipient_format": ""})
            x.assert_code(422)

        with self.subTest("delete test section"):
            x = self.delete(f"{BASE_URL}/{sid}")
            x.assert_code(200)


    def test_iojuggler_action_limit(self):
        x = self.get(BASE_URL)
        action_count = len(x.resp.json()["data"])

        created_sids = []
        for i in range(ACTION_LIMIT - action_count):
            x = self.post_data(BASE_URL, {"ui_name": f"tester{i}", "type": "reboot"})
            x.assert_code(201)
            created_sids.append(x.resp.json()["data"]["id"])

        x = self.post_data(BASE_URL, {"ui_name": f"tester20", "type": "reboot"})
        x.assert_code(422)

        x = self.delete_data(BASE_URL, created_sids)
        x.assert_code(200)

    def test_iojuggler_action_deletion_in_input(self):
        if not self.in_pin:
            self.skipTest("Test requires input pin")

        input_sid = None
        action_sid = None
        with self.subTest("create test section"):
            x = self.post_data(INPUTS_URL, {"name": self.in_pin, "trigger": "both"})
            x.assert_code(201)
            input_sid = x.resp.json()["data"]["id"]
            x = self.post_data(BASE_URL, {"ui_name": "tester20", "type": "reboot"})
            x.assert_code(201)
            action_sid = x.resp.json()["data"]["id"]

        with self.subTest("main test"):
            x = self.put_data(f"{INPUTS_URL}/{input_sid}", {"actions":["tester20"]})
            x.assert_code(200)
            x = self.delete(f"{BASE_URL}/{action_sid}")
            x.assert_code(200)
            x = self.get(f"{INPUTS_URL}/{input_sid}")
            self.assertNotIn("actions", x.resp.json()["data"])

        with self.subTest("delete test section"):
            x = self.delete(f"{BASE_URL}/{action_sid}")
            x = self.delete(f"{INPUTS_URL}/{input_sid}")
            x.assert_code(200)
