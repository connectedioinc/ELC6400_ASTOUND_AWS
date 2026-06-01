import sys
import time
import io

sys.path.append("../../../../tests")
import utility_integration as util

from utils.ssh import get_ssh

class test_stunnel(util.WrapTest):
    url = "/stunnel/config"
    url_fw = "/firewall/traffic_rules/config"
    cert = """
-----BEGIN CERTIFICATE-----
MIIDPzCCAiegAwIBAgIUR98Q25zoRAqPwj0Ow7Hbbku+D3gwDQYJKoZIhvcNAQEL
BQAwLzELMAkGA1UEBhMCQ0gxEzARBgNVBAoMCnN0cm9uZ1N3YW4xCzAJBgNVBAMM
AmNhMB4XDTI0MDYxMjA1MTQ0MloXDTM0MDYxMjA1MTQ0MlowLzELMAkGA1UEBhMC
Q0gxEzARBgNVBAoMCnN0cm9uZ1N3YW4xCzAJBgNVBAMMAmNhMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0cLdgcJON1R7AXLBV6Gnvlt+S9XIhO3drYNl
a9Ky0hJdugA7RkTBMjfbrDVwMDPfWkxkxThTCHlP3rnClOZw7mrVTPPpUiyihnpZ
sjHHcmpMWlJsM6qNWzE1USegq4sqNcsQHmJpVIOm9FvM325mvccpW2xcxSxXpubU
Qi/Qtl9DX/7lRaEWOlD3okqpsMaOsqJGiNctjROQgAKEliFO1fE+4dRuizyCEeAM
EXgc7FYQWVipO53tg2SS9WYo3NGfC6GiU+1Zehq0/BLrfs9rX3a9cZtgUE0v2lnp
2vhw0wEhF4EEwdWhW9Zd9xFmsgygvsOUohtz8I0RsXmK1N+QCQIDAQABo1MwUTAd
BgNVHQ4EFgQUanm9FiEI9Azb9q+cXsQ7ph/z93EwHwYDVR0jBBgwFoAUanm9FiEI
9Azb9q+cXsQ7ph/z93EwDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOC
AQEAqvPoofLTrCHBGXqtuLK9fHtgYblCDh1jv7UNqxx1oYWRG1/6p/y8lubB/tOA
QT68CAabu16qgtlW5cwmnEeAjvvRMapIJqVvckqNDYrBvFOpTRoksM3x8FjaOPaC
VCm2IDjSn6iCPRuCByzxxbmYcOG7UAGp56+xA9hWQPPjfZBGUgFc7PiutpE86RgF
lLNyvQx37Yuq0fwWEhll13x8oGdrH9LXXedE8HnRLONlZf8u5laPAFQclu2BNSAW
FeEwKV/LxsOfDGREJlx4YX6r6kgatge8IbIeOaYlstMk0Omvhj7STh3JqxGlnKha
3B8HMSCZxtbGQVcgfzJnVCorYw==
-----END CERTIFICATE-----
"""
    key = """
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDRwt2Bwk43VHsB
csFXoae+W35L1ciE7d2tg2Vr0rLSEl26ADtGRMEyN9usNXAwM99aTGTFOFMIeU/e
ucKU5nDuatVM8+lSLKKGelmyMcdyakxaUmwzqo1bMTVRJ6Criyo1yxAeYmlUg6b0
W8zfbma9xylbbFzFLFem5tRCL9C2X0Nf/uVFoRY6UPeiSqmwxo6yokaI1y2NE5CA
AoSWIU7V8T7h1G6LPIIR4AwReBzsVhBZWKk7ne2DZJL1Zijc0Z8LoaJT7Vl6GrT8
Eut+z2tfdr1xm2BQTS/aWena+HDTASEXgQTB1aFb1l33EWayDKC+w5SiG3PwjRGx
eYrU35AJAgMBAAECggEAE9Ecmycvu4N0MYFVacGAdvfu2RxD2uccA8n/mW2o7jbE
+w8NiohxVhy32K+dvzgPWFkSRh2ZnpnTZV/YVbfloGigaSo790L3QcwqUC7qwFDx
kLDrvv/UZfKirl2XjM1TegyKo8w5Vj4v1jMcClnERBaePiBhLVGQoFh7YhthVPFE
PgvSs3oTrDjDZxLnrhX0oXcxl15TzrN5f1gvjcIOcDxlcKFuiIuHgTnmVVGa5Hid
iWp4XEza/7GLk2dp/vDLXcwL8HYcFD0/cehh6dv6A+WVOzKhh9dTSVhWG0UIr80P
bMgRs37603LSXMDAgtDv7VCPD61NJa6msa+YM4BZeQKBgQDvNBYZN+0b05tRPvzD
PO1dRm+ncOY9JuarDx1WXmdOrcVOJy0DkxGOjjyrz4o6vJWKMsq9McsRgCx4KaFg
vSm5qx+AoXgomQqvG2Gigpp0aF/uECxRPNaO1lMiOlJT/Wyj4eammkhTnd1ZIare
bp0yVyPYz02iBTL/Zv9poXgkLQKBgQDgfYaRKbmNxTCsPsg8Sg/IZ42vlqG7Saer
ASW6OJHS6UTdhbblQQ9ZnC58TW0exwUObdYaO4OLIsPd+gQGsAxbRjHOJ7dDBByA
jD+WlWGlNOtj8xBNgtuySq7189VP4k4A99n7GuRt3yXI6y+Ho/D7aIi/+BWAlygw
/3Dkr3v4zQKBgGZX2ryfeQtW1jVExdCi2Mv3vv3dCCVR5494wAycB4daQfjWOiQ1
YGWl5b985J+M4E5ovOWF0GSEeoJPDYTeamPOG4RlkYuNL00MYhGt33e+0IyCzvNT
HFmwyZDzcxYMb9cOaCkQCbH88R+ZkAnrOca4EdZJm+WeY9tyrgT72PNhAoGBANMJ
Dfze9aFx01zJNGGA2i9yMb70Yxv2lNlsHbRfQ667PdLlxdbkf3KlIQoXm1JIk9dJ
p/FHK1UcHHdLdod27lbLuTxtF5m3frfVoF2GFqJBClwOfq/vKWsFTE7IpyoOu3er
iE7HrCAhm5qyhR8FHiCp14xnwob9EnplWBKTaX6tAoGBAItVUEImco07ufVyMinc
hcwMYELFU6GA/e0js4bey8hw+9sfGnMFtyxAkUjaV/nWAZEvRWB1orCzFuP/6oLQ
lD0SStijeLFgLPdlnhWNwcu+xCLvDZR6qX/RprVZwLt1x0RxKjkYB0YFTaCdUErm
e44Hm8gpNhplXGNX/5iMbOaR
-----END PRIVATE KEY-----
"""

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def test_instance(self):
        with self.subTest("upload_certs_st1"):
                f = io.StringIO(self.cert)
                x = self.send_file(f'{self.url}/st1', f, "cert")
                x.assert_code(200)
                f = io.StringIO(self.key)
                x = self.send_file(f'{self.url}/st1', f, "key")
                x.assert_code(200)
        with self.subTest("get_section"):
            x = self.get(self.url)
            x.assert_code(200)

        with self.subTest("update_section_1"):
            # server
            x = self.post_data(
                self.url,
                {
                    ".type": "service",
                    "id": "st1",
                    "accept_host": "127.0.0.1",
                    "client": "0",
                    "enabled": "1",
                    "accept_port": "9999",
                    "connect": [
                    "0.0.0.0:7777"
                    ],
                    "cipher_type": "none",
                    "protocol": "",
                    "cert": "/etc/certificates/cbid.stunnel.st1.certfile",
                    "key": "/etc/certificates/cbid.stunnel.st1.keyfile"
                },
            )
            x.assert_data(
                {
                    ".type": "service",
                    "id": "st1",
                    "accept_host": "127.0.0.1",
                    "client": "0",
                    "enabled": "1",
                    "accept_port": "9999",
                    "connect": [
                    "0.0.0.0:7777"
                    ],
                    "cipher_type": "none",
                    "cert": "/etc/certificates/cbid.stunnel.st1.certfile",
                    "cert:file_size": 1189,
                    "key": "/etc/certificates/cbid.stunnel.st1.keyfile",
                    "use_tpm": "0",
                    "key:file_size": 1705
                },
                201,
            )
            # client
            with self.subTest("upload_certs_st2"):
                f = io.StringIO(self.cert)
                x = self.send_file(f'{self.url}/st2', f, "CAfile")
                x.assert_code(200)
            x = self.post_data(
                self.url,
                {
                    ".type": "service",
                    "id": "st2",
                    "accept_host": "127.0.0.1",
                    "client": "1",
                    "enabled": "1",
                    "accept_port": "8888",
                    "connect": [
                    "127.0.0.1:9999"
                    ],
                    "cipher_type": "none",
                    "protocol": "",
                    "cert": "",
                    "key": "",
                    "CAfile": "/etc/certificates/cbid.stunnel.st2.CAfilefile"
                }
            )
            x.assert_data(
                {
                    ".type": "service",
                    "id": "st2",
                    "accept_host": "127.0.0.1",
                    "client": "1",
                    "enabled": "1",
                    "accept_port": "8888",
                    "connect": [
                    "127.0.0.1:9999"
                    ],
                    "cipher_type": "none",
                    "CAfile": "/etc/certificates/cbid.stunnel.st2.CAfilefile",
                    'CAfile:file_size': 1189,
                    "use_tpm": "0"
                },
                201,
            )
        with self.subTest("check_firewall_rules"):
            x = self.get(self.url_fw)
            found = False
            for section in x.resp.json()["data"]:
                if section["name"] == "Allow-stunnel":
                    found = True
                    self.assertEqual(section["dest_port"], ["9999"])
                    self.assertEqual(section["proto"], ["tcp"])
            if not found:
                self.fail("Firewall rule is not created")

        with self.subTest("start_listener"):
            self.ssh.send_cmd("sh -c 'echo labadiena | nc -l -p 7777 &'")
            time.sleep(5)

        with self.subTest("send_string_to_listener"):
            self.ssh.send_cmd("echo 'visogero' | nc 127.0.0.1 8888")
            time.sleep(1)

        with self.subTest("check_logs"):
            logs = self.ssh.send_cmd("logread -e stunnel")
            self.assertIn("Connection closed: 10 byte(s) sent to TLS, 9 byte(s) sent to socket", logs)
            self.assertIn("Connection closed: 9 byte(s) sent to TLS, 10 byte(s) sent to socket", logs)

        with self.subTest("cleanup"):
            x = self.get(self.url)
            for section in x.resp.json()["data"]:
                    x = self.delete(self.url + "/" + section["id"])
                    x.assert_code(200)

