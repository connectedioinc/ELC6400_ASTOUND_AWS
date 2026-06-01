import sys
import os
import utility_integration as util
from utils.ssh import open_ssh_connection, send_cmd
from time import sleep
import unittest
import response_codes as codes
sys.path.append("../../../../tests")

RC = codes.ResponseCodes

def wait_certificate_generation(timeout=60, interval=2):
    def is_generation_complete(ssh):
        status = send_cmd(ssh, "cat /tmp/certificates-status").strip()
        return status == "[]"
    with open_ssh_connection() as ssh:
        for _ in range(int(timeout / interval)):
            if is_generation_complete(ssh):
                return 
            sleep(interval)
    raise AssertionError("Certificate generation did not complete within the timeout")
    
class test_certificates(util.WrapTest):
    Env = util.Env
    http = util.Env.http
    api_url = util.Env.get_api_url()
    dh_params_generated = False
    base_info = [
        {
            "datetime": "-",
            "path": "/etc/ssl/certs/ca-certificates.crt",
            "name": "root_ca",
            "type": "cert",
            "cert_type": "root_ca",
            "key_size": "-",
            "fullname": "ca-certificates.crt"
        },
        {
            'cert_type': 'server',
            'datetime': '2064375249',
            'fullname': 'uhttpd.crt',
            'key_size': '256',
            'encryption': 'ecc',
            'name': 'Teltonika',
            'path': '/etc/uhttpd.crt',
            'type': 'cert',
            'services': [ 'uhttpd:main' ]
        },
        {
            'cert_type': 'server',
            'datetime': '2064375249',
            'encryption': 'ecc',
            'fullname': 'uhttpd.key',
            'key_size': '256',
            'pass_required': False,
            'path': '/etc/uhttpd.key',
            'type': 'key',
            'services': [ 'uhttpd:main' ]
        }
    ]

    def update_datetime_from_endpoint(self):
        try:
            response = self.get("/certificates/config")
            response.resp.raise_for_status()
            actual_data = response.resp.json().get("data", {}).get("generated", [])
            datetime_map = {
                item["fullname"]: item["datetime"]
                for item in actual_data
                if "fullname" in item and "datetime" in item
            }
            
            for item in test_certificates.base_info:
                fname = item.get("fullname")
                if fname and fname in datetime_map:
                    item["datetime"] = datetime_map[fname]
            
            self.__class__.base_info = test_certificates.base_info
            
            return test_certificates.base_info
        except Exception as e:
            return test_certificates.base_info

    def test_certificates_base_functionality(self):
        self.update_datetime_from_endpoint()
        base_url = "/certificates"
        with self.subTest("start_simple_generation"):
            x = self.post_data(base_url + "/actions/generate", {
                "delete":"0",
                "sign":"0",
                "subject":"",
                "host": ["teltonika.lt"],
                "ip_address": ["192.168.5.5"],
                "type":"simple"
            })
            x.assert_code(200)
        with self.subTest("get_dh"):
            x = self.get(base_url + "/dh/config")
            x.assert_data([])
        with self.subTest("kill_dh_generation"):
            sleep(7)
            max_retries = 60

            def get_generation_pid(ssh):
                pid = send_cmd(ssh, "ps -w | grep [o]penssl | grep dh.pem | awk {'print$1'}").strip()
                return pid if pid.isdigit() else None

            with open_ssh_connection() as ssh:
                generation_pid = None
                for attempt in range(max_retries):
                    generation_pid = get_generation_pid(ssh)
                    if generation_pid:
                        break
                    sleep(1)

                if not generation_pid:
                    self.dh_params_generated = True

                send_cmd(ssh, f"kill {generation_pid}")
            wait_certificate_generation()
        with self.subTest("get_all"):
            x = self.get(base_url + "/config")
            resp = x.resp.json()
            generated = resp["data"]["generated"]
            body = [
                {
                    "type": "key",
                    "name": "ca",
                    "cert_type": "ca",
                    "key_size": "2048",
                    "encryption": "rsa",
                    "fullname": "ca.key.pem",
                    "pass_required": False,
                    "path": "/etc/certificates/ca.key.pem"
                },
                {
                    "type": "cert",
                    "name": "ca",
                    "cert_type": "ca",
                    "key_size": "2048",
                    "dns": ["teltonika.lt"],
                    "ip": ["192.168.5.5"],
                    "encryption": "rsa",
                    "auto_renew": False,
                    "fullname": "ca.cert.pem",
                    'path': '/etc/certificates/ca.cert.pem',
                    'signed_by': 'self-signed'
                },
                {
                    "type": "key",
                    "name": "server",
                    "encryption": "rsa",
                    "cert_type": "server",
                    "key_size": "2048",
                    "fullname": "server.key.pem",
                    "pass_required": False,
                    "path": "/etc/certificates/server.key.pem"
                },
                {
                    "type": "cert",
                    "name": "server",
                    "cert_type": "server",
                    "key_size": "2048",
                    "encryption": "rsa",
                    "dns": ["teltonika.lt"],
                    "ip": ["192.168.5.5"],
                    "encryption": "rsa",
                    "auto_renew": False,
                    "fullname": "server.cert.pem",
                    'path': '/etc/certificates/server.cert.pem',
                    'signed_by': 'ca.cert.pem'
                },
                {
                    "type": "key",
                    "name": "client",
                    "encryption": "rsa",
                    "cert_type": "client",
                    "key_size": "2048",
                    "fullname": "client.key.pem",
                    "pass_required": False,
                    "path": "/etc/certificates/client.key.pem"
                },
                {
                    "type": "cert",
                    "name": "client",
                    "cert_type": "client",
                    "key_size": "2048",
                    "dns": ["teltonika.lt"],
                    "ip": ["192.168.5.5"],
                    "encryption": "rsa",
                    "auto_renew": False,
                    "fullname": "client.cert.pem",
                    'path': '/etc/certificates/client.cert.pem',
                    'signed_by': 'ca.cert.pem'
                }
            ]
            if self.dh_params_generated:
                body.append({
                    "type": "dh",
                    "datetime": "-",
                    "name": "-",
                    "key_size": "2048",
                    "fullname": "dh.pem",
                    'path': '/etc/certificates/dh.pem',
                    'fullname': 'dh.pem',
                    'cert_type': 'dh',
                })
            datetime_map = {s["fullname"]: s.get("datetime", "-") for s in generated}
            for entry in body:
                entry["datetime"] = datetime_map.get(entry["fullname"], "-")

            body = self.base_info + body
            self.assertEqual(generated, body)

        with self.subTest("get_keys"):
            x = self.get(base_url + "/keys/config")
            body = [
                {
                    "type": "key",
                    "name": "ca",
                    "datetime": "-",
                    "cert_type": "ca",
                    "encryption": "rsa",
                    "key_size": "2048",
                    "fullname": "ca.key.pem",
                    "pass_required": False,
                    'path': '/etc/certificates/ca.key.pem'
                },
                {
                    "type": "key",
                    "name": "server",
                    "datetime": "-",
                    "encryption": "rsa",
                    "cert_type": "server",
                    "key_size": "2048",
                    "fullname": "server.key.pem",
                    "pass_required": False,
                    'path': '/etc/certificates/server.key.pem'
                },
                {
                    "type": "key",
                    "name": "client",
                    "datetime": "-",
                    "cert_type": "client",
                    "key_size": "2048",
                    "encryption": "rsa",
                    "fullname": "client.key.pem",
                    "pass_required": False,
                    'path': '/etc/certificates/client.key.pem'
                }
            ]
            
            body.insert(0, self.base_info[2])
            x.assert_data(body)
        with self.subTest("get_client"):
            x = self.get(base_url + "/client/config")
            resp = x.resp.json()
            keys = resp["data"]["keys"]
            certificates = resp["data"]["certificates"]
            keys_body = [
                    {
                        "type": "key",
                        "name": "client",
                        "cert_type": "client",
                        "key_size": "2048",
                        "datetime":"-",
                        "encryption": "rsa",
                        "fullname": "client.key.pem",
                        "pass_required": False,
                        'path': '/etc/certificates/client.key.pem'
                    }
            ]
            certificates_body = [
                    {
                        "type": "cert",
                        "name": "client",
                        "cert_type": "client",
                        "key_size": "2048",
                        "dns": ["teltonika.lt"],
                        "ip": ["192.168.5.5"],
                        "encryption": "rsa",
                        "auto_renew": False,
                        "fullname": "client.cert.pem",
                        'path': '/etc/certificates/client.cert.pem',
                        'signed_by': 'ca.cert.pem'
                    }
            ]
            self.assertEqual(keys, keys_body)
            certificates_body[0]["datetime"] = certificates[0]["datetime"]
            self.assertEqual(certificates, certificates_body)

        with self.subTest("get_server"):
            x = self.get(base_url + "/server/config")
            resp = x.resp.json()
            keys = resp["data"]["keys"]
            certificates = resp["data"]["certificates"]
            keys_body = [
                    {
                        "type": "key",
                        "name": "server",
                        "cert_type": "server",
                        "key_size": "2048",
                        "datetime":"-",
                        "encryption": "rsa",
                        "fullname": "server.key.pem",
                        "pass_required": False,
                        'path': '/etc/certificates/server.key.pem'
                    }
            ]
            certificates_body = [
                    {
                        "type": "cert",
                        "name": "server",
                        "cert_type": "server",
                        "key_size": "2048",
                        "dns": ["teltonika.lt"],
                        "ip": ["192.168.5.5"],
                        "encryption": "rsa",
                        "auto_renew": False,
                        'path': '/etc/certificates/server.cert.pem',
                        "fullname": "server.cert.pem",
                        'signed_by': 'ca.cert.pem'

                    }
            ]
            keys_body.insert(0, self.base_info[2])
            self.assertEqual(keys, keys_body)
            certificates_body.insert(0, self.base_info[1])
            certificates_body[1]["datetime"] = certificates[1]["datetime"]
            self.assertEqual(certificates, certificates_body)

        with self.subTest("get_ca"):
            x = self.get(base_url + "/ca/config")
            resp = x.resp.json()
            keys = resp["data"]["keys"]
            certificates = resp["data"]["certificates"]
            keys_body = [
                    {
                        "type": "key",
                        "name": "ca",
                        "cert_type": "ca",
                        "key_size": "2048",
                        "datetime":"-",
                        "encryption": "rsa",
                        "fullname": "ca.key.pem",
                        "pass_required": False,
                        'path': '/etc/certificates/ca.key.pem'
                    }
            ]
            certificates_body = [
                    {
                        "type": "cert",
                        "name": "ca",
                        "cert_type": "ca",
                        "key_size": "2048",
                        "dns": ["teltonika.lt"],
                        "ip": ["192.168.5.5"],
                        "encryption": "rsa",
                        "auto_renew": False,
                        "fullname": "ca.cert.pem",
                        'path': '/etc/certificates/ca.cert.pem',
                        'signed_by': 'self-signed'
                    }
            ]
            self.assertEqual(keys, keys_body)
            certificates_body[0]["datetime"] = certificates[0]["datetime"]
            self.assertEqual(certificates, certificates_body)
        with self.subTest("get_certificates"):
            x = self.get(base_url + "/certs/config")
            expected_data = [
                 {
                    "type": "cert",
                    "name": "server",
                    "cert_type": "server",
                    "key_size": "2048",
                    "dns": ["teltonika.lt"],
                    "ip": ["192.168.5.5"],
                    "encryption": "rsa",
                    "auto_renew": False,
                    "fullname": "server.cert.pem",
                    'path': '/etc/certificates/server.cert.pem',
                    'signed_by': 'ca.cert.pem'
                },
                {
                    "type": "cert",
                    "name": "client",
                    "cert_type": "client",
                    "key_size": "2048",
                    "dns": ["teltonika.lt"],
                    "ip": ["192.168.5.5"],
                    "encryption": "rsa",
                    "auto_renew": False,
                    "fullname": "client.cert.pem",
                    'path': '/etc/certificates/client.cert.pem',
                    'signed_by': 'ca.cert.pem',
                }
            ]
            expected_data.insert(0, self.base_info[1])
            expected_data.insert(0, self.base_info[0])
            expected_data[0].pop("datetime", None)
            expected_data[1].pop("datetime", None)
            x.assert_data(expected_data, 200, {"datetime"})
        with self.subTest("check_cert_contents"):
                with open_ssh_connection() as ssh:
                    generation_pid = None
                    content = send_cmd(ssh, "openssl x509 -in /etc/certificates/server.cert.pem -noout -text | grep 'DNS:teltonika.lt'")
                    self.assertEqual(content.strip(), f"DNS:teltonika.lt, IP Address:192.168.5.5")
        with self.subTest("delete_simple_certs"):
            x = self.get(base_url + "/config")
            resp = x.resp
            for section in resp.json()["data"]["generated"]:
                if section["fullname"] != "ca-certificates.crt" and section["fullname"] != "uhttpd.crt" and section["fullname"] != "uhttpd.key":
                    x = self.delete(base_url + "/config/" + section["fullname"])
                    x.assert_data({
                        "id":section["fullname"]
                    })
            x = self.get(base_url + "/config")
            x.assert_data({
                "generated": self.base_info,
                "generating":[]
            })

    def test_certificates_sign(self):
        self.update_datetime_from_endpoint()
        base_url = "/certificates"
        with self.subTest("create_ca"):
            x = self.post_data(base_url + "/actions/generate", {
                "type":"ca",
                "name":"test_sign",
                "subject":"",
                "sign":"0",
                "days":"3560",
                "key_size":"512",
                "delete":"0"
            })
            x.assert_data({0})
            wait_certificate_generation()
        with self.subTest("test_sign_validation"):
            x = self.post_data(base_url + "/actions/sign", {
                "type":"ca",
                "name":"signed_ca",
                "req_file":"test_sign.req.pem",
                "days":"3651",
                "ca_key":"test_sign.key.pem",
                "delete":"1"
            })
            x.assert_error("days", "Range of the value must be from 0 to 3650", RC.INVALID_OPT.val())
        with self.subTest("sign_ca"):
            x = self.post_data(base_url + "/actions/sign", {
                "type":"ca",
                "name":"signed_ca",
                "req_file":"test_sign.req.pem",
                "days":"420",
                "ca_key":"test_sign.key.pem",
                "delete":"1"
            })
            x.assert_data({
                "response":"signed_ca Created and signed successfully."
            })
            wait_certificate_generation()
        with self.subTest("get_certificates"):
            x = self.get(base_url + "/config")
            resp = x.resp.json()
            generated = resp["data"]["generated"]
            body = [
                {
                    "type": "key",
                    "name": "test_sign",
                    "cert_type": "ca",
                    "key_size": "512",
                    "encryption": "rsa",
                    "fullname": "test_sign.key.pem",
                    "pass_required": False,
                    "path": "/etc/certificates/test_sign.key.pem",
                },
                {
                    "type": "cert",
                    "encryption": "rsa",
                    "name": "signed_ca",
                    "cert_type": "ca",
                    "key_size": "512",
                    "auto_renew": False,
                    "fullname": "signed_ca.cert.pem",
                    "path": "/etc/certificates/signed_ca.cert.pem",
                    "signed_by": "self-signed",
                },
            ]

            gen_map = {entry["fullname"]: entry for entry in generated}
            for entry in body:
                fullname = entry.get("fullname")
                if fullname in gen_map:
                    entry["datetime"] = gen_map[fullname].get("datetime")

            expected = body + self.base_info

            def sort_key(item):
                return item.get("fullname", "") + item.get("type", "")

            expected_sorted = sorted(expected, key=sort_key)
            generated_sorted = sorted(generated, key=sort_key)

            self.assertEqual(generated_sorted, expected_sorted)
        with self.subTest("delete_signed"):
            x = self.get(base_url + "/config")
            resp = x.resp
            for section in resp.json()["data"]["generated"]:
                if section["fullname"] != "ca-certificates.crt" and section["fullname"] != "uhttpd.crt" and section["fullname"] != "uhttpd.key":
                    x = self.delete(base_url + "/config/" + section["fullname"])
                    x.assert_data({
                        "id":section["fullname"]
                    })
            x = self.get(base_url + "/config")
            x.assert_data({
                "generated": self.base_info,
                "generating":[]
            })

    def test_delete_simple_certs(self):
        self.update_datetime_from_endpoint()
        base_url = "/certificates"
        with self.subTest("delete_simple_certs"):
            x = self.get(base_url + "/config")
            resp = x.resp
            names = []
            for section in resp.json()["data"]["generated"]:
                names.append(section["fullname"])
                if section["fullname"] != "ca-certificates.crt":
                    self.Env.http.request("delete", "http://" + self.Env.ip + "/api" + base_url + "/config/" + section["fullname"])

    def test_tpm2(self):
        self.update_datetime_from_endpoint()
        response = self.get("/system/device/status")
        board = response.resp.json()["data"]["board"]
        if not board["hwinfo"]["tpm"]:
            self.skipTest("Device doesn't support tpm storage")
        base_url = "/certificates/"
        with self.subTest("generate_server_certs"):
            x = self.post_data(base_url + "actions/generate", {
                "days": "365",
                "delete": "0",
                "key_size": "2048",
                "name": "test",
                "sign": "0",
                "subject": "",
                "type": "server"
            })
            x.assert_data({0})
        with self.subTest("get_certs"):
            wait_certificate_generation()
            x = self.get(base_url + "config")
            generated = [
                {
                    "datetime": "-",
                    "type": "key",
                    "name": "test",
                    "pass_required": False,
                    "cert_type": "server",
                    "key_size": "2048",
                    "encryption": "rsa",
                    "fullname": "test.key.pem",
                    'path': '/etc/certificates/test.key.pem'
                },
                {
                    "datetime": "-",
                    "type": "req",
                    "name": "test",
                    "encryption": "rsa",
                    "cert_type": "server",
                    "key_size": "2048",
                    "fullname": "test.req.pem",
                    'path': '/etc/certificates/test.req.pem'
                }
            ]
            x.assert_data({
                "generated": self.base_info + generated,
                "generating":[]
            })
        with self.subTest("delete_server_cert"):
            x = self.delete(base_url + "config/test.req.pem")
            x.assert_data({
                "id":"test.req.pem"
            })
        with self.subTest("move_to_tpm"):
            x = self.post_data(base_url + "actions/import_tpm2", {
                "key": "test.key.pem"
            })
            x.assert_data({
                "response": "test.key.pem Imported successfully"
            })
        with self.subTest("get_certs"):
            x = self.get(base_url + "config")
            x.assert_data({
                "generated": self.base_info,
                "generating": []
            })
        with self.subTest("get_certs_with_tpm"):
            x = self.get(base_url + "config?include_tpm=true")
            generated =  [{
                "datetime": "-",
                "type": "key",
                "name": "test",
                "encryption": "rsa",
                "pass_required": False,
                "cert_type": "server",
                "key_size": "2048",
                "fullname": "test.key.pem",
                "tpm2": True,
                'path': '/etc/certificates/test.key.pem'
            }]
            x.assert_data({
                "generated": self.base_info + generated,
                "generating": []
            })
        with self.subTest("delete_tpm_key"):
            x = self.delete(base_url + "config/test.key.pem")
            x.assert_data({
                "id": "test.key.pem"
            })
        with self.subTest("get_clean_certs"):
            x = self.get(base_url + "config?include_tpm2=true")
            x.assert_data({
                "generated": self.base_info,
                "generating": []
            })
    def test_service(self):
        self.update_datetime_from_endpoint()
        base_url = "/certificates/config"
        with self.subTest("set_service"):
            x = self.post_data("/ipsec/config", {
                "id": "test"
            })
            x.assert_code(201)
            x = self.put_data("/ipsec/config/test", {
                ".type":"remote",
                "authentication_method":"x509",
                "cacert":"",
                "key":"/etc/uhttpd.key",
                "leftcert":"/etc/uhttpd.crt"
            })
            x.assert_code(200)
        with self.subTest("check_service_usage"):
            x = self.get(base_url)
            
            expected_data = []
            for item in self.base_info:
                item_copy = dict(item)
                if item.get("fullname") in ["uhttpd.crt", "uhttpd.key"]:
                    services = item.get("services", [])[:]
                    if "ipsec:test" not in services:
                        services.append("ipsec:test")
                    item_copy["services"] = services
                expected_data.append(item_copy)
            
            x.assert_data({
                'generated': expected_data,
                "generating": [],
            })
        with self.subTest("restore_service"):
            x = self.delete_data("/ipsec/config", ["test"])
            x.assert_code(200)
            x = self.get(base_url)
            x.assert_data({
                'generated': self.base_info,
                'generating': []
            })
    def test_directory(self):
        self.update_datetime_from_endpoint()
        CERT_PATH = "./files/test.crt"
        KEY_PATH = "./files/test.key.pem"
        base_url = "/certificates/config"
        ipsec_url = "/ipsec/config"
        sid = "test"
        cert = open(CERT_PATH, "w")
        cert.write("""
-----BEGIN CERTIFICATE-----
MIIDLjCCAhagAwIBAgIUTmvWmIkdMDWS7kWIZA46xv5WoKAwDQYJKoZIhvcNAQEL
BQAwLzELMAkGA1UEBhMCQ0gxEzARBgNVBAoMCnN0cm9uZ1N3YW4xCzAJBgNVBAMM
AmNhMB4XDTI1MDYxNzEyMTYzMloXDTMwMDYxNzEyMTYzMlowLzELMAkGA1UEBhMC
Q0gxEzARBgNVBAoMCnN0cm9uZ1N3YW4xCzAJBgNVBAMMAnAxMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5gSPQlNf6EEEShT/ZnjexPOX11GKytkMTkR8
UqMVML06Y2eM+PoGcrqT9Js+xW48ruvHhzqZ18QqDE3Sn8FjLMw18m2WX3JX8TKU
KqXPXmF5VFbfrsSWSgAuCBS8xbnjwwzAM51/6Z4064hR1PbfKF94H2IaA5bqnmOG
oYUedoGhfXCWYCi6eaG0Wn3vRqF93xLe/3am/3DxO6hG0a0tVc7YlPXRAkZC0Lfs
G96fSRrlR9yKAyijIopuuXDiw/zPW7CcwCu2S3fEBgCqmW9VcOccZWRy1x01VJDY
hhuaBReovPEk9Ej73hH8u3AIvndZFfcJfVHw54ejnwQc+sfqTQIDAQABo0IwQDAd
BgNVHQ4EFgQUlYrEWNhjDaxgo16pdKEd41nvWowwHwYDVR0jBBgwFoAUanm9FiEI
9Azb9q+cXsQ7ph/z93EwDQYJKoZIhvcNAQELBQADggEBABjkzHlxG91lLWqQYDQW
kyc+Ibjj4ZYLdwEnlHPv/76esTGf9j7ePmfHOU7A4ntLr88avbb3Bz4lMMCaS/SL
4LdkLaxL/uHKomwFDaNLb4c3WWVeA+bOgvjIPi+ZwgRS3smjstz6IpRuZ1cgeEJV
P5K1FFNnkRy5p39gcltRkb2ZDh1ELolJCecGHDGFxgnliL/gAXY9h/tLLZdvozl1
mqjKWf75dgDcPclOvFfYdzzIQDaiNicByzamgNv04SSwY0exFAcsVAmWKj3dYZiD
zTd4VPUtRfJIUItWBWqnXJJfHRmyDM+3RM5+UEoiQXzD5/Bf8pMMfFIQQqdhB53n
xOg=
-----END CERTIFICATE-----
""")
        cert.close()
        key = open(KEY_PATH, "w")
        key.write("""
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCvPCLXQt93HmuP
yQl8QYntH26n771feBgnb5S7UrbEknmIXWaPVR4GGwQbtbnRKLHQCPJBIR6yt3sN
v2xVc2Gr1D6ENpKyY0zFtxzut0SKY9dZqxYLnQ6xIUed1XTsZtx4+nLBuXSLHhhY
0JN4ZGq/dJK0Ly9oPZgpGBzgXiEuMWNCKPcIzSm0cP5BFj6Wftt5NHKQLfFZeQ4B
lTDP7qC9kNKUfYJ9fhhxKj37iwDJmvRlf9KhBcpZV62HjwylJ0qCTaNv3Y8RzMZV
CH0K5eogQ+xaH4iwCdMa3EedHwwULfA2+oHdQ45wNkKZX28K43BMNGVRzdpixJxp
MP+/U5QjAgMBAAECggEAAk2NrXR/S85I1GMAlwq/dRvSP2RkN6h644VeYihf/pWD
YA6YtR14LPAaUtm+8d3UweCobpijLMZ4XxX16hJQWzadrez7eE2YXJEmXnr65bKZ
NZYhM7Ko/1J3nkvLXD3+JCLhNjWOm2lWIV27USfqlTo8a3EBTxjztdjc/SGPj0hH
Jsh7ey/FlfkbUmxbamxZQn6pbmCzBUMozdGahGEiB81wXSFCcJ4dx1MRM5phwa48
Kse24Q7W4nSBozQM7iaRS9COmZBhVzbyxMHgiIDhHL7LhJSufKR2ej9TJJMtBf2O
XXlp4OQSjJxW9qmaJP0EY9iRQ173BujogEC/uxRSwQKBgQDZTqVGkBmsOpYUutca
LeG00XgWB8Crwmk/vdf4QcFlM792d+JKeNOsHfjjHErNxeE0A09+yNfVMopNXddP
lt/J7w7x/qQIbHEaVhf1GA0FKP/wazPEIc7NAAFRgx1bBFVO1W2mqwqGD4ILYVOh
imGvylrgKZqPskaU63YxtPrSQQKBgQDOb71d9LgMKLeOVC5HggDLG72qjzFrFWaf
rTRhVeSuR6+JKxpDa3l5S6TGDvhlznQowNYsRWyinUXBzYdcKXfzYSyYbGeR65Ua
xQ/TZurnqJ0REs2KM9NNYpnYmqSpPtLmnFWVi9wSmeYUxWHgZWM0cZPLnln0Oaq/
5at6m/kFYwKBgEWrDBvSSRjJc6JTwHCZMxp4aYqOk7u9SWbxI1NpKWqbq498oeUE
VcCBn3CYenb8MNYvFYZtN50XZfWl10ih8z9XUDBPViGJOr2ZynZ+bnYwDdXzWJZR
zG42yTVr1rZ+bicnD892WJpgUG37lwdcSTNFqdriG7ZkDnLiBnOrNRrBAoGBAJTc
uOZ24P1Lo0nMZG8GTUIpp/TFO3KnxRAiG2KRSM1wPiGg5lh1uOwB4zk7dF4dqV/1
5ruX+IWu+a2OYyzPboMfsMPdcDYmdqgOMKJWVdBlo5W7RGKDir0D/ELZCSJOflDz
rTeg2jrDpcmWqETjd81KlbRAZUebCglFOgm5TbJXAoGBAMQ0WPc86rSj8Tte5jQF
OhCGO9w6UnC4rdPlgMpGDUXrivhl/M8goBCIz94kbLRToGxdveAgbWeLpN8MgJBN
29VrheB3NyNv3r0SlL24pBeakYdPMpF4/ezDF9SRpkzQGCEI0BUj3Q2D5FVkFVCV
mEJALZOq6Nf6cYDduXIaRn7O
-----END PRIVATE KEY-----
""")
        key.close()
        with self.subTest("set_service"):
            x = self.post_data("/ipsec/config", {
                "id": "test"
            })
            x.assert_code(201)
        with self.subTest("upload_certificate"):
            x = self.post_data("/ipsec/config", {
                "id": "test"
            })
            x = self.send_file(ipsec_url + "/" + sid, CERT_PATH, "test.crt", {"option": "leftcert"})
            x.assert_data({
                "path": "/etc/certificates/cbid.ipsec.test.leftcerttest.crt"
            })
            x = self.send_file(ipsec_url + "/" + sid, KEY_PATH, "test.key.pem", {"option": "key"})
            x.assert_data({
                "path": "/etc/certificates/cbid.ipsec.test.keytest.key.pem"
            })
            x = self.put_data("/ipsec/config/test", {
                ".type":"remote",
                "authentication_method":"x509",
                "cacert":"",
                "key":"/etc/certificates/cbid.ipsec.test.keytest.key.pem",
                "leftcert":"/etc/certificates/cbid.ipsec.test.leftcerttest.crt"
            })
            x.assert_code(200)
            with self.subTest("check_cert_manager"):
                sleep(2)
                x = self.get(base_url)
                expected = [{
                    'cert_type': 'import',
                    'datetime': '-',
                    'encryption': '-',
                    'fullname': 'cbid.ipsec.test.keytest.key.pem',
                    'import': True,
                    'key_size': '-',
                    'name': '-',
                    'pass_required': False,
                    'path': '/etc/certificates/cbid.ipsec.test.keytest.key.pem',
                    'services': ['ipsec:test'],
                    'type': 'key'
                },
                {
                    "datetime": "1907928992",
                    "path": "/etc/certificates/cbid.ipsec.test.leftcerttest.crt",
                    "name": "p1",
                    "type": "cert",
                    "cert_type": "import",
                    "key_size": "2048",
                    "fullname": "cbid.ipsec.test.leftcerttest.crt",
                    "services": ["ipsec:test"],
                    "import": True,
                    "encryption": "rsa",
                    "pass_required": False
                }]
                expected = self.base_info + expected
                x.assert_data({
                    'generated': expected,
                    'generating': []
                })
        with self.subTest("restore_service"):
            x = self.delete_data("/ipsec/config", ["test"])
            x.assert_code(200)
            x = self.get(base_url)
            x.assert_data({
                'generated': self.base_info,
                'generating': []
            })
            os.remove(CERT_PATH)
            os.remove(KEY_PATH)
