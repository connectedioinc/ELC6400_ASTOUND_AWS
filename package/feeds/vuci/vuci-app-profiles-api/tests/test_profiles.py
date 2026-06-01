import sys
import time
import utility_integration as util
from utils.ssh import open_ssh_connection, send_cmd
sys.path.append("../../../../tests")
import re
class test_profiles(util.WrapTest):
    base_url = "/profiles/config"

    def test_profiles_base_functionality(self):
        with open_ssh_connection() as ssh:
                ipv6 = send_cmd(ssh, "uci get network.globals.ula_prefix")
                http_port = send_cmd(ssh, "uci get uhttpd.main.listen_http").strip()
                https_port = send_cmd(ssh, "uci get uhttpd.main.listen_https").strip()
                modified_ipv6 = re.sub(r'/\d+', '1', ipv6).strip()

        with self.subTest("create_profile"):
            x = self.post_data(self.base_url, {
                "id":"testProfile",
                "from_current_profile":"1"
            })
            x.assert_data({
                ".type": "profile",
                "profile_id": "1",
                "id": "testProfile"
            }, 201, {"updated"})
        with self.subTest("get_profiles"):
            x = self.get(self.base_url)
            x.assert_data([
                {
                    ".type": "profile",
                    "profile_id": "0",
                    "id": "default"
                },
                {
                    ".type": "profile",
                    "profile_id": "1",
                    "id": "testProfile"
                }
            ], 200, {"updated"})
        with self.subTest("get_single_profile"):
            x = self.get(self.base_url + "/testProfile")
            x.assert_data({
                ".type": "profile",
                "profile_id": "1",
                "id": "testProfile"
            }, 200, {"updated"})
        with self.subTest("change_profile"):
            x = self.post_data("/profiles/actions/apply_profile", {
                "name":"testProfile"
            })            
            x.assert_data({
                "lan_ipv4":util.Env().ip,
                "http_port": http_port,
                "https_port": https_port,
                'lan_ipv6': modified_ipv6
            })
            util.Env.refresh_token()
        with self.subTest("get_current_profile"):
            x = self.get("/profiles/status")
            x.assert_data({
                "current_profile":"testProfile"
            })
        with self.subTest("return_to_default"):
            x = self.post_data("/profiles/actions/apply_profile", {
                "name":"default"
            })
            resp = x.resp
            attempt_limit = 60
            attempt_count = 0

            while resp.status_code != 200 and attempt_count < attempt_limit:
                util.Env.refresh_token()
                x = self.post_data("/profiles/actions/apply_profile", {
                    "name": "default"
                })
                resp = x.resp
                attempt_count += 1
                time.sleep(1)

            if resp.status_code == 200:
                x.assert_data({
                    "lan_ipv4": util.Env().ip,
                    "http_port": http_port,
                    "https_port": https_port,
                    'lan_ipv6': modified_ipv6
                })
            else:
                self.fail(f"Failed to apply default profile after {attempt_count} attempts: {resp.text}")

            util.Env.refresh_token()
        with self.subTest("delete_testProfile"):
            x = self.delete(self.base_url + "/testProfile")
            x.assert_data({
                "id":"testProfile"
            })
        with self.subTest("try_profiles_put"):
            x = self.put_data(self.base_url + "/default", {
                "test":"test"
            })
            x.assert_error("Request", "PUT not implemented", 100)