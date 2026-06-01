import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import get_modems

class APNDatabase(WrapTest):
    url = "/apn_database/config"

    def setUp(self):
        if len(get_modems(self)) == 0:
            self.skipTest("Device has no modems.")

    def test_crud(self):
        body = {
            "mcc":"123",
            "mnc":"321",
            "authtype":"2",
            "carrier":"test",
            "user": "test",
            "password": "test",
            "apn":"test-apn",
            "pdptype":"1",
            ".type": "apn"
        }

        put_body = {
            "mcc":"246",
            "mnc":"02",
            "authtype":"1",
            "carrier":"test-put",
            "user": "test-put",
            "password": "test-put",
            "apn":"test-put",
            "pdptype":"0",
            ".type": "apn"
        }

        #TEST POST REQUEST
        x = self.post_data(self.url, body)
        body["country"] = "Other"
        x.assert_data(body, 201, ["id"])

        resp = x.resp.json()["data"]
        self.assertIn("id", resp)
        id = resp['id']

        # TEST GET REQUEST
        x = self.get(f"{self.url}/{id}")
        x.assert_data(body)

        # TEST PUT REQUEST
        x = self.put_data(f"{self.url}/{id}", put_body)
        put_body["country"] = "Lithuania"
        put_body["id"] = id
        x.assert_data(put_body)

        # TEST DELETE REQUEST
        self.delete(f"{self.url}/{id}").assert_code(200)
