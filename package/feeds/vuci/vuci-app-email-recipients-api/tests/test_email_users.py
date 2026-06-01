import sys
import utility_integration as util
from utils.ssh import open_ssh_connection, send_cmd
import response_codes as codes
RC = codes.ResponseCodes

sys.path.append("../../../../tests")


class test_email_users(util.WrapTest):
    def test_email_users_base_functionality(self):
        base_url = "/recipients/email_users/config"
        id = ""
        with self.subTest("create_section"):
            x = self.post_data(base_url, {
                "name": "testEmail",
                "secure_conn": "1",
                "smtp_ip": "8.8.8.8",
                "smtp_port": "25",
                "credentials": "1",
                "username": "test",
                "password": "test",
                "senderemail": "test@test.com",
            })
            x.assert_data({
                ".type": "email",
                "name": "testEmail",
                "secure_conn": "1",
                "smtp_ip": "8.8.8.8",
                "smtp_port": "25",
                "credentials": "1",
                "username": "test",
                "password": "test",
                "senderemail": "test@test.com",
            }, 201, ["id"])
        with self.subTest("find_section"):
            x = self.get(base_url)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "testEmail":
                    found = True
                    id = section["id"]
                if not found:
                    self.fail("Section is not created")
        with self.subTest("configure_section"):
            x = self.put_data(base_url + "/" + id, {
                "secure_conn": "0",
                "smtp_ip": "1.1.1.1",
                "smtp_port": "69",
                "credentials": "1",
                "username": "testTest",
                "password": "testTest",
                "senderemail": "testTest@test.com",
            })
            x.assert_data({
                ".type": "email",
                "id": id,
                "name": "testEmail",
                "secure_conn": "0",
                "smtp_ip": "1.1.1.1",
                "smtp_port": "69",
                "credentials": "1",
                "username": "testTest",
                "password": "testTest",
                "senderemail": "testTest@test.com",
            })
        with self.subTest("configure_section_with_ipv6"):
            x = self.put_data(base_url + "/" + id, {
                "secure_conn": "0",
                "smtp_ip": "111.222.111.222",
                "smtp_port": "69",
                "credentials": "1",
                "username": "testTest",
                "password": "testTest",
                "senderemail": "testTest@test.com",
            })
            x.assert_data({
                ".type": "email",
                "id": id,
                "name": "testEmail",
                "secure_conn": "0",
                "smtp_ip": "111.222.111.222",
                "smtp_port": "69",
                "credentials": "1",
                "username": "testTest",
                "password": "testTest",
                "senderemail": "testTest@test.com",
            })
        with self.subTest("configure_section_with_hostname"):
            x = self.put_data(base_url + "/" + id, {
                "secure_conn": "0",
                "smtp_ip": "smtp.test.com",
                "smtp_port": "69",
                "credentials": "1",
                "username": "testTest",
                "password": "testTest",
                "senderemail": "testTest@test.com",
            })
            x.assert_data({
                ".type": "email",
                "id": id,
                "name": "testEmail",
                "secure_conn": "0",
                "smtp_ip": "smtp.test.com",
                "smtp_port": "69",
                "credentials": "1",
                "username": "testTest",
                "password": "testTest",
                "senderemail": "testTest@test.com",
            })
        with self.subTest("configure_section_with_invalid_ip"):
            x = self.put_data(base_url + "/" + id, {
                "secure_conn": "0",
                "smtp_ip": "123",
                "smtp_port": "69",
                "credentials": "1",
                "username": "testTest",
                "password": "testTest",
                "senderemail": "testTest@test.com",
            })
            x.assert_error("smtp_ip", "Domain names or IP addresses accepted. E.g. 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com.", RC.INVALID_OPT.val())
        with self.subTest("get_section"):
            x = self.get(base_url + "/" + id)
            x.assert_data({
                ".type": "email",
                "name": "testEmail",
                "id": id,
                "secure_conn": "0",
                "smtp_ip": "smtp.test.com",
                "smtp_port": "69",
                "credentials": "1",
                "username": "testTest",
                "password": "testTest",
                "senderemail": "testTest@test.com",
            })
        with self.subTest("get_multiple_sections"):
            x = self.get(base_url)
            x.assert_data([{
                ".type": "email",
                "name": "testEmail",
                "secure_conn": "0",
                "smtp_ip": "smtp.test.com",
                "smtp_port": "69",
                "credentials": "1",
                "username": "testTest",
                "password": "testTest",
                "senderemail": "testTest@test.com",
            }], 200, ["id"])
        with self.subTest("delete_section"):
            x = self.delete(base_url + "/" + id)
            x.assert_data({"id": id})

    def test_email_users_send_email(self):
        base_url = "/recipients/email_users/actions"
        with self.subTest("send_email"):
            with open_ssh_connection(2) as ssh:
                send_cmd(ssh, "sleep 3; killall sendmail &")
                x = self.post_data(base_url + "/send_email", {
                    "smtp_ip": "8.8.8.8",
                    "smtp_port": "420",
                    "senderemail": "test@testEmail.com",
                    "secure_conn": "0"
                })
                x.assert_error(None, "Failed to send an email.",
                            1, None, "send_email")

        with self.subTest("send_email_test_options"):
            x = self.post_data(base_url + "/send_email", {
                "smtp_ip": "8",
                "smtp_port": "420",
                "senderemail": "test@testEmail.com",
                "secure_conn": "0"
            })
            x.assert_error("smtp_ip", "Domain names or IP addresses accepted. E.g. 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com.", RC.INVALID_OPT.val())

        with self.subTest("test_requires_sender"):
            x = self.post_data(base_url + "/send_email", {
                "smtp_ip": "1.1.1.1",
                "smtp_port": "420",
                "secure_conn": "0"
            })
            x.assert_error("senderemail", "Missing required option: senderemail", RC.INVALID_OPT.val())
        
        with self.subTest("test_requires_secure_conn"):
            x = self.post_data(base_url + "/send_email", {
                "smtp_ip": "1.1.1.1",
                "smtp_port": "420",
                "senderemail": "test@testEmail.com",
            })
            x.assert_error("secure_conn", "Missing required option: secure_conn", RC.INVALID_OPT.val())
