import utility_integration as util
from utility_integration import WrapTest, Env
import sys

from utils.general_api import get_modems
sys.path.append("../../../../tests")

SEND_SMS_URL = "/messages/actions/send"
SIMCARD_URL = "/sim_cards/config/"

ERR_CODES = {
    "NOT_VISIBLE": 1,
    "FAILED_TO_SEND": 2,
    "NO_MODEM": 3,
    "NO_MESSAGE": 4,
    "NO_NUMBER": 5,
	"SMS_LIMIT": 6,
	"NO_SIM": 7,
	"SMS_INVALID": 8,
	"SMS_COUNT": 9
}

class sms_send(WrapTest):
    def get_simcard_section(self, md):
        x = self.get(SIMCARD_URL)
        for sim in x.json["data"]:
            if sim["modem"] == md["id"] and sim["position"] == str(md["active_sim"]):
                return sim

    def test_send_sms_error_messages(self):
        modems = get_modems(self)
        if len(modems) == 0:
            self.skipTest("No modems found")

        md = modems[0]

        with self.subTest("test option requires"):
            x = self.post_data(SEND_SMS_URL, {})

            self.assertIn({"source": "message", "code": 103, "error": "Missing required option: message", "section": "send"}, x.json["errors"])
            self.assertIn({"source": "number", "code": 103, "error": "Missing required option: number", "section": "send"}, x.json["errors"])
            self.assertIn({"source": "modem", "code": 103, "error": "Missing required option: modem", "section": "send"}, x.json["errors"])

        with self.subTest("test if sms count error is returned"):
            if md["simstate"] != "Inserted":
                self.skipTest("Simcard not inserted")

            # msg is 4 sms long
            msg = "sdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ękl"
            x = self.post_data(SEND_SMS_URL, {"modem": md["id"], "number": "+1234567890", "message": msg})

            x.assert_error("Message sending", "Max SMS count is 3 messages", ERR_CODES["SMS_COUNT"])

        with self.subTest("test if sms limit error is returned when sms limit is set to 1 but sms is 2 messages long"):
            if md["simstate"] != "Inserted":
                self.skipTest("Simcard not inserted")

            sim = None
            with self.subTest("enable sms limit (1 sms)"):
                sim = self.get_simcard_section(md)
                x = self.put_data(SIMCARD_URL + sim["id"], {"enable_sms_limit":"1","sms_limit_num":"1","sms_limit":"day","period":"0"})
                x.assert_code(200)

            with self.subTest("test if sms limit error is returned when sms limit is set to 1 but sms is 2 messages long"):

                msg = "sdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@"
                x = self.post_data(SEND_SMS_URL, {"modem": md["id"], "number": "+1234567890", "message": msg})

                x.assert_error("Message sending", "Failed to send message, because sms limit was reached", ERR_CODES["SMS_LIMIT"])

            with self.subTest("reset sms limit"):
                sim = self.get_simcard_section(md)
                x = self.put_data(SIMCARD_URL + sim["id"], {"enable_sms_limit":"0","sms_limit_num":"","sms_limit":"","period":""})
                x.assert_code(200)

        with self.subTest("test if simcard not inserted error is returned"):
            if md["simstate"] != "Not inserted":
                self.skipTest("Simcard inserted")

            msg = "sdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@ęsdfsdf@"
            x = self.post_data(SEND_SMS_URL, {"modem": md["id"], "number": "+1234567890", "message": msg})

            x.assert_error("Message sending", "Failed to send message. SIM card not inserted.", ERR_CODES["NO_SIM"])