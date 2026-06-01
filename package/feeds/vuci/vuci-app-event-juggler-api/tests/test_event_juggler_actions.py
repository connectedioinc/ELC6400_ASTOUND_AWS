import sys
import io
import os

sys.path.append(os.path.dirname(__file__))
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import get_modems, get_hwinfo
from utils.ssh import get_ssh
import event_juggler_test_utils as test_utils

EVENT_URL = "/event_juggler/events/config"
CREATE_CONDITION = "/event_juggler/events/%s/conditions/config"
ACTION_URL = "/event_juggler/operations/config"
INTERFACES_URL = "/interfaces/config"
CREATE_ACTION = "/event_juggler/events/%s/operations/config"
PLUGIN = "reboot" # plugin which doesn't require extra options
DOWNLOAD_LUA_EXAMPLE = "/event_juggler/operations/actions/download_example_operation_lua"

ACTION_LIMIT = test_utils.get_limit("max_actions")

class test_event_juggler_actions(util.WrapTest):
    @classmethod
    def setUpClass(self):
        self.ssh = get_ssh()
        
    @classmethod
    def tearDownClass(self) -> None:
        self.ssh.logout()
    
    def setUp(self):
        self.hw_info = get_hwinfo(self)
        self.modems = get_modems(self)
        self.events = []
        self.interfaces = []
        self.event_id = test_utils.create_event(self,{"name":"test1"})["id"]

    def tearDown(self):
        self.delete_data(EVENT_URL,[i["id"] for i in self.events]).assert_code(200)
        self.delete_data(INTERFACES_URL,([i["id"] for i in self.interfaces])).assert_code(200) if len(self.interfaces) > 0 else ""
    
    def create_interface(self,data):
        res = self.post_data(INTERFACES_URL, data)
        res.assert_code(201)
        data = res.resp.json()["data"]
        self.interfaces.append(data)
        return data
    
    def create_condition(self,id,data={}):
        res = self.post_data(CREATE_CONDITION % (id), data)
        res.assert_code(201)
        return res.resp.json()["data"]

    def create_action(self,id,data = {}, code = 201):
        res = self.post_data(CREATE_ACTION % (id), data)
        res.assert_code(code)
        return res.resp.json()["data"] if "data" in res.resp.json() else None
    
    def delete_actions(self,data,code=200):
        self.delete_data(ACTION_URL,data).assert_code(code)
        
    def test_create_defaults(self):
        null_id = self.create_action(self.event_id)["id"]
        self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+null_id+".enabled").strip(),"0")
        empty_string_id = self.create_action(self.event_id,{"plugin":""})["id"]
        self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+empty_string_id+".enabled").strip(),"0")
        plugin_id = self.create_action(self.event_id,{"plugin":PLUGIN})["id"]
        self.assertEqual(self.ssh.send_cmd("uci get event_juggler."+plugin_id+".enabled").strip(),"1")
    
    def test_action_limit(self):
        res = test_utils.get_item(self,EVENT_URL,self.event_id)
        count = len(res["actions"])
        [self.create_action(self.event_id) for i in range(count, ACTION_LIMIT)]
        self.create_action(self.event_id,{},422)
        
    def test_filter_out_if_from_events_reporting_or_io_juggler(self):
        io_juggler = self.create_action(self.event_id)["id"]
        events_reporting = self.create_action(self.event_id)["id"]
        test_utils.get_item(self,ACTION_URL,io_juggler)
        test_utils.get_item(self,ACTION_URL,events_reporting)
        self.ssh.send_cmd("uci set event_juggler."+io_juggler+".events_reporting=1")
        self.ssh.send_cmd("uci set event_juggler."+events_reporting+".io_juggler=1")
        self.ssh.send_cmd("uci commit event_juggler")
        test_utils.get_item(self,ACTION_URL,io_juggler,404)
        test_utils.get_item(self,ACTION_URL,events_reporting,404)

    def test_cant_delete_events_only_child_action(self):
        event = test_utils.create_event(self,{"name":"test2"})
        action1_id = event["actions"][0]
        self.delete_actions([action1_id],422)
        action2_id= self.create_action(event["id"],{"name":"test_action"})["id"]
        self.delete_actions([action1_id, action2_id],422)
        self.delete_actions([action1_id])

    def test_base_options(self):
        self.create_action(self.event_id,{"name":""},422)
        self.create_action(self.event_id,{"name":"test1", "plugin":"test_plugin"},422)
        self.create_action(self.event_id,{"name":"test1", "conditions":["1"]},422)
        condition = self.create_condition(self.event_id)
        self.create_action(self.event_id, {"name":"test1", "conditions":[condition["id"]]})

    def test_connection_options(self):
        test_utils.check_plugin(self,"action","connection")
        interface = self.create_interface({"area_type":"lan"})
        test_data = {"plugin":"connection", "conn_type":"interface", "conn_interface":interface["id"], "conn_state": "0"}
        self.create_action(self.event_id, test_data)
        self.create_action(self.event_id,{**test_data,"conn_interface":"*"},422)

        if self.hw_info["mobile"] and  self.hw_info["dual_sim"]:
            test_data["conn_type"] = "modem"
            self.create_action(self.event_id,test_data,422)
            test_data["conn_sim"] = "1"
            self.create_action(self.event_id, test_data)
        
    def test_exec_options(self):
        test_utils.check_plugin(self,"action","exec")
        test_data = {"plugin":"exec", "exec_arg_type":"text", "exec_file_type":"upload", "exec_file_upload":"/etc/vuci-uploads/"}
        self.create_action(self.event_id,test_data,422)
        path = test_utils.upload_file(self,ACTION_URL,1,io.StringIO("file content\n"), "exec_file_upload")["path"]
        action = self.create_action(self.event_id, {**test_data, "exec_file_upload":path, "exec_arg":["a==a"]}, 422)
        action = self.create_action(self.event_id, {**test_data, "exec_file_upload":path})
        self.delete_actions([action["id"]])
        self.assertEqual(test_utils.file_exists(path), False)
        self.create_action(self.event_id,{**test_data, "exec_file_type":"path", "exec_file_path":"/etc/vuci-uploads/"},422)
               
    def test_http_options(self):
        test_utils.check_plugin(self,"action","http")
        test_data = {"plugin":"http", "http_url":"url.com", "http_ui_params":"1", "http_params":["a==ex"]}
        self.create_action(self.event_id, test_data,422)
        test_data = {"plugin": "http", "http_url": "url.com","http_ui_params": "0", "http_text": "test"}
        self.create_action(self.event_id, test_data)

    def test_lua_options(self):
        test_utils.check_plugin(self,"action","lua")
        self.create_action(self.event_id,{"plugin":"lua", "lua_action_path":"/etc/vuci-uploads/"},422)
        path = test_utils.upload_file(self,ACTION_URL,1,io.StringIO("file content\n"), "lua_action_path")["path"]
        action = self.create_action(self.event_id, {"plugin":"lua", "lua_action_path":path})
        self.delete_actions([action["id"]])
        self.assertEqual(test_utils.file_exists(path), False)

    def test_lua_example_download(self):
        test_utils.check_plugin(self,"action","lua")
        test_utils.example_download(self,DOWNLOAD_LUA_EXAMPLE,"/etc/event_juggler/action.lua")
        
    def test_mqtt_options(self):
        test_utils.check_plugin(self,"action","mqtt")
        test_data = {"name":"test", "plugin":"mqtt", "mqtt_remote_addr":"192.168.1.1", "mqtt_port":"200", "mqtt_topic":"123", "mqtt_text":"text", "mqtt_qos":"2", "mqtt_keepalive":"200", "mqtt_tls_type":"cert"}
        self.create_action(self.event_id,test_data,422)
        path = test_utils.upload_file(self,ACTION_URL,1,io.StringIO("file content\n"), "mqtt_cafile")["path"]
        test_data["mqtt_cafile"] = path
        action = self.create_action(self.event_id, test_data)
        self.delete_actions([action["id"]])
        self.assertEqual(test_utils.file_exists(path), False)

    def test_sim_switch_options(self):
        test_utils.check_plugin(self,"action","sim_switch")
        test_data = {"plugin": "sim_switch", "sim_flip":"0"}
        self.create_action(self.event_id,test_data,422)
        self.create_action(self.event_id,{**test_data,"sim_flip":"1"})
        self.create_action(self.event_id,{**test_data,"sim_number":str(self.modems[0]["sim_count"] + 1)},422)
        self.create_action(self.event_id,{**test_data,"sim_number":str(self.modems[0]["sim_count"] - 1)})
       
        

  