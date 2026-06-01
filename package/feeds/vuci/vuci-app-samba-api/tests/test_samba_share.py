import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
import response_codes as codes
from utils.general_api import is_package_installed
from utils.ssh import get_ssh

RC = codes.ResponseCodes

class test_samba_share(WrapTest):
    ERR_CODES = {
        "NOT_DIR": 1,
        "PATH_NOT_EXIST": 2
    }
    base_url = "/samba/shares/config"
    users_url = "/samba/users/config"

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def setUp(self):
        if not is_package_installed(self, "samba"):
            self.skipTest("Samba package is not installed")

    def create_share(self):
        resp = self.post_data(self.base_url, {
            ".type": "sambashare",
            "name": "SambaTest",
            "path": "/root/"
        })
        resp.assert_code(201)
        return resp.json["data"]["id"]

    def delete_share(self, id: str):
        resp = self.delete(f"{self.base_url}/{id}")
        resp.assert_code(200)

    def test_share_base_functionality(self):
        id = None
        with self.subTest("basic_crud"):
            self.crud_test(self.base_url, {
                ".type": "sambashare",
                "name": "SambaTest",
                "path": "/root/",
                "browseable": "1",
                "guest_ok": "0",
                "read_only": "0",
            },
            {
                ".type": "sambashare",
                "name": "test",
                "path": "/",
                "read_only": "1",
                "browseable": "0",
                "guest_ok": "1",
            })
        with self.subTest("create_share"):
            id = self.create_share()
        with self.subTest("duplicate_name"):
            x = self.post_data(self.base_url, {
                ".type": "sambashare",
                "name": "SambaTest",
                "path": "/root",
            })
            x.assert_error("name", "Name is already in use.", RC.INVALID_OPT.val())
        with self.subTest("check_yes_setter"):
            x = self.put_data(self.base_url + "/" + id, {
                "read_only": "1",
                "browseable": "1",
                "guest_ok": "1"
            })
            x.assert_code(200)

            self.assertTrue(self.ssh.send_cmd("uci get samba.@sambashare[-1].read_only").strip() == "yes")
            self.assertTrue(self.ssh.send_cmd("uci get samba.@sambashare[-1].browseable").strip() == "yes")
            self.assertTrue(self.ssh.send_cmd("uci get samba.@sambashare[-1].guest_ok").strip() == "yes")
        with self.subTest("check_no_setter"):
            x = self.put_data(self.base_url + "/" + id, {
                "read_only": "0",
                "browseable": "0",
                "guest_ok": "0"
            })
            x.assert_code(200)

            self.assertTrue(self.ssh.send_cmd("uci get samba.@sambashare[-1].read_only").strip() == "no")
            self.assertTrue(self.ssh.send_cmd("uci get samba.@sambashare[-1].browseable").strip() == "no")
            self.assertTrue(self.ssh.send_cmd("uci get samba.@sambashare[-1].guest_ok").strip() == "no")
        with self.subTest("delete_share"):
            self.delete_share(id)

    def test_share_path(self):
        with self.subTest("path_does_not_exist"):
            x = self.post_data(self.base_url, {
                ".type": "sambashare",
                "name": "SambaTest",
                "path": "/root/samba/test",
            })
            x.assert_error("path: /root/samba/test", "Provided path do not exist in the device.", self.ERR_CODES["PATH_NOT_EXIST"])
        with self.subTest("path_not_directory"):
            x = self.post_data(self.base_url, {
                ".type": "sambashare",
                "name": "SambaTest",
                "path": "/etc/rc.local",
            })
            x.assert_error("path: /etc/rc.local", "Path is not a directory.", self.ERR_CODES["NOT_DIR"])

    def test_allowed_users(self):
        shareId = None
        userId = None
        with self.subTest("create_sections"):
            shareId = self.create_share()
            resp = self.post_data(self.users_url, {
                ".type": "user",
                "username": "sambat",
                "password": "Pa$$word1"
            })
            resp.assert_code(201)
            userId = resp.json["data"]["id"]
        with self.subTest("add_invalid_allowed_user"):
            x = self.put_data(self.base_url + "/" + shareId, {
                "users": [ "test" ]
            })
            x.assert_error("users at index 1", "Must be one of the following values [sambat].", RC.INVALID_OPT.val())
        with self.subTest("add_allowed_user"):
            x = self.put_data(self.base_url + "/" + shareId, {
                "users": [ "sambat" ]
            })
            x.assert_data({
                "id": shareId,
                ".type": "sambashare",
                "name": "SambaTest",
                "path": "/root/",
                "read_only": "0",
                "browseable": "1",
                "guest_ok": "0",
                "users": [ "sambat" ]
            })
        with self.subTest("delete_allowed_user"):
            x = self.get(self.base_url + "/" + shareId)
            x.assert_data({
                "id": shareId,
                ".type": "sambashare",
                "name": "SambaTest",
                "path": "/root/",
                "read_only": "0",
                "browseable": "1",
                "guest_ok": "0",
                "users": [ "sambat" ]
            })

            resp = self.delete(f"{self.users_url}/{userId}")
            resp.assert_code(200)

            x = self.get(self.base_url + "/" + shareId)
            x.assert_data({
                "id": shareId,
                ".type": "sambashare",
                "name": "SambaTest",
                "path": "/root/",
                "read_only": "0",
                "browseable": "1",
                "guest_ok": "0"
            })
        with self.subTest("delete_share"):
            self.delete_share(shareId)
