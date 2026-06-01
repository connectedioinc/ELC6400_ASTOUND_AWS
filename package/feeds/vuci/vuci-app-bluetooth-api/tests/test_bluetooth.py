import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.ssh import open_ssh_connection, is_process_running, is_process_stopped
from time import sleep

class Bluetooth(WrapTest):
    url = "/bluetooth/config"

    def set_enabled(self, enabled: bool):
        response = self.put_data(f"{self.url}/general", {
            "enabled": "1" if enabled else "0"
        })
        response.assert_code(200)

    def test_basic_update(self):
        self.put_data(f"{self.url}/general", {
            "enabled": "1"
        }).assert_data({
            "enabled": "1",
            ".type": "section",
            "id": "general"
        })

        self.put_data(f"{self.url}/general", {
            "enabled": "0"
        }).assert_data({
            "enabled": "0",
            ".type": "section",
            "id": "general"
        })

    def test_process_running(self):
        with open_ssh_connection() as ssh:
            self.set_enabled(False)
            self.assertTrue(is_process_stopped(ssh, "blesem"), "Expected blesem to not be running")

            self.set_enabled(True)
            self.assertTrue(is_process_running(ssh, "blesem"), "Expected blesem to be running")
