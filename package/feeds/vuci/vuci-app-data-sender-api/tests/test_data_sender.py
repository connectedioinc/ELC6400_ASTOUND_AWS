from utils.general_api import is_package_installed
import io
import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.ssh import get_ssh, send_cmd
import utility_integration as util
import json
import response_codes as codes
import re

RC = codes.ResponseCodes

http = util.Env.http
api_url = util.Env.get_api_url()

URL_INPUTS = "/data_to_server/data"
URL_INPUTS_CFG = "/data_to_server/data/config/"
URL_OUTPUTS = "/data_to_server/servers"
URL_OUTPUTS_CFG = "/data_to_server/servers/config/"
URL_COLLECTIONS = "/data_to_server/collections"
URL_COLLECTIONS_CFG = "/data_to_server/collections/config/"

AZURE_KEY = """
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC3OJMwoVMEFfkj
WiLSj3S+NABQy0JQk2q6N2kScctbjrOVsum4oh89ZTUDiCzro37itDBjO31wykS+
PinmyarnY92qEO9jNhX5E2ZoIiogR4xjNnO6y9sqiMnX4DjeHfmBgy8hQflSan/d
MyHi2OPBIk/3yQ/LZGLUWaw+iRYHDHEGFCyK1WSs8FcOIT4yjzDpMqKTbn7XOxM1
x8tqFz9PeCpoN+r6Wt5q0ulFm27MUZaO9Ip6RPUypx4ax1aXUYjpLblMd1dOvD+N
B+PjakINPh+PNHfj5HQB0yOpq5nNqtXkBRl9Mus/ZgKR8xdetOLwOEpUs28MZR+8
vPdaLi53AgMBAAECggEANcONNYTxVk6YV+5YL49XA4VA3nR2lixb8h7WX0ozET/T
pMbmXH5+SkbLgqjP/alxT1bup//J9HH2MBkPtKBS3Slp30Cu7l7tnbQ6pa34zJYS
NP7CgPrW6ilPiWBLb6o+D+oNx2WTosKLmL4rYGSimIbYDm7aiqV/dq6Fo6gYZaKa
3+9u8DHWsEG0p0On5ouF28JMTyEDcMR/XgOvnsTaZ7IRAC5m4IU85P39iHg/UafD
YKn60YBYB0kdw2bbhjdw9occ0G0a3tzTbPv1M7nBrqlGcYzRuy20MIVHNnSj3qNr
TehqhOwcw0zVyGAaZJFDG7b6IMT8W5PbWMa2gO01EQKBgQDagPE0+IDQ/YxOCuh7
DOGSUkb1uV12uPOK7YmboaASNpINi23bbjTRlopsYViUFqC23Cq9Cr/akMLaQAkI
C1d8WZ8BTZJBt2mI7SMIiuURoSdSJxrikdMGaBYMPffGbHwqkwCe/16oT3UiBBPc
BseyjDqWSTPyR68gt7H466OLiQKBgQDWqaIwpPhM/3ucloos4WVpI4SnajdV6mQE
lNNB68nyZebPGs3GIjmL4z9ISlpCZZ59XxeM7vBPf6bUjBoiBId8J4Lac+8C0mRL
Yw3C+dw+P2bbvu34TrUsE6EBzkq5ccdAEmpmzH5kF3FINe99GFO/bTcKG/1nAmUn
hOpqg/Np/wKBgEkSiBf75zB9KpfK5BaKp0FEzMBOfmg+0AutBrEKazrMDyoCb/nL
MFTLMH2wTGwx6QteM9jGqISSludgNOUAzgAjBJ7t7zSU/vEwxN+Ne6/aogjCVSZi
OB1TX9Q2QQ+Vpiyivrltk51b/UMj8/RIPC6E4O7zijDDMlkRta4WN7ppAoGAQlMN
Ssxd76Rsc/hLXwyRQcf4n6WAzWnrV0MIdvC8Z8m2Y70bYSGH+EHRdquKccNmEcSE
yUW2OEnvqPJUzLfriJ/InWh+q7eHx4cmZFzBAPaj+Ddo3XSsI584+w7bJasS7igC
ehqq3pAjrzUC9vrCPX4oKFZ3mBE0Yd5+c0Sru88CgYBwQKEBA1ewgVi8VEHUYhK6
IRLe3H8+KJle6bICIwF1ZMyRoJfOBr4F0Z8aFzh1Uu+HdC5rTC3ZnKuqsoSlPIsV
88DCYP31ezIoB/xaWBSE9MlDVXPlFN1UdzJhb9LcYUBiYM7SR9yP4WGo7hLS03nw
/QJLrFDSeZ1VGUVFIUUS6g==
-----END PRIVATE KEY-----
"""

AZURE_CERT = """
-----BEGIN CERTIFICATE-----
MIIDJzCCAg8CFEWbpT+t/8cQ4W7BvsNHdmi2gJ+pMA0GCSqGSIb3DQEBCwUAME4x
CzAJBgNVBAYTAicnMQswCQYDVQQIDAInJzELMAkGA1UEBwwCJycxCzAJBgNVBAoM
AicnMQswCQYDVQQLDAInJzELMAkGA1UEAwwCY2EwHhcNMjMwMzIzMTAyODExWhcN
MzMwMzIwMTAyODExWjBSMQswCQYDVQQGEwInJzELMAkGA1UECAwCJycxCzAJBgNV
BAcMAicnMQswCQYDVQQKDAInJzELMAkGA1UECwwCJycxDzANBgNVBAMMBnNlcnZl
cjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALc4kzChUwQV+SNaItKP
dL40AFDLQlCTaro3aRJxy1uOs5Wy6biiHz1lNQOILOujfuK0MGM7fXDKRL4+KebJ
qudj3aoQ72M2FfkTZmgiKiBHjGM2c7rL2yqIydfgON4d+YGDLyFB+VJqf90zIeLY
48EiT/fJD8tkYtRZrD6JFgcMcQYULIrVZKzwVw4hPjKPMOkyopNuftc7EzXHy2oX
P094Kmg36vpa3mrS6UWbbsxRlo70inpE9TKnHhrHVpdRiOktuUx3V068P40H4+Nq
Qg0+H480d+PkdAHTI6mrmc2q1eQFGX0y6z9mApHzF1604vA4SlSzbwxlH7y891ou
LncCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEASG0MUMeKpm76W+1vuf1MZWC16Tez
4dLgzrjA4Tods2FWhvtRmihIInB3Aq+w5q5FK31FKI04MIBOSCH83bwDm9xGxFQK
kZ1/HtTEGVAfC8QJ6jH74/NQsUTv4IgwxcB5u23j+yKQrwGZ0rOt3jqjLn3pb7xC
y2OjDxTgUK5DWBK2wyQHVF4nH+IZWOtz11fH8o/mpYheiLBCLoL0Ud2y1LA0gyrz
GjzozdIrJY2QlCU70udA9csjRp9F3OXWxkuJCImh5qB1Ox42JFuwbCTG27zvqBfK
xNdkLIxjPVdpPHVOGRzq1mM3JtSqdjlLDGl1+T7R1tiy+yO2ZzRDjo1kyQ==
-----END CERTIFICATE-----
"""

