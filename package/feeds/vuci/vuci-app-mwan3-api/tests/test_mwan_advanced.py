import utility_integration as util
import response_codes as codes
from utils.general_api import is_package_installed
import sys
sys.path.append("../../../../tests")


class test_mwan_advanced(util.WrapTest):
    iface_url = "/failover/interfaces/config"
    members_url = "/failover/members/config"
    policies_url = "/failover/policies/config"
    rules_url = "/failover/rules/config"
    net_iface_url = "/interfaces/config"
    iface_sid = None
    members_sid = []
    policy_sid = None
    rule_sid = None
    default_members = []
    default_policies = []
    created_rule = {}
    create_members = [
        {
            "interface": "wan",
            "name": "wan_member_test",
            "weight": "10"
        }
    ]

    def setUp(self):
        if not is_package_installed(self, "mwan"):
            self.skipTest("MWAN3 package is not installed")
        x = self.get(self.members_url)
        self.default_members = x.resp.json()["data"]
        x = self.get(self.policies_url)
        self.default_policies = x.resp.json()["data"]

        # Create dummy iface
        x = self.post_data(self.net_iface_url, {"area_type": "wan"})
        self.iface_sid = x.resp.json()["data"]["id"]
        x.assert_code(201)
        self.create_members.append({"interface": self.iface_sid, "name": self.iface_sid + "_member"})

        # Delete automatically created mwan3 iface
        x = self.delete(self.iface_url + "/" + self.iface_sid)
        x.assert_data({
            "id": self.iface_sid
        })

    def test_mwan_advanced_functionality(self):
        with self.subTest("create_interface_configuration"):
            x = self.post_data(self.iface_url, {
                "id": self.iface_sid
            })
            x.assert_code(201)
        with self.subTest("create_iface_members"):
            for member in self.create_members:
                x = self.post_data(self.members_url, {
                    "interface": member["interface"],
                    "name": member["name"],
                    "weight": member.get("weight", "")
                })
                x.assert_code(201)
                self.members_sid.append(x.resp.json()["data"]["id"])
        with self.subTest("create_policy_configuration"):
            x = self.post_data(self.policies_url, {
                "use_member": self.members_sid,
            })
            x.assert_code(201)
            self.policy_sid = x.resp.json()["data"]["id"]
        with self.subTest("create_rule_configuration"):
            x = self.post_data(self.rules_url, {})
            x.assert_code(201)
            self.created_rule = x.resp.json()["data"]
            self.rule_sid = x.resp.json()["data"]["id"]
        with self.subTest("assign_member_to_default_policies"):
            for policy in self.default_policies:
                x = self.put_data(self.policies_url + "/" + policy["id"], {
                    "use_member": policy["use_member"] + [self.members_sid[1]]
                })
                x.assert_code(200)
        with self.subTest("assign_policy_to_rule"):
            x = self.put_data(self.rules_url + "/" + self.rule_sid, {
                "use_policy": self.policy_sid
            })
            x.assert_code(200)
        with self.subTest("delete_interface_configuration"):
            x = self.delete(self.iface_url + "/" + self.iface_sid)
            x.assert_data({
                "id": self.iface_sid
            })
            # Delete dummy iface also
            x = self.delete(self.net_iface_url + "/" + self.iface_sid)
            x.assert_data({
                "id": self.iface_sid
            })
        with self.subTest("check_member_removed_after_iface_deletion"):
            x = self.get(self.members_url + "/" + self.members_sid[1])
            x.assert_error(
                "UCI", f"Section: {self.members_sid[1]} for service does not exist", 113)
        with self.subTest("check_member_removed_from_policy_after_iface_deletion"):
            x = self.get(self.policies_url + "/" + self.policy_sid)
            member = self.create_members[1]
            x.assert_data({
                ".type": "policy",
                "id": self.policy_sid,
                "name": self.policy_sid,
                "use_member": [self.members_sid[0]]
            })
        with self.subTest("delete_policy_configuration"):
            x = self.delete(self.policies_url + "/" + self.policy_sid)
            x.assert_data({
                "id": self.policy_sid
            })
        with self.subTest("check_member_removed_from_default_policies_after_its_deletion"):
            x = self.get(self.policies_url)
            x.assert_data(self.default_policies)
        with self.subTest("check_policy_removed_from_created_rule"):
            x = self.get(self.rules_url + "/" + self.rule_sid)
            x.assert_data(self.created_rule)
        with self.subTest("delete_member_configuration"):
            x = self.delete(self.members_url + "/" + self.members_sid[0])
            x.assert_data({
                "id": self.members_sid[0]
            })
        with self.subTest("reset_policy"):
            x = self.put_data(self.rules_url + "/" + self.rule_sid, { "use_policy": "mwan_default" })
            x.assert_code(200)
        with self.subTest("delete_rule_configuration"):
            x = self.delete(self.rules_url + "/" + self.rule_sid)
            x.assert_data({
                "id": self.rule_sid
            })
        with self.subTest("check_non_existing_interface_creation"):
            x = self.post_data(self.iface_url, {
                "id": "test"
            })
            x.assert_error("URL", "Failover interface configuration ID must match an ID of a network interface configuration.", 113)
