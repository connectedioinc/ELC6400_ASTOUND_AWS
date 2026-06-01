import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import get_modems

class SimCards(util.WrapTest):
    sim_cards_config = "/sim_cards/config"
    sim_cards_status = "/sim_cards/status"
    sim_cards_usage = "/data_usage"
    modems = []
    
    def check_keys(self, data, keys):
        for k in keys:
            self.assertIn(k, data)

    def setUp(self):
        self.modems = get_modems(self)
        if len(self.modems) == 0:
            self.skipTest("Device has no modem.")

    def test_sim_cards(self):
        x = self.get(self.sim_cards_config)
        x.assert_code(200)
        x = x.resp.json()["data"]
        
        y = self.get(self.sim_cards_status)
        y.assert_code(200)
        y = y.resp.json()["data"]
        
        with self.subTest("Check modems and positions"):
            for simcard in x:
                self.check_keys(simcard, {"modem", "position"})
        
        with self.subTest("Check status value length"):
            self.assertEqual(len(x), len(y))

        with self.subTest("Check status options"):
            for simcard in y:
                self.check_keys(simcard, {"modem", "sms_limit_enabled", "sim", "section_name"})
        
        with self.subTest("Check usage intervals"):
            if util.Env().device != "TRB500":
                self.get(self.sim_cards_usage).assert_error("URL", "Interval not provided (must be day, week or month)", 1)
                self.get(self.sim_cards_usage + "/day/status").assert_code(200)
                self.get(self.sim_cards_usage + "/week/status").assert_code(200)
                self.get(self.sim_cards_usage + "/month/status").assert_code(200)
                self.get(self.sim_cards_usage + "/wrong/status").assert_error("URL", "Incorrect interval (must be day, week, month or total)", 1)

        with self.subTest("Check clear sms limit action"):
            for simcard in x:
                self.post_data("/sim_cards/" + simcard["id"] + "/actions/clear_sms_limit").assert_code(200)