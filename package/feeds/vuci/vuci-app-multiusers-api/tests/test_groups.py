import sys
import utility_integration as util
import response_codes as codes
from utils.ssh import open_ssh_connection, send_cmd
from utils.general_api import is_package_installed, get_hwinfo
sys.path.append("../../../../tests")


class multiusers_groups(util.WrapTest):

    def is_pkg_core(self, package):
        with open_ssh_connection() as ssh:
            res = send_cmd(ssh, f"grep -q \"Router:\" /usr/lib/opkg/info/{package}.control 2> /dev/null; echo $?").strip()
            if res == "1":
                return True
        return False

    def test_multiusers_groups_base_functionality(self):
        base_url = "/users/groups/config"
        hwinfo = get_hwinfo(self)
        with self.subTest("get_all"):
            permissions = [
                {
                    "hide_sensitive": "0",
                    "target_write": "allow",
                    "target_read": "allow",
                    "id": "root",
                    ".type": "group",
                    "write": [
                        "*"
                    ],
                    "read": [
                        "*"
                    ]
                },
                {
                    "hide_sensitive": "1",
                    "target_write": "deny",
                    "target_read": "deny",
                    "id": "admin",
                    ".type": "group",
                    "write": [
                        "system/admin/multiusers/users_configuration",
                        "system/maintenance/backup",
                        "system/flashops",
                        "system/maintenance/cli",
                        "system/wizard",
                        "system/maintenance/uscripts",
                        "system/admin/access_control/general",
                        "system/admin/profiles"
                    ],
                    "read": [
                        "system/admin/multiusers/users_configuration",
                        "system/admin/profiles",
                        "system/maintenance/backup",
                        "system/flashops",
                        "system/maintenance/cli",
                        "system/wizard",
                        "system/maintenance/uscripts"
                    ]
                },
                {
                    "hide_sensitive": "1",
                    "target_write": "allow",
                    "target_read": "deny",
                    "id": "user",
                    ".type": "group",
                    "write": [
                        "system/admin/multiusers/change_password"
                    ],
                    "read": [
                        "system/admin/multiusers/users_configuration",
                        "system/flashops",
                        "system/maintenance/backup",
                        "system/admin/access_control",
                        "system/maintenance/cli",
                        "system/maintenance/uscripts",
                        "system/maintenance/troubleshoot",
                        "system/package_manager",
                        "network",
                        "system/wizard"
                    ]
                }
            ]
            if hwinfo.get("wifi", False):
                permissions[2]["read"].append("status/wireless/channel_analysis")
            if self.is_pkg_core("vuci-app-coovachilli-ui"):
                permissions[2]["read"].append("services/hotspot/general/userscripts")
            if hwinfo.get("mobile", False):
                permissions[2]["read"].append("services/mobile_utilities/sms_messages/send")
            x = self.get(base_url)
            x.assert_data(permissions)
        with self.subTest("test_core_permissions"):
            def get_rpcd_permissions():
                with open_ssh_connection() as ssh:
                    res = {'write': send_cmd(ssh, "uci show rpcd.user.write").strip(),
                            'read': send_cmd(ssh, "uci show rpcd.user.read").strip()}
                    return res
            
            self.put_data(base_url + "/user", {
                "target_write": "deny",
                "target_read": "allow",
                "read": ["*"],
                "write": ["*"]
            })
            self.assertEqual(get_rpcd_permissions(), {
                "write": "rpcd.user.write='!superuser' 'core'",
                "read": "rpcd.user.read='!superuser' '*'"
            })
            self.put_data(base_url + "/user", {
                "target_write": "deny",
                "target_read": "deny",
                "read": ["*"],
                "write": ["*"]
            })
            self.assertEqual(get_rpcd_permissions(), {
                "write": "rpcd.user.write='!superuser'",
                "read": "rpcd.user.read='!superuser'"
            })
        with self.subTest("modify_users_group"):
            x = self.put_data(base_url + "/user", {
                "target_write": "allow",
                "target_read": "allow",
                "read": [
                    "system/maintenance/backup"
                ],
                "write": [
                    "system/maintenance/backup"
                ]
            })
            x.assert_data({
                "hide_sensitive": "1",
                "target_write": "allow",
                "target_read": "allow",
                "id": "user",
                ".type": "group",
                "read": [
                    "system/maintenance/backup"
                ],
                "write": [
                    "system/maintenance/backup"
                ]
            })
        with self.subTest("get_modified_group"):
            x = self.get(base_url + "/user")
            x.assert_data({
                "hide_sensitive": "1",
                "target_write": "allow",
                "target_read": "allow",
                "id": "user",
                ".type": "group",
                "read": [
                    "system/maintenance/backup"
                ],
                "write": [
                    "system/maintenance/backup"
                ]
            })
        with self.subTest("return_configuration"):
            data = {
                "hide_sensitive": "1",
                "target_write": "allow",
                "target_read": "deny",
                "read": [
                    "system/admin/multiusers/users_configuration",
                    "system/flashops",
                    "system/maintenance/backup",
                    "system/admin/access_control",
                    "system/maintenance/cli",
                    "system/maintenance/uscripts",
                    "system/maintenance/troubleshoot",
                    "system/package_manager",
                    "network",
                    "system/wizard"
                ],
                "write": [
                    "system/admin/multiusers/change_password"
                ]
            }
            if hwinfo.get("wifi", False):
                data["read"].append("status/wireless/channel_analysis")
            if self.is_pkg_core("vuci-app-coovachilli-ui"):
                data["read"].append("services/hotspot/general/userscripts")
            if hwinfo.get("mobile", False):
                data["read"].append("services/mobile_utilities/sms_messages/send")
            x = self.put_data(base_url + "/user", data)
            data["id"] = "user"
            data[".type"] = "group"
            x.assert_data(data)

    def test_multiusers_groups_deletion(self):
        x = self.delete("/users/groups/config")
        x.assert_error("Validation", "Deletion of whole configuration is not allowed",
                       codes.ResponseCodes.CONF_DEL_DISALLOWED.val(), None, None)

    def test_multiusers_groups_crud(self):
        self.crud_test("/users/groups/config", {
            "hide_sensitive": "1",
            ".type": "group",
            "id": "test",
            "target_write": "allow",
            "write": ["*"],
            "target_read": "allow",
            "read": ["*"]
        }, {
            "hide_sensitive": "0",
            ".type": "group",
            "target_write": "allow",
            "write": ["system/maintenance/backup"],
            "target_read": "allow",
            "read": ["system/maintenance/backup"]
        })
