import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, skip_device
from utils.ssh import open_ssh_connection, send_cmd, ubus_call
from utils.general_api import get_modems

class StatusSystem(WrapTest):
    def list_modems_ubus(self, ssh):
        modems = send_cmd(ssh, "ubus list gsm.modem*").split()
        self.assertTrue(len(modems) > 0)
        return modems  

    def get_modem_info_ubus(self, ssh, modem):
        info = ubus_call(ssh, modem, "info")
        self.assertIn("usb_id", info)
        self.assertIn("model", info)
        self.assertIn("cache", info)
        self.assertIn("imei", info["cache"])
        self.assertIn("firmware", info["cache"])
        return info

    def test_status_system(self):
        with open_ssh_connection() as ssh:
            modems = self.list_modems_ubus(ssh)

            x = get_modems(self)

            for modem in modems:
                info = self.get_modem_info_ubus(ssh, modem)
                api_modem = [i for i in x if i["id"] == info["usb_id"]][0]
                self.assertIn("id", api_modem)
                self.assertIn("model", api_modem)
                self.assertIn("imei", api_modem)
                self.assertIn("version", api_modem)

                # Checks id, model, imei, firmware version to match ubus values
                self.assertEqual(api_modem["id"], info["usb_id"])
                self.assertEqual(api_modem["model"], info["model"])
                self.assertEqual(api_modem["imei"], info["cache"]["imei"])
                self.assertEqual(api_modem["version"], info["cache"]["firmware"])

    @skip_device("TRB500") # No mdcollect
    def test_rx_tx(self):
        with open_ssh_connection() as ssh:
            for modem in get_modems(self):
                info = ubus_call(ssh, "mdcollect", "get_raw_total", { "modem": modem["id"] })
                x = self.get("/modems/" + modem["id"] + "/status")
                x.assert_code(200)
                x = x.resp.json()["data"]

                self.assertEqual(x["rxbytes"], info["rx"])
                self.assertEqual(x["txbytes"], info["tx"])
