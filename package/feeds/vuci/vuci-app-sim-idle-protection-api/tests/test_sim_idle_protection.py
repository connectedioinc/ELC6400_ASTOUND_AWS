import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest
from utils.general_api import is_package_installed
from response_codes import ResponseCodes as RC

class SIMIdleProtection(WrapTest):
    base_url = "/sim_idle_protection/config"

    def setUp(self):
        if not is_package_installed(self, "sim_idle_protection"):
            self.skipTest("Sim idle protection package is not installed")

    def get_all_data(self):
        """
            Gets all data for sim idle protection module

            Returns:
                All sim idle protection configuration data
        """
        x = self.get(self.base_url)
        x.assert_code(200)
        return x.resp.json()["data"]

    def test_GET(self):
        """
            Tests GET on sim idle protection
        """
        self.assertEqual(len(self.get_all_data()) > 0, True)
    
    def put_assert(self, url, option, value, error, code):
        """
            Wrapper to shorten error assertion

            Args:
                url: Url to send request to
                option: Option to be asserted with error
                value: Wrong value to be asserted with error
                error: Error to be asserted with response
                code: Error code to be asserted with response
        """
        self.put_data(url, {
            option: value
        }).assert_error(option, error, code, value)

    def test_PUT(self):
        """
            Tests PUT on sim idle protection
        """
        data = self.get_all_data()[0]
        url = self.base_url + "/" + data["id"]

        with self.subTest("Try to update read only values"):
            for k, v in {"modem": "3-1", "position": "1"}.items():
                self.put_assert(url, k, v, "Option is readonly", RC.INVALID_OPT.val())

        with self.subTest("Try to set float for integer values"):
            self.put_assert(url, "day", "1.5", "Value must be an integer and range of the value must be from 1 to 31.", RC.INVALID_OPT.val())
            self.put_assert(url, "weekday", "1.5", "Value must be an integer and range of the value must be from 0 to 6.", RC.INVALID_OPT.val())
            self.put_assert(url, "packet_size", "1.5", "Value must be an integer and range of the value must be from 1 to 1000.", RC.INVALID_OPT.val())
            self.put_assert(url, "count", "1.5", "Value must be an integer and range of the value must be from 1 to 30.", RC.INVALID_OPT.val())

        with self.subTest("Try to set something else to ip_type"):
            self.put_assert(url, "ip_type", "1.5", "Must be one of the following values [ipv4, ipv6].", RC.INVALID_OPT.val())
        
        with self.subTest("Try to set ipv4 host with ipv6 ip_type"):
            x = self.put_data(url, {"ip_type": "ipv6", "host": "192.168.1.1"})
            x.assert_error("host", "Domain names or IPv6 addresses accepted. E.g. ::0000:8a2e:0370:7334 or example.com .", RC.INVALID_OPT.val(), "192.168.1.1", data["id"])

        with self.subTest("Try to set ipv6 host with ipv4 ip_type"):
            x = self.put_data(url, {"ip_type": "ipv4", "host": "::0000:8a2e:0370:7334"})
            x.assert_error("host", "Domain names or IPv4 addresses accepted. E.g. 192.168.1.1 or example.com .", RC.INVALID_OPT.val(), "::0000:8a2e:0370:7334", data["id"])