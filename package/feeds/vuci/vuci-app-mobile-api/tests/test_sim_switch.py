import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import get_modems

class SimSwitch(util.WrapTest):
    sim_switch = "/sim_switch/config"
    modems = []
    sim_count = 0
    
    def setUp(self):
        self.modems = get_modems(self)
        if len(self.modems) == 0:
            self.skipTest("Device has no modem.")

        no_switch = True
        for m in self.modems:
            self.sim_count += m["sim_count"]
            if m["sim_count"] > 1:
                no_switch = False
                break
        
        if no_switch:
            self.skipTest("Device do not support SIM switch.")

    def set_data_limit(self, modem, position, enabled):
        """
            Sets data limit for SIM

            Args:
                modem: Device modem to check data limit
                position: SIM card position in the modem to check data limit
                enabled: Set to True to enable data limit
            
            Returns:
                True if data limit is enabled for specified modem and SIM
        """
        x = self.get("/interfaces/config")
        x.assert_code(200)
        x = x.resp.json()["data"]
        x = [i for i in x if {"modem", "sim"} <= set(i) 
            and i["modem"] == modem
            and i["sim"] == position
        ]
        if len(x) > 0:
            a = self.put("/interfaces/config/" + x[0]["id"], {
                    "data": {
                        "mob_limit_enabled": "1" if enabled else "0",
                        "data_limit": "1000" if enabled else "",
                        "period": "week" if enabled else "",
                        "reset_weekday": "1" if enabled else ""
                    }
                })
            if a.resp.status_code == 200:
                return True
        return False


    def test_sim_switch(self):
        with self.subTest("Has config for each card"):
            x = self.get(self.sim_switch)
            x.assert_code(200)
            self.assertEqual(len(x.resp.json()["data"]), self.sim_count)

        with self.subTest("Update configuration"):
            x = self.get(self.sim_switch)
            x.assert_code(200)
            x = x.resp.json()["data"][0]

            put_data = {
                "enabled": "0",
                "interval": "3",
                "retry_count": "1",
                "on_signal": "1",
                "weak_signal": "-50",
                "roaming": "1",
                "no_network": "1",
                "denied": "1",
                "data_fail_host": "1.1.1.1",
                "data_fail_timeout": "1"
            }

            u = self.put(self.sim_switch + "/" + x["id"], {
                "data": put_data
            })
            u.assert_code(200)
            u = u.resp.json()["data"]

            for k, v in put_data.items():
                self.assertIn(k, u)
                self.assertEqual(u[k], v)

        with self.subTest("Test data limit"):
            x = self.get(self.sim_switch)
            x.assert_code(200)
            x = x.resp.json()["data"][0]

            # Disable data limit on interface
            self.assertEqual(self.set_data_limit(x["modem"], x["position"], False), True)

            # Try to enable data limit on sim_switch
            z = self.put(self.sim_switch + "/" + x["id"], {"data": {
                "enabled": "0",
                "data_limit": "1",
            }})
            z.assert_code(422)

            # Enable data limit on interface
            self.assertEqual(self.set_data_limit(x["modem"], x["position"], True), True)

            # Try to enable data limit on sim_switch
            self.put(self.sim_switch + "/" + x["id"], {"data": {
                "enabled": "0",
                "data_limit": "1",
            }}).assert_code(200)
