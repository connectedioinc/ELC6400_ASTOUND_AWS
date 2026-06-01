import datetime
import sys

from utils.general_api import get_modems
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
import response_codes as codes
from utils.ssh import open_ssh_connection, send_cmd
import json
import operator

RC = codes.ResponseCodes

def dateSort(x):
    return x['date']

class ReadMessages(WrapTest):
    url_get_message = "/messages/status"
    modems = []

    def test_get_message(self):
        x = self.get(self.url_get_message)
        x.assert_code(200)
        sms_respone = x.resp.json()["data"]
        message_from_ubus = []
        if len(sms_respone) >= 1:
            with open_ssh_connection() as ssh:
                if len(self.modems) == 0:
                    available_modems = send_cmd(ssh, "ubus list gsm.modem*")
                    for available_modem in available_modems.splitlines():
                        self.modems.append({
                            "gsm": available_modem,
                            "modem_id": json.loads(send_cmd(ssh, "ubus call " + available_modem + " info"))["usb_id"]    
                        })

                with self.subTest("test with all messages"):
                    for modem in self.modems:
                        response = json.loads(send_cmd(ssh, "ubus call " + modem["gsm"] + " read_sms \'{\"index\": -1}\' ").strip())
                        if 'messages' in response:
                            for message in response["messages"]:
                                date_obj = datetime.datetime.strptime(message["date"], "%a %b %d %H:%M:%S %Y")
                                formatted_date = date_obj.strftime('%Y-%m-%d %H:%M:%S')
                                message_from_ubus.append({
                                    "id": str(message["index"]),
                                    "date": formatted_date,
                                    "sender": message["sender"],
                                    "message": message["text"],
                                    "status": message["stat_id_str"],
                                    "modem_id": modem["modem_id"]
                                })
                    if len(message_from_ubus) > 0:
                        sms_respone.sort(key=dateSort)
                        message_from_ubus.sort(key=dateSort)
                        self.assertListEqual(sms_respone, message_from_ubus)

                with self.subTest("test with single message"):
                    for modem in self.modems:
                        response = json.loads(send_cmd(ssh, "ubus call " + modem["gsm"] + " read_sms \'{\"index\": -1}\' ").strip())
                        if "messages" in response and len(response["messages"]) > 0: 
                            messages = response['messages']
                            x = self.get(f"/messages/modem/{modem['modem_id']}/sms/{str(messages[0]['index'])}/status")
                            date_obj = datetime.datetime.strptime(messages[0]["date"], "%a %b %d %H:%M:%S %Y")
                            formatted_date = date_obj.strftime('%Y-%m-%d %H:%M:%S')
                            x.assert_data({
                                "id": str(messages[0]["index"]),
                                "date": formatted_date,
                                "sender": messages[0]["sender"],
                                "message": messages[0]["text"],
                                "status": messages[0]["stat_id_str"],
                                "modem_id": modem["modem_id"]
                            })

    def test_delete_sms(self):
        x = self.get(self.url_get_message)
        x.assert_code(200)
        sms_respone = x.resp.json()["data"]
        
        if len(sms_respone) == 0:
            self.skipTest("None message to delete")

        x = self.post_data("/messages/actions/remove_messages", { "modem_id": sms_respone[0]["modem_id"], "sms_id": [sms_respone[0]["id"]] })
        x.assert_code(200)

    def test_delete_sms_errors(self):
        modems = get_modems(self)
        x = self.post_data("/messages/actions/remove_messages", { "modem_id": modems[0]["id"], "sms_id": ["5555"] })
        self.assertEqual(x.json["errors"][0]["source"], "sms_id")
        self.assertEqual(x.json["errors"][0]["code"], 113)
        self.assertEqual(x.json["errors"][0]["error"], "SMS with ID=5555 was not found")
        x.assert_code(404)
