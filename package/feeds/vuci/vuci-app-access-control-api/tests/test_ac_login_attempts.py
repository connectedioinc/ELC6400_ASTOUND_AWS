import response_codes as codes
import utility_integration as util
import sys
from utils.ssh import open_ssh_connection, send_cmd
import time

RC = codes.ResponseCodes

sys.path.append("../../../../tests")


class test_access_control_login_attempts(util.WrapTest):
    def test_access_control_login_attempts_actions(self):
        base_url = "/access_control/security/attempts"
        env = util.Env
        id = ""
        with self.subTest("get_login_attempts"):
            with open_ssh_connection() as ssh:
                send_cmd(
                    ssh, "ubus call ip_block push '{\"ip\":\"8.8.8.8\",\"destination_ip\":\"" + env.ip + "\",\"port\":\"22\"}'")
                send_cmd(
                    ssh, "ubus call ip_block push '{\"ip\":\"5.5.5.5\",\"destination_ip\":\"" + env.ip + "\",\"port\":\"22\"}'")
            time.sleep(0.5)

            x = self.get(base_url + "/config")
            for section in x.resp.json()["data"]:
                id = section["id"]
                break
            x.assert_data([
                {
                    ".type": "entry",
                    "port": "22",
                    "counter": "1",
                    "destination_ip": env.ip,
                    "iteration_count": "0",
                    "ip": "5.5.5.5",
                    "proto": "SSH"
                },
                {
                    ".type": "entry",
                    "port": "22",
                    "counter": "1",
                    "destination_ip": env.ip,
                    "iteration_count": "0",
                    "ip": "8.8.8.8",
                    "proto": "SSH"
                }], 200, ["id"])
        with self.subTest("get_single"):
            x = self.get(base_url + "/config/" + id)
            x.assert_data({
                ".type": "entry",
                "port": "22",
                "counter": "1",
                "destination_ip": env.ip,
                "iteration_count": "0",
                "ip": "5.5.5.5",
                "proto": "SSH",
                "id": id
            })
        with self.subTest("unblock_one"):
            x = self.delete(base_url + "/config/" + id)
            x.assert_data({
                "id": id
            })
        with self.subTest("unblock_all"):
            x = self.post(base_url + "/actions/unblock_all", {})
            x.assert_code(200)
        with self.subTest("multiple_get"):
            x = self.get(base_url + "/config")
            x.assert_data([])

    def test_access_control_login_attempts_delete_validations(self):
        base_url = "/access_control/security/attempts"
        with self.subTest("delete_no_section"):
            x = self.delete(base_url + "/config")
            x.assert_error("Validation", "Deletion of whole configuration is not allowed", RC.CONF_DEL_DISALLOWED.val())
        with self.subTest("delete_empty_data"):
            x = self.delete_data(base_url + "/config", {})
            x.assert_error("Validation", "Invalid data structure, only an array is acceptable", RC.INVALID_STRUCT.val())
        with self.subTest("delete_invalid_data"):
            x = self.delete_data(base_url + "/config", {"id": "test"})
            x.assert_error("Validation", "Invalid data structure, only an array is acceptable", RC.INVALID_STRUCT.val())
        with self.subTest("delete_invalid_sid"):
            x = self.delete_data(base_url + "/config", ["test"])
            x.assert_error("UCI", "Section: test for service does not exist", RC.INVALID_SECTION.val())
        with self.subTest("delete_section_invalid_sid"):
            x = self.delete(base_url + "/config/test")
            x.assert_error("UCI", "Section: test for service does not exist", RC.INVALID_SECTION.val())
