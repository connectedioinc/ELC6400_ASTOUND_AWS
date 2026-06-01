import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes
from utils.vpn import firewall_must_be_clean
from utils.ssh import get_ssh
import re
import time
import json

class test_wireguard(util.WrapTest):
    url = "/wireguard"
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def generate_keys(self):
        x = self.post("/wireguard/actions/generate_keys", None).resp
        self.assertIn("private", x.json()['data'])
        self.assertIn("public", x.json()['data'])
        return x.json()['data']['private'], x.json()['data']['public']

    def connection_check(self):
        time.sleep(10)
        wg_show = self.ssh.send_cmd("wg show")
        matches = re.findall(r'handshake', wg_show, re.IGNORECASE)
        if len(matches) != 2:
            self.fail("Wireguard handshake failed")

    def firewall_rename_check(self, search_names):
        types = ["traffic_rules", "zones"]
        for type in types:
            endpoint = "/firewall/" + type + "/config"
            x = self.get(endpoint)
            data = x.resp.json().get('data', [])
            for name in search_names:
                for item in data:
                    if item.get('name') == name:
                        resp = self.put_data(endpoint + "/" + item['id'], {
                            "name": name + "_new"})
        wg = x = self.get("/wireguard/config")
        wg_data = x.resp.json().get('data', [])
        for item in wg_data:
            resp = self.put_data("/wireguard/config/" + item['id'], {"enabled": "1"})
        for type in types:
            endpoint = "/firewall/" + type + "/config"
            x = self.get(endpoint)
            data = x.resp.json().get('data', [])
            for name in search_names:
                for item in data:
                    if item.get('name') == name:
                        self.fail("Found duplicate firewall section after renaming")
        for type in types:
            endpoint = "/firewall/" + type + "/config"
            x = self.get(endpoint)
            data = x.resp.json().get('data', [])
            for name in search_names:
                for item in data:
                    if item.get('name') == name + "_new":
                        resp = self.put_data(endpoint + "/" + item['id'], {
                            "name": name})

    def test_wireguard_base_functionality(self):
        inst1_private_key, inst1_public_key = self.generate_keys()
        inst2_private_key, inst2_public_key = self.generate_keys()
        pre_shared_key, _ = self.generate_keys()
        zone = ""
        with self.subTest("create_section"):
            # first instance POST
            x = self.post_data(self.url + "/config", {
                "id": "inst1",
                "enabled": "1",
                "private_key": "wDN6PWV3NOhhXCvjeRG9wWMKAftljpXMs41T464rYXg=",
                "public_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                "listen_port": "666",
                "addresses":["1.1.1.1/24", "2.2.2.2/25"],
                "metric": "1",
                "mtu": "1000"
            })
            x.assert_data({
                "enabled": "1",
                ".type": "interface",
                "mtu": "1000",
                "public_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                "id": "inst1",
                "metric": "1",
                "listen_port": "666",
                "private_key": "wDN6PWV3NOhhXCvjeRG9wWMKAftljpXMs41T464rYXg=",
                "addresses": ["1.1.1.1/24", "2.2.2.2/25"]
            }, 201)

            # second instance POST
            x = self.post_data(self.url + "/config", {
                "id": "inst2",
                "enabled": "1",
                "private_key": "wJwdqdSTif8nVqaT+jVFvfyIK/W4Oea7xcKZOvL+f0w=",
                "public_key": "L8trapFhHqaBdVfIgzo1Dyhgp+TD6isD2qjWBpjBWlw=",
                "listen_port": "777",
                "addresses":["2.2.2.2/32", "3.3.3.3/32"],
                "metric": "1",
                "mtu": "1000"
            })
            x.assert_data({
                "enabled": "1",
                ".type": "interface",
                "mtu": "1000",
                "public_key": "L8trapFhHqaBdVfIgzo1Dyhgp+TD6isD2qjWBpjBWlw=",
                "id": "inst2",
                "metric": "1",
                "listen_port": "777",
                "private_key": "wJwdqdSTif8nVqaT+jVFvfyIK/W4Oea7xcKZOvL+f0w=",
                "addresses":["2.2.2.2/32", "3.3.3.3/32"],
            }, 201)
        with self.subTest("check_firewall_zone"):
            x = self.get("/firewall/zones/config")
            resp = x.resp
            found = False
            for section in resp.json()['data']:
                if section['name'] == "wireguard":
                    found = True
                    self.assertEqual(section['input'], "ACCEPT")
                    self.assertEqual(section['forward'], "REJECT")
                    self.assertEqual(section['masq'], "1")
                    self.assertEqual(section['output'], "ACCEPT")
                    zone = section['id']
            if not found:
                self.fail("Zone is not created")

        # new keys
        inst1_private_key, inst1_public_key = self.generate_keys()
        inst2_private_key, inst2_public_key = self.generate_keys()

        # first instance PUT
        with self.subTest("configure_section"):
            x = self.put_data(self.url + "/config/inst1", {
                "enabled": "1",
                "private_key": inst1_private_key,
                "public_key": inst1_public_key,
                "listen_port": "51820",
                "addresses": ["10.5.0.1/32", "10.5.1.1/25"],
                "metric": "1",
                "mtu": "1500"
            })
            x.assert_data({
                ".type": "interface",
                "enabled": "1",
                "private_key": inst1_private_key,
                "public_key": inst1_public_key,
                "listen_port": "51820",
                "id": "inst1",
                "addresses": ["10.5.0.1/32", "10.5.1.1/25"],
                "metric": "1",
                "mtu": "1500"
            })

        # first instance GET
        with self.subTest("get_section"):
            x = self.get(self.url + "/config/inst1")
            x.assert_data({
                ".type": "interface",
                "enabled": "1",
                "private_key": inst1_private_key,
                "public_key": inst1_public_key,
                "listen_port": "51820",
                "id": "inst1",
                "addresses": ["10.5.0.1/32", "10.5.1.1/25"],
                "metric": "1",
                "mtu": "1500"
            })
        # second instance PUT
        with self.subTest("configure_section"):
            x = self.put_data(self.url + "/config/inst2", {
                "enabled": "1",
                "private_key": inst2_private_key,
                "public_key": inst2_public_key,
                "listen_port": "51821",
                "addresses": ["10.5.0.2/32", "10.5.1.2/25"],
                "metric": "1",
                "mtu": "1500"
            })
            x.assert_data({
                ".type": "interface",
                "enabled": "1",
                "private_key": inst2_private_key,
                "public_key": inst2_public_key,
                "listen_port": "51821",
                "id": "inst2",
                "addresses": ["10.5.0.2/32", "10.5.1.2/25"],
                "metric": "1",
                "mtu": "1500"
            })

        # second instance GET
        with self.subTest("get_section"):
            x = self.get(self.url + "/config/inst2")
            x.assert_data({
                ".type": "interface",
                "enabled": "1",
                "private_key": inst2_private_key,
                "public_key": inst2_public_key,
                "listen_port": "51821",
                "id": "inst2",
                "addresses": ["10.5.0.2/32", "10.5.1.2/25"],
                "metric": "1",
                "mtu": "1500"
            })
        # first instance peer1
        with self.subTest("create_peer"):
            x = self.post_data(self.url + "/inst1/peers/config", {
                "id": "peer_inst2",
                "public_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                "allowed_ips": ["1.1.1.1", "2.2.2.2"],
                "description": "description",
                "preshared_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                "route_allowed_ips":"1",
                "endpoint_host": "example.com",
                "endpoint_port": "666",
                "persistent_keepalive": "10"
            })
            x.assert_data({
                "endpoint_port": "666",
                "description": "description",
                "id": "peer_inst2",
                "allowed_ips": [ "1.1.1.1", "2.2.2.2" ],
                "preshared_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                "public_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                ".type": "wireguard_inst1",
                "persistent_keepalive": "10",
                "route_allowed_ips": "1",
                "endpoint_host": "example.com"
            }, 201)
        with self.subTest("configure_peer"):
            x = self.put_data(self.url + "/inst1/peers/config/peer_inst2", {
                "public_key": inst2_public_key,
                "allowed_ips": ["10.5.0.2/32", "10.5.1.2/32", "192.168.2.0/24"],
                "description": "description",
                "preshared_key": pre_shared_key,
                "route_allowed_ips":"1",
                "endpoint_host": "127.0.0.1",
                "endpoint_port": "51821",
                "persistent_keepalive": "10"
            })
            x.assert_data({
                "endpoint_port": "51821",
                "description": "description",
                "id": "peer_inst2",
                "allowed_ips": ["10.5.0.2/32", "10.5.1.2/32", "192.168.2.0/24"],
                "preshared_key": pre_shared_key,
                "public_key": inst2_public_key,
                ".type": "wireguard_inst1",
                "persistent_keepalive": "10",
                "route_allowed_ips": "1",
                "endpoint_host": "127.0.0.1",
            })
        with self.subTest("get_peer"):
            x = self.get(self.url + "/inst1/peers/config/peer_inst2")
            x.assert_data({
                "endpoint_port": "51821",
                "description": "description",
                "id": "peer_inst2",
                "allowed_ips": ["10.5.0.2/32", "10.5.1.2/32", "192.168.2.0/24"],
                "preshared_key": pre_shared_key,
                "public_key": inst2_public_key,
                ".type": "wireguard_inst1",
                "persistent_keepalive": "10",
                "route_allowed_ips": "1",
                "endpoint_host": "127.0.0.1"
            })
        # second instance peer1
        with self.subTest("create_peer"):
            x = self.post_data(self.url + "/inst2/peers/config", {
                "id": "peer_inst1",
                "public_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                "allowed_ips": ["1.1.1.1", "2.2.2.2"],
                "description": "description",
                "preshared_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                "route_allowed_ips":"1",
                "endpoint_host": "example.com",
                "endpoint_port": "666",
                "persistent_keepalive": "10"
            })
            x.assert_data({
                "endpoint_port": "666",
                "description": "description",
                "id": "peer_inst1",
                "allowed_ips": [ "1.1.1.1", "2.2.2.2" ],
                "preshared_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                "public_key": "QW6ck0GrFJ7Y6C6RzAd2NIW7a055BqsdtrkdbaKAEBQ=",
                ".type": "wireguard_inst2",
                "persistent_keepalive": "10",
                "route_allowed_ips": "1",
                "endpoint_host": "example.com"
            }, 201)
        with self.subTest("configure_peer"):
            x = self.put_data(self.url + "/inst2/peers/config/peer_inst1", {
                "public_key": inst1_public_key,
                "allowed_ips": ["10.5.0.1/32", "10.5.1.1/32", "192.168.1.0/24"],
                "description": "description",
                "preshared_key": pre_shared_key,
                "route_allowed_ips":"1",
                "endpoint_host": "127.0.0.1",
                "endpoint_port": "51820",
                "persistent_keepalive": "10"
            })
            x.assert_data({
                "endpoint_port": "51820",
                "description": "description",
                "id": "peer_inst1",
                "allowed_ips": ["10.5.0.1/32", "10.5.1.1/32", "192.168.1.0/24"],
                "preshared_key": pre_shared_key,
                "public_key": inst1_public_key,
                ".type": "wireguard_inst2",
                "persistent_keepalive": "10",
                "route_allowed_ips": "1",
                "endpoint_host": "127.0.0.1",
            })
        with self.subTest("get_peer"):
            x = self.get(self.url + "/inst2/peers/config/peer_inst1")
            x.assert_data({
                "endpoint_port": "51820",
                "description": "description",
                "id": "peer_inst1",
                "allowed_ips": ["10.5.0.1/32", "10.5.1.1/32", "192.168.1.0/24"],
                "preshared_key": pre_shared_key,
                "public_key": inst1_public_key,
                ".type": "wireguard_inst2",
                "persistent_keepalive": "10",
                "route_allowed_ips": "1",
                "endpoint_host": "127.0.0.1"
            })

        with self.subTest("check_duplicate_peer_validation"):
            x = self.post_data(self.url + "/inst2/peers/config", {
                "id": "peer2_inst2",
                "public_key": inst1_public_key
            })
            x.assert_error("public_key", "Public key cannot be the same between peers", codes.ResponseCodes.INVALID_OPT.val(), inst1_public_key, "peer2_inst2")
            self.connection_check()
            self.firewall_rename_check(["Allow-wireguard_inst1-traffic", "Allow-wireguard_inst2-traffic"])

            self.put_data(self.url + "/inst2/peers/config/peer_inst1", {
                "allowed_ips": ["0.0.0.0/0"],
            })
            ip_routes = json.loads(self.ssh.send_cmd("ip --json route"))
            for route in ip_routes:
                if route.get("dst") == "default":
                    found = True
            if found == False:
                self.fail("Wireguard handshake failed")
            self.connection_check()

        with self.subTest("delete_section"):
            x = self.delete(self.url + "/config/inst1")
            x.assert_data({
                "id": "inst1"
            })
            x = self.delete(self.url + "/config/inst2")
            x.assert_data({
                "id": "inst2"
            })

        with self.subTest("deletion side effects"):
            # Test if peers were deleted with section
            peer = self.get_section("network", "peer_inst1")
            self.assertEqual(peer, None)
            peer = self.get_section("network", "peer_inst2")
            self.assertEqual(peer, None)

            # Test if firewall zone was deleted with configs
            firewall_zone = self.get_section("firewall", zone)
            self.assertEqual(firewall_zone, None)

    def test_clean_firewall(self):
        id = "tester"
        with firewall_must_be_clean(self):
            self.post_data(self.url + "/config", { "id": id })
            self.put_data(f"{self.url}/config/{id}", { "enabled": "1" })
            self.delete(f"{self.url}/config/{id}")
