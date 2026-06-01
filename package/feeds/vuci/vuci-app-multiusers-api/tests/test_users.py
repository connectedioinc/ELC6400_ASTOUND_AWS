import sys
import utility_integration as util
import response_codes as codes
from utils.ssh import get_ssh
sys.path.append("../../../../tests")

class multiusers_users(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    # octal representations of ascii values
    def test_multiusers_username_escape_characters(self):
        base_url = "/users/config"
        with self.subTest("create_unicode_user_start"):
            username = "admin\001Unique"
            x = self.post_data(base_url, {
                "username": username,
                "password": "Testas.123",
                "group": "user"
            })
            resp = x.resp.json()
            errors_body = [
                {
                    "source": "username",
                    "code": 103,
                    "value": username,
                    "error": "A string of lowercase Latin letters, numbers, -, . and _ characters is accepted. First character must be a lowercase Latin letter. Length between 1 and 32 characters.",
                    "section": ".anonymous"
                },
            ]
            self.assertEqual(resp["errors"], errors_body)
        
        with self.subTest("create_unicode_user_end"):
            username = "admin\040Unique"
            x = self.post_data(base_url, {
                "username": username,
                "password": "Testas.123",
                "group": "user"
            })
            resp = x.resp.json()
            errors_body = [
                {
                    "source": "username",
                    "code": 103,
                    "value": username,
                    "error": "A string of lowercase Latin letters, numbers, -, . and _ characters is accepted. First character must be a lowercase Latin letter. Length between 1 and 32 characters.",
                    "section": ".anonymous"
                },
            ]
            self.assertEqual(resp["errors"], errors_body)

    def test_multiusers_users_create_validation(self):
        base_url = "/users/config"
        id = ""
        env = util.Env
        with self.subTest("create_used_user"):
            x = self.post_data(base_url, {
                "username": env.username,
                "password": "Testas123*",
                "group": "user"
            })
            resp = x.resp.json()
            errors_body = [
                {
                    "source": "username",
                    "code": 103,
                    "value": env.username,
                    "error": "User with this username already exists.",
                    "section": ".anonymous"
                },
            ]
            self.assertEqual(resp["errors"], errors_body)
        with self.subTest("create_reserved_user"):
            x = self.post_data(base_url, {
                "username": "ubus",
                "password": "Testas123*",
                "group": "user"
            })
            resp = x.resp.json()
            errors_body = [
                {
                    "source": "username",
                    "code": 103,
                    "value": "ubus",
                    "error": "This username is reserved for system",
                    "section": ".anonymous"
                },
            ]
            self.assertEqual(resp["errors"], errors_body)
        with self.subTest("create_invalid_user_with_dot"):
             x = self.post_data(base_url, {
                 "username": ".Test",
                 "password": "Testas123*",
                 "group": "user"
             })
             resp = x.resp.json()
             errors_body = [
                 {
                     "source": "username",
                     "code": 103,
                     "value": ".Test",
                     "error": "A string of lowercase Latin letters, numbers, -, . and _ characters is accepted. First character must be a lowercase Latin letter. Length between 1 and 32 characters.",
                     "section": ".anonymous"
                 }
             ]
             self.assertEqual(resp["errors"], errors_body)
        with self.subTest("create_invalid_user_with_hyphen"):
             x = self.post_data(base_url, {
                 "username": "-Test",
                 "password": "Testas123*",
                 "group": "user"
             })
             resp = x.resp.json()
             errors_body = [
                 {
                     "source": "username",
                     "code": 103,
                     "value": "-Test",
                     "error": "A string of lowercase Latin letters, numbers, -, . and _ characters is accepted. First character must be a lowercase Latin letter. Length between 1 and 32 characters.",
                     "section": ".anonymous"
                 }
             ]
             self.assertEqual(resp["errors"], errors_body)
        with self.subTest("create_invalid_user_with_colon"):
            x = self.post_data(base_url, {
                "username": "Te:st",
                "password": "Testas123*",
                "group": "user"
            })
            resp = x.resp.json()
            errors_body = [
                 {
                     "source": "username",
                     "code": 103,
                     "value": "Te:st",
                     "error": "A string of lowercase Latin letters, numbers, -, . and _ characters is accepted. First character must be a lowercase Latin letter. Length between 1 and 32 characters.",
                     "section": ".anonymous"
                 }
            ]
            self.assertEqual(resp["errors"], errors_body)
        with self.subTest("create_invalid_user_with_slash"):
            x = self.post_data(base_url, {
                "username": "Te/st",
                "password": "Testas123*",
                "group": "user"
            })
            resp = x.resp.json()
            errors_body = [
                 {
                     "source": "username",
                     "code": 103,
                     "value": "Te/st",
                     "error": "A string of lowercase Latin letters, numbers, -, . and _ characters is accepted. First character must be a lowercase Latin letter. Length between 1 and 32 characters.",
                     "section": ".anonymous"
                 }
            ]
            self.assertEqual(resp["errors"], errors_body)
    def test_multiusers_users_base_functionality(self):
        base_url = "/users/config"
        id = ""
        with self.subTest("create_user"):
            x = self.post_data(base_url, {
                "username": "test",
                "password": "Testas123*",
                "group": "user"
            })
            resp = x.resp.json()
            id = resp["data"]["id"]
            x.assert_data({
                "username": "test",
                "group": "user",
                "id": id,
                "ssh_enable": "0",
                ".type": "login"
            }, 201)
        with self.subTest("get_all"):
            x = self.get(base_url)
            resp = x.resp.json()
            admin_data = resp["data"][0]
            user_data = resp["data"][1]

            x.assert_data([
                {
                    "username": admin_data['username'],
                    "group": "root",
                    ".type": "login",
                    "ssh_enable": "0",
                    "id": admin_data['id']
                },
                {
                    "username": "test",
                    "group": "user",
                    ".type": "login",
                    "ssh_enable": "0",
                    "id": user_data["id"]
                }
            ], 200, {"id"})
        with self.subTest("change_password"):
            x = self.put_data(base_url + "/" + id, {
                "password": "Testas123**",
                "password_confirm": "Testas123**"
            })

            x.assert_data({
                "username": "test",
                "group": "user",
                "id": id,
                "ssh_enable": "0",
                ".type": "login"
            })
        with self.subTest("change_group"):
            x = self.put_data(base_url + "/" + id, {
                "group": "admin"
            })
            x.assert_data({
                "username": "test",
                ".type": "login",
                "group": "admin",
                "ssh_enable": "0",
                "id": id,
            })
        with self.subTest("delete_user"):
            x = self.delete(base_url + "/" + id)
            x.assert_data({
                "id": id
            })
    def test_multiusers_password_verification(self):
        base_url = "/users/config"
        id = ""
        with self.subTest("weak_password"):
            x = self.post_data(base_url, {
                "username": "test",
                "password": "test",
                "group": "user"
            })
            x.assert_error("password",
             "A password of minimum 8 characters and maximum 4094 characters, at least one uppercase letter, one lowercase letter, one number, one special character is accepted.", 103, "test", ".anonymous")
        with self.subTest("create_temp_user"):
            x = self.post_data(base_url, {
                "username": "test",
                "password": "Testas123*",
                "group": "user"
            })
            resp = x.resp.json()
            id = resp["data"]["id"]
            x.assert_data({
                "username": "test",
                "group": "user",
                ".type": "login",
                "ssh_enable": "0",
                "id": id
            }, 201)
        with self.subTest("passwords_do_not_match"):
            x = self.put_data(base_url + "/" + id, {
                "password": "testas123**",
                "password_confirm": "miaumiaumiau*"
            })
            resp = x.resp.json()
            errors_body = [
                {
                    "source": "password",
                    "code": 103,
                    "value": "testas123**",
                    "error": "'password' and 'password_confirm' options do not match.",
                    "section": id
                },
                {
                    "source": "password_confirm",
                    "code": 103,
                    "value": "miaumiaumiau*",
                    "error": "'password' and 'password_confirm' options do not match.",
                    "section": id
                }
            ]
            self.assertEqual(resp["errors"], errors_body)
        with self.subTest("delete_temp_user"):
            x = self.delete(base_url + "/" + id)
            x.assert_data({
                "id": id
            })

    def test_multiusers_admin_password(self):
        base_url = "/users/config"
        id = ""
        admin_username = ""
        env = util.Env
        with self.subTest("find_admin_id"):
            x = self.get(base_url)
            resp = x.resp.json()
            for section in resp["data"]:
                if section["group"] == "root":
                    id = section["id"]
                    admin_username = section["username"]
        with self.subTest("change_admin_password"):
            x = self.put_data(base_url + "/" + id, {
                "current_password": env.password,
                "password":"Testas.123",
                "password_confirm": "Testas.123"
            })
            x.assert_data({
                "username": admin_username,
                ".type": "login",
                "id": id,
                "ssh_enable": "0",
                "group": "root"
            })
        with self.subTest("return_password"):
            if env.password == "admin01":
                env.password = "Testas.123"
                self.ssh.send_cmd(f"echo root:admin01 | chpasswd")
                self.ssh.send_cmd(f"echo admin:admin01 | chpasswd")
                env.password = "admin01"
            else:
                x = self.put_data(base_url + "/" + id, {
                    "current_password": "Testas.123",
                    "password": env.password,
                    "password_confirm": env.password
                })
                
                x.assert_data({
                    "username": admin_username,
                    ".type": "login",
                    "id": id,
                    "ssh_enable": "0",
                    "group": "root"
                })
        with self.subTest("create_user_with_ssh"):
            x = self.post_data(base_url, {
                "username": "api-user",
                "password": "Api_pass123",
                "group": "user",
                "ssh_enable": "1"
            })
            x.assert_error("ssh_enable", "Can not create user with SSH access.", 103)