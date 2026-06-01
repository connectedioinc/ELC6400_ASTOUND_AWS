from utils.io_utils import get_all_io_pins, get_first_out_in_pin_ids, get_io_pin
import utility_integration as util
import sys
sys.path.append("../../../../tests")
INPUTS_URL = "/io/juggler/inputs/config"
ACTIONS_URL = "/io/juggler/operations/config"
CONDITIONS_URL = "/io/juggler/conditions/config"
IO_STATUS_URL = "/io/status"


class test_io_juggler_input(util.WrapTest):
    pins = None

    @classmethod
    def setUpClass(cls):
        cls.pins = get_all_io_pins()
        cls.in_pin, cls.out_pin = get_first_out_in_pin_ids()

    def clear_section(self, sid):
        x = self.put_data(f"{INPUTS_URL}/{sid}", {
            "name": self.in_pin,
            "min": "",
            "max": "",
            "acl": "",
            "min_curr": "",
            "max_curr": "",
            "trigger": "both",
            "wait": "",
            "inside": "",
            "min_perc": "",
            "max_perc": "",
            "actions": "",
            "actions": [],
            "conditions": [],
        })
        x.assert_code(200)

    def test_io_juggler_input_custom_option_validation(self):
        if not self.in_pin:
            self.skipTest("Input I/O pin is required for this test")

        adc_exists = get_io_pin("adc0")
        acl_exists = get_io_pin("acl0")

        sid = None
        action_sid = None
        cond_sid = None
        with self.subTest("create test section"):
            x = self.post_data(INPUTS_URL, {"name": self.in_pin, "enabled": "0"})
            x.assert_code(201)
            sid = x.resp.json()["data"]["id"]
            x = self.post_data(f"{ACTIONS_URL}", {"ui_name": "tester254", "type":"reboot"})
            x.assert_code(201)
            action_sid = x.resp.json()["data"]["id"]
            x = self.post_data(f"{CONDITIONS_URL}", {"ui_name": "tester254", "type":"minute", "value": "10"})
            x.assert_code(201)
            cond_sid = x.resp.json()["data"]["id"]

        with self.subTest("main test"):

            # "name" option
            for pin in self.pins:
                if (pin["type"] == "gpio" and (pin["direction"] != "out" or (pin["direction"] == "out" and pin["bi_dir"] == "1"))) or \
                        pin["type"] == "dwi" or pin["type"] == "acl" or pin["type"] == "adc":
                    x = self.put_data(
                        f"{INPUTS_URL}/{sid}", {"name": pin["id"], "min": "", "max": "", "acl": "", "min_curr": "", "max_curr": "", "trigger": "both"})
                    if pin["id"] == "adc0":
                        x.assert_code(422)
                        x = self.put_data(
                            f"{INPUTS_URL}/{sid}", {"name": pin["id"], "min": "1", "max": "2"})
                        x.assert_code(200)
                    elif pin["id"] == "acl0":
                        x.assert_code(422)
                        x = self.put_data(
                            f"{INPUTS_URL}/{sid}", {"name": pin["id"], "acl": "current", "min_curr": "5", "max_curr": "6"})
                        x.assert_code(200)
                    else:
                        x.assert_code(200)

            # "trigger" option
            self.clear_section(sid)
            if acl_exists:
                x = self.put_data(f"{INPUTS_URL}/{sid}",
                                  {"name": "acl0", "trigger": "rising"})
                x.assert_code(422)
            if adc_exists:
                x = self.put_data(f"{INPUTS_URL}/{sid}",
                                  {"name": "adc0", "trigger": "rising"})
                x.assert_code(422)
            x = self.put_data(f"{INPUTS_URL}/{sid}",
                              {"name": self.in_pin, "trigger": "rising"})
            x.assert_code(200)

            # "wait" option
            self.clear_section(sid)
            if acl_exists:
                x = self.put_data(
                    f"{INPUTS_URL}/{sid}", {"name": "acl0", "wait": "1", "acl": "current", "min_curr": "5", "max_curr": "6"})
                x.assert_code(422)
            if adc_exists:
                x = self.put_data(
                    f"{INPUTS_URL}/{sid}", {"name": "adc0", "wait": "1", "min": "1", "max": "2"})
                x.assert_code(422)
            x = self.put_data(f"{INPUTS_URL}/{sid}",
                              {"name": self.in_pin, "wait": "1"})
            x.assert_code(200)

            # "inside" option
            self.clear_section(sid)
            if acl_exists:
                x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": "acl0", "acl": "current",
                                  "inside": "1", "min_curr": "5", "max_curr": "6"})
                x.assert_code(200)
            if adc_exists:
                x = self.put_data(
                    f"{INPUTS_URL}/{sid}", {"name": "adc0", "inside": "1", "min": "1", "max": "2"})
                x.assert_code(200)
            x = self.put_data(f"{INPUTS_URL}/{sid}",
                              {"name": self.in_pin, "inside": "1"})
            x.assert_code(422)

            # "min" "max" options
            self.clear_section(sid)
            if adc_exists:
                x = self.put_data(f"{INPUTS_URL}/{sid}",
                                  {"name": "adc0", "min": "1", "max": "2"})
                x.assert_code(200)
                self.assertEqual(x.resp.json()["data"]["min"], "1")
                self.assertEqual(x.resp.json()["data"]["max"], "2")
                x = self.put_data(f"{INPUTS_URL}/{sid}",
                                  {"name": "adc0", "min": "2", "max": "1"})
                x.assert_code(422)
            x = self.put_data(f"{INPUTS_URL}/{sid}",
                              {"name": self.in_pin, "min": "1", "max": "2"})
            x.assert_code(422)

            # "acl" "min_curr" "max_curr" "min_perc" "max_perc" options
            self.clear_section(sid)
            if acl_exists:
                x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": "acl0", "acl": "current", "min_curr": "5", "max_curr": "6"})
                x.assert_code(200)
                x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": "acl0", "acl": "current", "min_curr": "6", "max_curr": "5"})
                x.assert_code(422)
                x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": "acl0", "acl": "percent", "min_perc": "5", "max_perc": "6"})
                x.assert_code(200)
                x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": "acl0", "acl": "percent", "min_perc": "6", "max_perc": "5"})
                x.assert_code(422)
                x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": "acl0", "acl": "current", "min_perc": "5", "max_perc": "6"})
                x.assert_code(422)
                x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": "acl0", "acl": "percent", "min_curr": "5", "min_curr": "6"})
                x.assert_code(422)
            x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": self.in_pin, "acl": "current", "min_curr": "5", "max_curr": "6"})
            x.assert_code(422)
            x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": self.in_pin, "acl": "percent", "min_perc": "5", "max_perc": "6"})
            x.assert_code(422)

            # "actions" option
            self.clear_section(sid)
            x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": self.in_pin, "actions": ["afghadfh"]})
            x.assert_code(422)
            x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": self.in_pin, "actions": ["tester254"]})
            x.assert_code(200)

            # "conditions" option
            self.clear_section(sid)
            x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": self.in_pin, "conditions": ["afghadfh"]})
            x.assert_code(422)
            x = self.put_data(f"{INPUTS_URL}/{sid}", {"name": self.in_pin, "conditions": ["tester254"]})
            x.assert_code(200)


        with self.subTest("delete test sections"):
            x = self.delete(f"{CONDITIONS_URL}/{cond_sid}")
            x.assert_code(200)
            x = self.delete(f"{ACTIONS_URL}/{action_sid}")
            x.assert_code(200)
            x = self.delete(f"{INPUTS_URL}/{sid}")
            x.assert_code(200)

