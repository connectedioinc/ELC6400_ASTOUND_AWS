import sys
import utility_integration as util
import response_codes as codes
sys.path.append("../../../../tests")

class access_control_pam(util.WrapTest):
    
    def test_access_control_pam_base_functionality(self):
        base_url = "/access_control/pam/config"
        id = ""
        with self.subTest("create_pam"):
            x = self.post_data(base_url, {
                "service":"rpcd"
            })
            resp = x.resp.json()
            id = resp["data"]["id"]
            x.assert_data({
                "enabled": "0",
                "port": "1812",
                "timeout": "3",
                "id": id,
                "service": "rpcd",
                ".type": "pam"
            }, 201)
        with self.subTest("get_all"):
            x = self.get(base_url)
            x.assert_data([
                {
                    "enabled": "0",
                    ".type": "pam",
                    "service": "sshd",
                    "module": "unix",
                    "type": "optional"
                },
                {
                    "enabled": "0",
                    ".type": "pam",
                    "service": "rpcd",
                    "module": "unix",
                    "type": "optional"
                },
                {
                    "enabled": "0",
                    "port": "1812",
                    "timeout": "3",
                    "service": "rpcd",
                    ".type": "pam"
                }
            ], 200, {"id"})
        with self.subTest("get_single"):
            x = self.get(base_url + "/" + id)
            x.assert_data({
                "enabled": "0",
                "port": "1812",
                "timeout": "3",
                "id": id,
                "service": "rpcd",
                ".type": "pam"
            })
        with self.subTest("modify"):
            x = self.put_data(base_url + "/" + id, {
                "enabled": "1",
                "port": "5000",
                "timeout": "5"
            })
            x.assert_data({
                "enabled": "1",
                "port": "5000",
                "timeout": "5",
                "id": id,
                "service": "rpcd",
                ".type": "pam"
            })
        with self.subTest("get_modified"):
            x = self.get(base_url + "/" + id)
            x.assert_data({
                "enabled": "1",
                "port": "5000",
                "timeout": "5",
                "id": id,
                "service": "rpcd",
                ".type": "pam"
            })
        with self.subTest("delete_section"):
            x = self.delete(base_url + "/" + id)
            x.assert_data({
                "id": id
            })