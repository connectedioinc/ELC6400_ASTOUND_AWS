import sys
import os
import io
sys.path.append(os.path.dirname(__file__))
sys.path.append("../../../../tests")
import utility_integration as util
from utils.io_utils import get_all_io_pins
from utils.ssh import get_ssh
import event_juggler_test_utils as test_utils

EVENT_URL = "/event_juggler/events/config"
EVENT_OPTIONS = "/event_juggler/events/options"
CREATE_CONDITION_URL = "/event_juggler/events/%s/conditions/config"
CONDITION_URL = "/event_juggler/conditions/config"
ACTION_URL = "/event_juggler/operations/config"

class test_event_juggler_events(util.WrapTest):
    @classmethod
    def setUpClass(self):
        self.pins = get_all_io_pins()
        self.ssh = get_ssh()

    @classmethod
    def tearDownClass(self) -> None:
        self.ssh.logout()
    
    def setUp(self):
        self.events = []
        self.event_id = test_utils.create_event(self, {"name":"test1"})["id"]
    
    def tearDown(self):
        self.delete_data(EVENT_URL,[i["id"] for i in self.events]).assert_code(200)

    def test_filter_out_if_from_events_reporting_or_io_juggler(self):
        io_juggler_id = test_utils.create_event(self, {"name":"test2"})["id"]
        events_reporting_id = test_utils.create_event(self, {"name":"test3"})["id"]
        self.ssh.send_cmd("uci set event_juggler."+events_reporting_id+".events_reporting=1")
        self.ssh.send_cmd("uci set event_juggler."+io_juggler_id+".io_juggler=1")
        self.ssh.send_cmd("uci commit event_juggler")
        test_utils.get_item(self,EVENT_URL,io_juggler_id,404)
        test_utils.get_item(self,EVENT_URL,events_reporting_id,404)
        self.ssh.send_cmd("uci set event_juggler."+events_reporting_id+".events_reporting=0")
        self.ssh.send_cmd("uci set event_juggler."+io_juggler_id+".io_juggler=0")
        self.ssh.send_cmd("uci commit event_juggler")

    def test_create_default_action(self):
        self.assertEqual(len(test_utils.get_item(self,EVENT_URL,self.event_id)["actions"]),1)

    def test_enable_switch_on_off_requires(self):
        with self.subTest("disable event"):
            test_utils.create_event(self, {"name":"test2", "plugin":"boot"})
            test_utils.create_event(self, {"name":"test3", "plugin":"boot","enabled":"0"})
        with self.subTest("enable event"):
            test_utils.create_event(self, {"name":"test4","enabled":"1", "plugin":"boot"},422)
            test_utils.create_event(self, {"name":"test4","enabled":"1", "plugin":"boot", "boot_mode":"reboot"})

    def test_check_filter_name_on_event_change(self):
        test_utils.check_plugin(self,"condition","filter")
        test_utils.check_plugin(self,"event","log")
        test_utils.check_plugin(self,"event","boot")
        self.post_data(CREATE_CONDITION_URL %(self.event_id),{"plugin":"filter","filter_name":"event.text", "filter_value":"val", "filter_operator":"eq"}).assert_code(422)
        event = test_utils.create_event(self,{"name":"test2", "plugin":"log"})
        condition = self.post_data(CREATE_CONDITION_URL %(event["id"]),{"plugin":"filter","filter_name":"event.text", "filter_value":"val", "filter_operator":"eq"})
        condition.assert_code(201)
        condition = condition.resp.json()["data"]
        self.put_data(ACTION_URL + "/" + event["actions"][0], {"conditions":[condition["id"]]}).assert_code(200)
        self.put_data(EVENT_URL + "/" +event["id"], {"plugin":"boot"}).assert_error("Validation", "The filter_name option 'event.text' is not valid for the event plugin in section '"+condition["id"]+"'.",113)

    def test_delete(self):
        with self.subTest("delete related actions"):
            event = test_utils.create_event(self, {"name":"test2"})
            self.get(ACTION_URL+"/"+event["actions"][0]).assert_code(200)
            self.delete_data(EVENT_URL,[event["id"]]).assert_code(200)
            del self.events[-1]
            self.get(ACTION_URL+"/"+event["actions"][0]).assert_code(404)
        with self.subTest("delete related conditions"):
            event = test_utils.create_event(self, {"name":"test2"})
            condition = self.post_data(CREATE_CONDITION_URL %(event["id"]),{})
            condition.assert_code(201)
            self.delete_data(EVENT_URL,[event["id"]]).assert_code(200)
            del self.events[-1]
            self.get(CONDITION_URL+"/"+condition.resp.json()["data"]["id"]).assert_code(404)
        with self.subTest("delete related files"):
            test_utils.check_plugin(self,"condition","lua")
            event = test_utils.create_event(self, {"name":"test2"})
            path = test_utils.upload_file(self,CONDITION_URL,1,io.StringIO("file content\n"), "lua_cond_path")["path"]
            self.post_data(CREATE_CONDITION_URL %(event["id"]),{"name":"test","plugin":"lua", "lua_cond_path":path}).assert_code(201)
            self.delete_data(EVENT_URL,[event["id"]]).assert_code(200)
            del self.events[-1]
            self.assertEqual(test_utils.file_exists(path), False)

    
    def test_enable(self):
        with self.subTest("set event enabled status"):
            res = test_utils.get_item(self,EVENT_URL,self.event_id)
            self.put_data(EVENT_URL+"/"+self.event_id,{"enabled":"1"}).assert_code(422)
            self.put_data(EVENT_URL+"/"+self.event_id,{"plugin":"boot","boot_mode":"reboot","enabled":"1"}).assert_code(200)
            self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+res["id"]+".enabled").strip(),"1")
            self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+res["actions"][0]+".enabled").strip(),"0")
        with self.subTest("enable related actions"):
            test_utils.check_plugin(self,"action","reboot")
            self.put_data(ACTION_URL+"/"+res["actions"][0],{"plugin":"reboot"}).assert_code(200)
            self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+res["actions"][0]+".enabled").strip(),"1")
        with self.subTest("enable related conditions"):
            test_utils.check_plugin(self,"condition","time")
            condition = self.post_data(CREATE_CONDITION_URL %(self.event_id),{"plugin":"time", "time_cond_day_type":"weekday"})
            condition.assert_code(201)
            self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+condition.resp.json()["data"]["id"]+".enabled").strip(),"1")

    def test_name(self):
        test_utils.create_event(self,{"name":"test2"})
        test_utils.create_event(self,{"name":"test2"},422)
        
    def test_gsm_options(self): 
        test_utils.check_plugin(self,"event","gsm")
        test_data = {"name":"test3", "plugin":"gsm", "enabled":"1", "gsm_event":"service_mode"}
        test_utils.create_event(self,{**test_data, "name":"test4"})
        test_utils.create_event(self,{**test_data, "gsm_event":"rssi_value"},422)
        test_utils.create_event(self,{**test_data, "gsm_event":"rssi_value", "gsm_signal_trigger":"range", "gsm_signal_range":["12"]},422)
        test_utils.create_event(self,{**test_data, "gsm_event":"rssi_value", "gsm_signal_trigger":"range", "gsm_signal_range":["-140,10"]},422)
        test_utils.create_event(self,{**test_data, "gsm_event":"rssi_value", "gsm_signal_trigger":"range", "gsm_signal_range":["-10,-20"]},422)
        test_utils.create_event(self,{**test_data, "gsm_event":"rssi_value", "gsm_signal_trigger":"range", "gsm_signal_range":["-20,-10"]})

    def test_io_options(self): 
        test_utils.check_plugin(self,"event","io")
        acceptible_pins = filter(lambda pin: pin["type"] in ["adc", "acl", "dwi"] or (pin["type"] == "gpio" and (pin["direction"] != "out" or (pin["direction"] == "out" and pin["bi_dir"] == True))), self.pins)
        test_data={"name":"test2","plugin":"io", "io_name":"*","enabled":"1"}
        test_utils.create_event(self,test_data,422)
        for pin in acceptible_pins:
            test_data["name"] +="1"
            if pin["type"] == "acl":
                test_utils.create_event(self,{**test_data, "io_name":pin["id"], "io_acl":"current", "io_min":"10", "io_max":"10"},422)
                test_utils.create_event(self,{**test_data, "io_name":pin["id"], "io_acl":"current", "io_inside":"0", "io_min":"11", "io_max":"10"},422)
                test_utils.create_event(self,{**test_data, "io_name":pin["id"], "io_acl":"current", "io_inside":"0", "io_min":"10", "io_max":"11", "io_trigger":"rising"},422)
                test_utils.create_event(self,{**test_data, "io_name":pin["id"], "io_acl":"current", "io_inside":"0", "io_min":"10", "io_max":"11"})
            elif pin["type"] == "adc":
                test_utils.create_event(self,{**test_data, "io_name":pin["id"], "io_acl":"current", "io_inside":"0", "io_min":"10", "io_max":"11"},422)
                test_utils.create_event(self,{**test_data, "io_name":pin["id"], "io_inside":"0", "io_min":"10", "io_max":"11"})
            elif pin["type"] == "dwi" or pin["type"] == "gpio":
                test_utils.create_event(self,{**test_data, "io_name":pin["id"]},422)
                test_utils.create_event(self,{**test_data, "io_name":pin["id"], "io_trigger":"rising"})

    def test_log_options(self):
        test_utils.check_plugin(self,"event","log")
        log_list = self.get(EVENT_OPTIONS)
        log_list.assert_code(200)
        log_list = log_list.resp.json()["data"]["log_events"]
        log_event = list(log_list)[0]
        log_event_mark = log_list[log_event][0]
        test_data = {"name":"test2", "plugin":"log", "enabled":"1"}
        test_utils.create_event(self,{**test_data},422)
        test_utils.create_event(self,{**test_data,"log_event":log_event},422)
        test_utils.create_event(self,{**test_data,"log_event_mark":log_event_mark},422)
        test_utils.create_event(self,{**test_data,"log_event":log_event, "log_event_mark":log_event_mark})
    
    def test_time_options(self):
        test_utils.check_plugin(self,"event","time")
        test_data = {"name":"test2", "plugin":"time", "enabled":"1"}
        test_utils.create_event(self,{**test_data},422)
        test_utils.create_event(self,{**test_data, "time_day_type":"days"})
        event_id = test_utils.create_event(self,{**test_data,"name":"test3", "time_day_type":"days", "time_month":["jan","feb"]})["id"]
        self.assertEqual(test_utils.get_item(self,EVENT_URL,event_id)["time_month"],["jan","feb"])
        event_id = test_utils.create_event(self,{**test_data,"name":"test4", "time_day_type":"days", "time_weekday":["mon","tue"]})["id"]
        self.assertEqual(test_utils.get_item(self,EVENT_URL,event_id)["time_weekday"],["mon","tue"])