class NewDataSender(WrapTest):
    input_options_from_device = []
    output_options_from_device = []
    input_options = []
    output_options = []
    options = []
    all_api_options = {
        'azure_attestation_mechanism': '',
        'azure_configuration_type': '',
        'azure_connection_string': '',
        'azure_connection_type': '',
        'azure_global_prov_uri': '',
        'azure_id_scope': '',
        'azure_registration_id': '',
        'azure_section_name': '',
        'azure_symmetric_key': '',
        'azure_x509certificate': '',
        'azure_x509privatekey': '',
        'bl_filter': 'all',
        'bl_filter_mac': 'AA:AA:AA:AA:AA:AA',
        'bl_filter_name': 'BluetoothName',
        'bl_object': '0',
        'bl_segments': '55',
        'dlms_filter': '',
        'dlms_filter_invert': '',
        'dlms_filter_name': '',
        'dlms_object': '',
        'dlms_segments': '',
        'dnp3_db': '',
        'dnp3_filter': '',
        'dnp3_filter_address': '',
        'dnp3_filter_ip': '',
        'dnp3_object': '',
        'dnp3_segments': '',
        'format_script': '',
        'format_str': '',
        'gsm_modem_id': '',
        'http_cafile': '/etc/certificates/cbid.ds_cert',
        'http_certfile': '/etc/certificates/cbid.ds_cert',
        'http_device_files': '',
        'http_header': ['TestHeader'],
        'http_host': '1.1.1.1',
        'http_keyfile': '/etc/certificates/cbid.ds_cert',
        'http_tls': '0',
        'http_verify_peer': '',
        'impulse_counter_filter': '',
        'impulse_counter_filter_invert': '',
        'impulse_counter_filter_pin': '',
        'impulse_counter_object': '',
        'impulse_counter_segments': '',
        'lua_script': '/etc/vuci-uploads/test',
        'mbus_db': '',
        'mbus_filter': '',
        'mbus_filter_invert': '',
        'mbus_filter_name': '',
        'mbus_object': '',
        'mbus_segments': '',
        'mdc_current': '0',
        'mdc_modem_id': '',
        'mdc_period': 'day',
        'mdc_sim': '1',
        'modbus_alarm_filter_alarm_id': 'test',
        'modbus_alarm_filter': 'all',
        'modbus_alarm_filter_register': '5',
        'modbus_alarm_filter_server_id': '2',
        'modbus_filter': 'all',
        'modbus_filter_request': 'RequestName',
        'modbus_filter_server_id': '69',
        'modbus_filter_server_ip': '1.1.1.1',
        'modbus_object': '0',
        'modbus_segments': '55',
        'mqtt_cafile': '/etc/certificates/cbid.ds_cert',
        'mqtt_certfile': '/etc/certificates/cbid.ds_cert',
        'mqtt_client_id': '10',
        'mqtt_device_files': '',
        'mqtt_device_files': '',
        'mqtt_host': '1.1.1.1',
        'mqtt_identity': 'Asdadasdad454',
        'mqtt_in_cafile': '/etc/certificates/cbid.ds_cert',
        'mqtt_in_certfile': '/etc/certificates/cbid.ds_cert',
        'mqtt_in_client_id': 'Testerino',
        'mqtt_in_host': '1.1.1.1',
        'mqtt_in_identity': 'identity',
        'mqtt_in_insecure': '0',
        'mqtt_in_keepalive': '10',
        'mqtt_in_keyfile': '/etc/certificates/cbid.ds_cert',
        'mqtt_in_password': 'password',
        'mqtt_in_port': '420',
        'mqtt_in_psk': 'A2174fBD37D5DBDB812FC7bDfc454F07a89f4934',
        'mqtt_in_qos': '0',
        'mqtt_insecure': '0',
        'mqtt_in_tls': '0',
        'mqtt_in_tls_type': 'psk',
        'mqtt_in_topic': 'Test',
        'mqtt_in_username': 'username',
        'mqtt_keepalive': '55',
        'mqtt_keyfile': '/etc/certificates/cbid.ds_cert',
        'mqtt_password': 'MqttPass',
        'mqtt_port': '69',
        'mqtt_psk': 'A2174fBD37D5DBDB812FC7bDfc454F07a89f4934',
        'mqtt_qos': '0',
        'mqtt_tls': '0',
        'mqtt_tls_type': 'psk',
        'mqtt_topic': 'MqttTopic',
        'mqtt_use_credentials': '0',
        'mqtt_username': 'MqttUser',
        'mqtt_msg_count': '10',
        'na_str': '',
        'opcua_filter': '',
        'opcua_filter_invert': '',
        'opcua_filter_name': '',
        'opcua_object': '',
        'opcua_segments': '',
        'ubus_method': '',
        'ubus_object': '',
        'ubus_timeout': '69',
        'wifi_filter': 'all',
        'wifi_filter_mac': 'AA:AA:AA:AA:AA:AA',
        'wifi_filter_name': 'WifiName',
        'wifi_filter_signal': '-69',
        'wifi_object': '0',
        'wifi_segments': '5',
        # 'el_event': 'Config',
        # 'el_event_str': 'all',
        'lua_out_script': '/etc/vuci-uploads/test',
        'smtp_recipients': ["test@test.lt"],
        'smtp_subject': 'TestSubject',
        'smtp_account': '',
        'soc_address': '1.1.1.1',
        'soc_port': '80',
        'soc_udp': '0',
        'soc_timeout': '60',
        'sms_phone': '+3706666666666',
        'sms_modem_id': '',
        'sms_group': '',
        'ftp_host': '1.1.1.1',
        'ftp_username': 'FTPUser',
        'ftp_password': 'FTPPass',
        'ftp_port': '69',
        'ftp_file_name': 'obuolys',
        'ftp_dir': '/etc/vuci-uploads/test',
        'ftp_buff_size': '69420',
        'ftp_overflow': '0',
        'ftp_mode': 'interval',
        'ftp_interval': '55',
        'ftp_hour': '3',
        'ftp_minute': '15',
        'ftp_day': '10',
        'ftp_cwd': 'nocwd',
        'iec60870_filter': '',
        'iec60870_filter_client_id': '',
        'iec60870_filter_information_object_address': '',
        'iec60870_filter_common_address': '',
        'iec60870_segments': ''
    }

    @classmethod
    def tearDownClass(cls):
        cls.ssh.send_cmd("rm /etc/vuci-uploads/test")
        cls.ssh.send_cmd("rm /etc/certificates/cbid.ds_cert")
        cls.ssh.logout()

    @classmethod
    def setUpClass(cls):
        io_pins = None
        cls.ssh = get_ssh()
        ssh = cls.ssh
        send_cmd(ssh, 'rm /tmp/data_sender/*') # clear cache
        io_pins = send_cmd(ssh, 'ubus list | grep ioman').splitlines()
        ds_json = json.loads(send_cmd(ssh, 'datasender -d'))['plugins']
        board = json.loads(send_cmd(ssh, 'cat /etc/board.json'))

        modems_res = http.get(f'{api_url}/modems/status')
        if modems_res.status_code == 200:
            cls.all_api_options.update({
                'mdc_modem_id': modems_res.json()['data'][0]['id'],
                'sms_modem_id': modems_res.json()['data'][0]['id'],
                'gsm_modem_id': modems_res.json()['data'][0]['id'],
            })
        else:
            modem_need = False
            for x in cls.input_options:
                for config_option in x['config']:
                    if 'modem' in config_option['option'] or 'modem_id' in config_option['option']:
                        modem_need = True
            for x in cls.output_options:
                for config_option in x['config']:
                    if 'modem' in config_option['option'] or 'modem_id' in config_option['option']:
                        modem_need = True
            if modem_need == True:
                print('RIP Modem')
        
        for plugin in ds_json:
            if plugin["name"] == "ubus":
                if send_cmd(ssh, 'cat /usr/local/usr/lib/opkg/info/azure_iothub.control &> /dev/null ; echo $?').strip() == '0' \
                or send_cmd(ssh, 'cat /usr/lib/opkg/info/azure_iothub.control &> /dev/null ; echo $?').strip() == '0':
                    cls.output_options_from_device.append("azure")
                continue

            if plugin["type"] == 1:
                if (plugin["name"] == "gsm" or plugin["name"] == "sms") and not board["hwinfo"].get("mobile"):
                    continue
                if plugin["name"] == "wifiscan" and not board["hwinfo"].get("wifi"):
                    continue
                if plugin["name"] == "bluetooth" and not board["hwinfo"].get("bluetooth"):
                    continue
                if plugin["name"] == "mdcollect" and (not board["hwinfo"].get("mobile") or send_cmd(ssh, 'cat /usr/lib/opkg/info/mdcollectd.control &> /dev/null ; echo $?').strip() != '0'):
                    continue
                cls.input_options_from_device.append(plugin["name"])
                if 'config' in plugin:
                    cls.input_options.append({
                        'name': plugin['name'],
                        'config': plugin['config']
                    })
            elif plugin["type"] == 4:
                if plugin["name"] == "sms" and not board["hwinfo"].get("mobile"):
                    continue
                cls.output_options_from_device.append(plugin["name"])
                if 'config' in plugin:
                    cls.output_options.append({
                        'name': plugin['name'],
                        'config': plugin['config']
                    })

        # events_options = http.get(f'{api_url}/events_reporting/options')
        # if events_options.status_code == 200:
        #     events_options = events_options.json()['data']['events']
        #     event = list(events_options.keys())[0]
        #     eventMark = events_options[event][0]
        #     cls.all_api_options.update({
        #         'event': event,
        #         'eventMark': eventMark
        #     })
        # else:
        #     event_need = False
        #     for x in cls.input_options:
        #         for config_option in x['config']:
        #             if 'event' in config_option['option'] or 'eventMark' in config_option['option']:
        #                 event_need = True
        #     for x in cls.output_options:
        #         for config_option in x['config']:
        #             if 'event' in config_option['option'] or 'eventMark' in config_option['option']:
        #                 event_need = True
        #     if event_need == True:
        #         print('RIP Events')

        if len(io_pins) > 0:
            for pin in io_pins:
                if 'ioman.' in pin:
                    cls.all_api_options.update({
                        'io_name': pin.split('.')[2]
                    })
                    break
        else:
            io_need = False
            for x in cls.input_options:
                for config_option in x['config']:
                    if 'io_name' in config_option['option']:
                        io_need = True
            for x in cls.output_options:
                for config_option in x['config']:
                    if 'io_name' in config_option['option']:
                        io_need = True
            if io_need == True:
                print('RIP IO')
        
        networks = http.get(f'{api_url}/ulog/available_interfaces')
        if networks.status_code == 200:
            cls.all_api_options.update({
                'network': networks.json()['data']['network'][0]
            })
        else:
            network_need = False
            for x in cls.input_options:
                for config_option in x['config']:
                    if 'network' in config_option['option']:
                        network_need = True
            for x in cls.output_options:
                for config_option in x['config']:
                    if 'network' in config_option['option']:
                        network_need = True
            if network_need == True:
                print('RIP Networks')
        sms_groups = http.get(f'{api_url}/recipients/phone_groups/config')
        if sms_groups.status_code == 200 and len(sms_groups.json()['data']) > 0:
            cls.configurated_options.update({
                'sms_group': sms_groups.json()['data'][0]['name'] 
            })
        smtp_groups = http.get(f'{api_url}/recipients/email_users/config')
        if smtp_groups.status_code == 200  and len(smtp_groups.json()['data']) > 0:
            cls.configurated_options.update({
                'smtp_account': smtp_groups.json()['data'][0]['name']
            })
        
        for x in cls.input_options:
            for config_option in x['config']:
                if not(config_option['option'] in cls.all_api_options) and not(config_option['option'] in cls.options) and (not 'admin' in config_option or ('admin' in config_option and config_option['admin'] == False )):
                    cls.options.append(config_option['option'])

        for x in cls.output_options:
            for config_option in x['config']:
                if not(config_option['option'] in cls.all_api_options) and not(config_option['option'] in cls.options) and (not 'admin' in config_option or ('admin' in config_option and config_option['admin'] == False )):
                    cls.options.append(config_option['option'])

        if len(cls.options) > 0:
            print("Missing configurated options:")
            print(cls.options)
            print('------------------------------------------------------------')  
            cls.fail(
                cls, "Data sender API options do not match 'datasender -d' output")
