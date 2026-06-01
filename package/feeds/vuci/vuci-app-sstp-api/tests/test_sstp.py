import sys

sys.path.append("../../../../tests")
from utils.ssh import get_ssh
import utility_integration as util
from utils.cert_generation import generate_certificates, delete_certificates


class SSTP(util.WrapTest):
    url = "/sstp/config"
    url_fw = "/firewall/zones/config"

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def check_firewall(self, enabled):
        with self.subTest("check_firewall_zone"):
            x = self.get(self.url_fw)
            found = False
            for section in x.resp.json()["data"]:
                if section["name"] == "sstp":
                    found = True
            if enabled and not found:
                self.fail("Firewall zone is not created")
            if not enabled and found:
                self.fail("Firewall zone exist after instance delete")

    def test_instance(self):
        with self.subTest("create_interface"):
            if (
                self.ssh.send_cmd(
                    'test -f /etc/certificates/ca.cert.pem && echo "$?"'
                ).strip()
                != "0"
            ):
                generate_certificates(self)
            x = self.post_data(self.url, {"id": "test"})
            x.assert_data(
                {
                    "enabled": "0",
                    ".type": "interface",
                    "id": "test",
                    "defaultroute": "0",
                },
                201,
            )

        with self.subTest("update_interface"):
            x = self.put_data(
                f"{self.url}/test",
                {
                    "enabled": "1",
                    "server": "127.0.0.1",
                    "username": "aaaa",
                    "password": "bbbb",
                },
            )
            x.assert_data(
                {
                    "password": "bbbb",
                    ".type": "interface",
                    "username": "aaaa",
                    "id": "test",
                    "defaultroute": "0",
                    "enabled": "1",
                    "server": "127.0.0.1",
                },
                200,
            )
            self.check_firewall(True)

        with self.subTest("create_interface2"):
            x = self.post_data(
                self.url,
                {
                    "id": "test2",
                    "enabled": "1",
                    "defaultroute": "1",
                    "device_files": "1",
                    "sstp_options": [
                        "refuse-pap",
                        "refuse-eap",
                        "refuse-chap",
                        "refuse-mschap",
                        "debug",
                    ],
                    "ca": "/etc/certificates/ca.cert.pem",
                    "server": "127.0.0.1",
                },
            )
            x.assert_data(
                {
                    "enabled": "1",
                    "sstp_options": [
                        "refuse-pap",
                        "refuse-eap",
                        "refuse-chap",
                        "refuse-mschap",
                        "debug",
                    ],
                    "device_files": "1",
                    "defaultroute": "1",
                    "id": "test2",
                    ".type": "interface",
                    "ca": "/etc/certificates/ca.cert.pem",
                    "server": "127.0.0.1",
                },
                201,
                {"ca:file_size"},
            )

        with self.subTest("check_interface"):
            x = self.get(f"{self.url}/test")
            x.assert_data(
                {
                    "password": "bbbb",
                    ".type": "interface",
                    "username": "aaaa",
                    "id": "test",
                    "defaultroute": "0",
                    "enabled": "1",
                    "server": "127.0.0.1",
                },
                200,
            )

        # del sec
        with self.subTest("delete_interface1"):
            x = self.delete(f"{self.url}/test")
            x.assert_data({"id": "test"}, 200)

        with self.subTest("delete_interface2"):
            x = self.delete(f"{self.url}/test2")
            x.assert_data({"id": "test2"}, 200)
            delete_certificates(self)
            self.check_firewall(False)
