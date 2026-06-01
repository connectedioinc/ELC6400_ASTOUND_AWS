import sys
import utility_integration as util
from utils.ssh import get_ssh
import response_codes as codes

RC = codes.ResponseCodes
sys.path.append("../../../../tests")


class troubleshoot_diagnostics(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def test_troubleshoot_diagnostics_base_functionality(self):
        base_url = "/diagnostics"
        internet_connection = False
        with self.subTest("check_internet_connection"):
            res = self.ssh.send_cmd("ping -c 1 1.1.1.1 &> /dev/null ; echo $?")
            internet_connection = res.strip() == "0"
        if internet_connection:
            with self.subTest("ping"):
                x = self.post_data(base_url + "/actions/ping", {
                    "host": "8.8.8.8",
                    "proto": "ipv4"
                })
                x.assert_code(200)
            with self.subTest("traceroute"):
                x = self.post_data(base_url + "/actions/traceroute", {
                    "host": "8.8.8.8",
                    "proto": "ipv4"
                })
                x.assert_code(200)
            with self.subTest("nslookup"):
                x = self.post_data(base_url + "/actions/nslookup", {
                    "host": "8.8.8.8"
                })
                x.assert_code(200)
        else:
            with self.subTest("ping_no_connection"):
                x = self.post_data(base_url + "/actions/ping", {
                    "host": "8.8.8.8",
                    "proto": "ipv4"
                })
                x.assert_data({
                    "response": "PING 8.8.8.8 (8.8.8.8): 56 data bytes\nping: sendto: Network is unreachable\n"
                })
            with self.subTest("traceroute_no_connection"):
                x = self.post_data(base_url + "/actions/traceroute", {
                    "host": "8.8.8.8",
                    "proto": "ipv4"
                })
                x.assert_data({
                    "response": "traceroute: can't connect to remote host (8.8.8.8): Network is unreachable\n"
                })
            with self.subTest("nslookup_no_connection"):
                x = self.post_data(base_url + "/actions/nslookup", {
                    "host": "8.8.8.8",
                })
                x.assert_data({
                    "response": ";; connection timed out; no servers could be reached\n\n"
                })
        with self.subTest("ping_proto_validation"):
            x = self.post_data(base_url + "/actions/ping", {
                "host": "1.1.1.1",
                "proto": "invalid"
            })
            expected = [
                {
                    "source": "proto",
                    "code": RC.INVALID_OPT.val(),
                    "value": "invalid",
                    "error": "Must be one of the following values [ipv4, ipv6].",
                    "section": "ping"
                }
            ]
            self.assertListEqual(x.resp.json().get("errors", []), expected)
        with self.subTest("traceroute_proto_validation"):
            x = self.post_data(base_url + "/actions/traceroute", {
                "host": "1.1.1.1",
                "proto": "invalid"
            })
            expected = [
                {
                    "source": "proto",
                    "code": RC.INVALID_OPT.val(),
                    "value": "invalid",
                    "error": "Must be one of the following values [ipv4, ipv6].",
                    "section": "traceroute"
                }
            ]
            self.assertListEqual(x.resp.json().get("errors", []), expected)
        with self.subTest("ping_host_validation"):
            x = self.post_data(base_url + "/actions/ping", {
                "host": "-1.-1",
                "proto": "ipv4"
            })
            expected = [
                {
                    "source": "host",
                    "code": RC.INVALID_OPT.val(),
                    "value": "-1.-1",
                    "error": "Domain names or IPv4 addresses accepted. E.g. 192.168.1.1 or example.com .",
                    "section": "ping"
                }
            ]
            self.assertListEqual(x.resp.json().get("errors", []), expected)
        with self.subTest("traceroute_host_validation"):
            x = self.post_data(base_url + "/actions/traceroute", {
                "host": "-1.-1",
                "proto": "ipv4"
            })
            expected = [
                {
                    "source": "host",
                    "code": RC.INVALID_OPT.val(),
                    "value": "-1.-1",
                    "error": "Domain names or IPv4 addresses accepted. E.g. 192.168.1.1 or example.com .",
                    "section": "traceroute"
                }
            ]
            self.assertListEqual(x.resp.json().get("errors", []), expected)
        with self.subTest("ping_validation"):
            x = self.post_data(base_url + "/actions/ping", {
                "host": "-1.-1",
                "proto": "invalid"
            })
            expected = [
                {
                    "source": "host",
                    "code": RC.INVALID_OPT.val(),
                    "value": "-1.-1",
                    "error": "Domain names or IP addresses accepted. E.g. 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com.",
                    "section": "ping"
                },
                {
                    "source": "proto",
                    "code": RC.INVALID_OPT.val(),
                    "value": "invalid",
                    "error": "Must be one of the following values [ipv4, ipv6].",
                    "section": "ping"
                }
            ]
            self.assertListEqual(x.resp.json().get("errors", []), expected)
        with self.subTest("traceroute_validation"):
            x = self.post_data(base_url + "/actions/traceroute", {
                "host": "-1.-1",
                "proto": "invalid"
            })
            expected = [
                {
                    "source": "host",
                    "code": RC.INVALID_OPT.val(),
                    "value": "-1.-1",
                    "error": "Domain names or IP addresses accepted. E.g. 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com.",
                    "section": "traceroute"
                },
                {
                    "source": "proto",
                    "code": RC.INVALID_OPT.val(),
                    "value": "invalid",
                    "error": "Must be one of the following values [ipv4, ipv6].",
                    "section": "traceroute"
                }
            ]
            self.assertListEqual(x.resp.json().get("errors", []), expected)
        with self.subTest("nslookup_host_validation"):
            x = self.post_data(base_url + "/actions/nslookup", {
                "host": "-1.-1"
            })
            x.assert_error(
                "host", "Domain names or IP addresses accepted. E.g. 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com.", RC.INVALID_OPT.val())
