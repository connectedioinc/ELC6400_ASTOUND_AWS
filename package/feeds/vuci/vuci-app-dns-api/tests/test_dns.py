import utility_integration as util
import sys
sys.path.append("../../../../tests")


class test_dns(util.WrapTest):

    def test_dns_base_functionality(self):
        base_url = "/dns/config"
        with self.subTest("multiple_dns_get"):
            x = self.get(base_url)
            x.assert_data([{
                ".type": "dnsmasq",
                "id": "general",
                "rebind_protection": "1",
                "localise_queries": "1",
                "strictorder": "0",
                "boguspriv": "1",
                "address": [],
                "server": []
            }])
        with self.subTest("single_dns_get"):
            x = self.get(base_url + "/general")
            x.assert_data({
                ".type": "dnsmasq",
                "id": "general",
                "rebind_protection": "1",
                "localise_queries": "1",
                "strictorder": "0",
                "boguspriv": "1",
                "address": [],
                "server": []
            })
        with self.subTest("configure_single_dns_section"):
            x = self.put_data(base_url + "/general", {
                "logqueries": "1",
                "localservice": "1",
                "server": [
                    "/example.com/1.1.1.1",
                    "/example2.com/#",
                    "/*.ru/",
                    "/ru/"
                ],
                "address": [
                    "/example.com/1.1.1.1",
                    "/#/2.2.2.2",
                    "/example2.com/#",
                    "/#/#"
                ],
                "interface": ["lan"],
                "rebind_protection": "1",
                "boguspriv": "1",
                "localise_queries": "1",
                "notinterface": ["lan"],
                "cachesize": "0"
            })
            x.assert_data({
                "cachesize": "0",
                "logqueries": "1",
                "notinterface": [
                    "lan"
                ],
                "id": "general",
                "rebind_protection": "1",
                "boguspriv": "1",
                "localise_queries": "1",
                ".type": "dnsmasq",
                "strictorder": "0",
                "localservice": "1",
                "interface": [
                    "lan"
                ],
                "server": [
                    "/example.com/1.1.1.1",
                    "/example2.com/#",
                    "/*.ru/",
                    "/ru/"
                ],
                "address": [
                    "/example.com/1.1.1.1",
                    "/#/2.2.2.2",
                    "/example2.com/#",
                    "/#/#"
                ],
            })
        with self.subTest("check_configured_dns_section"):
            x = self.get(base_url + "/general")
            x.assert_data({
                "cachesize": "0",
                "logqueries": "1",
                "notinterface": [
                    "lan"
                ],
                "id": "general",
                "rebind_protection": "1",
                "boguspriv": "1",
                "localise_queries": "1",
                ".type": "dnsmasq",
                "localservice": "1",
                "interface": [
                    "lan"
                ],
                "server": [
                    "/example.com/1.1.1.1",
                    "/example2.com/#",
                    "/*.ru/",
                    "/ru/"
                ],
                "address": [
                    "/example.com/1.1.1.1",
                    "/#/2.2.2.2",
                    "/example2.com/#",
                    "/#/#"
                ],
                "strictorder": "0"
            })
        with self.subTest("try_invalid_servers"):
            invalid_servers = ["/**.ru/", "/.ru/", "/.*ru/", "/ru*/1.1.1.1"]
            for s in invalid_servers:
                x = self.put_data(base_url + "/general", {
                    "server": [s]
                })
                x.assert_error("server at index 1", "Domain names or IP addresses are accepted. E.g. /example.com or 192.168.1.1. Wildcard symbol (*) at the start can also be used for domain. E.g. *.example.com.", 103, None, None)
        with self.subTest("clear_dns_configuration"):
            x = self.put_data(base_url + "/general", {
                "logqueries": "",
                "localservice": "",
                "server": [],
                "address": [],
                "interface": [""],
                "notinterface": [""],
                "cachesize": "",
                "rebind_protection": "1",
                "localise_queries": "1",
                "boguspriv": "1",
                "strictorder": "0"
            })
            x.assert_data({
                "id": "general",
                ".type": "dnsmasq",
                "rebind_protection": "1",
                "localise_queries": "1",
                "boguspriv": "1",
                "address": [],
                "server": [],
                "strictorder": "0"
            })

    def test_dns_deletion(self):
        x = self.delete("/dns/config")
        x.assert_error(
            "Validation", "Section deletion is not allowed", 111, None, None)

    def test_dns_creation(self):
        x = self.post_data("/dns/config", {})
        x.assert_error(
            "Validation", "Section creation is not allowed", 108, None, None)