# ------------------------------------- Input/Output option Tests -------------------------------------

    def test_inputs_options(self):
        if self.ssh.send_cmd("mnf_info -n").startswith("x86"):
            self.skipTest("Test is not available for x86 devices")

        options_from_api = []

        with self.subTest("get inputs options from API"):
            x = self.get(f'{URL_INPUTS}/options')
            x.assert_code(200)
            for plugin in x.json['data']['plugins']:
                if 'name' in plugin:
                    options_from_api.append(plugin["name"])

        options_from_api.sort()
        self.input_options_from_device.sort()

        self.assertListEqual(options_from_api, self.input_options_from_device)

    def test_outputs_options(self):
        options_from_api = []

        with self.subTest("get outputs options from API"):
            x = self.get(f'{URL_OUTPUTS}/options')
            x.assert_code(200)
            for plugin in x.json['data']['plugins']:
                if 'name' in plugin:
                    options_from_api.append(plugin["name"])

        options_from_api.sort()
        self.output_options_from_device.sort()
        self.assertListEqual(options_from_api, self.output_options_from_device)

# -----------------------------------------------------------------------------------------------------

# -------------------------------------------- Input Tests --------------------------------------------

    def test_all_input_crud(self):
        collection_sid = None

        x = self.post_data(f'{URL_COLLECTIONS}/config', {
            'name': 'test_name'
        })
        collection_sid = x.resp.json()['data']['id']
        x.assert_code(201)

        for input_data in self.input_options:
            sid = None
            with self.subTest('Create input. Input plugin: ' + input_data['name']):
                x = self.post_data(f'{URL_COLLECTIONS}/{collection_sid}/data/config', {
                    'name': 'test_name',
                    'plugin': input_data['name']
                })
                sid = x.resp.json()['data']['id']
                x.assert_code(201)

            with self.subTest('Update input. Input plugin: ' + input_data['name']):
                payload = {}
                if 'lua' in input_data['name'] or 'mqtt' in input_data['name']:
                    self.ssh.send_cmd("touch /etc/vuci-uploads/test")
                    self.ssh.send_cmd("chown ds:ds /etc/vuci-uploads/test")
                if 'mqtt' in input_data['name']:
                    self.setupFakeCertificates()
                for input_option in input_data['config']:
                    if input_option['option'] in self.all_api_options and self.all_api_options[input_option['option']] != '':
                        payload.update({input_option['option']: self.all_api_options[input_option['option']]})
                x = self.put_data(f'{URL_COLLECTIONS}/{collection_sid}/data/config/{sid}', payload)

            with self.subTest('Delete input. Input plugin: ' + input_data['name']):
                x = self.delete(f'{URL_COLLECTIONS}/{collection_sid}/data/config/{sid}')
                x.assert_code(200)

        x = self.delete(f'{URL_COLLECTIONS}/config/{collection_sid}')
        x.assert_code(200)        

    # def test_if_cant_update_name_option(self):
    #     with self.subTest("Created input with name"):
    #         sid= None
    #         with self.subTest("create input"):
    #             x = self.post_data(URL_INPUTS_CFG, {
    #                 "name":"TestOptionName",
    #                 "plugin":"base"
    #             })
    #             sid = x.resp.json()['data']['id']
    #             x.assert_code(201)

    #         with self.subTest("try update name option"):
    #             x = self.put_data(URL_INPUTS_CFG + sid, {
    #                 "name":"AnotherName"
    #             })
    #             x.assert_error("name", "Option can not be modified.", RC.INVALID_OPT.val())

    #         with self.subTest("delete input"):
    #             x = self.delete(URL_INPUTS_CFG + sid)
    #             x.assert_code(200)

    #     with self.subTest("Created input without name"):
    #         sid= None
    #         with self.subTest("create input"):
    #             x = self.post_data(URL_INPUTS_CFG, {
    #                 "plugin":"base"
    #             })
    #             sid = x.resp.json()['data']['id']
    #             x.assert_code(201)

    #         with self.subTest("try update name option"):
    #             x = self.put_data(URL_INPUTS_CFG + sid, {
    #                 "name":"TestOptionName"
    #             })
    #             x.assert_code(200)

    #             x = self.put_data(URL_INPUTS_CFG + sid, {
    #                 "name":"AnotherName"
    #             })
    #             x.assert_error("name", "Option can not be modified.", RC.INVALID_OPT.val())

    #         with self.subTest("delete input"):
    #             x = self.delete(URL_INPUTS_CFG + sid)
    #             x.assert_code(200)

    def test_if_cant_delete_all_inputs_which_belongs_collection(self):
        collection_sid = None
        input_sid_default = None
        input_sid_another = None

        with self.subTest("create collection"):
            x = self.post_data(URL_COLLECTIONS_CFG, {"name":"testerino"})
            collection_sid = x.json["data"]["id"]
            input_sid_default = x.json["data"]["input"][0]
            x.assert_code(201)

        with self.subTest("create input"):
            x = self.post_data(f"{URL_COLLECTIONS}/{collection_sid}/data/config", {"name":"testerino", "plugin":"base"})
            input_sid_another = x.json["data"]["id"]
            x.assert_code(201)

        with self.subTest("delete input"):
            x = self.delete(f"{URL_COLLECTIONS}/{collection_sid}/data/config/{input_sid_another}")
            x.assert_code(200)

        with self.subTest("delete default input"):
            x = self.delete(f"{URL_COLLECTIONS}/{collection_sid}/data/config/{input_sid_default}")
            x.assert_error("Validation", f"Can't delete all inputs which appended to data sender colletion (id = {collection_sid}).", RC.NO_DELETE.val())

        with self.subTest("delete collection"):
            x = self.delete(URL_COLLECTIONS_CFG + collection_sid)
            x.assert_code(200)

    def test_if_input_option_is_deleted_in_collection_when_deleting_input(self):
        input_id1 = None
        input_id2 = None
        input_id3 = None
        input_id4 = None
        coll_id = None

        with self.subTest("create collection"):
            x = self.post_data(URL_COLLECTIONS_CFG, {"name":"rinkinys"})
            coll_id = x.json["data"]["id"]
            input_id1 = x.json["data"]["input"][0]
            x.assert_code(201)

        with self.subTest("create inputs"):
            x = self.post_data(f"{URL_COLLECTIONS}/{coll_id}/data/config", {"name":"ggwpp2", "plugin":"base"})
            input_id2 = x.json["data"]["id"]
            x.assert_code(201)
            x = self.post_data(f"{URL_COLLECTIONS}/{coll_id}/data/config", {"name":"ggwpp3", "plugin":"base"})
            input_id3 = x.json["data"]["id"]
            x.assert_code(201)
            x = self.post_data(f"{URL_COLLECTIONS}/{coll_id}/data/config", {"name":"ggwpp4", "plugin":"base"})
            input_id4 = x.json["data"]["id"]
            x.assert_code(201)

        with self.subTest("delete input3"):
            x = self.delete(f"{URL_COLLECTIONS}/{coll_id}/data/config/{input_id3}")
            x.assert_code(200)

        with self.subTest("test if input3 was deleted from collection"):
            x = self.get(URL_COLLECTIONS_CFG + coll_id)
            self.assertEqual(x.json["data"]["input"], [input_id1, input_id2, input_id4])

        with self.subTest("delete input4"):
            x = self.delete(f"{URL_COLLECTIONS}/{coll_id}/data/config/{input_id4}")
            x.assert_code(200)

        with self.subTest("test if input4 was deleted from collection"):
            x = self.get(URL_COLLECTIONS_CFG + coll_id)
            self.assertEqual(x.json["data"]["input"], [input_id1, input_id2])

        with self.subTest("delete input1"):
            x = self.delete(f"{URL_COLLECTIONS}/{coll_id}/data/config/{input_id1}")

        with self.subTest("test if input1 was deleted from collection"):
            x = self.get(URL_COLLECTIONS_CFG + coll_id)
            self.assertEqual(x.json["data"]["input"], [input_id2])

        with self.subTest("delete collection"):
            x = self.delete(URL_COLLECTIONS_CFG + coll_id)

    def test_if_related_inputs_and_outputs_are_deleted_when_deleting_collection(self):
        input_id1 = None
        input_id2 = None
        output_id = None
        coll_id = None

        with self.subTest("create collection"):
            x = self.post_data(URL_COLLECTIONS_CFG, {"name":"rinkinys"})
            coll_id = x.json["data"]["id"]
            input_id1 = x.json["data"]["input"][0]
            output_id = x.json["data"]["output"]

        with self.subTest("create additional input"):
            x = self.post_data(f"{URL_COLLECTIONS}/{coll_id}/data/config", {"name":"ggwpp", "plugin":"base"})
            input_id2 = x.json["data"]["id"]

        with self.subTest("delete collection"):
            x = self.delete(URL_COLLECTIONS_CFG + coll_id)

        with self.subTest("test if related inputs and outputs were deleted"):
            self.get(URL_INPUTS_CFG + input_id1).assert_code(404)
            self.get(URL_INPUTS_CFG + input_id2).assert_code(404)
            self.get(URL_OUTPUTS_CFG + output_id).assert_code(404)
            self.get(URL_COLLECTIONS_CFG + coll_id).assert_code(404)

    def test_if_output_and_input_is_created_when_creating_collection(self):
        coll_id = None
        input_id = None
        output_id = None
        with self.subTest("create collection and test if input/outpud created messages are returned"):
            x = self.post_data(URL_COLLECTIONS_CFG, {"name":"rinkinys"})
            coll_id = x.json["data"]["id"]
            output_id = x.json["data"]["output"]
            input_id = x.json["data"]["input"][0]

            self.assertIn({
                "message": "Output configuration was automatically created.",
                "source": "output",
                "code": 1
            }, x.json["messages"])
            self.assertIn({
                "message": "Input configuration was automatically created.",
                "source": "input",
                "code": 2
            }, x.json["messages"])

        with self.subTest("test if output and input created"):
            self.get(URL_INPUTS_CFG + input_id).assert_code(200)
            self.get(URL_OUTPUTS_CFG + output_id).assert_code(200)

        with self.subTest("delete collection"):
            x = self.delete(URL_COLLECTIONS_CFG + coll_id)

    def test_custom_option_require_logic(self):
        input_id1 = None
        input_id2 = None
        output_id = None
        coll_id = None
            
        with self.subTest("create disabled collection"):
            x = self.post_data(URL_COLLECTIONS_CFG, {"name": "rinkinys"})
            coll_id = x.json["data"]["id"]

            input_id2 = x.json["data"]["input"][0]
            output_id = x.json["data"]["output"]

            with self.subTest("test if custom messages are present"):
                self.assertEqual(x.json["messages"], [{"message": "Output configuration was automatically created.", "source": "output", "code": 1}, {
                                 "message": "Input configuration was automatically created.", "source": "input", "code": 2}])

        with self.subTest("test if collection can't be enabled with missing output options"):
            x = self.put_data(URL_COLLECTIONS_CFG + coll_id, {"enabled": "1"})
            self.assertIn({"source": "plugin", "code": 103,
                           "error": f"Data sender output (id = {output_id}) is missing required option: plugin", "section": output_id}, x.json["errors"])
            self.put_data(f"{URL_COLLECTIONS}/{coll_id}/servers/config/{output_id}", {"plugin": "http"}).assert_code(200)
            x = self.put_data(URL_COLLECTIONS_CFG + coll_id, {"enabled": "1"})
            self.assertIn({"source": "plugin", "code": 103, "error": f"Data sender output (id = {output_id}) is missing required option: http_host", "section": output_id}, x.json["errors"])

        with self.subTest("test if input can't be enabled with missing input options"):
            x = self.put_data(f"{URL_COLLECTIONS}/{coll_id}/data/config/{input_id2}", {"enabled":"0","name": "test2", "plugin": "mqtt"}).assert_code(200)
            x = self.put_data(f"{URL_COLLECTIONS}/{coll_id}/data/config/{input_id2}", {"enabled": "1"})
            self.assertIn({"source": "plugin", "code": 103,
                           "error": "Missing required option: mqtt_in_host", "section": input_id2}, x.json["errors"])
            self.assertIn({"source": "plugin", "code": 103,
                           "error": "Missing required option: mqtt_in_topic", "section": input_id2}, x.json["errors"])
        pass

        with self.subTest("test if output's required option can't be deleted when collection is enabled"):
            self.put_data(f"{URL_COLLECTIONS}/{coll_id}/servers/config/{output_id}", {"plugin": "http", "http_host": "1.2.3.4"}).assert_code(200)
            self.put_data(URL_COLLECTIONS_CFG + coll_id, {"enabled": "1"}).assert_code(200)

            x = self.put_data(f"{URL_COLLECTIONS}/{coll_id}/servers/config/{output_id}", {"http_host": ""})
            self.assertIn({"source": "plugin", "code": 103,
                           "error": "Missing required option: http_host", "section": output_id}, x.json["errors"])

            with self.subTest("test if required option can be edited (just in case)"):
                x = self.put_data(f"{URL_COLLECTIONS}/{coll_id}/servers/config/{output_id}", {"http_host": "4.3.2.1"})
                x.assert_code(200)
        
        with self.subTest("test if input's required option can be deleted when input is disabled and it's parent collection is enabled"):
            self.put_data(URL_COLLECTIONS_CFG + coll_id, {"enabled": "1"}).assert_code(200)
            self.put_data(f"{URL_COLLECTIONS}/{coll_id}/data/config/{input_id2}", {"enabled": "1", "mqtt_in_host":"192.168.1.1", "mqtt_in_topic": "test_topic"}).assert_code(200)
            self.put_data(f"{URL_COLLECTIONS}/{coll_id}/data/config/{input_id2}", {"enabled": "0", "mqtt_in_host": "" }).assert_code(200)
                                                                                   
        with self.subTest("test if requires are reenabled for subsequent sections"):
            self.put_data(URL_COLLECTIONS_CFG + coll_id, {"enabled": "1"}).assert_code(200)
            x = self.put_data(f"{URL_COLLECTIONS}/{coll_id}/servers/config/{output_id}", {"plugin": "http", "http_host":""})
            self.assertIn({"source": "plugin", "code": 103,
                           "error": "Missing required option: http_host", "section": output_id}, x.json["errors"])
        with self.subTest("delete collection"):
            x = self.delete(URL_COLLECTIONS_CFG + coll_id)
            x.assert_code(200)


