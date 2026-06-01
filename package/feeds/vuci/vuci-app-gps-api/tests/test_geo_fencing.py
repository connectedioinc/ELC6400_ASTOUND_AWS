import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import delete_all

class GPSGeoFencing(WrapTest):
    url = "/gps/geofencing/config"

    def setUp(self):
        delete_all(self, self.url)

    def test_basic_crud(self):
        self.crud_test(self.url, {
            "radius": "200",
            "longitude": "0.000000",
            "latitude": "0.000000",
            "id": "testing",
            ".type": "geofencing"
        }, {
            "enabled": "1",
            "radius": "123",
            "switch_profile": "default",
            "longitude": "1.234567",
            "latitude": "7.654321",
            ".type": "geofencing",
            "generate_event": "on_both"
        })
