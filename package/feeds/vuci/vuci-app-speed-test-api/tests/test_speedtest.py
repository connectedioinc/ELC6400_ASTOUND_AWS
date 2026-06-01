import sys
import utility_integration as util
import response_codes as codes
from utils.ssh import open_ssh_connection, send_cmd
from time import sleep
sys.path.append("../../../../tests")
Env = util.Env
http = Env.http

class speedtest(util.WrapTest):

    base_url = "/speedtest"
    internet_connection = False

    def test_check_internet_connection(self):
        with open_ssh_connection() as ssh:
            res = send_cmd(ssh, "ping -c 1 1.1.1.1 &> /dev/null ; echo $?")
            self.internet_connection = res.strip() == "0"
            exists = send_cmd(ssh, "test -e /tmp/speedtest.json && echo 1 || echo 0")
            if exists.strip() == "1":
                send_cmd(ssh, "rm /tmp/speedtest.json")

    def test_speedtest(self):
        self.test_check_internet_connection()
        if self.internet_connection:
            with self.subTest("get_server_list"):
                x = self.get(self.base_url + "/options")
                x.assert_code(200)
            with self.subTest("get_ip"):
                x = self.post_data(self.base_url + "/actions/get_ip", {
                    "url":"www.google.com"
                })
                x.assert_code(200)
            with self.subTest("check_server_list_ip_resolved"):
                x = self.get(self.base_url + "/options")
                x = x.resp.json()
                self.assertIn("ip", x["data"][0])
            with self.subTest("refresh_servers_list"):
                x = self.post(self.base_url + "/actions/refresh")
                x.assert_code(200)
            with self.subTest("start_speedtest"):
                x = self.post(self.base_url + "/actions/start")
                x.assert_data({
                    "response":"Speed test started."
                })
            with self.subTest("get_results"):
                sleep(0.5)
                skippable_options = ["isp", "external_ip", "wan_ip"]
                x = self.get(self.base_url + "/status")
                x.assert_data({
                    "state":"FINDING_SERVER",
                    "wan_name": "WAN",
                }, 200, skippable_options)
        else:
            with self.subTest("get_status"):
                x = self.get(self.base_url + "/status")
                x.assert_data("Speedtest", 200, "NOT_RUNNING")

            with self.subTest("get_server_list"):
                x = self.get(self.base_url + "/options")
                x.assert_error("Speedtest", "Failed to get server list.", 1)
            with self.subTest("start_speedtest"):
                x = self.post(self.base_url + "/actions/start")
                x.assert_data({
                    "response":"Speed test started."
                })
            with self.subTest("get_status_updated"):
                sleep(0.5)
                x = self.get(self.base_url + "/status")
                x.assert_data({
                    "state": "CHECKING_CONNECTION",
                    "avgUploadSpeed":"0",
                    "downloaded":"0",
                    "avgDownloadSpeed":"0",
                    "uploaded":"0",
                    "wan_name": "-",
                    "wan_ip": "-"

                })
            with self.subTest("remove_speedtest_file"):
                with open_ssh_connection() as ssh:
                    send_cmd(ssh, "rm /tmp/speedtest.json")
            with self.subTest("refresh_server_list"):
                x = self.post(self.base_url + "/actions/refresh")
                x.assert_error("Speedtest", "Failed to refresh server list.", 1)
            with self.subTest("get_ip_no_url"):
                x = self.post(self.base_url + "/actions/get_ip")
                x.assert_error("Speedtest", "url field is missing.", 4)
            with self.subTest("get_ip"):
                x = self.post_data(self.base_url + "/actions/get_ip", {
                    "url":"www.google.com"
                })
                x.assert_error("Speedtest", "Failed to resolve ip address.", 3)