# # -----------------------------------------------------------------------------------------------------

# # -------------------------------------------- Output Tests -------------------------------------------

    def test_all_output_crud(self):
        for output_data in self.output_options:
            sid = None
            output_sid = None
            with self.subTest('Create output. Output plugin: ' + output_data['name']):
                x = self.post_data(f'{URL_COLLECTIONS}/config',{'name': 'Testerino'})
                sid = x.resp.json()['data']['id']
                output_sid = x.resp.json()['data']['output']

            with self.subTest('Update output. Output plugin: ' + output_data['name']):
                if 'http' in output_data['name'] or 'mqtt' in output_data['name'] or 'lua' in output_data['name']:
                        self.ssh.send_cmd("touch /etc/vuci-uploads/test")
                        self.ssh.send_cmd("chown ds:ds /etc/vuci-uploads/test")
                if 'mqtt' in output_data['name'] or 'http' in output_data['name']:
                    self.setupFakeCertificates()
                payload = {}
                for output_option in output_data['config']:
                    if output_option['option'] in self.all_api_options and self.all_api_options[output_option['option']] != '':
                        payload.update({output_option['option']: self.all_api_options[output_option['option']]})
                x = self.put_data(f'{URL_COLLECTIONS}/{sid}/servers/config/{output_sid}', payload)
                x.assert_code(200)

            with self.subTest('Delete output. Output plugin: ' + output_data['name']):
                x = self.delete(f'{URL_COLLECTIONS}/config/{sid}')
                x.assert_code(200)

