import sys
import io
import response_codes as codes
from time import sleep
import utility_integration as util
from utils.ssh import get_ssh
from utils.general_api import is_package_installed

sys.path.append("../../../../tests")

class test_access_control_webui(util.WrapTest):
    cert = """
-----BEGIN CERTIFICATE-----
MIID7TCCAqGgAwIBAgIUDcYfu03H5I09gYBLinAN99tTE4cwQQYJKoZIhvcNAQEK
MDSgDzANBglghkgBZQMEAgEFAKEcMBoGCSqGSIb3DQEBCDANBglghkgBZQMEAgEF
AKIDAgEgME4xCzAJBgNVBAYTAicnMQswCQYDVQQIDAInJzELMAkGA1UEBwwCJycx
CzAJBgNVBAoMAicnMQswCQYDVQQLDAInJzELMAkGA1UEAwwCY2EwHhcNMjUwOTI5
MDQwMjQ0WhcNMzUwOTI3MDQwMjQ0WjBSMQswCQYDVQQGEwInJzELMAkGA1UECAwC
JycxCzAJBgNVBAcMAicnMQswCQYDVQQKDAInJzELMAkGA1UECwwCJycxDzANBgNV
BAMMBnNlcnZlcjCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAK0ODEZj
cyzt7A97qw0hVXMNlKqWWvQnG7VmUslVoJIuBMbEwP2UXCUXMgAAH9jIkRbu7NO9
fMg0VTHkQx1hhiGg8EnFe8UXeNRcpIO2c39MfYog8fomeQ7UVF8f3NXcl999t9aQ
M/+mLklSqzt4E9u6xC9G9aQCMGTXf7JJFVQD+DWYIQ/GLMKvxrp/KE9LEzJXJLrK
cNICl9zH4idMfUU9XsRH2yY8dGtKlPGLuTSJX2BP+gK0RVZd7yaUddGrVP6jtp0i
0tCoABWVkoDXLLb36kSJOzrfiwbFTNYrYgDVF3+b+TmQhN/FQAtU1WK4luBOtWki
6EXTQe+D2a5gUb8CAwEAAaNXMFUwEwYDVR0lBAwwCgYIKwYBBQUHAwEwHQYDVR0O
BBYEFKyQAa9dGg/QVX6ynhIzAVW291ElMB8GA1UdIwQYMBaAFFA0bA3Q3maXUJOt
MwDZXRHQzeOYMEEGCSqGSIb3DQEBCjA0oA8wDQYJYIZIAWUDBAIBBQChHDAaBgkq
hkiG9w0BAQgwDQYJYIZIAWUDBAIBBQCiAwIBIAOCAQEAE1VptI31oNQnHcJMrrFv
zTsrwTetCCRd7bvrwGCpAPhyyc19axrnpQNRR/IvA2T1JcMy2RNxDUM+fX6+vRn/
u87Q6tConBZhxnxc4FdnsBiyzQwYuUC1N/RWAcWbiyniDMOA5obAMCjF+eKu+qZQ
y/b+5C/fLBoWHoLWHQNlErkVR0yb5i9TFexKTOvQagAzPoN2qi+VSTrU/n2s8aIb
uVd2BTjORvOgwaJWhjyyNycm841rkj3C5YoH3QdKoalv1a8UCAnFUeIrCSB8OY8K
7uL/5CzPCc9pqw+Rau5f5JAph50lvjhluPz0g7s2AYvu2300QQqC3Pf8wi5p2QRg
4g==
-----END CERTIFICATE-----
    """
    key = """
-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgFu8Lor170GwIDZTZ
a9L8cxpfBlM7fJ4js/smCc7kkTOhRANCAAQ5YtuePESE0OZsS0lhfihrkqgdWW/N
67pv1s70OY99KAt0RiZ8cJphENsh5wzrfb47iihe7zgXhoDCDpnBQHx1
-----END PRIVATE KEY-----
    """
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()
    
    def test_access_control_webui_base_functionality(self):
        base_url = "/access_control/webui/config"
        with self.subTest("configure_section"):
            x = self.put_data(base_url + "/general", {
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "wan_listen_http":"80",
                "https_wan_access":"0",
                "listen_https":"443",
                "wan_listen_https":"443",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key"
            })
            expected = {
                "id":"general",
                ".type":"uhttpd",
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "wan_listen_http":"80",
                "https_wan_access":"0",
                "listen_https":"443",
                "wan_listen_https":"443",
                "rfc1918_filter":"1",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key",
                'enable_basic_auth': '0',
                "webui_access": "1"
            }
            if is_package_installed(self, "uhttpd-mod-ubus"):
                expected["enable_json_rpc"] = "0"
            x.assert_data(expected, 200, {"cert:file_size", "key:file_size"})
        with self.subTest("single_get"):
            x = self.get(base_url + "/general")
            expected = {
                "id":"general",
                ".type":"uhttpd",
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "wan_listen_http":"80",
                "https_wan_access":"0",
                "listen_https":"443",
                "wan_listen_https":"443",
                "rfc1918_filter":"1",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key",
                'enable_basic_auth': '0',
                "webui_access": "1"
            }
            if is_package_installed(self, "uhttpd-mod-ubus"):
                expected["enable_json_rpc"] = "0"
            x.assert_data(expected, 200, {"cert:file_size", "key:file_size"})
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            expected = {
                "id":"general",
                ".type":"uhttpd",
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "wan_listen_http":"80",
                "https_wan_access":"0",
                "listen_https":"443",
                "wan_listen_https":"443",
                "rfc1918_filter":"1",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key",
                'enable_basic_auth': '0',
                "webui_access": "1"
            }
            if is_package_installed(self, "uhttpd-mod-ubus"):
                expected["enable_json_rpc"] = "0"
            x.assert_data([expected], 200, {"cert:file_size", "key:file_size"})
        with self.subTest("clear_configuration"):
            x = self.put_data(base_url + "/general", {
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"",
                "http_wan_access":"",
                "listen_http":"80",
                "wan_listen_http":"",
                "https_wan_access":"",
                "listen_https":"443",
                "wan_listen_https":"",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key"
            })
            expected = {
                ".type":"uhttpd",
                "id":"general",
                "enable_http":"1",
                "enable_https":"1",
                "listen_http":"80",
                "wan_listen_http":"80",
                "listen_https":"443",
                "wan_listen_https":"443",
                "rfc1918_filter":"1",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key",
                'enable_basic_auth': '0',
                "webui_access": "1"
            }
            if is_package_installed(self, "uhttpd-mod-ubus"):
                expected["enable_json_rpc"] = "0"
            x.assert_data(expected, 200, {"cert:file_size", "key:file_size"})
        with self.subTest("test_ac_webui_deletion"):
            x = self.delete(base_url)
            x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
        with self.subTest("test_ac_webui_creation"):
            x = self.post_data(base_url, {})
            x.assert_error("Validation", "Section creation is not allowed", 108, None, None)
        with self.subTest("duplicate_http_port"):
            x = self.put_data(base_url + "/general", {
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "https_wan_access":"0",
                "listen_https": "80",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key"
            })
            x.assert_error("Validation", "Port 80 is already in use", 113, None, None)
        with self.subTest("empty_http_port"):
            x = self.put_data(base_url + "/general", {
                "listen_https": "",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key"
            })
            x.assert_error("listen_https", "Option can not be empty", 103, None, None)
        with self.subTest("duplicate_default_ssh_port"):
            x = self.put_data(base_url + "/general", {
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "https_wan_access":"0",
                "listen_https": "22",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key"
            })
            x.assert_error("Validation", "Port 22 is already used in another service", 113, None, None)
        with self.subTest("duplicate_ssh_http"):
            x = self.put_data(base_url + "/general", {
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"22",
                "https_wan_access":"0",
                "listen_https": "80",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key"
            })
            x.assert_error("Validation", "Port 22 is already used in another service", 113, None, None)
        with self.subTest("duplicate_cli_port"):
            x = self.put_data(base_url + "/general", {
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"4200",
                "https_wan_access":"0",
                "listen_https": "443",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key"
            })
            x.assert_error("Validation", "Port 4200 is already used in another service", 113, None, None)

    def test_basic_authentication(self):
        base_url = "/access_control/webui/config"
        with self.subTest("enable_auth_with_disabled_redirect"):
            x = self.put_data(base_url + "/general", {
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "https_wan_access":"0",
                "listen_https": "443",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key",
                "enable_basic_auth": "1"
            })

            x.assert_error("enable_basic_auth", "Basic auth can not be enabled when HTTPS and HTTPS redirect are disabled", 103, None, None)
        with self.subTest("enable_basic_auth"):
            # enable with ssh as redirect_https can't be enabled
            self.ssh.send_cmd('uci set uhttpd.main.enable_basic_auth=1')
            self.ssh.send_cmd('uci commit uhttpd')
            x = self.get(base_url + "/general")
            expected = {
                "id":"general",
                ".type":"uhttpd",
                "enable_http":"1",
                "enable_https":"1",
                "listen_http":"80",
                "listen_https":"443",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key",
                'enable_basic_auth': '1',
                'rfc1918_filter': '1',
                'rfc1918_filter_http': '1',
                'rfc1918_filter_https': '1',
                'wan_listen_http': '80',
                'wan_listen_https': '443',
                "webui_access": "1"
            }
            if is_package_installed(self, "uhttpd-mod-ubus"):
                expected["enable_json_rpc"] = "0"
            x.assert_data(expected, 200, {"cert:file_size", "key:file_size"})
        with self.subTest("disable_https"):
            x = self.put_data(base_url + "/general", {
                "enable_http":"1",
                "enable_https":"0",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "https_wan_access":"0",
                "listen_https": "443",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key",
            })
            expected = {
                'listen_https': '443',
                'listen_http': '80',
                'enable_https': '0',
                'key': '/etc/uhttpd.key',
                'redirect_https': '0',
                'enable_basic_auth': '0',
                'wan_listen_https': '443',
                'device_files': '1',
                'id': 'general',
                'cert': '/etc/uhttpd.crt',
                '.type': 'uhttpd',
                'rfc1918_filter': '1',
                'wan_listen_http': '80',
                'rfc1918_filter_http': '1',
                'enable_http': '1',
                'rfc1918_filter_https': '1',
                'http_wan_access': '0',
                'https_wan_access': '0',
                "webui_access": "1"
            }
            if is_package_installed(self, "uhttpd-mod-ubus"):
                expected["enable_json_rpc"] = "0"
            x.assert_data(expected, 200, {"cert:file_size", "key:file_size"})
        with self.subTest("reset_config"):
            x = self.put_data(base_url + "/general", {
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "https_wan_access":"0",
                "listen_https": "443",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/uhttpd.crt",
                "key":"/etc/uhttpd.key",
                "enable_basic_auth": "0"
            })
            expected = {
                'listen_https': '443',
                'listen_http': '80',
                'enable_https': '1',
                'key': '/etc/uhttpd.key',
                'redirect_https': '0',
                'enable_basic_auth': '0',
                'wan_listen_https': '443',
                'device_files': '1',
                'id': 'general',
                'cert': '/etc/uhttpd.crt',
                '.type': 'uhttpd',
                'rfc1918_filter': '1',
                'wan_listen_http': '80',
                'rfc1918_filter_http': '1',
                'enable_http': '1',
                'rfc1918_filter_https': '1',
                'http_wan_access': '0',
                'https_wan_access': '0',
                "webui_access": "1"
            }
            if is_package_installed(self, "uhttpd-mod-ubus"):
                expected["enable_json_rpc"] = "0"
            x.assert_data(expected, 200, {"cert:file_size", "key:file_size"})

    def test_regenerate(self):
        base_url = "/access_control/webui/config/general"
        genrate_url = "/access_control/webui/actions/generate"

        with self.subTest("upload_certificates"):
            f = io.StringIO(self.cert)
            x = self.send_file(base_url, f, "cert")
            x.assert_code(200)
            f = io.StringIO(self.key)
            x = self.send_file(base_url, f, "key")
            x.assert_code(200)

        with self.subTest("with_replacing"):
            x = self.put_data(base_url, {
                "enable_http":"1",
                "enable_https":"1",
                "redirect_https":"0",
                "http_wan_access":"0",
                "listen_http":"80",
                "https_wan_access":"0",
                "listen_https": "443",
                "rfc1918_filter_http": "1",
                "rfc1918_filter_https": "1",
                "device_files":"1",
                "cert":"/etc/certificates/cbid.uhttpd.general.certfile",
                "key":"/etc/certificates/cbid.uhttpd.general.keyfile"
            })
            expected = {
                'listen_https': '443',
                'listen_http': '80',
                'enable_https': '1',
                'key': '/etc/certificates/cbid.uhttpd.general.keyfile',
                'redirect_https': '0',
                'enable_basic_auth': '0',
                'wan_listen_https': '443',
                'device_files': '1',
                'id': 'general',
                'cert': '/etc/certificates/cbid.uhttpd.general.certfile',
                '.type': 'uhttpd',
                'rfc1918_filter': '1',
                'wan_listen_http': '80',
                'rfc1918_filter_http': '1',
                'enable_http': '1',
                'rfc1918_filter_https': '1',
                'http_wan_access': '0',
                'https_wan_access': '0',
                "webui_access": "1"
            }
            if is_package_installed(self, "uhttpd-mod-ubus"):
                expected["enable_json_rpc"] = "0"
            x.assert_data(expected, 200, {"cert:file_size", "key:file_size"})

        with self.subTest("without_replacing"):
            self.ssh.send_cmd('echo "test" > /etc/uhttpd.crt')
            self.ssh.send_cmd('echo "test" > /etc/uhttpd.key')
            self.post_data(genrate_url, {
                "force": "0",
                "replace": "0"
            }).assert_code(200)
            sleep(2)
            crt = self.ssh.send_cmd('cat /etc/uhttpd.crt')
            key = self.ssh.send_cmd('cat /etc/uhttpd.key')
            self.assertTrue(crt.startswith("-----BEGIN CERTIFICATE-----"), "Certificate file doesn't have the expected format")
            self.assertTrue(key.startswith("-----BEGIN PRIVATE KEY-----") or key.startswith("-----BEGIN RSA PRIVATE KEY-----"), 
                            "Key file doesn't have the expected format")

        with self.subTest("replace_with_force"):
            self.ssh.send_cmd('echo "test" > /etc/uhttpd-ca.crt')
            self.ssh.send_cmd('echo "test" > /etc/uhttpd-ca.key')
            self.post_data(genrate_url, {
                "force": "1",
                "replace": "0"
            }).assert_code(200)
            sleep(6)
            crt = self.ssh.send_cmd('cat /etc/uhttpd-ca.crt')
            key = self.ssh.send_cmd('cat /etc/uhttpd-ca.key')
            self.assertTrue(crt.startswith("-----BEGIN CERTIFICATE-----"), "Certificate file doesn't have the expected format")
            self.assertTrue(key.startswith("-----BEGIN PRIVATE KEY-----") or key.startswith("-----BEGIN RSA PRIVATE KEY-----"), 
                            "Key file doesn't have the expected format")
        with self.subTest("restore_config_with_replace"):
            self.post_data(genrate_url, {
                "force": "1",
                "replace": "1"
            }).assert_code(200)
            sleep(6)
            expected_data = {
                'listen_https': '443',
                'listen_http': '80',
                'enable_https': '1',
                'key': '/etc/uhttpd.key',
                'redirect_https': '0',
                'enable_basic_auth': '0',
                'wan_listen_https': '443',
                'device_files': '1',
                'id': 'general',
                'cert': '/etc/uhttpd.crt',
                '.type': 'uhttpd',
                'rfc1918_filter': '1',
                'wan_listen_http': '80',
                'rfc1918_filter_http': '1',
                'enable_http': '1',
                'rfc1918_filter_https': '1',
                'http_wan_access': '0',
                'https_wan_access': '0',
                "webui_access": "1"
            }
            if is_package_installed(self, "uhttpd-mod-ubus"):
                expected_data["enable_json_rpc"] = "0"
            self.get(base_url).assert_data(expected_data, 200, {"cert:file_size", "key:file_size"})
