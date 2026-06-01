from utils.general_api import is_package_installed
import utility_integration as util
import sys
sys.path.append("../../../../tests")

class test_https_dns_proxy_global(util.WrapTest):
    url = "/dns/https_proxy/config"
    default_data = [
        {
            "bootstrap_dns": [
                "1.0.0.1",
                "1.1.1.1"
            ],
            ".type": "https-dns-proxy",
            "resolver_url": "https://cloudflare-dns.com/dns-query",
            "id": "1",
            "priority": "1"
        },
        {
            "bootstrap_dns": [
                "8.8.4.4",
                "8.8.8.8"
            ],
            ".type": "https-dns-proxy",
            "resolver_url": "https://dns.google/dns-query",
            "id": "2",
            "priority": "2"
        }
    ]

    def setUp(self):
        if not is_package_installed(self, "https-dns-proxy"):
            self.skipTest("HTTPS DNS Proxy package is not installed")

    def test_https_dns_proxy_functionality(self):
        with self.subTest("get_configuration"):
            x = self.get(self.url)
            x.assert_data(self.default_data)
        with self.subTest("basic_crud"):
            self.crud_test(self.url, {
                "bootstrap_dns": [
                    "1.1.1.1",
                    "1.0.0.1"
                ],
                ".type": "https-dns-proxy",
                "resolver_url": "https://cloudflare-dns.com/dns-query",
                "priority": "3"
            },
            {
                "bootstrap_dns": [
                    "1.1.1.1",
                    "1.0.0.1"
                ],
                ".type": "https-dns-proxy",
                "resolver_url": "https://cloudflare-dns.com/dns-query",
                "priority": "3"
            })