# # -----------------------------------------------------------------------------------------------------

# # ------------------------------------------ Collection Tests -----------------------------------------

    def test_if_output_name_is_set_when_collection_is_created(self):
        sid= None
        output_sid= None
        with self.subTest('Create collection'):
            x = self.post_data(f'{URL_COLLECTIONS}/config', {'name': 'Testerino'})
            sid = x.resp.json()['data']['id']
            output_sid = x.resp.json()['data']['output']

        with self.subTest('Check ouput name'):
            x = self.get(URL_OUTPUTS_CFG + output_sid)
            x.assert_code(200)
            name = x.resp.json()['data']['name']
            self.assertEqual(name, "Testerino_output")

        with self.subTest('Delete collection'):
            x = self.delete(f'{URL_COLLECTIONS}/config/{sid}')
            x.assert_code(200)

    # TODO: After new AzureIotHub implementation fix this test
    def test_azure_output(self):
        def find_number_after_azure_in_text(text):
            try:
                data = json.loads(text)
                ubus_object_value = data.get("values", {}).get("ubus_object", "")
                match = re.search(r'azure\.(\d+)', ubus_object_value)
                if match:
                    return match.group(1)
                else:
                    return
            except Exception as e:
                return f"Error: {str(e)}"

        output_sid = None
        coll_sid = None
        azure_sid = None
        if not is_package_installed(self, "azure"):
            self.skipTest("Azure not installed")

        with self.subTest("create azure collection+output+input"):
            x = self.post_data(URL_COLLECTIONS_CFG, {
                "name": "ttt123"
            })
            coll_sid = x.json["data"]["id"]
            output_sid = x.json["data"]["output"]

        with self.subTest("test plugin type validation"):
            x = self.put_data(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', {
                "plugin": "invalid_plugin",
                "azure_connection_type": "iothub"
            })
            x.assert_code(422)
            self.assertIn("azure", x.json["errors"][0]["error"])
            self.assertNotIn("ubus", x.json["errors"][0]["error"])

        with self.subTest("test azure plugin setting"):
            x = self.put_data(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', {
                "plugin": "azure",
                "azure_connection_type": "iothub"
            })
            x.assert_code(200)
            self.assertEqual(x.json["data"]["plugin"], "azure")
            self.assertEqual(x.json["data"]["azure_connection_type"], "iothub")

        with self.subTest("check ubus options"):
            cfg = self.ssh.send_cmd('ubus call uci get \'{"config":"data_sender","section":"'+output_sid+'"}\'')
            azure_sid = find_number_after_azure_in_text(cfg)
            self.assertIn(f'"ubus_object": "azure.{azure_sid}"', cfg)
            self.assertIn('"ubus_method": "message"', cfg)
            self.assertIn('"plugin": "ubus"', cfg)

        with self.subTest("check if azure section is deleted when changing plugin type"):
            x = self.put_data(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', {"plugin":"http", "http_host": "1.1.1.1", "azure_connection_type": ""})
            x.assert_data({"plugin":"http", "http_host": "1.1.1.1", "id": output_sid, ".type": "output", "name": "ttt123_output"},
                          skippable_options=["azure_configuration_type"])
            cfg = self.ssh.send_cmd('ubus call uci get \'{"config":"data_sender","section":"'+output_sid+'"}\'')
            self.assertNotIn(f'"ubus_object": "azure.{output_sid}"', cfg)
            self.assertNotIn('"ubus_method": "message"', cfg)
            self.assertEqual(self.ssh.send_cmd('ubus call uci get \'{"config":"azure_iothub","section":"'+output_sid+'"}\'').strip(), "")

        with self.subTest("check if azure section is created when changing plugin type"):
            x = self.put_data(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', {"plugin":"azure", "http_host": "", "azure_connection_type": "iothub"})
            x.assert_data({"plugin":"azure", "id": output_sid, ".type": "output", "name": "ttt123_output", "azure_connection_type": "iothub", "azure_configuration_type": "unique"})
            x.assert_code(200)
            cfg = self.ssh.send_cmd('ubus call uci get \'{"config":"data_sender","section":"'+output_sid+'"}\'')
            azure_sid = find_number_after_azure_in_text(cfg)
            self.assertIn(f'"ubus_object": "azure.{azure_sid}"', cfg)
            self.assertIn('"ubus_method": "message"', cfg)
            self.assertNotEqual(self.ssh.send_cmd('ubus call uci get \'{"config":"azure_iothub","section":"'+azure_sid+'"}\'').strip(), "")
        
        with self.subTest("check azure options"):
            x = self.put_data(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', {"plugin": "azure", "azure_connection_type": "iothub", "azure_connection_string": "aa.aaa"})
            x.assert_data({"plugin": "azure", "azure_connection_type": "iothub",
                          "azure_connection_string": "aa.aaa", "name": "ttt123_output", "id": output_sid, ".type": "output", "azure_configuration_type": "unique"})
            cfg = self.ssh.send_cmd('ubus call uci get \'{"config":"data_sender","section":"'+output_sid+'"}\'')
            azure_sid = find_number_after_azure_in_text(cfg)
            uci_s = json.loads(self.ssh.send_cmd('ubus call uci get \'{"config":"azure_iothub","section":"'+azure_sid+'"}\''))["values"]
            del uci_s[".name"]
            self.assertDictEqual(uci_s, {
                ".anonymous": False,
                ".type": "azure_iothub",
                "connection_type": "iothub",
                "connection_string": "aa.aaa",
                "enabled": "1",
                "hidden": "1"})

            x = self.put_data(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', {
                "plugin": "azure",
                "azure_connection_type": "provisioning",
                "azure_connection_string": "",
                "azure_id_scope": "who mst",
                "azure_registration_id": "123 fgsgd",
                "azure_attestation_mechanism": "x509_certificate",
                "azure_global_prov_uri": "global.azure-devices-provisioning.net"})
            x.assert_data({
                "plugin": "azure",
                "azure_connection_type": "provisioning",
                "azure_id_scope": "who mst",
                "azure_registration_id": "123 fgsgd",
                "azure_attestation_mechanism": "x509_certificate",
                "azure_global_prov_uri": "global.azure-devices-provisioning.net",
                "name": "ttt123_output",
                "id": output_sid,
                "azure_configuration_type": "unique",
                ".type": "output"})
            uci_s = json.loads(self.ssh.send_cmd('ubus call uci get \'{"config":"azure_iothub","section":"'+azure_sid+'"}\''))["values"]
            del uci_s[".name"]
            self.assertDictEqual(uci_s, {
                ".anonymous": False,
                "enabled": "1",
                "attestation_mechanism": "x509_certificate",
                ".type": "azure_iothub",
                "connection_type": "provisioning",
                "id_scope": "who mst",
                "registration_id": "123 fgsgd",
                "global_prov_uri": "global.azure-devices-provisioning.net",
                "hidden": "1"})

        with self.subTest("check azure upload options"):
            f = io.StringIO(AZURE_CERT)
            x = self.send_file(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', f, "azure_x509certificate")
            x.assert_code(200)
            uploaded_file_path = x.json["data"]["path"]

            x = self.put_data(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', {"azure_x509certificate": uploaded_file_path,
                                                                                        "azure_configuration_type": "unique"})
            x.assert_code(200)
            self.assertEqual(x.json["data"]["azure_x509certificate:file_size"], len(AZURE_CERT))

            f = io.StringIO(AZURE_KEY)
            x = self.send_file(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', f, "azure_x509privatekey")
            x.assert_code(200)
            uploaded_file_path = x.json["data"]["path"]

            x = self.put_data(f'{URL_COLLECTIONS}/{coll_sid}/servers/config/{output_sid}', {"azure_x509privatekey": uploaded_file_path})
            x.assert_code(200)
            self.assertEqual(x.json["data"]["azure_x509privatekey:file_size"], len(AZURE_KEY))

        with self.subTest("delete azure collection+output+input"):
            self.delete(URL_COLLECTIONS_CFG + coll_sid).assert_code(200)
            self.assertEqual(self.ssh.send_cmd('ubus call uci get \'{"config":"azure_iothub","section":"'+output_sid+'"}\'').strip(), "")

# # -----------------------------------------------------------------------------------------------------

# # --------------------------------------- Option deletion tests ---------------------------------------

    def test_module_is_deleted_and_cant_set_option(self):
        def for_error_sorting(e):
            return e['source']
        prefix = {
            "bluetooth":    "bl",
            "chilli":       "hs",
            "dlms":         "dlms",
            "dnp3":         "dnp3",
            # "eventlog":     "el",
            "gsm":          "gsm",
            "io":           "io",
            "lua":          "lua",
            "mbus":         "mbus",
            "mdcollect":    "mdc",
            "modbus":       "modbus",
            "mqtt":         "mqtt",
            "opcua":        "opcua",
            "sms":          "sms",
            "wifiscan":     "wifi",
            "file":         "file",
            "ftp":          "ftp",
            "http":         "http",
            "smtp":         "smtp",
            "socket":       "soc",
            "telegram":     "telegram"
	    }

        self.ssh = get_ssh()
        ssh = self.ssh
        options= []
        input_name= None
        for input_plugin in self.input_options_from_device:
            response = send_cmd(ssh, f'datasender -d /usr/lib/data_sender/ds_input_{input_plugin}.so')
            parsed_response = json.loads(response)["plugins"][0]
            if "config" in parsed_response:
                for config in parsed_response["config"]:
                    if input_plugin in prefix and prefix[input_plugin] in config["option"] and (not 'admin' in config or ('admin' in config and config['admin'] == False )):
                        options.append(config["option"])
            if len(options) > 0:
                input_name = input_plugin
                break
        
        if input_name != None:
            sid = None
            input_sid = None
            error_messages = [] 
            with self.subTest("Rename plugin name. Plugin name: " + input_name):
                send_cmd(ssh, f'rm /tmp/data_sender/* ; mv /usr/lib/data_sender/ds_input_{input_name}.so /usr/lib/data_sender/ds_input_testerino.so')

            with self.subTest("Create empty plugin and generate error messages"):
                x = self.post_data(f'{URL_COLLECTIONS}/config', {'name': 'Testerino'})
                sid = x.resp.json()['data']['id']
                input_sid = x.resp.json()['data']['input'][0]
                for option in options:
                    error_messages.append({
                        "source": option,
                        "code": 103,
                        "error": "Invalid option",
                        "section": input_sid
                    })

            with self.subTest("Try to update plugin options with bad prefix"):
                payload = {"name": "testerino420"}
                for input_option in options:
                    if input_option in self.all_api_options and self.all_api_options[input_option] != '':
                        payload.update({input_option: self.all_api_options[input_option]})
                x = self.put_data(f'{URL_COLLECTIONS}/{sid}/data/config/{input_sid}', payload)
                api_error_messages = x.json["errors"]
                api_error_messages.sort(key=for_error_sorting)
                error_messages.sort(key=for_error_sorting)
                self.assertListEqual(api_error_messages, error_messages)

            with self.subTest("Revert plugin name. Plugin name: " + input_name):
                send_cmd(ssh, f'mv /usr/lib/data_sender/ds_input_testerino.so /usr/lib/data_sender/ds_input_{input_name}.so')

            
            with self.subTest("Delete collection"):
                x = self.delete(f'{URL_COLLECTIONS}/config/{sid}')
                x.assert_code(200)

# # -----------------------------------------------------------------------------------------------------

    def test_time_validation(self):
        collection_sid = None

        with self.subTest("create collection"):
            x = self.post_data(URL_COLLECTIONS_CFG, {"name":"testerino"})
            collection_sid = x.json["data"]["id"]
            x.assert_code(201)

        with self.subTest("returns generic error if time is not valid"):
            data = [
                { 'time':'10:10', 'isValid': True},
                { 'time':'1:10', 'isValid': False},
                { 'time':'01:10', 'isValid': True},
                { 'time':'10:1', 'isValid': False},
                { 'time':'10:01', 'isValid': True},
                { 'time':'*:1', 'isValid': False},
                { 'time':'**:01', 'isValid': False},
                { 'time':'01:***', 'isValid': False},
                { 'time':'*:01', 'isValid': True},
                { 'time':'*:*', 'isValid': True},
                { 'time':'10:', 'isValid': False},
                { 'time':'10', 'isValid': False},
                { 'time':'10:10,11', 'isValid': True},
                { 'time':'10:10,1,11', 'isValid': False},
                { 'time':'10:*', 'isValid': True},
                { 'time':'10: ', 'isValid': False},
                { 'time':'10:10,', 'isValid': False},
            ]
            for val in data:
                x = self.put_data(f'{URL_COLLECTIONS_CFG}{collection_sid}', { 'time' : [val['time']] })
                val['isValid'] and x.assert_code(200)
                not val['isValid'] and x.assert_error("time at index 1", "Time of format hh:mm, hh:mm,mm, *:mm, *:mm,mm hh:*, or *:* is accepted. '*' means 'every hour' or 'every minute'. If regular minutes are used, multiple minute values can be provided by seperating them with ','.",103)

        with self.subTest("returns error if '*' minute value is used with extra minute values"):
            data = [
                { 'time':'10:*,11', 'isValid': False},
                { 'time':'10:*,11,*', 'isValid': False},
                { 'time':'10:*,*,*', 'isValid': False},
                { 'time':'10:*', 'isValid': True}
            ]
            for val in data:
                x = self.put_data(f'{URL_COLLECTIONS_CFG}{collection_sid}', { 'time' : [val['time']] })
                val['isValid'] and x.assert_code(200)
                not val['isValid'] and x.assert_error("time at index 1", "It's not possible to use multiple minute values when '*' (every minute wildcard) is selected.",103)
            
        with self.subTest("returns error if minute value is already used"):
            message = "'{0}' minute value for hour '{1}' is already used."
            source = 'time at index {0}'
            data = [
                { 'time':['10:15', '10:16']},
                { 'time':['10:15', '10:15'], 'minute':'15', 'hour':'10', 'index':'2'},
                { 'time':['10:15', '10:16,15'], 'minute':'15', 'hour':'10', 'index':'2'},
                { 'time':['10:13,12,11,15', '10:16,15,17'], 'minute':'15', 'hour':'10', 'index':'2'},
                { 'time':['10:*', '10:*'], 'minute':'*', 'hour':'10', 'index':'2'},
                { 'time':['*:10', '*:15,10'], 'minute':'10', 'hour':'*', 'index':'2'},
                { 'time':['*:*', '*:*'], 'minute':'*', 'hour':'*', 'index':'2'},
                { 'time':['*:15,16', '*:16,15,17', '11:18', '*:*'], 'minute':'16', 'hour':'*', 'index':'2'},    
                { 'time':['01:10,11', '11:12,13,11', '01:10'], 'minute':'10', 'hour':'01', 'index':'3'}
            ]
            for val in data:
                x = self.put_data(f'{URL_COLLECTIONS_CFG}{collection_sid}', { 'time' : val['time'] })
                not 'minute' in val and x.assert_code(200)
                'minute' in val and x.assert_error(source.format(val['index']), message.format(val['minute'], val['hour']), 103)
            

        with self.subTest("delete collection"):
            x = self.delete(URL_COLLECTIONS_CFG + collection_sid)
            x.assert_code(200)

    def setupFakeCertificates(self):
        self.ssh.send_cmd("touch /etc/certificates/cbid.ds_cert")
        self.ssh.send_cmd("chown certificates:certificates /etc/certificates/cbid.ds_cert")
