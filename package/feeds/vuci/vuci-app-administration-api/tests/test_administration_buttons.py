import sys
import utility_integration as util
from utils.general_api import get_hwinfo
sys.path.append("../../../../tests")

class test_administration_buttons(util.WrapTest):

    def setUp(self):
        hwinfo = get_hwinfo(self)
        if not hwinfo["reset_button"]:
            self.skipTest("Reset button is not present on the device")

    def test_administration_buttons_base_functionality(self):
        base_url = "/system/buttons/config"
        sid_reboot = ""
        sid_default = ""
        sid_firstboot = ""
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            resp = x.resp
            for section in resp.json()["data"]:
                if section["handler"] == "reboot":
                    sid_reboot = section["id"]
                if section["handler"] == "default":
                    sid_default = section["id"]
                if section["handler"] == "firstboot":
                    sid_firstboot = section["id"]
            x.assert_data([
                {
                    ".type":"button",
                    "max":"5",
                    "min":"0",
                    "action":"released",
                    "handler":"reboot"
                },
                {
                    ".type":"button",
                    "max":"11",
                    "min":"6",
                    "action":"released",
                    "handler":"default"
                },
                {
                    ".type":"button",
                    "max":"20",
                    "min":"12",
                    "action":"released",
                    "handler":"firstboot"
                }
            ],200, {"id"})
        with self.subTest("single_get"):
            x = self.get(base_url + "/" + sid_reboot)
            x.assert_data({
                ".type":"button",
                "max":"5",
                "min":"0",
                "action":"released",
                "handler":"reboot",
                "id":sid_reboot
            })
        with self.subTest("configure_administration_buttons"):
            x = self.put_data(base_url, [
                {
                    "id":sid_reboot,
                    "min":"1",
                    "max":"6",
                    "enabled":"0"
                },
                {
                    "id":sid_default,
                    "min":"7",
                    "max":"12",
                    "enabled":"0"
                },
                {
                    "id":sid_firstboot,
                    "min":"13",
                    "max":"21",
                    "enabled":"0"
                }
            ])
            x.assert_data([
                {
                    ".type":"button",
                    "enabled":"0",
                    "max":"6",
                    "min":"1",
                    "action":"released",
                    "handler":"reboot",
                    "id":sid_reboot
                },
                {
                    ".type":"button",
                    "enabled":"0",
                    "max":"12",
                    "min":"7",
                    "action":"released",
                    "handler":"default",
                    "id":sid_default
                },
                {
                    ".type":"button",
                    "enabled":"0",
                    "max":"21",
                    "min":"13",
                    "action":"released",
                    "handler":"firstboot",
                    "id":sid_firstboot
                }
            ])
        with self.subTest("get_configured"):
            x = self.get(base_url + "/" + sid_default)
            x.assert_data({
                ".type":"button",
                "enabled":"0",
                "max":"12",
                "min":"7",
                "action":"released",
                "handler":"default",
                "id":sid_default
            })
        with self.subTest("return_configuration"):
            x = self.put_data(base_url, [
                {
                    "id":sid_reboot,
                    "min":"0",
                    "max":"5",
                    "enabled":""
                },
                {
                    "id":sid_default,
                    "min":"6",
                    "max":"11",
                    "enabled":""
                },
                {
                    "id":sid_firstboot,
                    "min":"12",
                    "max":"20",
                    "enabled":""
                }
            ])
            x.assert_data([
                {
                    ".type":"button",
                    "max":"5",
                    "min":"0",
                    "action":"released",
                    "handler":"reboot",
                    "id":sid_reboot
                },
                {
                    ".type":"button",
                    "max":"11",
                    "min":"6",
                    "action":"released",
                    "handler":"default",
                    "id":sid_default
                },
                {
                    ".type":"button",
                    "max":"20",
                    "min":"12",
                    "action":"released",
                    "handler":"firstboot",
                    "id":sid_firstboot
                }
            ])

    def test_administration_buttons_deletion(self):
        x = self.delete("/system/buttons/config")
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
    def test_administration_buttons_creation(self):
        x = self.post_data("/system/buttons/config", {})
        x.assert_error("Validation", "Section creation is not allowed", 108, None, None)