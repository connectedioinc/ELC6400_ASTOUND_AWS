from utils.io_utils import get_all_io_pins, get_first_out_in_pin_ids
import utility_integration as util
import sys

from utils.general_api import get_modems
sys.path.append("../../../../tests")

http = util.Env.http
api_url = util.Env.get_api_url()
SMS_RULES_URL = "/sms_utilities/rules/config"
CALL_RULES_URL = "/call_utilities/rules/config"
IOJ_INPUTS_URL = "/io/juggler/inputs/config"
IOJ_ACTIONS_URL = "/io/juggler/operations/config"
BASE_URL = "/io/scheduler/config"
DIN1_PIN_NAME = "din1"
OUT_PIN_NAME = "dout1"


class test_io_sched_inst(util.WrapTest):
    pins = None
    _disabled_sms_rules = {}
    _disabled_call_rules = {}
    _disabled_ioj_inputs = {}
    _disabled_io_sched_instances = {}

    @classmethod
    def setUpClass(cls):
        cls.pins = get_all_io_pins()
        cls.disable_all(SMS_RULES_URL)
        cls.disable_all(CALL_RULES_URL)
        cls.disable_all(IOJ_INPUTS_URL)
        cls.disable_all(BASE_URL)
        cls.in_pin, cls.out_pin = get_first_out_in_pin_ids()

    @classmethod
    def tearDownClass(cls):
        cls.enable_all(SMS_RULES_URL)
        cls.enable_all(CALL_RULES_URL)
        cls.enable_all(IOJ_INPUTS_URL)
        cls.enable_all(BASE_URL)

    @classmethod
    def _get_disabled_list(self, url):
        return {
            SMS_RULES_URL: self._disabled_sms_rules,
            CALL_RULES_URL: self._disabled_call_rules,
            IOJ_INPUTS_URL: self._disabled_ioj_inputs,
            BASE_URL: self._disabled_io_sched_instances
        }[url]

    @classmethod
    def enable_all(self, url):
        """Enables all previously disabled (using self.disable_all) configurations"""
        previously_disabled = self._get_disabled_list(url)
        if len(previously_disabled) > 0:
            http.put(api_url + url, json={"data":[
                {"id": s["id"], "enabled": "1"} for s in previously_disabled.values()]})

    @classmethod
    def disable_all(self, url):
        """Disables all configurations"""
        confs_to_disable = self._get_disabled_list(url)
        x = http.get(api_url + url)
        if x.status_code == 200:
            for s in x.json()["data"]:
                if "enabled" in s and s["enabled"] == "1":
                    confs_to_disable[s["id"]] = s
        if len(confs_to_disable) > 0:
            x = http.put(api_url + url, json={"data":[
                {"id": s["id"], "enabled": "0"} for s in confs_to_disable.values()]})



