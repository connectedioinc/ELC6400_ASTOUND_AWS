import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.ssh import open_ssh_connection, is_process_running, is_process_stopped
from time import sleep

class GPSNMEA(WrapTest):
    url = "/gps/config/general"

    def setUp(self):
        if not self.has_gps():
            self.skipTest("device doesn't have gps")

    def has_gps(self):
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        return board["hwinfo"]["gps"]

    def set_enabled(self, enabled: bool):
        response = self.put_data(self.url, {
            "enabled": "1" if enabled else "0"
        })
        response.assert_code(200)
        return response.resp.json()["data"]

    def test_process_running(self):
        with open_ssh_connection() as ssh:
            self.set_enabled(False)
            self.assertTrue(is_process_stopped(ssh, "gpsd"), "Expected gpsd to not be running")

            self.set_enabled(True)
            self.assertTrue(is_process_running(ssh, "gpsd"), "Expected gpsd to be running")
