import utility_integration as util
import sys

from utils.ssh import open_ssh_connection, send_cmd
sys.path.append("../../../../tests")
ALL_PIN_STATUS_URL = "/io/status"
ONE_PIN_STATUS_URL = "/io/{}/status"
CHANGE_STATE_URL = "/io/{}/actions/change_state"
WRITABLE_OPTIONS = [
    "value",
    "invert_input",
    "state",
    "direction"
]


class test_io_status(util.WrapTest):

    def get_available_option_values(self, pin):
        w_pin = self.get_pin_writable_options(pin)
        if not w_pin:
            return None
        options = {}
        for opt in w_pin:
            if opt == "value":
                options[opt] = ["0", "1"]
            if opt == "invert_input":
                options[opt] = ["0", "1"]
            if opt == "state":
                if "dwi" in pin["type"] or "dwi" in pin["id"]:
                    options[opt] = ["dry", "wet"]
                if "acl" in pin["type"] or "acl" in pin["id"]:
                    options[opt] = ["active", "inactive"]
                if "relay" in pin["type"] or "relay" in pin["id"]:
                    options[opt] = ["open", "closed"]
            if opt == "direction":
                if "dio" in pin["type"] or "dio" in pin["id"]:
                    options[opt] = ["in", "out"]

        return options

    def get_pin_writable_options(self, pin):
        w_pin = {}
        if pin["id"] == "adc0":
            return None
        for o in WRITABLE_OPTIONS:
            if o in pin:
                if o == "direction" and "dio" not in pin["id"]:
                    continue
                if o == "value" and ("dio" not in pin["id"] and "direction" in pin and pin["direction"] != "out") or ("dwi" in pin["id"]) \
                    or ("direction" in pin and  pin["direction"] != "out"):
                    continue
                w_pin[o] = pin[o]
        return w_pin

    def test_io_status_writable_options(self):
        pins = None
        x = self.get(ALL_PIN_STATUS_URL)
        x.assert_code(200)
        pins = x.resp.json()["data"]

        with self.subTest("main test"):
            for pin in pins:
                pin_options = self.get_available_option_values(pin)
                if not pin_options:
                    continue
                for opt in pin_options:
                    for val in pin_options[opt]:
                        x = self.post_data(CHANGE_STATE_URL.format(pin["id"]), {opt:val})
                        x.assert_code(200)
                        self.assertEqual(x.resp.json()["data"][opt], val)

        with self.subTest("reset initial pin state"):
            for pin in pins:
                pin_options = self.get_pin_writable_options(pin)
                if pin_options:
                    x = self.post_data(CHANGE_STATE_URL.format(pin["id"]), pin_options)
                    x.assert_code(200)

    def test_io_status_structure(self):
        required_keys = ["io_name", "io_param", "type",
                         "block_type", "block_pins", "block_index", "id"]
        optional_keys = ["bi_dir", "value",
                         "invert_input", "state", "direction"]

        def check_pin(pin):
            for key in required_keys:
                self.assertIn(key, pin)

            if "bi_dir" in pin:
                self.assertTrue(pin["bi_dir"] == "1" or pin["bi_dir"] == "0")

            if "value" in pin:
                self.assertTrue(pin["value"] == "1" or pin["value"] == "0" or isinstance(
                    pin["value"], (int, float)))

            if "invert_input" in pin:
                self.assertTrue(pin["invert_input"] ==
                                "1" or pin["invert_input"] == "0")

        x = self.get(ALL_PIN_STATUS_URL)

        x.assert_code(200)

        data = x.resp.json()["data"]

        for pin in data:
            # check single GET
            x = self.get(ONE_PIN_STATUS_URL.format(pin["id"]))
            pin_data = x.resp.json()["data"]
            check_pin(pin_data)

        for pin in data:
            # check GET all
            check_pin(pin)

    def test_io_status_all_pins_returned(self):
        x = self.get(ALL_PIN_STATUS_URL)
        x.assert_code(200)

        pins = x.resp.json()["data"]
        io_ids = [pin["id"] for pin in pins]

        with open_ssh_connection() as ssh:
            res = send_cmd(ssh, "ubus list ioman.* | grep -v .therm.").strip()
            for line in res.split():
                parts = line.split(".")
                io_id = parts.pop()
                self.assertIn(io_id, io_ids)              

    def test_io_status_structure(self):
        required_keys = ["io_name", "io_param", "type", "block_type", "block_pins", "block_index", "id"]
        optional_keys = ["bi_dir", "value", "invert_input", "state", "direction"]
        def check_pin(pin):
            for key in required_keys:
                self.assertIn(key, pin)

            if "bi_dir" in pin:
                self.assertTrue(pin["bi_dir"] == "1" or pin["bi_dir"] == "0")

            if "value" in pin:
                self.assertTrue(pin["value"] == "1" or pin["value"] == "0" or isinstance(pin["value"], (int, float)))

            if "invert_input" in pin:
                self.assertTrue(pin["invert_input"] == "1" or pin["invert_input"] == "0")

        x = self.get(ALL_PIN_STATUS_URL)
        x.assert_code(200)
        data = x.resp.json()["data"]

        for pin in data:
            x = self.get(ONE_PIN_STATUS_URL.format(pin["id"]))
            pin_data = x.resp.json()["data"]
            check_pin(pin_data)

        for pin in data:
            check_pin(pin)