#################### TESTS ####################
    def test_io_sched_inst_range_and_pin_validations(self):
        if not self.out_pin:
            self.skipTest("I/O output pin doesn't exist.")

        with self.subTest("tests if io juggler input/action validation works when no ioj inputs are enabled"):
            x = self.post_data(BASE_URL, {"enabled": "1", "end_time": "12:00", "period": "week",
                                          "start_day": "1", "start_time": "12:00", "end_day": "2", "pin": self.out_pin})

            x.assert_code(201)

            x = self.delete_data(BASE_URL, [x.resp.json()["data"]["id"]])
            x.assert_code(200)

        with self.subTest("tests if io juggler input/action validation works when ioj input is enabled (with actions)"):
            if not self.in_pin:
                self.skipTest("I/O input pin doesn't exist.")

            io_action_id = None

            with self.subTest("create i/o action"):
                x = self.post_data(IOJ_ACTIONS_URL, {
                    "ui_name": "adfgdfg",
                    "type": "reboot"
                })
                io_action_id = x.json["data"]["id"]

            with self.subTest("main test"):

                x = self.post_data(IOJ_INPUTS_URL, {
                    "enabled": "1",
                    "name": self.in_pin,
                    "actions": ["adfgdfg"],
                    "trigger": "rising"
                })
                x.assert_code(201)
                ioj_id = x.resp.json()["data"]["id"]

                x = self.post_data(BASE_URL, {"enabled": "1", "end_time": "12:00", "period": "week",
                                            "start_day": "1", "start_time": "12:00", "end_day": "2", "pin": self.out_pin})
                x.assert_code(201)

                x = self.delete_data(BASE_URL, [x.resp.json()["data"]["id"]])
                x.assert_code(200)
                x = self.delete_data(IOJ_INPUTS_URL, [ioj_id])
                x.assert_code(200)

            with self.subTest("delete i/o action"):
                x = self.delete_data(IOJ_ACTIONS_URL, [io_action_id])
                x.assert_code(200)

        with self.subTest("test_io_sched_range_validation"):
            if not self.out_pin:
                return self.skipTest("I/O output pin doesn't exist.")

            id1, id2 = None, None
            with self.subTest("create test sections"):
                x = self.post_data(BASE_URL, {"pin": self.out_pin, "period": "week",
                                            "enabled": "0", "start_day": "1", "start_time": "10:00", "end_day": "1", "end_time": "13:00"})
                x.assert_code(201)
                id1 = x.resp.json()["data"]["id"]

                x = self.post_data(BASE_URL, {"pin": self.out_pin, "period": "week",
                                            "enabled": "0", "start_day": "1", "start_time": "12:00", "end_day": "1", "end_time": "13:00"})
                x.assert_code(201)
                id2 = x.resp.json()["data"]["id"]

            with self.subTest("main test"):
                x = self.put_data(BASE_URL, [
                    {"id": id2, "enabled": "1"}
                ])
                x.assert_code(200)

                x = self.put_data(BASE_URL, [
                    {"id": id1, "enabled": "1"}, {"id": id2, "enabled": "0"}
                ])
                x.assert_code(200)

                x = self.put_data(BASE_URL, [
                    {"id": id1, "enabled": "1"}, {"id": id2, "enabled": "1"}
                ])
                x.assert_code(422)
                resp = x.resp.json()
                self.assertListEqual(
                    [{"source": "Validation", "code": 16, "error": "Scheduler interval overlaps with already enabled interval of same output pin",
                        "section": id1},
                    {"source": "Validation", "code": 16, "error": "Scheduler interval overlaps with already enabled interval of same output pin",
                        "section": id2}],
                    resp["errors"]
                )

                x = self.put_data(f"{BASE_URL}/{id2}", {"pin": self.out_pin, "period": "week",
                                                        "enabled": "1", "start_day": "1", "start_time": "11:00", "end_day": "1", "end_time": "14:00"})
                x.assert_code(422)
                self.assertEqual(x.json["errors"][0]["code"], 16)
                x = self.put_data(f"{BASE_URL}/{id2}", {"pin": self.out_pin, "period": "week",
                                                        "enabled": "1", "start_day": "1", "start_time": "9:00", "end_day": "1", "end_time": "11:00"})
                x.assert_code(422)
                self.assertEqual(x.json["errors"][0]["code"], 16)
                x = self.put_data(f"{BASE_URL}/{id2}", {"pin": self.out_pin, "period": "week",
                                                        "enabled": "1", "start_day": "1", "start_time": "9:00", "end_day": "1", "end_time": "14:00"})
                x.assert_code(422)
                self.assertEqual(x.json["errors"][0]["code"], 16)
                x = self.put_data(f"{BASE_URL}/{id2}", {"pin": self.out_pin, "period": "week",
                                                        "enabled": "1", "start_day": "1", "start_time": "11:00", "end_day": "1", "end_time": "11:30"})
                x.assert_code(422)
                self.assertEqual(x.json["errors"][0]["code"], 16)
                x = self.put_data(f"{BASE_URL}/{id2}", {"pin": self.out_pin, "period": "week",
                                                        "enabled": "1", "start_day": "1", "start_time": "10:00", "end_day": "1", "end_time": "13:00"})
                x.assert_code(422)
                self.assertEqual(x.json["errors"][0]["code"], 16)

            with self.subTest("delete test sections"):
                x = self.delete_data(BASE_URL, [id1, id2])
                x.assert_code(200)

    def test_io_sched_inst_custom_option_validations(self):
        sid = None
        with self.subTest("create test section"):
            x = self.post_data(BASE_URL, {})
            x.assert_code(201)
            sid = x.resp.json()["data"]["id"]

        with self.subTest("main test"):
            # "pin" option
            for pin in self.pins:
                if (pin["type"] == "gpio" and (pin["direction"] == "out" or pin["bi_dir"] == "1")) or pin["type"] == "relay":
                    x = self.put_data(f"{BASE_URL}/{sid}", {"pin": pin["id"]})
                    x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"pin": "invalid_pin"})
            x.assert_code(422)

            # "start_day" "period" options
            x = self.put_data(f"{BASE_URL}/{sid}", {"period": "week", "start_day": "0", "end_day": "1"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"period": "week", "start_day": "5", "end_day": "6"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"period": "week", "start_day": "-1", "end_day": "-2"})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"period": "week", "start_day": "7", "end_day": "8"})
            x.assert_code(422)

            x = self.put_data(f"{BASE_URL}/{sid}", {"period": "month", "start_day": "1", "end_day": "5"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"period": "month", "start_day": "30", "end_day": "31"})
            x.assert_code(200)
            x = self.put_data(f"{BASE_URL}/{sid}", {"period": "month", "start_day": "32", "end_day": "33"})
            x.assert_code(422)
            x = self.put_data(f"{BASE_URL}/{sid}", {"period": "month", "start_day": "-1", "end_day": "7"})
            x.assert_code(422)
            
        with self.subTest("delete test section"):
            x = self.delete(f"{BASE_URL}/{sid}")
            x.assert_code(200)

    def test_io_sched_inst_custom_validations_in_hook(self):
        if not self.out_pin:
            self.skipTest("I/O output pin doesn't exist.")

        sid = None
        with self.subTest("create test section"):
            x = self.post_data(BASE_URL, {"period": "week", "pin": self.out_pin, "start_day": "1",
                                          "start_time": "11:11", "end_day": "2", "end_time": "12:12"})
            x.assert_code(201)
            sid = x.resp.json()["data"]["id"]

        with self.subTest("main section"):
            # error code 11
            in_pin_id = next((pin["id"] for pin in self.pins if pin.get("direction") == "in" and pin.get("bi_dir") == "1"), None)
            if in_pin_id:
                x = self.put_data(f"{BASE_URL}/{sid}", {"enabled": "1", "pin": in_pin_id})
                x.assert_code(422)
                x.assert_error("pin", "Selected pin is set as \"input\" pin. You can change it to \"output\" in status page", 11)

            # error code 12
            x = self.put_data(f"{BASE_URL}/{sid}", {"enabled": "1", "period": "week", "pin": self.out_pin, "start_day": "1",
                                                    "start_time": "11:11", "end_day": "2", "end_time": "12:12"})
            x.assert_code(200)
            x = self.post_data(f"{BASE_URL}", {"enabled": "1", "period": "month", "pin": self.out_pin, "start_day": "4",
                                               "start_time": "11:11", "end_day": "5", "end_time": "12:12"})
            x.assert_code(422)
            x.assert_error("period", "Only intervals of the same period type can be active at one time", 12)

            # error codes 13, 14
            x = self.put_data(f"{BASE_URL}/{sid}", {"enabled": "0"})
            x.assert_code(200)
            if len(get_modems(self)) > 0:
                x = self.post_data(SMS_RULES_URL, {"enabled": "1", "io": self.out_pin, "smstext": "testerino", "action": "reboot"})
                x.assert_code(201)
                sms_sid = x.resp.json()["data"]["id"]

                x = self.put_data(f"{BASE_URL}/{sid}", {"enabled": "1"})
                x.assert_code(422)
                x.assert_error("pin", "Selected pin is used in SMS Utilites rules. You need to disable the rules in order to use the output scheduler", 13)

                x = self.delete(f"{SMS_RULES_URL}/{sms_sid}")
                x.assert_code(200)

                x = self.post_data(CALL_RULES_URL, {"enabled": "1", "pin": self.out_pin, "action": "dout", "value": "0"})
                x.assert_code(201)
                call_sid = x.resp.json()["data"]["id"]

                x = self.put_data(f"{BASE_URL}/{sid}", {"enabled": "1"})
                x.assert_code(422)
                x.assert_error("pin", "Selected pin is used in Call Utilites rules. You need to disable the rules in order to use the output scheduler", 14)

                x = self.delete(f"{CALL_RULES_URL}/{call_sid}")
                x.assert_code(200)

            # error code 15
            if self.in_pin:
                x = self.post_data(IOJ_ACTIONS_URL, {"ui_name": "tessfgn12", "type": "reboot", "dest": self.out_pin})
                x.assert_code(201)
                act_sid = x.resp.json()["data"]["id"]

                x = self.post_data(IOJ_INPUTS_URL, {"enabled": "1", "name": self.in_pin, "actions": ["tessfgn12"], "trigger": "rising"})
                x.assert_code(201)
                inp_sid = x.resp.json()["data"]["id"]

                x = self.put_data(f"{BASE_URL}/{sid}", {"enabled": "1"})
                x.assert_code(422)
                x.assert_error("pin", "Selected pin is used in I/O Juggler actions. You need to disable the input which uses the action in order to use the output scheduler", 15)

                x = self.delete(f"{IOJ_INPUTS_URL}/{inp_sid}")
                x.assert_code(200)
                x = self.delete(f"{IOJ_ACTIONS_URL}/{act_sid}")
                x.assert_code(200)

            # error code 17
            x = self.put_data(f"{BASE_URL}/{sid}", {"enabled": "1", "period": "week", "pin": self.out_pin, "start_day": "5",
                                                    "start_time": "11:11", "end_day": "5", "end_time": "11:11"})
            x.assert_code(422)
            x.assert_error("Validation", "Starting time is the same as the ending time", 17)


        with self.subTest("delete test section"):
            x = self.delete(f"{BASE_URL}/{sid}")
            x.assert_code(200)
