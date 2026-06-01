import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all, must_have_serial_device

@must_have_serial_device
class NTRIP(WrapTest):
    url = "/ntrip/config"

    def setUp(self):
        delete_all(self, self.url)

    def create_config(self, device: str):
        response = self.post_data(self.url, {
            "device": device,
            "name": "testing",
        })
        response.assert_code(201)
        return response.resp.json()["data"]["id"]

    def update_config(self, id: str, data: dict):
        response = self.put_data(f"{self.url}/{id}", data)
        response.assert_code(200)
        return response.resp.json()["data"]

    def test_basic_crud(self):
        self.crud_test(self.url, {
            "device": self.serial_device,
            ".type": "ntrip",
            "name": "testing",
        }, {
            "ntrip_user": "foobar",
            "flowcontrol": "none",
            "ntrip_port": "11",
            "ntrip_password": "bezbaz",
            "baudrate": "115200",
            "ntrip_ip": "1.1.1.1",
            "ntrip_data_format": "n",
            "parity": "none",
            ".type": "ntrip",
            "device": self.serial_device,
            "stopbits": "1",
            "name": "testing",
            "enabled": "1",
            "databits": "8",
            "nmea_source": "4",
            "report_interval": "10"
        })

    def test_nmea_source(self):
        """
            When switchign nmea source any related paramters from previous nmea source must be deleted
        """
        config = self.create_config(self.serial_device)

        with self.subTest("from predefined string"):
            updated = self.update_config(config, {
                "nmea_source": "1",
                "user_nmea" : "$GPGGA,foobarbaz"
            })
            self.assertIn("user_nmea", updated)

            updated = self.update_config(config, {
                "nmea_source": "4"
            })
            self.assertNotIn("user_nmea", updated)

        with self.subTest("from predefined coordinates"):
            updated = self.update_config(config, {
                "nmea_source": "2",
                "lattitude": "11.111111",
                "longitude": "22.222222"
            })
            self.assertIn("lattitude", updated)
            self.assertIn("longitude", updated)

            updated = self.update_config(config, {
                "nmea_source": "4"
            })
            self.assertNotIn("lattitude", updated)
            self.assertNotIn("longitude", updated)
