import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.ssh import assert_process_starts
from utils.modbus import stop_modbus_server

class ModbusTCPServer(WrapTest):
    url = "/modbus/server/tcp/config/general"

    def test_basic_update(self):
        self.put_data(self.url, {
            "allow_ra": "0",
            "clientregs": "0",
            "device_id": "1",
            "enabled": "1",
            "keepconn": "1",
            "md_data_type": "0",
            "port": "502",
            "timeout": "0"
        }).assert_data({
            ".type": "modbus",
            "id": "general",
            "allow_ra": "0",
            "clientregs": "0",
            "device_id": "1",
            "enabled": "1",
            "keepconn": "1",
            "md_data_type": "0",
            "port": "502",
            "timeout": "0"
        })

    def test_disallow_post(self):
        self.post(self.url, {}) \
            .assert_error("Validation", "Section creation is not allowed", 108)

    def test_disallow_delete(self):
        self.delete(self.url) \
            .assert_error("Validation", "Section deletion is not allowed", 111)

    def test_process_running(self):
        stop_modbus_server(self)
        with assert_process_starts(self, "modbus_server"):
            self.put_data(self.url, {
                "enabled": "1"
            }).assert_code(200)
