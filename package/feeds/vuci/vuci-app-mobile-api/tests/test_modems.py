import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import get_modems

class Modems(WrapTest):
    base_url = "/modems"
    full_keys = [
        "simstate", "simstate_id", "pinstate", "pinstate_id", "data_conn_state", "data_conn_state_id",
        "imei", "version", "model", "txbytes", "rxbytes", "baudrate",
        "is_busy", "busy_state", "busy_state_id", "sc_band_av", "ca_signal",
        "pinleft", "pukleft", "operator_state", "operator_state_id", "operator", "ntype",
        "mode", "band", "iccid", "cellid", "rssi", "rscp", "ecio",
        "rsrp", "rsrq", "sinr", "imsi", "ipv6", "dynamic_mtu",
        "multi_apn", "volte_supported", "operators_scan",
        "volte", "data_off", "mobile_stage"
    ]

    def setUp(self):
        if len(get_modems(self)) == 0:
            self.skipTest("Device has no modem.")

    def check_keys(self, data, keys):
        for k in keys:
            self.assertIn(k, data)

    def test_modems_endpoints(self):
        with self.subTest("Test status full"):
            x = self.get(self.base_url + "/status")
            x.assert_code(200)
            x = x.resp.json()["data"]

            for modem in x:
                self.check_keys(modem, self.full_keys)
