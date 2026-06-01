import os
import sys

sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import get_ssh
import base64


class IPSec(util.WrapTest):
    maxDiff = None
    url = "/ipsec/config"
    url_traffic_rules = "/firewall/traffic_rules/config"
    tmp_cert_dir = "/tmp/ipsec"

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def create_files(self):
        if not os.path.isdir("./files/ipsec"):
            os.mkdir("./files/ipsec")
        self.ssh.send_cmd(f"mkdir -p {self.tmp_cert_dir}")
        self.ssh.send_cmd(f"openssl genrsa -out {self.tmp_cert_dir}/ca.key 2048")
        self.ssh.send_cmd(
            f'openssl req -x509 -new -nodes -key {self.tmp_cert_dir}/ca.key -sha256 -days 3650 -out {self.tmp_cert_dir}/ca.crt -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=TestCA"'
        )

        self.ssh.send_cmd(f"openssl genrsa -out {self.tmp_cert_dir}/key.priv 2048")
        self.ssh.send_cmd(
            f'openssl req -new -key {self.tmp_cert_dir}/key.priv -out {self.tmp_cert_dir}/server.csr \
        -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=server"'
        )
        self.ssh.send_cmd(
            f"openssl x509 -req -in {self.tmp_cert_dir}/server.csr -CA {self.tmp_cert_dir}/ca.crt \
        -CAkey {self.tmp_cert_dir}/ca.key -CAcreateserial -out {self.tmp_cert_dir}/cert.crt \
        -days 3650 -sha256"
        )
        self.ssh.send_cmd(f"rm {self.tmp_cert_dir}/server.csr")

        self.ssh.send_cmd(f"openssl genrsa -out {self.tmp_cert_dir}/right.key 2048")
        self.ssh.send_cmd(
            f'openssl req -new -key {self.tmp_cert_dir}/right.key -out {self.tmp_cert_dir}/right.csr \
        -subj "/C=US/ST=Test/L=Test/O=Test/OU=Test/CN=rightcert"'
        )
        self.ssh.send_cmd(
            f"openssl x509 -req -in {self.tmp_cert_dir}/right.csr -CA {self.tmp_cert_dir}/ca.crt \
        -CAkey {self.tmp_cert_dir}/ca.key -CAcreateserial -out {self.tmp_cert_dir}/rightcert.cert \
        -days 3650 -sha256"
        )
        self.ssh.send_cmd(f"rm {self.tmp_cert_dir}/right.csr")

        self.ssh.send_cmd(
            f"openssl pkcs12 -export -out {self.tmp_cert_dir}/pkcs12.p12 -inkey {self.tmp_cert_dir}/key.priv -in {self.tmp_cert_dir}/cert.crt -certfile {self.tmp_cert_dir}/ca.crt -passout pass:123456789"
        )

        self.ssh.send_cmd(f"chmod 600 {self.tmp_cert_dir}/key.priv")
        self.ssh.send_cmd(f"chmod 600 {self.tmp_cert_dir}/ca.key")
        self.ssh.send_cmd(f"chmod 644 {self.tmp_cert_dir}/ca.crt")
        self.ssh.send_cmd(f"chmod 644 {self.tmp_cert_dir}/cert.crt")
        self.ssh.send_cmd(f"chmod 600 {self.tmp_cert_dir}/pkcs12.p12")
        self.ssh.send_cmd(f"chmod 644 {self.tmp_cert_dir}/rightcert.cert")
        self.ssh.send_cmd(f"chmod 600 {self.tmp_cert_dir}/right.key")

    def delete_files(self):
        self.ssh.send_cmd(f"rm -r {self.tmp_cert_dir}")

    def check_firewall(self, rules_to_check):
        with self.subTest("check_firewall_rules"):
            x = self.get(self.url_traffic_rules)
            rules_data = x.resp.json()["data"]

            for rule in rules_to_check:
                name = rule["name"]
                expected_enabled = rule["enabled"]
                matching_rule = next(
                    (section for section in rules_data if section["name"] == name), None
                )

                if not matching_rule:
                    self.fail(f"Firewall rule '{name}' is not created.")
                else:
                    actual_enabled = matching_rule["enabled"]
                    if expected_enabled != actual_enabled:
                        self.fail(f"Firewall rule '{name}' is not enabled as expected.")
                    elif not expected_enabled and actual_enabled:
                        self.fail(
                            f"Firewall rule '{name}' is still enabled after it was expected to be disabled."
                        )

    def test_main(self):
        with self.subTest("test_fields"):
            id = "p1"
            url_put = self.url + "/" + id
            self.delete(f"{self.url}/{id}")
            x = self.post_data(self.url, {"id": id})
            template = x.json["data"]

            self.create_files()

            x = self.put_data(url_put, {"enabled": "1"})
            template.update({"enabled": "1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"pre_shared_key": "1234"})
            x.assert_error(
                "pre_shared_key",
                "Provided value is too short. Is 4 characters, but can not be shorter than 5 characters",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"pre_shared_key": "A" * 513})
            x.assert_error(
                "pre_shared_key",
                "Provided value is too long. Is 513 characters, but can be up to 512 characters",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"pre_shared_key": "12345"})
            template.update({"pre_shared_key": "12345"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"gateway": "www.example.org"})
            template.update({"gateway": "www.example.org"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"gateway": "example.org"})
            template.update({"gateway": "example.org"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"gateway": "172.16.0.254"})
            template.update({"gateway": "172.16.0.254"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"gateway": "172.16.0.300"})
            x.assert_error(
                "gateway",
                "Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted. E.g. 192.168.1.1 or example.com.",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"gateway": "172.16.0.0/24"})
            template.update({"gateway": "172.16.0.0/24"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"gateway": "fd00:dead:beef::1"})
            template.update({"gateway": "fd00:dead:beef::1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"gateway": "fd00:dead:beef::0/64"})
            template.update({"gateway": "fd00:dead:beef::0/64"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"gateway": "www.example.org:5555"})
            x.assert_error(
                "gateway",
                "Domain names, ip addresses (with or without network mask), %any, %any4, %any6 values are accepted. E.g. 192.168.1.1 or example.com.",
                103,
                None,
                None,
            )
            with self.subTest("Post invalid ID"):
                x = self.post_data(self.url, {"id": "1234 "})
                x.assert_error(
                    "id",
                    "A string of a-Z, 0-9 and _ characters is accepted.",
                    103,
                )
            with self.subTest("upload_certs"):
                content = self.ssh.send_cmd(f"cat {self.tmp_cert_dir}/cert.crt")
                with open("./files/ipsec/cert.crt", "w") as f:
                    f.write(content)
                x = self.send_file(
                    f"{url_put}", "./files/ipsec/cert.crt", option="leftcert"
                ).assert_data(
                    {"path": "/etc/certificates/cbid.ipsec.p1.leftcertcert.crt"}
                )
                content = self.ssh.send_cmd(f"cat {self.tmp_cert_dir}/key.priv")
                with open("./files/ipsec/key.priv", "w") as f:
                    f.write(content)
                x = self.send_file(
                    f"{url_put}", "./files/ipsec/key.priv", option="key"
                ).assert_data({"path": "/etc/certificates/cbid.ipsec.p1.keykey.priv"})
                content = self.ssh.send_cmd(f"cat {self.tmp_cert_dir}/ca.crt")
                with open("./files/ipsec/ca.crt", "w") as f:
                    f.write(content)
                x = self.send_file(
                    f"{url_put}", "./files/ipsec/ca.crt", option="cacert"
                ).assert_data({"path": "/etc/certificates/cbid.ipsec.p1.cacertca.crt"})
            x = self.put_data(
                url_put,
                {
                    "authentication_method": "x509",
                    "key": "/etc/certificates/cbid.ipsec.p1.keykey.priv",
                    "cacert": "/etc/certificates/cbid.ipsec.p1.cacertca.crt",
                    "leftcert": "/etc/certificates/cbid.ipsec.p1.leftcertcert.crt",
                    "key_decrypt": "123456789",
                },
            )
            template.update(
                {
                    "authentication_method": "x509",
                    "key": "/etc/certificates/cbid.ipsec.p1.keykey.priv",
                    "cacert": "/etc/certificates/cbid.ipsec.p1.cacertca.crt",
                    "leftcert": "/etc/certificates/cbid.ipsec.p1.leftcertcert.crt",
                    "key_decrypt": "123456789",
                }
            )
            # uncomment after credential file deletion is fixed
            # template.pop("pre_shared_key")
            x.assert_data(
                template,
                200,
                {"key:file_size", "cacert:file_size", "leftcert:file_size"},
            )
            x = self.put_data(
                url_put,
                {
                    "authentication_method": "eap-mschapv2",
                    "key": "/etc/certificates/cbid.ipsec.p1.keykey.priv",
                    "cacert": "/etc/certificates/cbid.ipsec.p1.cacertca.crt",
                    "leftcert": "/etc/certificates/cbid.ipsec.p1.leftcertcert.crt",
                    "key_decrypt": "123456789",
                },
            )
            template.update(
                {
                    "authentication_method": "eap-mschapv2",
                    "key": "/etc/certificates/cbid.ipsec.p1.keykey.priv",
                    "cacert": "/etc/certificates/cbid.ipsec.p1.cacertca.crt",
                    "leftcert": "/etc/certificates/cbid.ipsec.p1.leftcertcert.crt",
                    "key_decrypt": "123456789",
                }
            )
            x.assert_data(
                template,
                200,
                {"key:file_size", "cacert:file_size", "leftcert:file_size"},
            )

            keys_to_remove = {
                "authentication_method",
                "key",
                "key:file_size",
                "cacert",
                "cacert:file_size",
                "leftcert",
                "leftcert:file_size",
                "key_decrypt",
            }
            for key in keys_to_remove:
                template.pop(key, None)
            content = self.ssh.send_cmd(f"openssl base64 -in {self.tmp_cert_dir}/pkcs12.p12")
            with open("./files/ipsec/pkcs12.p12", "wb") as f:
                f.write(base64.b64decode(content))
            x = self.send_file(
                f"{url_put}", "./files/ipsec/pkcs12.p12", option="pkcs12_path"
            ).assert_data(
                {"path": "/etc/vuci-uploads/cbid.ipsec.p1.pkcs12_pathpkcs12.p12"}
            )
            x = self.put_data(
                url_put,
                {
                    "authentication_method": "pkcs12",
                    "pkcs12_path": "/etc/vuci-uploads/cbid.ipsec.p1.pkcs12_pathpkcs12.p12",
                    "pkcs12_decrypt": "123456789",
                },
            )
            template.update(
                {
                    "authentication_method": "pkcs12",
                    "pkcs12_path": "/etc/vuci-uploads/cbid.ipsec.p1.pkcs12_pathpkcs12.p12",
                    "pkcs12_decrypt": "123456789",
                    # remove after credential file deletion is fixed
                    "cacert": "/etc/certificates/cbid.ipsec.p1.cacertca.crt",
                    "key": "/etc/certificates/cbid.ipsec.p1.keykey.priv",
                    "key_decrypt": "123456789",
                    "leftcert": "/etc/certificates/cbid.ipsec.p1.leftcertcert.crt",
                    # to here
                }
            )
            x.assert_data(
                template,
                200,
                {
                    "pkcs12_path:file_size",
                    "cacert:file_size",
                    "key:file_size",
                    "leftcert:file_size",
                },
            )
            x = self.put_data(url_put, {"local_identifier": "A" * 256})
            x.assert_error(
                "local_identifier",
                "Provided value is too long. Is 256 characters, but can be up to 255 characters",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"local_identifier": "local_beef"})
            template.update({"local_identifier": "local_beef"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"remote_identifier": "A" * 256})
            x.assert_error(
                "remote_identifier",
                "Provided value is too long. Is 256 characters, but can be up to 255 characters",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"remote_identifier": "remote_beef"})
            template.update({"remote_identifier": "remote_beef"})
            x.assert_data(template, 200)
            content = self.ssh.send_cmd(f"cat {self.tmp_cert_dir}/rightcert.cert")
            with open("./files/ipsec/rightcert.cert", "w") as f:
                f.write(content)
            x = self.send_file(
                f"{url_put}", "./files/ipsec/rightcert.cert", option="rightcert"
            ).assert_data(
                {"path": "/etc/certificates/cbid.ipsec.p1.rightcertrightcert.cert"}
            )
            x = self.put_data(
                url_put,
                {
                    "rightcert": "/etc/certificates/cbid.ipsec.p1.rightcertrightcert.cert"
                },
            )
            template.update(
                {"rightcert": "/etc/certificates/cbid.ipsec.p1.rightcertrightcert.cert"}
            )
            x.assert_data(template, 200, {"rightcert:file_size"})
            x = self.put_data(url_put, {"mode": "someother"})
            x.assert_error(
                "mode",
                "Must be one of the following values [start, add, route].",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"mode": "add"})
            template.update({"mode": "add"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"mode": "route"})
            template.update({"mode": "route"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"mode": "start"})
            template.update({"mode": "start"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"type": "someother"})
            x.assert_error(
                "type",
                "Must be one of the following values [tunnel, transport].",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"type": "transport"})
            template.update({"type": "transport"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"bind_to": "test"})
            x.assert_error(
                "bind_to", "Must be one of the following values [].", 103, None, None
            )
            x = self.put_data(url_put, {"type": "tunnel"})
            template.update({"type": "tunnel"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"defaultroute": "1"})
            template.update({"defaultroute": "1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"defaultroute": "0"})
            template.update({"defaultroute": "0"})
            x.assert_data(template, 200)

            x = self.put_data(
                url_put,
                {
                    "local_subnet": [
                        "192.168.1.0/24",
                        "10.0.0.0/8",
                        "172.16.0.0/16",
                        "0.0.0.0/0",
                        "fd01::/64"
                    ]
                },
            )
            template.update(
                {
                    "local_subnet": [
                        "192.168.1.0/24",
                        "10.0.0.0/8",
                        "172.16.0.0/16",
                        "0.0.0.0/0",
                        "fd01::/64"
                    ]
                }
            )
            x.assert_data(template, 200)
            x = self.put_data(
                url_put,
                {
                    "remote_subnet": [
                        "192.168.1.0/24",
                        "10.0.0.0/8",
                        "172.16.0.0/16",
                        "0.0.0.0/0",
                        "fd02::/64"
                    ]
                },
            )
            template.update(
                {
                    "remote_subnet": [
                        "192.168.1.0/24",
                        "10.0.0.0/8",
                        "172.16.0.0/16",
                        "0.0.0.0/0",
                        "fd02::/64"
                    ]
                }
            )
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"keyexchange": "ikev42"})
            x.assert_error(
                "keyexchange",
                "Must be one of the following values [ikev1, ikev2].",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"keyexchange": "ikev1"})
            template.update({"keyexchange": "ikev1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"keyexchange": "ikev2"})
            template.update({"keyexchange": "ikev2"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"aggressive": "1"})
            template.update({"aggressive": "1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"aggressive": "0"})
            template.update({"aggressive": "0"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"forceencaps": "1"})
            template.update({"forceencaps": "1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"forceencaps": "0"})
            template.update({"forceencaps": "0"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"local_firewall": "1"})
            template.update({"local_firewall": "1"})
            x.assert_data(template, 200)
            self.check_firewall(
                [
                    {"name": "Forward-" + id + "-in", "enabled": "1"},
                    {"name": "Forward-" + id + "-out", "enabled": "1"},
                ]
            )
            x = self.put_data(url_put, {"local_firewall": "0"})
            template.update({"local_firewall": "0"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"remote_firewall": "1"})
            template.update({"remote_firewall": "1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"remote_firewall": "0"})
            template.update({"remote_firewall": "0"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"comp_mode": "1"})
            template.update({"comp_mode": "1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"comp_mode": "0"})
            template.update({"comp_mode": "0"})
            x.assert_data(template, 200)

            x = self.put_data(
                url_put, {"inactivity": "999999999999999999999999999999999"}
            )
            x.assert_error("inactivity", "Value is too long", 103, None, None)
            x = self.put_data(url_put, {"inactivity": "150"})
            template.update({"inactivity": "150"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"dpd": "1"})
            template.update({"dpd": "1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"dpdaction": "die"})
            x.assert_error(
                "dpdaction",
                "Must be one of the following values [restart, hold, clear, none].",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"dpdaction": "restart"})
            template.update({"dpdaction": "restart"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"dpdaction": "hold"})
            template.update({"dpdaction": "hold"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"dpdaction": "clear"})
            template.update({"dpdaction": "clear"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"dpdaction": "none"})
            template.update({"dpdaction": "none"})
            x.assert_data(template, 200)
            x = self.put_data(
                url_put, {"dpddelay": "999999999999999999999999999999999"}
            )
            x.assert_error("dpddelay", "Value is too long", 103, None, None)
            x = self.put_data(url_put, {"dpddelay": "150"})
            template.update({"dpddelay": "150"})
            x.assert_data(template, 200)
            x = self.put_data(
                url_put, {"dpdtimeout": "999999999999999999999999999999999"}
            )
            x.assert_error("dpdtimeout", "Value is too long", 103, None, None)
            x = self.put_data(url_put, {"dpdtimeout": "150"})
            template.update({"dpdtimeout": "150"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"remote_sourceip": ["10.0.0.1"]})
            x.assert_error(
                "remote_sourceip at index 1",
                "One of the following: IPv4 and IPv6 addresses are accepted. E.g. 192.168.1.1.IPv4 addresses with mask prefix are accepted E.g 192.168.1.0/24. Following words are accepted: %config, %poolname",
                103,
                None,
                None,
            )
            x = self.put_data(
                url_put,
                {
                    "remote_sourceip": [
                        "%config",
                        "%poolname",
                        "10.6.0.0/24",
                        "fd00:dead:beef::0/64",
                    ]
                },
            )
            template.update(
                {
                    "remote_sourceip": [
                        "%config",
                        "%poolname",
                        "10.6.0.0/24",
                        "fd00:dead:beef::0/64",
                    ]
                }
            )
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"local_sourceip": "10.0.0.1/24"})
            x.assert_error(
                "local_sourceip",
                "One of the following: - IPv4 and IPv6 addresses or subnets are accepted.E.g. 192.168.1.1 .- Following words are accepted: %config, %config4, %config6",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"local_sourceip": "%config4"})
            template.update({"local_sourceip": "%config4"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"local_sourceip": "%config6"})
            template.update({"local_sourceip": "%config6"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"local_sourceip": "%config"})
            template.update({"local_sourceip": "%config"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"local_sourceip": "fd00:dead:beef::1"})
            template.update({"local_sourceip": "fd00:dead:beef::1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"local_sourceip": "10.0.0.1"})
            template.update({"local_sourceip": "10.0.0.1"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"rightdns": ["172.16.0.254", "172.16.0.253","2001:4860:4860::8888", "2001:4860:4860::8844"]})
            template.update({"rightdns": ["172.16.0.254", "172.16.0.253","2001:4860:4860::8888", "2001:4860:4860::8844"]})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"xauth_identity": "deadbeef"})
            template.update({"xauth_identity": "deadbeef"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"leftprotoport": "tcp/65000-65007"})
            x.assert_error(
                "leftprotoport",
                "Value must match the format: ^[a-zA-Z0-9/%%]*$",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"leftprotoport": "tcp/65000"})
            template.update({"leftprotoport": "tcp/65000"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"rightprotoport": "tcp/65000-65007"})
            x.assert_error(
                "rightprotoport",
                "Value must match the format: ^[a-zA-Z0-9/%%]*$",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"rightprotoport": "tcp/65000"})
            template.update({"rightprotoport": "tcp/65000"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"custom": ["local_addrs=%any4"]})
            template.update({"custom": ["local_addrs=%any4"]})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"custom": ["reqid=1"]})
            template.update({"custom": ["reqid=1"]})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"passthrough": ["by_neil_breen"]})
            x.assert_error(
                "passthrough at index 1",
                "Must be one of the following values [lan, wan, wan6].",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"passthrough": ["lan"]})
            template.update({"passthrough": ["lan"]})
            x.assert_data(template, 200)

            x = self.put_data(
                url_put,
                {"passthrough_ip": ["192.168.1.0/24", "192.168.2.0/24", "192.168.3.1"]},
            )
            x.assert_error(
                "passthrough_ip at index 3",
                "IPv4 or IPv6 subnet is accepted.",
                103,
                None,
                None,
            )
            x = self.put_data(
                url_put,
                {"passthrough_ip": ["fd00::0001/64", "fd00::/48", "fd00:dead:beef::1"]},
            )
            x.assert_error(
                "passthrough_ip at index 3",
                "IPv4 or IPv6 subnet is accepted.",
                103,
                None,
                None,
            )
            x = self.put_data(
                url_put,
                {
                    "passthrough_local": [
                        "192.168.1.0/24",
                        "192.168.2.0/24",
                        "192.168.3.1/32",
                        "fd00::0001/64",
                        "fd00::/48"
                    ]
                },
            )
            template.update(
                {
                    "passthrough_local": [
                        "192.168.1.0/24",
                        "192.168.2.0/24",
                        "192.168.3.1/32",
                        "fd00::0001/64",
                        "fd00::/48"
                    ]
                }
            )
            x.assert_data(template, 200)
            x = self.put_data(
                url_put,
                {
                    "passthrough_remote": [
                        "192.168.4.0/24",
                        "192.168.5.0/24",
                        "192.168.6.1/32",
                        "fd00::0002/64",
                        "fd01::/48"
                    ]
                }
            )
            template.update(
                {
                    "passthrough_remote": [
                        "192.168.4.0/24",
                        "192.168.5.0/24",
                        "192.168.6.1/32",
                        "fd00::0002/64",
                        "fd01::/48"
                    ]
                }
            )
            x.assert_data(template, 200)
            x = self.put_data(
                url_put,
                {
                    "passthrough_ip": [
                        "192.168.1.0/24",
                        "192.168.2.0/24",
                        "192.168.3.1/32",
                        "fd00::0001/64",
                        "fd00::/48"
                    ]
                },
            )
            template.update(
                {
                    "passthrough_ip": [
                        "192.168.1.0/24",
                        "192.168.2.0/24",
                        "192.168.3.1/32",
                        "fd00::0001/64",
                        "fd00::/48"
                    ],
                    "passthrough_local": [
                        "192.168.1.0/24",
                        "192.168.2.0/24",
                        "192.168.3.1/32",
                        "fd00::0001/64",
                        "fd00::/48"
                    ],
                    "passthrough_remote": [
                        "192.168.1.0/24",
                        "192.168.2.0/24",
                        "192.168.3.1/32",
                        "fd00::0001/64",
                        "fd00::/48"
                    ],
                }
            )
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"flush": "1"})
            template.update({"flush": "1"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"force_crypto_proposal": "1"})
            template.update({"force_crypto_proposal": "1"})
            x.assert_data(template, 200)
            x = self.put_data(url_put, {"force_crypto_proposal2": "1"})
            template.update({"force_crypto_proposal2": "1"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"ikelifetime": "999"})
            x.assert_error(
                "ikelifetime",
                "A number with an indicator s, m, h or d is accepted, example: 3h",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"ikelifetime": "1800s"})
            template.update({"ikelifetime": "1800s"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"lifetime": "999"})
            x.assert_error(
                "lifetime",
                "A number with an indicator s, m, h or d is accepted, example: 3h",
                103,
                None,
                None,
            )
            x = self.put_data(url_put, {"lifetime": "1800s"})
            template.update({"lifetime": "1800s"})
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"xauth": "1"})
            template.update({"xauth": "1"})
            x.assert_data(template, 200)

            x = self.put_data(
                url_put,
                {
                    "crypto_proposal1": [
                        "unbreakable_encryption,sha1,modp1536",
                        "aes256,sha256,modp2048",
                        "des,md5,modp768",
                    ]
                },
            )
            x.assert_error(
                "crypto_proposal1 at index 1",
                "Must be one of the following values [3des, des, aes128, aes192, aes256, aes128gcm8, aes192gcm8, aes256gcm8, aes128gcm12, aes192gcm12, aes256gcm12, aes128gcm16, aes192gcm16, aes256gcm16, chacha20poly1305].",
                103,
                None,
                None,
            )
            x = self.put_data(
                url_put,
                {
                    "crypto_proposal1": [
                        "aes128,sha1,modp1536",
                        "aes256,sha256,modp2048",
                        "des,md5,modp768",
                    ]
                },
            )
            template.update(
                {
                    "crypto_proposal1": [
                        "aes128,sha1,modp1536",
                        "aes256,sha256,modp2048",
                        "des,md5,modp768",
                    ]
                }
            )
            x.assert_data(template, 200)

            x = self.put_data(
                url_put,
                {
                    "crypto_proposal2": [
                        "unbreakable_encryption,sha1,modp1536",
                        "aes256,sha256,modp2048",
                        "des,md5,modp768",
                    ]
                },
            )
            x.assert_error(
                "crypto_proposal2 at index 1",
                "Must be one of the following values [3des, des, aes128, aes192, aes256, aes128gcm8, aes192gcm8, aes256gcm8, aes128gcm12, aes192gcm12, aes256gcm12, aes128gcm16, aes192gcm16, aes256gcm16, chacha20poly1305].",
                103,
                None,
                None,
            )
            x = self.put_data(
                url_put,
                {
                    "crypto_proposal2": [
                        "aes128,sha1,modp1536",
                        "aes256,sha256,modp2048",
                        "des,md5,modp768",
                    ]
                },
            )
            template.update(
                {
                    "crypto_proposal2": [
                        "aes128,sha1,modp1536",
                        "aes256,sha256,modp2048",
                        "des,md5,modp768",
                    ]
                }
            )
            x.assert_data(template, 200)

            x = self.put_data(url_put, {"route_based_ipsec": "1"})
            x.assert_error(
                "route_based_ipsec", "Missing required option: xfrm_ip", 103, None, None
            )

            x = self.put_data(
                url_put,
                {
                    "route_based_ipsec": "1",
                    "xfrm_ip": "10.8.0.1/24",
                    "xfrm_mtu": "1440",
                },
            )
            template.update(
                {
                    "route_based_ipsec": "1",
                    "xfrm_ip": "10.8.0.1/24",
                    "xfrm_mtu": "1440",
                    "local_subnet": ["0.0.0.0/0"],
                    "remote_subnet": ["0.0.0.0/0"],
                }
            )
            x.assert_data(template, 200)

            self.check_firewall(
                [
                    {"name": "Forward-" + id + "-in", "enabled": "0"},
                    {"name": "Forward-" + id + "-out", "enabled": "0"},
                    {"name": "Allow-IPsec-ESP", "enabled": "1"},
                    {"name": "Allow-IPsec-NAT-T", "enabled": "1"},
                    {"name": "Allow-IPsec-IKE", "enabled": "1"},
                    {"name": "Allow-IPsec-Forward", "enabled": "1"},
                    {"name": "Allow-IPsec-Input", "enabled": "1"},
                    {"name": "Allow-IPsec-Output", "enabled": "1"},
                ]
            )

            keys_to_remove = {
                "key:file_size",
                "cacert:file_size",
                "leftcert:file_size",
                "rightcert:file_size",
                "pkcs12_path:file_size",
                "id",
            }
            for key in keys_to_remove:
                template.pop(key, None)

            self.delete(f"{self.url}/{id}")
            self.create_files()
            x = self.post_data(self.url, {"id": "p1", **template})
            x = self.post_data(self.url, {"id": "p2", **template})
            self.delete(f"{self.url}/p1")
            self.delete(f"{self.url}/p2")
            self.delete_files()
