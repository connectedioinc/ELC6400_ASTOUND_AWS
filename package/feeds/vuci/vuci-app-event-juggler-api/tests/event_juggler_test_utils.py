from utils.ssh import get_ssh
import json
import utility_integration as util
http = util.Env.http
api_url = util.Env.get_api_url()
ssh = get_ssh()
EVENT_URL = "/event_juggler/events/config"

http.get(api_url + "/event_juggler/operations/config") # create plugin_data.json if it doesn't exist
PLUGINS = json.loads(ssh.send_cmd("cat /tmp/event_juggler/plugin_data.json"))["plugin_data"]

def check_plugin(self, plugin_type, name):
    if not len([i for i in PLUGINS[plugin_type] if i['name'] == name]) == 1:
        self.skipTest(name+" plugin is not available")

def get_limit(value):
    return json.loads(ssh.ubus_call("file", "exec", { "command":"event_juggler", "params":["-f"] })["stdout"])[value]

def create_event(self,data, code=201):
    res = self.post_data(EVENT_URL, data)
    res.assert_code(code)
    if "data" in res.resp.json():
        data = res.resp.json()["data"]
        self.events.append(data)
        return data

def upload_file(self, url, id, file, option):
    res = self.send_file(f"{url}/{id}", file, option)
    res.assert_code(200)
    return res.resp.json()["data"]

def file_exists(path):
    return True if ssh.send_cmd(f"ls {path} &> /dev/null ; echo $?").strip() == "0" else False

def get_item(self,url,id,code=200):
    res = self.get(url + "/" + id)
    res.assert_code(code)
    return res.resp.json()["data"] if "data" in res.resp.json() else None

def example_download(self, url, path):
    resp = http.post(f"{api_url}{url}")
    self.assertEqual(resp.content.decode('utf-8'), ssh.ubus_call("file", "read", { "path":path })["data"])