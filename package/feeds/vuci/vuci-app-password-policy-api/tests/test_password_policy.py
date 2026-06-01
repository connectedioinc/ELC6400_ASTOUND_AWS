from utils.ssh import open_ssh_connection, send_cmd
import response_codes as codes
import utility_integration as util
import sys
import copy
sys.path.append("../../../../tests")


RC = codes.ResponseCodes


class test_password_policy(util.WrapTest):
    users_url = "/users/config"
    url = "/password_policy/config"

    default_data = [
        {
            ".type": "policy",
            "id": "general",
            "password_length": "8",
            "require_digits": "1",
            "require_lower_upper": "1",
            "require_special": "1",
            "password_lifetime": "0"
        }
    ]

    test_cases = [
        {
            "test_case": "password_length_error",
            "password": "1",
            "values": {
                "password_length": "10",
                "require_digits": "0",
                "require_lower_upper": "0",
                "require_special": "0"
            },
            "api_error": "A password of minimum 10 characters and maximum 4094 characters is accepted.",
            "ssh_error": "Password is too short. Minimum length is 10 characters."
        },
        {
            "test_case": "require_digits_error",
            "password": "abcdefgh",
            "values": {
                "password_length": "8",
                "require_digits": "1",
                "require_lower_upper": "0",
                "require_special": "0"
            },
            "api_error": "A password of minimum 8 characters and maximum 4094 characters, at least one number is accepted.",
            "ssh_error": "Password must contain at least one digit."
        },
        {
            "test_case": "require_lower_upper_error",
            "password": "12345678",
            "values": {
                "password_length": "8",
                "require_digits": "0",
                "require_lower_upper": "1",
                "require_special": "0"
            },
            "api_error": "A password of minimum 8 characters and maximum 4094 characters, at least one uppercase letter, one lowercase letter is accepted.",
            "ssh_error": "Password must contain both lowercase and uppercase letters."
        },
        {
            "test_case": "require_special_error",
            "password": "12345678",
            "values": {
                "password_length": "8",
                "require_digits": "0",
                "require_lower_upper": "0",
                "require_special": "1"
            },
            "api_error": "A password of minimum 8 characters and maximum 4094 characters, at least one special character is accepted.",
            "ssh_error": "Password must contain at least one special character."
        },
        {
            "test_case": "require_all_short_error",
            "password": "1",
            "values": {
                "password_length": "10",
                "require_digits": "1",
                "require_lower_upper": "1",
                "require_special": "1"
            },
            "api_error": "A password of minimum 10 characters and maximum 4094 characters, at least one uppercase letter, one lowercase letter, one number, one special character is accepted.",
            "ssh_error": "Password is too short. Minimum length is 10 characters."
        },
        {
            "test_case": "require_all_cases_error",
            "password": "1234567891",
            "values": {
                "password_length": "10",
                "require_digits": "1",
                "require_lower_upper": "1",
                "require_special": "1"
            },
            "api_error": "A password of minimum 10 characters and maximum 4094 characters, at least one uppercase letter, one lowercase letter, one number, one special character is accepted.",
            "ssh_error": "Password must contain both lowercase and uppercase letters."
        },
        {
            "test_case": "require_all_special_error",
            "password": "Abcdefgh12",
            "values": {
                "password_length": "10",
                "require_digits": "1",
                "require_lower_upper": "1",
                "require_special": "1"
            },
            "api_error": "A password of minimum 10 characters and maximum 4094 characters, at least one uppercase letter, one lowercase letter, one number, one special character is accepted.",
            "ssh_error": "Password must contain at least one special character."
        },
        {
            "test_case": "password_length_success",
            "password": "1234567891",
            "values": {
                "password_length": "10",
                "require_digits": "0",
                "require_lower_upper": "0",
                "require_special": "0"
            }
        },
        {
            "test_case": "require_digits_success",
            "password": "12345678",
            "values": {
                "password_length": "8",
                "require_digits": "1",
                "require_lower_upper": "0",
                "require_special": "0"
            }
        },
        {
            "test_case": "require_lower_upper_success",
            "password": "abcDefgh",
            "values": {
                "password_length": "8",
                "require_digits": "0",
                "require_lower_upper": "1",
                "require_special": "0"
            }
        },
        {
            "test_case": "require_special_success",
            "password": "@@@@@@@@",
            "values": {
                "password_length": "8",
                "require_digits": "0",
                "require_lower_upper": "0",
                "require_special": "1"
            }
        },
        {
            "test_case": "require_all_success",
            "password": "@bcDefgh12",
            "values": {
                "password_length": "10",
                "require_digits": "1",
                "require_lower_upper": "1",
                "require_special": "1"
            }
        },
    ]

    def test_password_policy_functionality(self):
        with self.subTest("check_default_configuration"):
            x = self.get(self.url)
            x.assert_data(self.default_data)
        with self.subTest("check_default_validation"):
            x = self.post_data(self.users_url, {
                "username": "test_policy",
                "password": "1",
                "group": "user"
            })
            x.assert_error(
                "password", "A password of minimum 8 characters and maximum 4094 characters, at least one uppercase letter, one lowercase letter, one number, one special character is accepted.", RC.INVALID_OPT.val())
        for case in self.test_cases:
            with self.subTest("change_" + case["test_case"]):
                put_data = [
                    {
                        ".type": "policy",
                        "id": "general",
                        "password_lifetime": "0"
                    }
                ]
                put_data[0].update(case["values"])
                x = self.put_data(self.url, put_data)
                x.assert_data(put_data)
            with self.subTest("check_" + case["test_case"] + "_validation_api"):
                user_name = "test_policy"
                x = self.post_data(self.users_url, {
                    "username": user_name,
                    "password": case["password"],
                    "group": "user"
                })

                if "api_error" in case:
                    x.assert_error(
                        "password", case["api_error"], RC.INVALID_OPT.val())
                else:
                    x.assert_data({
                        "username": user_name,
                        "group": "user"
                    }, 201, [".type", "id", "ssh_enable"])
                    user_id = x.resp.json()["data"]["id"]
                    x = self.delete(self.users_url + "/" + user_id)
                    x.assert_data({
                        "id": user_id
                    })
            with self.subTest("check_" + case["test_case"] + "_validation_ssh"):
                user_name = "test_policy_ssh"
                with open_ssh_connection() as ssh:
                    send_cmd(ssh, "adduser " + user_name + " -D -G user")
                    if "ssh_error" in case:
                        output = send_cmd(
                            ssh, "echo " + case["password"] + " | passwd " + user_name)
                        self.assertIn(case["ssh_error"], output)
                    else:
                        output = send_cmd(
                            ssh, "(echo " + case["password"] + "; sleep 1; echo " + case["password"] + ") | passwd " + user_name)
                        self.assertIn(
                            "Changing password for " + user_name + "\r\nNew password: \r\nRetype password: \r\n", output)

                    send_cmd(ssh, "deluser " + user_name)
        with self.subTest("return_configuration_to_default"):
            x = self.put_data(self.url, self.default_data)
            x.assert_data(self.default_data)

    def test_password_expiration_functionality(self):
        with self.subTest("update_password_change_time"):
            with open_ssh_connection() as ssh:
                send_cmd(ssh, f"echo root:{util.Env.password} | chpasswd")
                send_cmd(ssh, f"echo admin:{util.Env.password} | chpasswd")
        with self.subTest("change_password_lifetime"):
            put_data = [
                {
                    ".type": "policy",
                    "id": "general",
                    "password_lifetime": "1"
                }
            ]
            x = self.put_data(self.url, put_data)
            x.assert_data(put_data, 200, ["password_length", "require_digits",
                          "require_lower_upper", "require_special", "current_days_left"])
        with self.subTest("check_password_expiration"):
            x = self.get(self.url)
            data = copy.deepcopy(self.default_data)
            data[0]["current_days_left"] = "1"
            data[0]["password_lifetime"] = "1"
            x.assert_data(data)

            with open_ssh_connection() as ssh:
                initial_timestamp = send_cmd(ssh, "date +%s")
                timestamp = int(initial_timestamp) + 86400
                send_cmd(ssh, "date -s @" + str(timestamp))

                x = self.get(self.url)
                data = copy.deepcopy(self.default_data)
                data[0]["current_days_left"] = "0"
                data[0]["password_lifetime"] = "1"
                x.assert_data(data)

                send_cmd(ssh, "date -s @" + str(initial_timestamp))
        with self.subTest("return_configuration_to_default"):
            x = self.put_data(self.url, self.default_data)
            x.assert_data(self.default_data)
