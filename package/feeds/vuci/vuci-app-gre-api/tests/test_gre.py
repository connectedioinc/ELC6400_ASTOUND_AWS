import sys
from time import sleep

sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes
from utils.vpn import firewall_must_be_clean
from utils.ssh import get_ssh
import json


class GRE(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    gre_url = "/gre/config"
    lan_url = "/interfaces/config"

    lan_settings = {
        "ifname": ["eth0"],
        "keepalive_interval": "1",
        "fwzone": "lan",
        "bridge": "0",
        "defaultroute": "1",
        "metric": "0",
        "delegate": "1",
        "force_link": "1",
        "enabled": "1",
        "proto": "static",
        ".type": "interface",
        "id": "lan",
        "name": "lan",
        "ipaddr": "192.168.33.1",
        "netmask": "255.255.255.0",
        "area_type": "lan",
        "keepalive_failure": "5",
    }

    lan1_settings = {
        "ifname": ["eth0.101"],
        "keepalive_interval": "1",
        "fwzone": "lan",
        "bridge": "0",
        "defaultroute": "1",
        "metric": "0",
        "delegate": "1",
        "force_link": "1",
        "enabled": "1",
        "proto": "static",
        ".type": "interface",
        "id": "lan1",
        "name": "lan1",
        "ipaddr": "192.168.101.1",
        "netmask": "255.255.255.0",
        "ip6addr": "fd11:dead:beef::1/64",
        "area_type": "lan",
        "keepalive_failure": "5",
    }
    lan2_settings = {
        "ifname": ["eth0.102"],
        "keepalive_interval": "1",
        "fwzone": "lan",
        "bridge": "0",
        "defaultroute": "1",
        "metric": "0",
        "delegate": "1",
        "force_link": "1",
        "enabled": "1",
        "proto": "static",
        ".type": "interface",
        "id": "lan2",
        "name": "lan2",
        "ipaddr": "192.168.102.1",
        "netmask": "255.255.255.0",
        "ip6addr": "fd12:dead:beef::1/64",
        "area_type": "lan",
        "keepalive_failure": "5",
    }

    def test_clean_firewall(self):
        id = "tester"
        with firewall_must_be_clean(self):
            self.post_data(self.gre_url, {"id": id})
            self.put_data(f"{self.gre_url}/{id}", {"enabled": "1"})
            self.delete(f"{self.gre_url}/{id}")

    def create_instance(self, type, family="ipv4"):
        id = "gre1"
        ipaddr_tunlink = "192.168.101.1"
        peeraddr = "192.168.102.1"
        proto = "gre"
        if family == "ipv6":
            ipaddr_tunlink = "lan1"
            peeraddr = "fd12:dead:beef::1"
            proto = "grev6"
        tun_ipaddr = "172.16.0.1"
        route_id = "1"
        if type == "gre2":
            id = "gre2"
            ipaddr_tunlink = "192.168.102.1"
            peeraddr = "192.168.101.1"
            proto = "gre"
            if family == "ipv6":
                ipaddr_tunlink = "lan2"
                peeraddr = "fd11:dead:beef::1"
                proto = "grev6"
            tun_ipaddr = "172.16.0.2"
            route_id = "2"

        gre_routes_url = "/gre/" + id + "/routes/config"
        url_put = self.gre_url + "/" + id
        self.delete(f"{self.gre_url}/{id}")
        # first GRE
        x = self.post_data(self.gre_url, {"id": id})
        template = x.json["data"]
        ## enabled
        x = self.put_data(url_put, {"enabled": "1"})
        template.update({"enabled": "1"})
        ## ipaddr_tunlink
        x = self.put_data(url_put, {"ipaddr_tunlink": "aaaaaaaaaaaaaaaaa"})
        x.assert_error(
            "ipaddr_tunlink",
            "IPv4 and IPv6 addresses are accepted. E.g. 192.168.1.1. or Provided value is too long. Is 17 characters, but can be up to 16 characters",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"ipaddr_tunlink": ipaddr_tunlink})
        template.update({"ipaddr_tunlink": ipaddr_tunlink})
        ## proto
        x = self.put_data(url_put, {"proto": "otorp"})
        x.assert_error(
            "proto",
            "Must be one of the following values [gre, grev6].",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"proto": proto})
        template.update({"proto": proto})
        ## peeraddr
        x = self.put_data(url_put, {"peeraddr": "::1"})
        x = self.put_data(url_put, {"peeraddr": "fd00:dead:beef::1"})
        x = self.put_data(url_put, {"peeraddr": "::0/128"})
        error = "Domain names or IPv4 addresses accepted. E.g. 192.168.1.1 or example.com ."
        if family == "ipv6":
            error = "Domain names or IPv6 addresses accepted. E.g. ::0000:8a2e:0370:7334 or example.com ."
        x.assert_error(
            "peeraddr",
            error,
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"peeraddr": peeraddr + "/32"})
        x.assert_error(
            "peeraddr",
            error,
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"peeraddr": "example.com"})
        x = self.put_data(url_put, {"peeraddr": peeraddr})
        template.update({"peeraddr": peeraddr})
        ## mtu
        x = self.put_data(url_put, {"mtu": "100000"})
        x.assert_error(
            "mtu",
            "Value must be an integer and range of the value must be from 68 to 9200.",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"mtu": "9200"})
        x = self.put_data(url_put, {"mtu": "68"})
        x = self.put_data(url_put, {"mtu": "1500"})
        template.update({"mtu": "1500"})
        ## ikey
        x = self.put_data(url_put, {"ikey": "4294967296"})
        x.assert_error(
            "ikey",
            "Value must be an integer and range of the value must be from 0 to 4294967295.",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"ikey": "4294967295"})
        x = self.put_data(url_put, {"ikey": "1111"})
        template.update({"ikey": "1111"})
        ## okey
        x = self.put_data(url_put, {"okey": "4294967296"})
        x.assert_error(
            "okey",
            "Value must be an integer and range of the value must be from 0 to 4294967295.",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"okey": "4294967295"})
        x = self.put_data(url_put, {"okey": "1111"})
        template.update({"okey": "1111"})
        ## df and ttl
        x = self.put_data(url_put, {"df": "1"})
        x = self.put_data(url_put, {"ttl": "255"})
        ### should not be able to set ttl value with DF
        x = self.put_data(url_put, {"ttl": "256"})
        x.assert_error(
            "ttl", "Range of the value must be from 0 to 255", 103, None, None
        )
        x = self.put_data(url_put, {"df": "0"})
        x = self.put_data(url_put, {"ttl": "64"})

        template.update({"ttl": "64"})
        template.update({"df": "0"})
        ## keepalive
        x = self.put_data(url_put, {"keep_alive": "1"})
        template.update({"keep_alive": "1"})
        x = self.put_data(url_put, {"keep_alive_interval": "256"})
        x = self.put_data(url_put, {"keep_alive_interval": "10"})
        template.update({"keep_alive_interval": "10"})
        x = self.put_data(url_put, {"keep_alive_retries": "256"})
        x = self.put_data(url_put, {"keep_alive_retries": "10"})
        template.update({"keep_alive_retries": "10"})
        ## GRE interface IPs
        x = self.put_data(url_put, {"tun_ipaddr": "fd00:dead:beef::1"})
        x.assert_error(
            "tun_ipaddr",
            "IPv4 addresses are accepted. E.g. 192.168.1.1 .",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"tun_ipaddr": tun_ipaddr})
        template.update({"tun_ipaddr": tun_ipaddr})
        x = self.put_data(url_put, {"tun_netmask": "255.255.255.256"})
        x.assert_error(
            "tun_netmask",
            "IPv4 netmasks are accepted. E.g. 255.255.255.0 .",
            103,
            None,
            None,
        )
        x = self.put_data(url_put, {"tun_netmask": "255.255.255.255"})
        template.update({"tun_netmask": "255.255.255.255"})

        ## GRE routes
        x = self.post_data(gre_routes_url, {"id": route_id})
        template_routes = x.json["data"]
        gre_routes_url_put = "/gre/" + id + "/routes/config/" + route_id
        x = self.put_data(gre_routes_url_put, {"target": "fd00:dead:beef::1/64"})

        x = self.put_data(gre_routes_url_put, {"target": tun_ipaddr + "/32"})
        x.assert_error(
            "target", "IPv4 addresses are accepted. E.g. 192.168.1.1 .", 103, None, None
        )
        x = self.put_data(gre_routes_url_put, {"target": tun_ipaddr})
        template_routes.update({"target": tun_ipaddr})

        x = self.put_data(gre_routes_url_put, {"netmask": "256.256.256.256"})
        x.assert_error(
            "netmask",
            "IPv4 netmasks are accepted. E.g. 255.255.255.0 .",
            103,
            None,
            None,
        )
        x = self.put_data(gre_routes_url_put, {"netmask": "255.255.255.255"})
        template_routes.update({"netmask": "255.255.255.255"})
        return template, template_routes

    def check_ping(self, family="ipv4"):
        sleep(10)
        self.ssh.send_cmd('logger -t "GRE_test" "Checking ping"')
        if family == "ipv4":
            self.ssh.send_cmd("sh -c 'ping -c 5 172.16.0.2 -I gre4-gre1 -W 1'")
            self.ssh.send_cmd("sh -c 'ping -c 5 172.16.0.1 -I gre4-gre2 -W 1'")
        else:
            self.ssh.send_cmd("sh -c 'ping -c 5 172.16.0.2 -I gre6-gre1 -W 1'")
            self.ssh.send_cmd("sh -c 'ping -c 5 172.16.0.1 -I gre6-gre2 -W 1'")
        if family == "ipv4":
            stats_gre1 = json.loads(
                self.ssh.send_cmd("sh -c 'ip -s --json link show dev gre4-gre1'")
            )[0]["stats64"]["rx"]["bytes"]
            stats_gre2 = json.loads(
                self.ssh.send_cmd("sh -c 'ip -s --json link show dev gre4-gre2'")
            )[0]["stats64"]["rx"]["bytes"]
            self.assertIn("420", str(stats_gre1))
            self.assertIn("420", str(stats_gre2))
        else:
            stats_gre1 = json.loads(
                self.ssh.send_cmd("sh -c 'ip -s --json link show dev gre6-gre1'")
            )[0]["stats64"]["rx"]["bytes"]
            stats_gre2 = json.loads(
                self.ssh.send_cmd("sh -c 'ip -s --json link show dev gre6-gre2'")
            )[0]["stats64"]["rx"]["bytes"]

    def test_main(self):
        with self.subTest("create_lans"):
            self.ssh.send_cmd('logger -t "GRE_test" "Creating LANS"')
            self.post_data(self.lan_url, self.lan_settings)
            self.ssh.send_cmd("uci rename network.lan1='lan'")
            self.ssh.send_cmd("uci commit network")
            self.post_data(self.lan_url, self.lan1_settings)
            self.post_data(self.lan_url, self.lan2_settings)

        with self.subTest("create_instance"):
            self.ssh.send_cmd('logger -t "GRE_test" "Creating instances using PUT"')
            template_gre1, routes_gre1 = self.create_instance("gre1")
            template_gre2, routes_gre2 = self.create_instance("gre2")

        with self.subTest("check_ping_put_ipv4"):
            self.check_ping()

        self.delete(f"{self.gre_url}/gre1")
        self.delete(f"{self.gre_url}/gre2")

        with self.subTest("post"):
            self.ssh.send_cmd('logger -t "GRE_test" "Creating instances using POST"')
            self.post_data(self.gre_url, template_gre1)
            self.post_data(self.gre_url, template_gre2)

        with self.subTest("check_ping_post_ipv4"):
            self.check_ping()

        self.delete(f"{self.gre_url}/gre1")
        self.delete(f"{self.gre_url}/gre2")

        with self.subTest("create_instance_ipv6"):
            self.ssh.send_cmd('logger -t "GRE_test" "Creating IPv6 instances using PUT"')
            template_gre1, routes_gre1 = self.create_instance("gre1", family="ipv6")
            template_gre2, routes_gre2 = self.create_instance("gre2", family="ipv6")

        self.delete(f"{self.gre_url}/gre1")
        self.delete(f"{self.gre_url}/gre2")

        with self.subTest("post"):
            self.ssh.send_cmd('logger -t "GRE_test" "Creating instances using POST"')
            self.post_data(self.gre_url, template_gre1)
            self.post_data(self.gre_url, template_gre2)

        self.delete(f"{self.lan_url}/lan1")
        self.delete(f"{self.lan_url}/lan2")
        self.delete(f"{self.gre_url}/gre1")
        self.delete(f"{self.gre_url}/gre2")
