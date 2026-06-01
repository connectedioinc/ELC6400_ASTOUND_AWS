import sys
import os
import io
sys.path.append(os.path.dirname(__file__))
sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import get_ssh
from utils.io_utils import get_all_io_pins
import event_juggler_test_utils as test_utils

http = util.Env.http
api_url = util.Env.get_api_url()

CONDITION_URL = "/event_juggler/conditions/config"
EVENT_URL = "/event_juggler/events/config"
ACTION_URL = "/event_juggler/operations/config"
CREATE_CONDITION = "/event_juggler/events/%s/conditions/config"
CREATE_ACTION = "/event_juggler/events/%s/operations/config"
DOWNLOAD_LUA_EXAMPLE = "/event_juggler/conditions/actions/download_example_condition_lua"

PLUGIN = {"plugin":"time", "time_cond_day_type":"weekday"}
CONDITION_LIMIT = test_utils.get_limit("max_conditions")

class test_event_juggler_conditions(util.WrapTest):
    @classmethod
    def setUpClass(self):
        self.pins = get_all_io_pins()
        self.ssh = get_ssh()

    @classmethod
    def tearDownClass(self) -> None:
        self.ssh.logout()
    
    def setUp(self):
        self.events = []
        self.event_id = test_utils.create_event(self,{"name":"test1"})["id"]
 
    def tearDown(self):
        self.delete_data(EVENT_URL,[i["id"] for i in self.events]).assert_code(200)

    def create_condition(self,id,data = {}, code = 201):
        res = self.post_data(CREATE_CONDITION % (id), data)
        res.assert_code(code)
        return res.resp.json()["data"] if "data" in res.resp.json() else None
    
    def delete_conditions(self,data, code=200):
        self.delete_data(CONDITION_URL,data).assert_code(code)

    def update_condition(self,id,data):
        res = self.put_data(CONDITION_URL  + "/" + id, data)
        res.assert_code(200)
        return res.resp.json()["data"]

    def test_create_default(self):
        null_id = self.create_condition(self.event_id)["id"]
        self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+null_id+".enabled").strip(),"0")
        empty_string_id = self.create_condition(self.event_id,{"plugin":""})["id"]
        self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+empty_string_id+".enabled").strip(),"0")
        plugin_id = self.create_condition(self.event_id,PLUGIN)["id"]
        self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+plugin_id+".enabled").strip(),"1")
        event = test_utils.get_item(self,EVENT_URL, self.event_id)
        self.assertEqual(event["available_conditions"],[null_id, empty_string_id, plugin_id])

    def test_filter_out_if_from_events_reporting_or_io_juggler(self):
        io_juggler = self.create_condition(self.event_id)["id"]
        events_reporting = self.create_condition(self.event_id)["id"]
        self.ssh.send_cmd("uci set event_juggler."+io_juggler+".events_reporting=1")
        self.ssh.send_cmd("uci set event_juggler."+events_reporting+".io_juggler=1")
        self.ssh.send_cmd("uci commit event_juggler")
        test_utils.get_item(self,CONDITION_URL,io_juggler,404)
        test_utils.get_item(self,CONDITION_URL,events_reporting,404)

    def test_do_not_allow_create_without_binding(self):
        self.post_data(CONDITION_URL,{}).assert_code(405)

    def test_condition_limit(self):
        res = test_utils.get_item(self,EVENT_URL, self.event_id)
        count = len(res["available_conditions"] if "available_conditions" in res else [])
        [self.create_condition(self.event_id,{}) for i in range(count, CONDITION_LIMIT)]
        self.create_condition(self.event_id,{},422)

    def test_put_set_enabled(self):
        condition_id = self.create_condition(self.event_id)["id"]
        self.update_condition(condition_id, {"plugin":""})
        self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+condition_id+".enabled").strip(),"0")

    def test_delete_on_bool_plugin(self):
        first_id = self.create_condition(self.event_id)["id"]
        second_id = self.create_condition(self.event_id)["id"]
        bool_condition = self.create_condition(self.event_id,{ "plugin":"bool", "bool_operation":"and", "bool_conditions":[first_id, second_id]})
        self.delete_conditions([first_id])
        bool_res = test_utils.get_item(self,CONDITION_URL, bool_condition["id"])
        self.assertEqual(bool_res["bool_conditions"], [second_id])

    def test_delete_remove_from_action_conditions(self):
        first_id = self.create_condition(self.event_id)["id"]
        second_id = self.create_condition(self.event_id)["id"]
        action = self.post_data(CREATE_ACTION % (self.event_id),{"conditions":[first_id, second_id]})
        action.assert_code(201)
        self.delete_conditions([first_id])
        self.assertEqual(test_utils.get_item(self,ACTION_URL, action.resp.json()["data"]["id"])["conditions"],[second_id])

    def test_plugin_option(self):
        self.create_condition(self.event_id,PLUGIN)
        self.create_condition(self.event_id,{"plugin":"*"},422)
       
    def test_name_option(self):
        self.create_condition(self.event_id, {"name":"test1"})
        self.create_condition(self.event_id, {"name":"test1"},422)

    def test_bool_options(self):
        test_utils.check_plugin(self,"condition","bool")
        test_data = {"plugin":"bool", "bool_operation":"and"}
        first_id = self.create_condition(self.event_id)["id"]
        second_id = self.create_condition(self.event_id)["id"]
        test_data["bool_conditions"]="*"
        self.create_condition(self.event_id,test_data,422)
        test_data["bool_conditions"]=[first_id]
        self.create_condition(self.event_id,test_data,422)
        test_data["bool_conditions"]=[first_id, second_id]
        self.create_condition(self.event_id, test_data)

    def test_plugin_option_remove_filter_option(self):
        test_utils.check_plugin(self,"condition","filter")
        test_utils.check_plugin(self,"event","log")
        self.create_condition(self.event_id,{"plugin":"filter","filter_name":"io.name", "filter_value":"val", "filter_operator":"eq"},422)
        io_event = test_utils.create_event(self,{"name":"test2", "plugin":"log"})
        self.create_condition(io_event["id"], {"plugin":"filter","filter_name":"event.text", "filter_value":"val", "filter_operator":"eq"})

    def test_filter_options(self):
        test_utils.check_plugin(self,"condition","filter")
        test_utils.check_plugin(self,"event","log")
        test_data =  {"plugin":"filter","filter_name":"io.name", "filter_value":"val", "filter_operator":"eq"}
        io_event_id = test_utils.create_event(self,{"name":"test2", "plugin":"log"})["id"]
        test_data["filter_name"]="*"
        self.create_condition(io_event_id,test_data,422)
        test_data["filter_name"]="event.text"
        self.create_condition(io_event_id, test_data)
        test_data["filter_name"] = "ge"
        self.create_condition(io_event_id,test_data,422)

    def test_io_options(self):
        test_utils.check_plugin(self,"condition","io")
        io_event_id = test_utils.create_event(self,{"name":"test2", "plugin":"io"})["id"]
        acceptible_pins = filter(lambda pin: pin["type"] in ["adc", "acl", "dwi", "relay"] or (pin["type"] == "gpio" and (pin["direction"] != "out" or (pin["direction"] == "out" and pin["bi_dir"] == True))), self.pins)
        test_data={"plugin":"io", "io_cond_name":"*"}
        self.create_condition(io_event_id,test_data,422)
        for pin in acceptible_pins:
            if pin["type"] == "acl":
                self.create_condition(io_event_id, {**test_data, "io_cond_name":pin["id"], "io_cond_acl":"current", "io_cond_min":"10", "io_cond_max":"10"},422)
                self.create_condition(io_event_id, {**test_data, "io_cond_name":pin["id"], "io_cond_acl":"current", "io_cond_min":"10", "io_cond_max":"11"})
            elif pin["type"] == "adc":
                self.create_condition(io_event_id, {**test_data, "io_cond_name":pin["id"], "io_cond_min":"10", "io_cond_max":"10"},422)
                self.create_condition(io_event_id, {**test_data, "io_cond_name":pin["id"], "io_cond_min":"10", "io_cond_max":"11"})
            elif pin["type"] in ["dwi", "relay", "gpio"]:
                self.create_condition(io_event_id, {**test_data, "io_cond_name":pin["id"]},422)
                self.create_condition(io_event_id, {**test_data, "io_cond_name":pin["id"], "io_cond_state":"1"})
            else:
                self.create_condition(io_event_id, {**test_data, "io_cond_name":pin["id"]})

    def test_lua_options(self):
        test_utils.check_plugin(self,"condition","lua")
        self.create_condition(self.event_id, {"plugin":"lua", "lua_cond_path":"/etc/vuci-uploads/"},422)
        path = test_utils.upload_file(self,CONDITION_URL,1,io.StringIO("file content\n"), "lua_cond_path")["path"]
        condition = self.create_condition(self.event_id, {"name":"test","plugin":"lua", "lua_cond_path":path})
        self.delete_conditions([condition["id"]])
        self.assertEqual(test_utils.file_exists(path), False)

    def test_lua_example_download(self):
        test_utils.check_plugin(self,"condition","lua")
        test_utils.example_download(self,DOWNLOAD_LUA_EXAMPLE,"/etc/event_juggler/condition.lua")
        
    def test_time_options(self):
        test_utils.check_plugin(self,"condition","time")
        test_data = {"plugin":"time","time_cond_day_type":"yearday","time_cond_start_yday":"2","time_cond_end_yday":"3"}
        self.create_condition(self.event_id,test_data)
        self.create_condition(self.event_id,{**test_data, "time_cond_end_yday":"1"},422)
        cond_id = self.create_condition(self.event_id,{**test_data, "time_cond_wday":["mon","tue"]})["id"]
        self.assertEqual(test_utils.get_item(self,CONDITION_URL,cond_id,code=200)["time_cond_wday"],["mon","tue"])
        self.update_condition(cond_id,{"time_cond_wday":[]})
        self.assertFalse("time_cond_wday" in test_utils.get_item(self,CONDITION_URL,cond_id,code=200))
        self.create_condition(self.event_id,{**test_data, "time_cond_start_time":"21:30"},422)
        self.create_condition(self.event_id,{**test_data, "time_cond_start_time":"21:30", "time_cond_end_time":"*:30"},422)
        self.create_condition(self.event_id,{**test_data, "time_cond_start_time":"21:30", "time_cond_end_time":"**:30"},422)
        self.create_condition(self.event_id,{**test_data, "time_cond_start_time":"*:30", "time_cond_end_time":"*:30"})
