import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import get_modems, generate_require_error_messages, is_package_installed
import response_codes as codes

http = Env.http
api_url = Env.get_api_url()
RC = codes.ResponseCodes

class test_snmp_trap_rules(WrapTest):
    url_trap_rules= "/snmp/trap/config"
    pins = []

    @classmethod
    def setUpClass(cls):
        x = Env.http.get(Env.get_api_url() + "/io/status")
        if x.status_code == 200:
            for io in x.json()["data"]:
                cls.pins.append(io["id"])

    def update_state(self, sid, state, pin, io_from="", io_to=""):
        if io_from == "" and io_to =="":
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "type": "iotrap",
                "name": pin,
                "state": state,
                "from": "",
                "to": ""
            }).assert_data({
                "state": state,
                ".type": "trap",
                "name": pin,
                "type": "iotrap"
            }, skippable_options=["id"])

        if not (io_to == "" and io_from ==""):
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "type": "iotrap",
                "name": pin,
                "state": state,
                "from": io_from,
                "to": io_to,
            }).assert_data({
                "state": state,
                ".type": "trap",
                "name": pin,
                "type": "iotrap",
                "from": io_from,
                "to": io_to
            }, skippable_options=["id"])

    def test_snmp_trap_rules_io(self):
        if len(self.pins) == 0:
            self.skipTest("Device does not have IO pins")

        x= self.post_data(self.url_trap_rules, {})
        x.assert_code(201)
        sid = x.resp.json()["data"]["id"]

        with self.subTest("check state option"):
            for pin in self.pins:
                if ("din" in pin or "dout" in pin or "iio" in pin or "dio" in pin):
                    self.update_state(sid, "active", pin)
                    self.update_state(sid, "inactive", pin)
                
                if ("relay0" in pin or "relay1" in pin):
                    self.update_state(sid, "open", pin)
                    self.update_state(sid, "closed", pin)

                if ("dwi0" in pin or "dwi1" in pin):
                    self.update_state(sid, "rising", pin)
                    self.update_state(sid, "falling", pin)

                if ("adc0" in pin or "acl0" in pin or "pwr0" in pin):
                    self.update_state(sid, "in_range", pin, "5", "10")
                    self.update_state(sid, "out_of_range", pin, "5", "10")
                    x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                        "type": "iotrap",
                        "name": pin,
                        "state": "in_range",
                        "from": "10",
                        "to": "9",
                    })
                    x.assert_error("Validation", "'from' option is bigger or equal to 'to' option", RC.INVALID_OPT.val())

        with self.subTest("clear config"):
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "enabled": "",
                "name": "",
                "type": "",
                "state": "",
                "from": "",
                "to": ""
            }).assert_code(200)

        with self.subTest("check enable depedency"):           
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "enabled": '1'
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["type"]))
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "enabled": '1',
                "type": "iotrap"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["name", "state"]))
            if "adc0" in self.pins:
                x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                    "enabled": '1',
                    "type": "iotrap",
                    "name": "adc0"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["state", "from", "to"]))
            if "pwr0" in self.pins:
                x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                    "enabled": '1',
                    "type": "iotrap",
                    "name": "pwr0"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["state", "from", "to"]))
            if "acl0" in self.pins:
                x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                    "enabled": '1',
                    "type": "iotrap",
                    "name": "acl0"
                })
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["state", "from", "to"]))
        
        x = self.delete(f"{self.url_trap_rules}/{sid}")
        x.assert_data({
            "id": sid
        })

    def test_snmp_trap_rules_gsm(self):
        modems = get_modems(self)
        if len(modems) == 0:
            self.skipTest("Device does not have GSM")
        
        x= self.post_data(self.url_trap_rules, {})
        x.assert_code(201)
        sid = x.resp.json()["data"]["id"]

        with self.subTest("check singal option, when name is signalstrtrap"):
            for modem in modems:
                x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                    "enabled": "0",
                    ".type": "trap",
                    "name": "signalstrtrap",
                    "type": "gsm",
                    "signal": "-69",
                    "modem": modem["id"]
                }).assert_data({
                    "id": sid,
                    "enabled": "0",
                    ".type": "trap",
                    "name": "signalstrtrap",
                    "type": "gsm",
                    "signal": "-69",
                    "modem": modem["id"]
                })

        with self.subTest("clear config"):
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "enabled": "",
                "name": "",
                "type": "",
                "signal": "",
                "modem": ""
            })

        with self.subTest("check enable depedency"): 
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "enabled": "1"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["type"]))
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "enabled": "1",
                "type": "gsm"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["name"]))
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "enabled": "1",
                "type": "gsm",
                "name": "signalstrtrap"
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["signal"]))

        x = self.delete(f"{self.url_trap_rules}/{sid}")
        x.assert_data({
            "id": sid
        })

    def test_snmp_trap_rules_chilli(self):

        if not is_package_installed(self, "hotspot"):
            self.skipTest("Device does not have installed coova-chilli package")
        
        x= self.post_data(self.url_trap_rules, {})
        x.assert_code(201)
        sid = x.resp.json()["data"]["id"]

        x = self.put_data(f"{self.url_trap_rules}/{sid}", {
            "enabled": "1",
            "type": "chilli",
            "name": "connectedtrap",
        }).assert_code(200)

        x = self.put_data(f"{self.url_trap_rules}/{sid}", {
            "enabled": "1",
            "type": "chilli",
            "name": "disconnectedtrap",
        }).assert_code(200)

        x = self.put_data(f"{self.url_trap_rules}/{sid}", {
            "enabled": "1",
            "type": "chilli",
            "name": "blatatata",
        })

        x.assert_error("name", "Must be one of the following values [connectedtrap, disconnectedtrap].", RC.INVALID_OPT.val())

        x = self.delete(f"{self.url_trap_rules}/{sid}")
        x.assert_data({
            "id": sid
        })

    def test_snmp_trap_rules_eventslog(self):
        x= self.post_data(self.url_trap_rules, {})
        x.assert_code(201)
        sid = x.resp.json()["data"]["id"]

        x = self.put_data(f"{self.url_trap_rules}/{sid}", {
            "enabled": "1",
            "type": "eventtrap",
            "event": "Config",
            "event_mark": "all"
        }).assert_code(200)

        x = self.put_data(f"{self.url_trap_rules}/{sid}", {
            "enabled": "1",
            "type": "eventtrap",
            "event": "blatatata",
        })
        
        if (x.json["errors"][0]["error"] and x.json["errors"][0]["source"] == "event" and
            not "Must be one of the following values" in x.json["errors"][0]["error"]): 
            self.assertFalse(x.resp.status_code, "Expected error message, which says 'event' option is wrong.")

        x = self.put_data(f"{self.url_trap_rules}/{sid}", {
            "enabled": "1",
            "type": "eventtrap",
            "event": "Config",
            "event_mark": "blatatata"
        })

        if (x.json["errors"][0]["error"] and x.json["errors"][0]["source"] == "event_mark" and
            not "Must be one of the following values" in x.json["errors"][0]["error"]): 
            self.assertFalse(x.resp.status_code, "Expected error message, which says 'event_mark' option is wrong.")

        with self.subTest("test if 'name' option is always added for 'type'='eventtrap'"):
            x = self.put_data(f"{self.url_trap_rules}/{sid}", {
                "enabled": "0",
                "type": "eventtrap",
                "name": ""
            })
            self.assertEqual(x.json["data"]["name"], "log_event")

        x = self.delete(f"{self.url_trap_rules}/{sid}")
        x.assert_data({
            "id": sid
        })