import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.ssh import open_ssh_connection, send_cmd, ubus_call
from utils.general_api import get_modems

class MobileOperators(WrapTest):

    def get_modem_info_ubus(self, ssh, modem):
        info = ubus_call(ssh, modem, "info")
        self.assertIn("usb_id", info)
        self.assertIn("model", info)
        self.assertIn("cache", info)
        self.assertIn("imei", info["cache"])
        self.assertIn("firmware", info["cache"])
        return info

    def list_modems_ubus(self, ssh):
        modems = send_cmd(ssh, "ubus list gsm.modem*").split()
        self.assertTrue(len(modems) > 0)
        return modems        

    def test_network_mobile_operators(self):
        with open_ssh_connection(10) as ssh:
            modems = self.list_modems_ubus(ssh)
            
            for modem in modems:
                info = self.get_modem_info_ubus(ssh, modem)

                x = self.get("/modems/" + info["usb_id"] + "/status")
                x.assert_code(200)
                x = x.resp.json()["data"]

                if x["simstate"] == "Inserted":
                    with self.subTest("Check operator"):
                        self.assertEqual(x["oper"], info["cache"]["operator"])
                        self.assertEqual(x["provider"], info["cache"]["provider_name"])

                with self.subTest("Check active sim"):
                    if info["simcount"] > 1:
                        active_sim = ubus_call(ssh, modem, "get_sim_slot")
                        self.assertIn("index", active_sim)
                        self.assertEqual(x["active_sim"], active_sim["index"])
                    else:
                        self.assertEqual(x["active_sim"], 1)

        with self.subTest("CRUD operator lists"):
            url = "/operator_lists/config"

            x = self.post_data(url, {"name": "test"})
            x.assert_code(201)
            x_post = x.resp.json()["data"]
            self.assertTrue("id" in x_post and "name" in x_post and x_post["name"] == "test")
            
            x = self.put_data(url + "/" + x_post["id"], {"name": "wrong"})
            x.assert_error("name: wrong", "'name' can not be modified.", 103)

            x = self.put_data(url + "/" + x_post["id"], {"mcc_mnc": ["123", "321"]})
            x.assert_code(200)
            x_put = x.resp.json()["data"]
            self.assertTrue("id" in x_put and "mcc_mnc" in x_put)
            self.assertEqual(x_put["mcc_mnc"], ["123", "321"])

            x = self.delete(url + "/" + x_put["id"])
            x.assert_code(200)