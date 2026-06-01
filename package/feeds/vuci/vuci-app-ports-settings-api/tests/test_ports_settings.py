import utility_integration as util
from utils.general_api import is_package_installed
import sys
sys.path.append("../../../../tests")


class test_ports_settings(util.WrapTest):
    url = "/ports_settings/config"
    sid = None
    response = None
    dsa = False
    gigabit_port = False
    gigabit_2_5_port = False
    is_x86 = False
    poe_ports = []
    default_data = {
        "enabled": "1",
        ".type": "port",
        "autoneg": "on"
    }

    @util.skip_device("TSW")
    def setUp(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        if not self.supports_port_link(board):
            self.skipTest("Device doesn't support ports settings")

        if not is_package_installed(self, "ports-settings"):
            self.fail("Discrepency, port_link flag is set, but port-settings app is not installed")

        self.dsa = self.suppports_dsa(board)
        self.gigabit_port = self.supports_gigabit_port(board)
        self.gigabit_2_5_port = self.supports_2_5_gigabit_port(board)
        self.poe_ports = self.get_poe_ports(board)
        self.is_x86 = self.is_x86(board)
        self.status = self.get_port_status()

    def supports_port_link(self, board):
        return board["hwinfo"]["port_link"]

    def suppports_dsa(self, board):
        return board["hwinfo"]["dsa"]

    def supports_gigabit_port(self, board):
        return board["hwinfo"]["gigabit_port"]

    def supports_2_5_gigabit_port(self, board):
        return board["hwinfo"]["2_5_gigabit_port"]

    def get_poe_ports(self, board):
        return 'poe' in board and board['poe']['ports'] or []

    def is_x86(self, board):
        return 'model' in board and board["model"]["platform"] == "X86_64"

    def get_port_status(self):
        if self.dsa:
            x = self.get("/ports_settings/status")
            return x.resp.json()["data"]
        return []
    
    def port_force_autoneg(self, port):
        if len(self.status) == 0:
            return False
        port_status = next(s for s in self.status if s["id"] == port)
        return "force_autoneg" in port_status and port_status["force_autoneg"]
        
    @util.skip_device("TSW")
    def test_ports_settings_base_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            self.response = x.resp.json()["data"]
            get_response = self.response[0]
            self.sid = get_response["id"]
            default = self.default_data.copy()
            default["id"] = self.sid
            default["advert"] = ["10mh", "10mf", "100mh", "100mf"]
            if self.dsa:
                port_status = next(s for s in self.status if s["id"] == self.sid)
                default["advert"] = port_status["link_supported"]
            else:
                if self.gigabit_port:
                    default["advert"].append("1000mf")
                if self.gigabit_2_5_port:
                    default["advert"].append("2500mf")
            if any([port["name"] == self.sid for port in self.poe_ports]):
                default["poe_enable"] = "1"
            # To ensure that data is in the same order
            default["advert"] = default["advert"].sort()
            get_response["advert"] = get_response["advert"].sort()
            self.assertEqual(default, get_response)
        with self.subTest("edit_configuration"):
            put_data = {
                ".type": "port",
                "advert": ["100mf", "10mf"]
            }
            if not self.port_force_autoneg(self.sid):
                put_data["speed"] = "10"
                put_data["duplex"] = "full"
                put_data["autoneg"] = "off"
            if self.dsa:
                port_status = next(s for s in self.status if s["id"] == self.sid)
                put_data["advert"] = port_status["link_supported"][0:2]
                put_data["mtu"] = "99"
            if any([port["name"] == self.sid for port in self.poe_ports]):
                put_data["poe_enable"] = "0"
            x = self.put_data(self.url + "/" + self.sid, put_data)
            put_data["id"] = self.sid
            put_data["enabled"] = "1"
            if self.port_force_autoneg(self.sid):
                put_data["autoneg"] = "on"
            x.assert_data(put_data)
        with self.subTest("disable_autoneg"):
            if self.port_force_autoneg(self.sid):
                self.skipTest("Autonegotiation is enforced on this port and option cannot be changed")
            x = self.put_data(self.url + "/" + self.sid, { "autoneg": "off", "advert": ""  })
            x.assert_code(200)
        with self.subTest("enable_autoneg_without_advert"):
            if self.port_force_autoneg(self.sid):
                self.skipTest("Autonegotiation is enforced on this port and option cannot be changed")
            x = self.put_data(self.url + "/" + self.sid, { "autoneg": "on" })
            x.assert_error("Validation", "'autoneg' cannot be enabled without 'advert'", 103, None, None)
        with self.subTest("enable_autoneg_without_advert_2"):
            if self.port_force_autoneg(self.sid):
                self.skipTest("Autonegotiation is enforced on this port and option cannot be changed")
            x = self.put_data(self.url + "/" + self.sid, { "autoneg": "on", "advert": [] })
            x.assert_error("Validation", "'autoneg' cannot be enabled without 'advert'", 103, None, None)
        with self.subTest("enable_autoneg"):
            if self.port_force_autoneg(self.sid):
                self.skipTest("Autonegotiation is enforced on this port and option cannot be changed")
            x = self.put_data(self.url + "/" + self.sid, { "autoneg": "on", "advert": ["10mh", "10mf", "100mh", "100mf"]})
            x.assert_code(200)
        with self.subTest("remove_advert_when_autoneg_enabled"):
            x = self.put_data(self.url + "/" + self.sid, { "advert": [] })
            x.assert_error("Validation", "'autoneg' cannot be enabled without 'advert'", 103, None, None)
        with self.subTest("remove_advert_when_autoneg_enabled_2"):
            x = self.put_data(self.url + "/" + self.sid, { "advert": "" })
            x.assert_error("Validation", "'autoneg' cannot be enabled without 'advert'", 103, None, None)
        with self.subTest("check_port_capabilities_advert"):
            ports = filter(lambda p: "force_autoneg" in p and p["force_autoneg"], self.status)
            if len(list(ports)) == 0:
                self.skipTest("Device doesn't have force_autoneg")
            for port in ports:
                x = self.put_data(self.url + "/" + port["id"], { "autoneg": "on", "advert": ["10mh", "10mf", "100mh", "100mf", "1000mf", "2500mf"]})
                x.assert_error("autoneg", f"Autonegotiation is enforced on '{port['id']}' port and option cannot be changed", 103)
        with self.subTest("set_invalid_advert"):
            ports = filter(lambda p: not "force_autoneg" in p or not p["force_autoneg"], self.status)
            if len(list(ports)) == 0:
                self.skipTest("Device doesn't provide port capabilities")
            for port in ports:
                x = self.put_data(self.url + "/" + port["id"], { "autoneg": "on", "advert": ["2500mf"]})
                x.assert_error("advert at index 1", "Must be one of the following values [10mh, 10mf, 100mh, 100mf, 1000mf].", 103, None, None)
        with self.subTest("reset_configuration"):
            default = self.default_data.copy()
            default["speed"] = ""
            default["duplex"] = ""
            default["advert"] = ["10mh", "10mf", "100mh", "100mf"]
            if self.dsa:
                default["mtu"] = ""
            if self.dsa and not self.is_x86:
                port_status = next(s for s in self.status if s["id"] == self.sid)
                default["advert"] = port_status["link_supported"]
            else:
                if self.gigabit_port:
                    default["advert"].append("1000mf")
                elif self.gigabit_2_5_port:
                    default["advert"].append("2500mf")
            if any([port["name"] == self.sid for port in self.poe_ports]):
                default["poe_enable"] = "1"
                self.default_data["poe_enable"] = "1"
            if self.port_force_autoneg(self.sid):
                del default["autoneg"]
                del default["speed"]
                del default["duplex"]
            self.default_data["advert"] = sorted(default["advert"])
            x = self.put_data(self.url + "/" + self.sid, default)
            self.default_data["id"] = self.sid
            res_data = x.resp.json()["data"]
            res_data["advert"] = sorted(res_data["advert"])
            self.assertEqual(self.default_data, res_data)

    @util.skip_device("TSW")
    def test_port_mirroring_deletion(self):
        x = self.delete(self.url)
        x.assert_error(
            "Validation", "Section deletion is not allowed", 111, None, None)

    @util.skip_device("TSW")
    def test_port_mirroring_creation(self):
        x = self.post_data(self.url, {})
        x.assert_error(
            "Validation", "Section creation is not allowed", 108, None, None)
