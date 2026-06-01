import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import get_modems

class MobileGeneral(WrapTest):

    @staticmethod
    def find_in(o, page):
        if isinstance(o, dict) and "title" in o and o["title"] == page:
            return o

        if isinstance(o, dict):
            for k, v in o.items():
                o = MobileGeneral.find_in(v, page)
                if o is not None:
                    return o

        if isinstance(o, list):
            for v in o:
                o = MobileGeneral.find_in(v, page)
                if o is not None:
                    return o

    def test_mobile_general(self):
        x = self.get("/ui/config/menu")
        x.assert_code(200)
        x = x.resp.json()["data"]
        self.assertIn("menu", x)
        menu = x["menu"]

        modems = get_modems(self)
        for modem in modems:
            if modem["sim_count"] > 1:
                sim_switch_pages = self.find_in(menu, "SIM Switch")
                self.assertIn("children", sim_switch_pages)
                for i in range(1, modem["sim_count"] + 1):
                    self.assertTrue(self.find_in(sim_switch_pages["children"], f"SIM{i}") is not None)

        for modem in modems:
            for i in range(1, modem["sim_count"] + 1):
                if len(modems) > 1:
                    name = modem["name"]
                    self.assertTrue(self.find_in(menu, f"SIM{i} ({name})") is not None)
                else:
                    self.assertTrue(self.find_in(menu, f"SIM{i}") is not None)