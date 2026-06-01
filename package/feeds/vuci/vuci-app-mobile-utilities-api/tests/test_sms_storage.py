import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
import utility_integration as util
http = util.Env.http
api_url = util.Env.get_api_url()

url_sms_storage = "/messages/storage/config"
url_modem = "/modems/status"

class SMSStorage(WrapTest):
    data = []
    update_data = {
        "msg_storage": "sm",
    }
    
    @classmethod
    def setUpClass(cls):
        x = http.get(api_url + url_sms_storage)
        y = http.get(api_url + url_modem)
        if x.status_code == 200 and y.status_code == 200:
            for sms_storage in x.json()["data"]:
                for modem in y.json()["data"]:
                    if sms_storage["modem_id"] == modem["id"]:
                        cls.data.append({
                            "sid": sms_storage["id"],
                            "modem": sms_storage["modem_id"],
                            "simstate": modem["simstate"]
                        })

    def test_sms_storage(self):
        for config in self.data:
            if config["simstate"] == "Inserted":
                x = self.put_data(f'{url_sms_storage}/{config["sid"]}', self.update_data)
                x.assert_code(200)
            elif config["simstate"] == "Not inserted":
                x = self.put_data(f'{url_sms_storage}/{config["sid"]}', self.update_data)
                if x.resp.json()["errors"][0]["error"] != f'Failed to update \'msg_storage\' option, \'{config["modem"]}\' modem has no SIM inserted.':
                    self.assertFalse(x.resp.status_code, "Expected error message, which says can't update storage config without SIM card.")


        
        