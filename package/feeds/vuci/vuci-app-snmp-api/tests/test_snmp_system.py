from copy import deepcopy
import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
import utility_integration as util
from utils.ssh import open_ssh_connection

http = util.Env.http
api_url = util.Env.get_api_url()

class test_snmp_system(WrapTest):
    url_settings = "/snmp/system/config/"
    url_mib = "/snmp/system/actions/download_mib"

    def test_basic_update_snmp_system(self):
        default_cfg = None
        hostname = None
        with self.subTest("Get default cfg"):
            default_cfg = self.get(self.url_settings)
            with open_ssh_connection() as ssh:
                hostname = ssh.send_cmd("uci get system.system.hostname").strip()

        with self.subTest("Main test"):
            sid = default_cfg.json["data"][0]["id"]
            x = self.put_data(self.url_settings + sid, {
                "sysLocation": "test420",
                "sysContact": "test@test.com",
                "sysName": "test420"
            })
            x.assert_data({
                ".type": "system",
                "id": sid,
                "oid": "1.3.6.1.4.1.48690",
                "sysLocation": "test420",
                "sysContact": "test@test.com",
                "sysName": "test420"
            })
            x = self.put_data(self.url_settings + sid, {
                "sysLocation": "",
                "sysContact": "",
                "sysName": "test420"
            })
            x.assert_data({
                ".type": "system",
                "id": sid,
                "oid": "1.3.6.1.4.1.48690",
                "sysName": "test420"
            })
            
        with self.subTest("Reset default cfg"):
            default_cfg.json["data"][0]["sysName"] = hostname
            default_data = deepcopy(default_cfg.json["data"])
            del default_data[0]["oid"]

            x = self.put_data(self.url_settings, default_data)
            x.assert_data(default_cfg.json["data"])


    def test_basic_update_snmp_mib_file(self):
        self.get(self.url_settings) # for autoskip

        mib_from_api = http.request("post", api_url + self.url_mib).content
        mib_from_api = mib_from_api.decode("utf-8") 
        mib_from_api = mib_from_api.replace("\r", "")

        file_path = self.get_section("snmpd", "general")["values"]["mibfile"]

        with open_ssh_connection() as ssh:
            mib_from_device = ssh.send_cmd(f"cat {file_path}")
            mib_from_device = mib_from_device.replace("\r", "")
            
            self.assertEqual(mib_from_api, mib_from_device)