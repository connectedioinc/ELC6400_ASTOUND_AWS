from utils.io_utils import get_all_io_pins, get_first_out_in_pin_ids
import utility_integration as util
from utility_integration import Env
import sys
sys.path.append("../../../../tests")
BASE_URL = "/io/juggler/conditions/config"
INPUTS_URL = "/io/juggler/inputs/config"
ACTIONS_URL = "/io/juggler/operations/config"
CONDITION_LIMIT = 10

class test_io_juggler_condition(util.WrapTest):
    pins = None

    @classmethod
    def setUpClass(cls):
        cls.pins = get_all_io_pins()
        cls.in_pin, cls.out_pin = get_first_out_in_pin_ids()

    def test_io_juggler_condition_time_option_validation(self):
        sid = None
        sid2 = None
        with self.subTest("create test section"):
            x = self.post_data(BASE_URL, {"type": "minute",
                                          "ui_timetype": "0",
                                          "ui_name": "testor132",
                                          "month_override": "",
                                          "operation": "",
                                          "conditions": "",
                                          "ui_timetype": "",
                                          "value": "",
                                          "interval1": "",
                                          "interval2": "",
                                          "state": "",
                                          "min": "",
                                          "max": "",
                                          "acl": "",
                                          "min_perc": "",
                                          "max_perc": "",
                                          "min_curr": "",
                                          "max_curr": ""
                                          })
            x.assert_code(201)
            sid = x.resp.json()["data"]["id"]
            x = self.post_data(BASE_URL, {"type": "minute","ui_name": "pastor132", "value": "10"})
            x.assert_code(201)
            sid2 = x.resp.json()["data"]["id"]

        with self.subTest("main test"):

            # "ui_name" option
            x = self.put_data(f"{BASE_URL}/{sid}", {"uin_name": "testor132"})
            x.assert_code(422)

            # "type" option
            type_vals = ["io", "minute", "hour", "weekday", "monthday", "yearday", "bool"]
            adc = False
            acl = False
            for pin in self.pins:
                if pin["type"] == "adc":
                    adc = True
                if pin["type"] == "acl":
                    acl = True
            if (adc and acl) or (adc and not acl):
                type_vals.append("analog")

            for _type in type_vals:
                x = self.put_data(f"{BASE_URL}/{sid}", {"type": _type})
                self.assertIn(x.resp.status_code, [200, 422])
                if x.resp.status_code == 422:
                    self.assertIn("required", x.resp.json()["errors"][0]["error"].lower())
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "ggggg"})
            x.assert_code(422)
            for _type in ["minute", "hour", "weekday", "monthday", "yearday"]:
                x = self.put_data(f"{BASE_URL}/{sid}",
                                  {"type": _type, "value": "5."})
                x.assert_code(422)
                x = self.put_data(f"{BASE_URL}/{sid}",
                                  {"type": _type, "value": "5.1"})
                x.assert_code(422)
                x = self.put_data(f"{BASE_URL}/{sid}",
                                  {"type": _type, "value": "10000"})
                x.assert_code(422)
                x = self.put_data(f"{BASE_URL}/{sid}",
                                  {"type": _type, "value": "5"})
                x.assert_code(200)


            # "name" option
            for pin in self.pins:
                if pin["type"] == "gpio" or pin["type"] == "dwi" or pin["type"] == "relay":
                    x = self.put_data(f"{BASE_URL}/{sid}", {"name": pin["id"]})
                    x.assert_code(200)
                if pin["type"] == "acl":
                    x = self.put_data(f"{BASE_URL}/{sid}", {"name": pin["id"], "acl": "current", "min_curr": "5", "max_curr": "6"})
                    x.assert_code(200)
                if pin["type"] == "adc":
                    x = self.put_data(f"{BASE_URL}/{sid}", {"name": pin["id"], "min": "5", "max": "6"})
                    x.assert_code(200)

            # "operation" option
            for val in ["and", "nand", "or", "nor"]:
                x = self.put_data(f"{BASE_URL}/{sid}", {"operation": val})
                self.assertEqual(x.resp.json()["data"]["operation"], val)
            x = self.put_data(f"{BASE_URL}/{sid}", {"operation": "invalid"})
            x.assert_code(422)

            # "min" "max" options
            pin_types = [ pin["type"] for pin in self.pins ]
            if "adc" in pin_types:
                x = self.put_data(f"{BASE_URL}/{sid}", {"name": "adc0", "min": "5", "max": "6"})
                x.assert_code(200)
                x = self.put_data(f"{BASE_URL}/{sid}", {"name": "adc0", "min": "6", "max": "5"})
                x.assert_code(422)
            if "acl" in pin_types:
                x = self.put_data(f"{BASE_URL}/{sid}", {"name": "acl0", "acl": "current", "min_curr": "5", "max_curr": "6"})
                x.assert_code(200)
                x = self.put_data(f"{BASE_URL}/{sid}", {"name": "acl0", "acl": "current", "min_curr": "6", "max_curr": "5"})
                x.assert_code(422)
                x = self.put_data(f"{BASE_URL}/{sid}", {"name": "acl0", "acl": "percent", "min_perc": "5", "max_perc": "6"})
                x.assert_code(200)
                x = self.put_data(f"{BASE_URL}/{sid}", {"name": "acl0", "acl": "percent", "min_perc": "6", "max_perc": "5"})
                x.assert_code(422)


            # "conditions" option
            x = self.put_data(f"{BASE_URL}/{sid}", {"conditions":["pastor132"]})
            x.assert_code(200)
            cond_section = self.get_section("event_juggler", sid)["values"]
            cond2_section = self.get_section("event_juggler", sid2)["values"]
            self.assertEqual(cond_section["bool_conditions"][0], cond2_section[".name"])
            x = self.put_data(f"{BASE_URL}/{sid}", {"conditions":["invalid"]})
            x.assert_code(422)

        with self.subTest("delete test section"):
            x = self.delete(f"{BASE_URL}/{sid2}")
            x.assert_code(200)
            x = self.delete(f"{BASE_URL}/{sid}")
            x.assert_code(200)

    def test_iojuggler_condition_limit(self):
        x = self.get(BASE_URL)
        action_count = len(x.resp.json()["data"])

        created_sids = []
        for i in range(CONDITION_LIMIT - action_count):
            x = self.post_data(BASE_URL, {"ui_name": f"tester{i}", "type": "minute"})
            x.assert_code(201)
            created_sids.append(x.resp.json()["data"]["id"])

        x = self.post_data(BASE_URL, {"ui_name": f"tester20", "type": "minute"})
        x.assert_code(422)

        x = self.delete_data(BASE_URL, created_sids)
        x.assert_code(200)

    def test_iojuggler_condition_deletion_in_input_action_and_other_conditions(self):
        if not self.in_pin:
            self.skipTest("Test requires input pin")

        ui_name = "tester120"
        input_sid = None
        action_sid = None
        sid = None
        cond_sid = None
        with self.subTest("create test section"):
            x = self.post_data(INPUTS_URL, {"name": self.in_pin, "trigger": "both"})
            x.assert_code(201)
            input_sid = x.resp.json()["data"]["id"]

            x = self.post_data(BASE_URL, {"ui_name": "tester20", "type": "minute", "value": "10"})
            x.assert_code(201)
            cond_sid = x.resp.json()["data"]["id"]

            x = self.post_data(ACTIONS_URL, {"ui_name": "tester200", "type": "reboot"})
            x.assert_code(201)
            action_sid = x.resp.json()["data"]["id"]

            x = self.post_data(BASE_URL, {"ui_name": ui_name, "type": "minute", "value": "10"})
            x.assert_code(201)
            sid = x.resp.json()["data"]["id"]

        with self.subTest("main test"):
            x = self.put_data(f"{ACTIONS_URL}/{action_sid}", {"conditions":[ui_name]})
            x.assert_code(200)
            x = self.put_data(f"{INPUTS_URL}/{input_sid}", {"conditions":[ui_name]})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{cond_sid}", {"conditions":[ui_name]})
            x.assert_code(200)
            x = self.delete(f"{BASE_URL}/{sid}")
            x.assert_code(200)
            x = self.get(f"{INPUTS_URL}/{input_sid}")
            self.assertNotIn("conditions", x.resp.json()["data"])
            x = self.get(f"{ACTIONS_URL}/{action_sid}")
            self.assertNotIn("conditions", x.resp.json()["data"])
            x = self.get(f"{BASE_URL}/{cond_sid}")
            self.assertNotIn("conditions", x.resp.json()["data"])

        with self.subTest("delete test section"):
            x = self.delete(f"{BASE_URL}/{sid}")
            x = self.delete(f"{ACTIONS_URL}/{action_sid}")
            x = self.delete(f"{BASE_URL}/{cond_sid}")
            x = self.delete(f"{INPUTS_URL}/{input_sid}")

    def test_iojuggler_condition_custom_requires(self):
        sid = None
        sid2 = None
        sid3 = None
        with self.subTest("create test section"):
            x = self.post_data(BASE_URL, {"type": "minute","ui_name": "pastor132", "value": "10"})
            x.assert_code(201)
            sid = x.resp.json()["data"]["id"]
            x = self.post_data(BASE_URL, {"type": "minute", "ui_name": "blatatata", "value": "10"})
            x.assert_code(201)
            sid2 = x.resp.json()["data"]["id"]
            x = self.post_data(BASE_URL, {"type": "minute", "ui_name": "ratatata", "value": "10"})
            x.assert_code(201)
            sid3 = x.resp.json()["data"]["id"]

        with self.subTest("main test"):
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "io"})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "io", "state": "0"})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "io", "name": self.out_pin, "state": "0"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "minute", "ui_timetype": "0", "value": ""})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "minute", "ui_timetype": "0", "value": "5"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "minute", "ui_timetype": "1", "interval1": ""})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "minute", "ui_timetype": "1", "interval2": ""})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "minute", "ui_timetype": "1", "interval1": "5", "interval2": "6"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "bool", "operation": ""})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "bool", "operation": "or"})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"type": "bool", "operation": "or", "conditions": ["blatatata", "ratatata"]})
            x.assert_code(200)
            if any(pin["type"] == "adc" for pin in self.pins):
                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "analog", "name": "adc0", "min": "", "max": ""})
                x.assert_code(422)
                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "analog", "name": "adc0", "min": "5", "max": "6", "not": "0"})
                x.assert_code(200)
            if any(pin["type"] == "adc" for pin in self.pins):
                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "analog", "acl": "current", "name": "acl0", "min_curr": "", "max_curr": ""})
                x.assert_code(422)
                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "analog", "acl": "current", "name": "acl0", "min_curr": "5", "max_curr": "6"})
                x.assert_code(200)
                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "analog", "acl": "percent", "name": "acl0", "min_perc": "", "max_perc": ""})
                x.assert_code(422)
                x = self.put_data(f"{BASE_URL}/{sid}", {"type": "analog", "acl": "percent", "name": "acl0", "min_perc": "5", "max_perc": "6"})
                x.assert_code(200)

        with self.subTest("delete test section"):
            x = self.delete_data(BASE_URL, [sid, sid2, sid3])
            x.assert_code(200)