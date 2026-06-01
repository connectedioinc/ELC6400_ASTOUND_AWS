import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env
import response_codes as codes
from utils.general_api import is_package_installed
from utils.ssh import get_ssh

RC = codes.ResponseCodes

class test_samba_users(WrapTest):
    ERR_CODES = {
        "USER_CREATE_FAILED": 1,
        "USER_PASS_SET_FAILED": 2,
        "USERNAME_RESERVED": 3,
        "USERNAME_IN_USE": 4,
        "NO_USERNAME_CHANGE": 5
    }
    base_url = "/samba/users/config"

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def setUp(self):
        if not is_package_installed(self, "samba"):
            self.skipTest("Samba package is not installed")

    def create_user(self):
        resp = self.post_data(self.base_url, {
            ".type": "user",
            "username": "sambat11",
            "password": "Pa$$word1"
        })
        resp.assert_code(201)
        return resp.json["data"]["id"]

    def delete_user(self, id: str):
        resp = self.delete(f"{self.base_url}/{id}")
        resp.assert_code(200)

    def test_basic_crud(self):
        self.crud_test(self.base_url, {
            ".type": "user",
            "username": "sambat11",
            "password": "Pa$$word1"
        },
        {
            ".type": "user",
            "username": "sambat11",
            "password": "Pa$$word123"
        }, [ "password" ])

    def test_username_validation(self):
        with self.subTest("check_reserved_users"):
            reserved_users = self.ssh.send_cmd("awk -F: '{print $1}' /etc/passwd").strip().split("\n")
            for user in reserved_users:
                user = user.strip()
                x = self.post_data(self.base_url, {
                    ".type": "user",
                    "username": user,
                    "password": "Pa$$word1"
                })
                if len(user) > 8:
                    x.assert_error("username", f"Provided value is too long. Is {len(user)} characters, but can be up to 8 characters", RC.INVALID_OPT.val())
                else:
                    x.assert_error(f"username: {user}", "Username is reserved.", self.ERR_CODES["USERNAME_RESERVED"])
        with self.subTest("check_duplicate_username"):

            id = self.create_user()
            x = self.post_data(self.base_url, {
                ".type": "user",
                "username": "sambat11",
                "password": "Pa$$word1"
            })
            x.assert_error("username: sambat11", "Username already in use.", self.ERR_CODES["USERNAME_IN_USE"])
            
            self.delete_user(id)
        with self.subTest("not_allowed_username_change"):
            id = self.create_user()
            x = self.put_data(self.base_url + "/" + id, {
                "username": "test"
            })
            x.assert_error("Validation", "Username change is not allowed.", self.ERR_CODES["NO_USERNAME_CHANGE"])

            self.delete_user(id)
    
    def test_user_creation(self):
        with self.subTest("check_user_created_deleted"):

            id = self.create_user()
            response = self.ssh.send_cmd("grep sambat11 /etc/passwd >/dev/null 2>&1; echo $?").strip()
            self.assertTrue(response == "0")

            self.delete_user(id)
            response = self.ssh.send_cmd("grep sambat11 /etc/passwd >/dev/null 2>&1; echo $?").strip()
            self.assertTrue(response == "1")
        with self.subTest("check_user_creation_failed"):
            self.ssh.send_cmd("/usr/sbin/adduser -HD -s /bin/false sambat11")
            x = self.post_data(self.base_url, {
                ".type": "user",
                "username": "sambat11",
                "password": "Pa$$word1"
            })
            x.assert_error("username: sambat11", "Username is reserved.", self.ERR_CODES["USERNAME_RESERVED"])
            
            self.ssh.send_cmd("/usr/sbin/deluser sambat11")
            self.ssh.send_cmd("/bin/sed --in-place '/^sambat11:/d' /etc/group")


