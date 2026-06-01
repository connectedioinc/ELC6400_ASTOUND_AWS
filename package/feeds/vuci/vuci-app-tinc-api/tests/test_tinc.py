import sys
import time
import os.path

sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import get_ssh
from utils.general_api import is_package_installed


class Tinc(util.WrapTest):
    url = "/tinc/config"
    url_fw = "/firewall/zones/config"

    def setUp(self):
        if not is_package_installed(self, "tinc"):
            self.skipTest("Tinc package is not installed")

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()
        os.makedirs("./files/tinc/", exist_ok=True)

    @classmethod
    def tearDownClass(cls) -> None:
        os.remove("./files/tinc/rsa_key.pub")
        os.remove("./files/tinc/rsa_key.priv")
        cls.ssh.logout()

    def check_firewall(self, enabled):
        with self.subTest("check_firewall_zone"):
            x = self.get(self.url_fw)
            found = False
            for section in x.resp.json()["data"]:
                if section["name"] == "tinc":
                    found = True
            if enabled and not found:
                self.fail("Firewall zone is not created")
            if not enabled and found:
                self.fail("Firewall zone exist after instance delete")

    def test_instance(self):
        with self.subTest("create_interface1"):
            x = self.post_data(self.url, {"id": "int1"})
            x.assert_data(
                {
                    "keyexpire": "3600",
                    ".type": "tinc-net",
                    "pingtimeout": "5",
                    "id": "int1",
                    "port": "655",
                    "name": "int1",
                    "mode": "router",
                    "addressfamily": "any",
                    "pinginterval": "60",
                },
                201,
            )

        with self.subTest("create_host1"):
            x = self.post_data(f"/tinc/int1/hosts/config", {"id": "host1"})
            x.assert_data(
                {"id": "host1", ".type": "tinc-host_int1", "net": "int1"}, 201
            )

        with self.subTest("update_interface1"):
            self.ssh.send_cmd("tincd --generate-keys=512 | echo")
            if not os.path.isdir("./files/tinc"):
                os.mkdir("./files/tinc")
            priv_key_data = self.ssh.send_cmd("cat /etc/tinc/rsa_key.priv")
            pub_key_data = self.ssh.send_cmd("cat /etc/tinc/rsa_key.pub")
            with open("./files/tinc/rsa_key.priv", "w") as f:
                f.write(priv_key_data)
            with open("./files/tinc/rsa_key.pub", "w") as f:
                f.write(pub_key_data)
            self.ssh.send_cmd("rm /etc/tinc/*")

            self.send_file(
                f"{self.url}/int1", "./files/tinc/rsa_key.priv", option="privatekeyfile"
            ).assert_data(
                {"path": "/etc/certificates/cbid.tinc.int1.privatekeyfilersa_key.priv"}
            )
            self.send_file(
                f"{self.url}/int1", "./files/tinc/rsa_key.pub", option="publickeyfile"
            ).assert_data(
                {"path": "/etc/certificates/cbid.tinc.int1.publickeyfilersa_key.pub"}
            )

            x = self.put_data(
                f"{self.url}/int1",
                {
                    "enabled": "1",
                    "privatekeyfile": "/etc/certificates/cbid.tinc.int1.privatekeyfilersa_key.priv",
                    "publickeyfile": "/etc/certificates/cbid.tinc.int1.publickeyfilersa_key.pub",
                    "local_ip": "10.0.0.1/24",
                    "local_ipv6": "2000::1/64",
                    "connectto": ["host1"],
                    "subnet": ["192.168.1.0/24", "192.168.5.0/24"],
                },
            )
            x.assert_data(
                {
                    "keyexpire": "3600",
                    ".type": "tinc-net",
                    "pingtimeout": "5",
                    "id": "int1",
                    "publickeyfile": "/etc/certificates/cbid.tinc.int1.publickeyfilersa_key.pub",
                    "port": "655",
                    "name": "int1",
                    "privatekeyfile": "/etc/certificates/cbid.tinc.int1.privatekeyfilersa_key.priv",
                    "enabled": "1",
                    "mode": "router",
                    "addressfamily": "any",
                    "pinginterval": "60",
                    "local_ip": "10.0.0.1/24",
                    "local_ipv6": "2000::1/64",
                    "subnet": ["192.168.1.0/24", "192.168.5.0/24"],
                    "connectto": ["host1"],
                },
                200,
                {"publickeyfile:file_size", "privatekeyfile:file_size"},
            )
            self.check_firewall(True)

        with self.subTest("update_host1"):
            x = self.put_data(
                f"/tinc/int1/hosts/config/host1",
                {
                    "enabled": "1",
                    "publickeyfile": "/etc/certificates/cbid.tinc.int1.publickeyfilersa_key.pub",
                    "description": "My test Host",
                    "subnet": ["192.168.1.0/24"],
                },
            )
            x.assert_data(
                {
                    "enabled": "1",
                    ".type": "tinc-host_int1",
                    "description": "My test Host",
                    "id": "host1",
                    "publickeyfile": "/etc/certificates/cbid.tinc.int1.publickeyfilersa_key.pub",
                    "subnet": ["192.168.1.0/24"],
                    "net": "int1",
                },
                200,
                {"publickeyfile:file_size"},
            )

        with self.subTest("check_int1"):
            x = self.get(f"{self.url}/int1")
            x.assert_data(
                {
                    "keyexpire": "3600",
                    "local_ip": "10.0.0.1/24",
                    "subnet": ["192.168.1.0/24", "192.168.5.0/24"],
                    "privatekeyfile": "/etc/certificates/cbid.tinc.int1.privatekeyfilersa_key.priv",
                    "connectto": ["host1"],
                    "addressfamily": "any",
                    "enabled": "1",
                    ".type": "tinc-net",
                    "pingtimeout": "5",
                    "id": "int1",
                    "publickeyfile": "/etc/certificates/cbid.tinc.int1.publickeyfilersa_key.pub",
                    "name": "int1",
                    "port": "655",
                    "local_ipv6": "2000::1/64",
                    "mode": "router",
                    "pinginterval": "60",
                },
                200,
                {"publickeyfile:file_size", "privatekeyfile:file_size"},
            )

        with self.subTest("check_host1"):
            x = self.get(f"/tinc/int1/hosts/config/host1")
            x.assert_data(
                {
                    "enabled": "1",
                    ".type": "tinc-host_int1",
                    "description": "My test Host",
                    "id": "host1",
                    "publickeyfile": "/etc/certificates/cbid.tinc.int1.publickeyfilersa_key.pub",
                    "subnet": ["192.168.1.0/24"],
                    "net": "int1",
                },
                200,
                {"publickeyfile:file_size"},
            )

        # new int
        with self.subTest("create_interface2"):
            x = self.post_data(
                self.url,
                {
                    "id": "int2",
                    "enabled": "1",
                    "privatekeyfile": "/etc/certificates/cbid.tinc.int1.privatekeyfilersa_key.priv",
                    "publickeyfile": "/etc/certificates/cbid.tinc.int1.publickeyfilersa_key.pub",
                    "local_ip": "10.0.0.2/24",
                    "local_ipv6": "2000::2/64",
                    "subnet": ["192.168.1.0/24", "192.168.5.0/24"],
                    "port": "656",
                },
            )
            x.assert_code(201)

        with self.subTest("create_host2"):
            x = self.post_data(
                f"/tinc/int2/hosts/config",
                {
                    "id": "host2",
                    "enabled": "1",
                    "publickeyfile": "/etc/certificates/cbid.tinc.int1.publickeyfilersa_key.pub",
                    "description": "My test Host2",
                    "subnet": ["192.168.1.0/24"],
                    "address": ["127.0.0.1", "127.0.0.1:655"],
                },
            )
            x.assert_code(201)

        with self.subTest("create_host3"):
            x = self.post_data(f"/tinc/int2/hosts/config", {"id": "host3"})
            x.assert_code(201)

        with self.subTest("update_interface2"):
            x = self.put_data(
                f"{self.url}/int2",
                {
                    "connectto": ["host2", "host3"],
                },
            )
            x.assert_code(200)

        with self.subTest("check_interfaces"):
            time.sleep(5)
            ip1 = self.ssh.send_cmd(
                'ip --json a | jsonfilter -e \'@[@.ifname="tinc_int1"]["addr_info"][0].local\''
            )
            ip2 = self.ssh.send_cmd(
                'ip --json a | jsonfilter -e \'@[@.ifname="tinc_int2"]["addr_info"][0].local\''
            )
            if ip1.strip() != "10.0.0.1" or ip2.strip() != "10.0.0.2":
                self.fail("Interface not created")

        with self.subTest("disable_int1"):
            x = self.put_data(
                f"{self.url}/int1",
                {"enabled": "0"},
            )
            x.assert_code(200)

        with self.subTest("disable_int2"):
            x = self.put_data(
                f"{self.url}/int2",
                {"enabled": "0"},
            )
            x.assert_code(200)

        # del sec
        with self.subTest("delete_host1"):
            x = self.delete(f"/tinc/int1/hosts/config/host1")
            x.assert_data({"id": "host1"}, 200)

        with self.subTest("delete_int1"):
            x = self.delete(f"{self.url}/int1")
            x.assert_data({"id": "int1"}, 200)

        with self.subTest("delete_int2"):
            x = self.delete(f"{self.url}/int2")
            x.assert_data({"id": "int2"}, 200)
            self.check_firewall(False)
