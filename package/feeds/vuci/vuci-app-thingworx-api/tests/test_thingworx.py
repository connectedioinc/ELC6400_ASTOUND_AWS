import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import open_ssh_connection, is_process_running, is_process_stopped
from utils.general_api import generate_require_error_messages

http = util.Env.http
api_url = util.Env.get_api_url()

class ThingWorx(util.WrapTest):
    url = "/thingworx/config/thingworx"
    url_iface = "/interfaces/config"
    iface = None

    empty_data = {
        "appkey": "",
        ".type": "iottw",
        "iface": "",
        "port": "",
        "thing": "",
        "enabled": "",
        "server": ""
    }

    def tearDown(self):
        self.put_data(self.url, self.empty_data).assert_code(200)

    @classmethod
    def setUpClass(cls):
        cls.iface = cls.get_first_iface(cls.url_iface)

    @classmethod
    def get_first_iface(self, url):
        x = http.get(api_url + url)
        if x.status_code == 200:
            for iface in x.json()["data"]:
                if "modem" in iface:
                    return iface
        return None    

    def test_basic_update(self):
        if self.iface == None:
            x = self.put_data(self.url, {
                "appkey": "Test420",
                ".type": "iottw",
                "port": "420",
                "thing": "Blatata",
                "enabled": "0",
                "server": "69.69.69.69"
            })
            x.assert_data({
                "appkey": "Test420",
                ".type": "iottw",
                "port": "420",
                "thing": "Blatata",
                "enabled": "0",
                "server": "69.69.69.69",
                "id": "thingworx"
            })
        else:
            x = self.put_data(self.url, {
                "appkey": "Test420",
                ".type": "iottw",
                "iface": self.iface["id"],
                "port": "420",
                "thing": "Blatata",
                "enabled": "0",
                "server": "69.69.69.69"
            })
            x.assert_data({
                "appkey": "Test420",
                ".type": "iottw",
                "iface": self.iface["id"],
                "port": "420",
                "thing": "Blatata",
                "enabled": "0",
                "server": "69.69.69.69",
                "id": "thingworx"
            })

    def test_required_options(self):
        with self.subTest("Clear config"):
            x = self.put_data(self.url, self.empty_data)
            x.assert_code(200)

        with self.subTest("Check require"):
            x = self.put_data(self.url, {
                "enabled": "1",
            })

            if self.iface == None:
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "thingworx", ["server", "port", "thing", "appkey"]))
            else:
                self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "thingworx", ["server", "port", "thing", "appkey", "iface"]))

    def test_check_process(self):
        with open_ssh_connection() as ssh:
            x = self.put_data(self.url, self.empty_data)
            x.assert_code(200)

            self.assertTrue(is_process_stopped(ssh, "twStreamApp"), "Expected 'twStreamApp' not to be running")

            if self.iface == None:
                x = self.put_data(self.url, {
                    "appkey": "Test420",
                    ".type": "iottw",
                    "port": "420",
                    "thing": "Blatata",
                    "enabled": "1",
                    "server": "69.69.69.69"
                })
                x.assert_code(200)
            else:
                x = self.put_data(self.url, {
                    "appkey": "Test420",
                    ".type": "iottw",
                    "iface": self.iface["id"],
                    "port": "420",
                    "thing": "Blatata",
                    "enabled": "1",
                    "server": "69.69.69.69"
                })
                x.assert_code(200)

            self.assertTrue(is_process_running(ssh, "twStreamApp"), "Expected 'twStreamApp' to be running")
            x = self.put_data(self.url, self.empty_data)
            x.assert_code(200)