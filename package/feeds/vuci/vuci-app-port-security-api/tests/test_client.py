import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes
from utils.ssh import get_ssh
import os

RC = codes.ResponseCodes

class test_client_api(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()
        cls.ssh.send_cmd("cp -p /etc/config/dot1x /tmp/dot1x_config")
        os.makedirs("./files/dot1x/", exist_ok=True)
        ca = open("./files/dot1x/ca.crt", "w")
        ca.write("""
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
""")
        ca.close()

        key = open("./files/dot1x/user.priv", "w")
        key.write("""
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDmBI9CU1/oQQRK
FP9meN7E85fXUYrK2QxORHxSoxUwvTpjZ4z4+gZyupP0mz7Fbjyu68eHOpnXxCoM
TdKfwWMszDXybZZfclfxMpQqpc9eYXlUVt+uxJZKAC4IFLzFuePDDMAznX/pnjTr
iFHU9t8oX3gfYhoDluqeY4ahhR52gaF9cJZgKLp5obRafe9GoX3fEt7/dqb/cPE7
qEbRrS1VztiU9dECRkLQt+wb3p9JGuVH3IoDKKMiim65cOLD/M9bsJzAK7ZLd8QG
AKqZb1Vw5xxlZHLXHTVUkNiGG5oFF6i88ST0SPveEfy7cAi+d1kV9wl9UfDnh6Of
BBz6x+pNAgMBAAECggEAOWTWXUGiCvkcKaMLJmXPCjxQ/TpcxCg77JSko9cLDM4O
sWqPb7mtXbfF/tE07L0Iucndz9WUuRS6vDa38UJnLXCoHl1vWdIVdPr+oxScBWwT
gvKpXjmx2XWphr0r7DdpyEvYcpigZ+ngwQuTBa1y+ec2eTg4jwA7ezmQyKFHfGB7
kBRQD9Tzkmm9V0MV4x6Xxzfjsrpbg1bfmQHA4RxhgySNO//TKXJW4NtluBbD7FlN
nFp3PF++7H8UQi2bMT6VGAMXdFsxOULAqVwL+sE7s7+9zNwkAWudBP+U8qTXtWRD
mRSj3TxXxTv25im7Kp7s/5uEA1dk6UgSliigXblEMQKBgQD1tgsXuina8d/GRxrc
KgiVw6Uyedw/DpdE6uowR+rI4DQGbB3jqIetvQ56i/6fR0mWTIMQEZqmfIs/7Y96
EbgCPE1O3NEtiF2pO6UwBq5w1HCuHS1liNpTcKiKbhvlyE5RNbd25nWbXP9vH0CE
hfhIwMzObYbn9sQdbisTdbFFcQKBgQDvpknTkuJ9DjdWY1BlZPRRJnlllH50VByY
Pmu8yHn5m1X9CpPpfsaouHfQBg3ETjW0KiEDBCAg0LAEHwOK4Y7K5eyBA4an/Ik+
XkffpOXm2qEC4F2UqBtGyrqa/qUpnin/w/5mVEz12K9kqK4YtZfG7C/qWvUbeRwp
/+hJ3huUnQKBgDptb3XU7t8BZRThE6IG3MPAIig+kgDsl0vsEIQqlcnuhnCAhRr9
mEXYDvlVENcPPJBg4UmQ5hVwyCwLcXK1g+wEKt315EfPhXYYmM8yx4hM+/5rMcBT
Kpds0qcYR8n8N6NYAqhjZNPs6VCjPdRFhyTFs+3iXZILO9dDuzqFYgIBAoGADM1Y
UkodeUrCIAZMLC55csBYadnF65b2tBdZkAsxoOjwbgUbo7SXDjpUhDNelucKrWY2
vz+AK+CaFo5FlSy5gRNJUBcNIXo3JrLIqiTX9z4krc+okCFu25hG4bLKxe9iFPy2
YWcNeXCq5fiw3DcPNZw2bxGO2HnezEuUcCXCWW0CgYBrI6Mzx8rftGOExY4vSvzn
h9dYISbfjJUAnutrI896ui+Tmm/HROGktsVrNn5Uj8FuagG1NVvLG6Ulf5G11ycX
BALQkIpixb1DiyOpbjDUdCqefR9bs+zSjRZFzC61enh2e0FXlTyK+0XbzUsfPoFG
MLKWDxQmL0weO9xTY71m/g==
-----END PRIVATE KEY-----
""")
        key.close()

        cert = open("./files/dot1x/user.crt", "w")
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

    @classmethod
    def tearDownClass(cls) -> None:
        os.remove("./files/dot1x/ca.crt")
        os.remove("./files/dot1x/user.priv")
        os.remove("./files/dot1x/user.crt")
        cls.ssh.send_cmd("mv /tmp/dot1x_config /etc/config/dot1x")
        cls.ssh.logout()

    base_url = "/dot1x"
    def test_client_api(self):
        with self.subTest("upload_files"):
            self.send_file(self.base_url + "/ports/config/_eth0", "./files/dot1x/user.crt", option = "client_cert").assert_data( {"path": "/etc/certificates/cbid.dot1x._eth0.client_certuser.crt"})
            self.send_file(self.base_url + "/ports/config/_eth0", "./files/dot1x/user.priv", option = "private_key").assert_data( {"path": "/etc/certificates/cbid.dot1x._eth0.private_keyuser.priv"})
            self.send_file(self.base_url + "/ports/config/_eth0", "./files/dot1x/ca.crt", option = "ca_cert").assert_data( {"path": "/etc/certificates/cbid.dot1x._eth0.ca_certca.crt"})

        with self.subTest("try_invalid_md5"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "role": "client",
                "password": "test",
                "identity": "",
                "auth_type": "md5",
                "enabled": "1"
            })
            x.assert_error("auth_type", "Missing required option: identity", RC.INVALID_OPT.val())
        with self.subTest("try_valid_md5"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "role": "client",
                "password": "test",
                "identity": "hello!",
                "auth_type": "md5",
                "enabled": "1"
            })
            x.assert_code(200)


        with self.subTest("try_invalid_tls"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "role": "client",
                "auth_type": "tls",
                "identity": "bob",
                "client_cert": "/etc/certificates/cbid.dot1x._eth0.client_certuser.crt",
                "private_key": "",
                "enabled": "1"
            })
            x.assert_error("auth_type", "Missing required option: private_key", RC.INVALID_OPT.val())

        with self.subTest("try_valid_tls"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "role": "client",
                "auth_type": "tls",
                "identity": "bob",
                "client_cert": "/etc/certificates/cbid.dot1x._eth0.client_certuser.crt",
                "private_key": "/etc/certificates/cbid.dot1x._eth0.private_keyuser.priv",
                "enabled": "1"
            })
            x.assert_code(200)

        with self.subTest("try_tls_optional_settings"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "private_key_pass": "123",
                "ca_cert": "/etc/certificates/cbid.dot1x._eth0.ca_certca.crt"
            })
            x.assert_code(200)

        with self.subTest("try_invalid_pwd"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "role": "client",
                "password": "test",
                "identity": "",
                "auth_type": "pwd",
                "enabled": "1"
            })
            x.assert_error("auth_type", "Missing required option: identity", RC.INVALID_OPT.val())

        with self.subTest("try_valid_pwd"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "role": "client",
                "password": "test",
                "identity": "hello!",
                "auth_type": "pwd",
                "enabled": "1"
            })
            x.assert_code(200)
        with self.subTest("try_invalid_peap"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "role": "client",
                "password": "hello",
                "identity": "bob",
                "anonymous_identity": "",
                "auth_type": "peap",
                "enabled": "1"
            })
            x.assert_error("auth_type", "Missing required option: anonymous_identity", RC.INVALID_OPT.val())

        with self.subTest("try_valid_peap"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "role": "client",
                "password": "hello",
                "identity": "bob",
                "anonymous_identity": "not_bob",
                "inner_authentication": "mschapv2",
                "enabled": "1"
            })
            x.assert_code(200)
        
        with self.subTest("try_peap_extra_options"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "ca_cert": "/etc/certificates/cbid.dot1x._eth0.ca_certca.crt",
                "peap_version": "auto"
            })
            x.assert_code(200)

        with self.subTest("try_peap_inner_auth_md5"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "inner_authentication": "md5",
            })
            x.assert_code(200)

        with self.subTest("try_peap_inner_auth_gtc"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "inner_authentication": "gtc",
            })
            x.assert_code(200)

        with self.subTest("try_peap_inner_auth_invalid"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "inner_authentication": "invalid",
            })
            x.assert_error("inner_authentication", "Must be one of the following values [mschapv2, md5, gtc].", RC.INVALID_OPT.val())

        with self.subTest("try_peap_version0"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "peap_version": "0",
            })
            x.assert_code(200)

        with self.subTest("try_peap_version1"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "peap_version": "1",
            })
            x.assert_code(200)

        with self.subTest("try_peap_version3"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "peap_version": "2",
            })
            x.assert_error("peap_version", "Must be one of the following values [auto, 0, 1].", RC.INVALID_OPT.val())

        with self.subTest("try_invalid_ttls"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "enabled": "1",
                ".type": "port",
                "inner_authentication": "gtc",
                "anonymous_identity": "",
                "identity": "bob",
                "password": "hello",
                "ca_cert": "",
                "peap_version": "1",
                "auth_type": "ttls"
            })
            x.assert_error("auth_type", "Missing required option: anonymous_identity", RC.INVALID_OPT.val())

        with self.subTest("try_valid_ttls"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "enabled": "1",
                ".type": "port",
                "inner_authentication": "gtc",
                "anonymous_identity": "not_bob",
                "identity": "bob",
                "password": "hello",
                "ca_cert": "",
                "peap_version": "1",
                "auth_type": "ttls"
            })
            x.assert_code(200)

        with self.subTest("try_invalid_inner_auth"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "enabled": "1",
                ".type": "port",
                "inner_authentication": "420",
                "anonymous_identity": "not_bob",
                "identity": "bob",
                "password": "hello",
                "ca_cert": "",
                "peap_version": "1",
                "auth_type": "ttls"
            })
            x.assert_error("inner_authentication", "Must be one of the following values [pap, mschap, mschapv2, mschapv2noeap, chap, md5, gtc].", RC.INVALID_OPT.val())

        with self.subTest("try_valid_ttls_optional_ca"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "enabled": "1",
                ".type": "port",
                "inner_authentication": "gtc",
                "anonymous_identity": "not_bob",
                "identity": "bob",
                "password": "hello",
                "ca_cert": "",
                "peap_version": "1",
                "auth_type": "ttls"
            })
            x.assert_code(200)
    
        with self.subTest("cleanup"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "enabled": "0",
                ".type": "port",
                "inner_authentication": "",
                "anonymous_identity": "",
                "identity": "bob",
                "password": "hello",
                "ca_cert": "",
                "private_key": "",
                "client_cert": "",
                "peap_version": "",
                "auth_type": "md5"
            })
            x.assert_code(200)
