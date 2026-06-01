import sys, time
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
from utils.general_api import get_modems

class InterfacesGeneral(WrapTest):

    def test_mobile_ifaces(self):
            url = "/interfaces/config"
            ifaces = self.get(url)
            ifaces.assert_code(200)
            ifaces = [i for i in ifaces.resp.json()["data"] if "proto" in i and i["proto"] in ["connm", "wwan"]]

            if len(ifaces) == 0:
                self.skipTest("No mobile ifaces found")

            x = self.create_mobile_interface("test")

            if self.multi_apn_supported():
                x.assert_code(201)

                x = self.delete_iface("test")
                x.assert_code(200)
            else:
                x.assert_code(422)

            with self.subTest("Enable and disable mobile iface"):
                self.update_iface(ifaces[0]["id"], {"enabled": "0"})
                self.update_iface(ifaces[0]["id"], {"enabled": "1"})

            with self.subTest("Try to edit mobile iface when modem is in full control"):
                if self.set_modem_full_control():
                    x = self.update_iface(ifaces[0]["id"], {"dns": ["1.1.1.1"]}, True)
                    x.assert_code(422)
                    self.set_modem_full_control(False)
                    x = self.update_iface(ifaces[0]["id"], {"dns": ["1.1.1.1"]}, True)
                    x.assert_code(200)

    def multi_apn_supported(self):
        modems = get_modems(self)
        if len(modems) == 0:
            return False
        if "multi_apn" in modems[0] and modems[0]["multi_apn"]:
                return True
        return False

    def create_mobile_interface(self, id):
        modems = get_modems(self)
        modems_len = len(modems)
        data = {
            "id": id,
            "proto": "connm" if Env.device.startswith("TRB1") else "wwan",
            "dns": [],
            "delegate": "1",
            "force_link": "0",
            "fwzone": "wan",
            "method": "nat",
            "pdptype": "ip",
            "auto_apn": "1",
            "area_type": "wan"
        }

        if modems_len > 1:
            data["modem"] = modems[0]["id"]
            data["sim"] = "1"
        if modems_len == 1 and modems[0]["sim_count"] > 1:
            data["sim"] = "1"

        return self.post("/interfaces/config", { "data": data })

    def delete_iface(self, id):
        return self.delete(f"/interfaces/config/{id}")

    def update_iface(self, id, update_data, no_check = False):
        put_resp = self.put(f"/interfaces/config/{id}", {"data": update_data})            
        x = self.get(f"/interfaces/config/{id}")
        if not no_check:
            put_resp.assert_code(200)
            x.assert_code(200)
        x = x.resp.json()["data"]
        if not no_check:
            for k, v in update_data.items():
                self.assertIn(k, x)
                self.assertEqual(v, x[k])
        return put_resp

    def set_modem_full_control(self, enable = True):
        x = self.get("/system/serial/status")

        if x.resp.status_code == 404:
            return False # Skip if no package
        if len(x.resp.json()["data"]) == 0:
            return False # Skip if no serials

        if enable:
            x = self.post("/services/modem_control/config", {
                "data": {
                    "device": "/dev/rs232",
                    "name": "test",
                    "enabled": "1",
                    "baudrate": "9600",
                    "databits": "8",
                    "stopbits": "1",
                    "parity": "none",
                    "flowcontrol": "none",
                    "ctl_mode": "full"
                }
            })
            time.sleep(10)
            return x.resp.status_code == 201
        else:
            x = self.delete("/services/modem_control/config/1")
            time.sleep(10)
            return x.resp.status_code == 200