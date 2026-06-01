import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest

class USBTools(WrapTest):
    url = "/usb_tools/config/general"

    def set_auto_sync(self, enabled: bool):
        res = self.put_data(self.url, {
            "auto_sync": "1" if enabled else "0"
        })
        res.assert_code(200)
        return res.resp.json()["data"]

    def test_sync_write(self):
        config = self.set_auto_sync(True)
        self.assertEqual(config["auto_sync"], "1")

        config = self.set_auto_sync(False)
        self.assertEqual(config["auto_sync"], "0")
