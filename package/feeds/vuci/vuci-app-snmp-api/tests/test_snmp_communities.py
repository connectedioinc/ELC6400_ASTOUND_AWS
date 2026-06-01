import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env

class test_snmp_communities(WrapTest):
    url_communities = "/snmp/communities/config"
    url_communities_v6 = "/snmp/communities_v6/config"
    url_settings = "/snmp/agent/config/general"

    def test_basic_update_communities(self):
        self.crud_test(self.url_communities, {
            ".type": "com2sec",
        },{
             ".type": "com2sec",
            "ipaddr": "1.1.1.1",
            "community": "test",
            "secname": "rw",
            "netmask": "24"
        })

    def test_basic_crud_communities_v6(self):
        self.crud_test(self.url_communities_v6, {
            ".type": "com2sec6",
        },{
            ".type": "com2sec6",
            "source": "defaultv1",
            "community": "test",
            "secname": "rw",
        })


    def test_communities_count_validation(self):
        x = self.put_data(self.url_settings, {
            "enabled": "0"
        }).assert_code(200)

        with self.subTest("Delete all SNMP communities"):
            x = self.get(self.url_communities)
            snmp_communities = x.resp.json()["data"]

            snmp_communities_id = []
            for communitiy in snmp_communities:
                snmp_communities_id.append(communitiy["id"])

            if len(snmp_communities_id) > 0:
                x = self.delete_data(self.url_communities, snmp_communities_id)
                x.assert_code(200)


        with self.subTest("Delete all SNMPV6 communities"):
            x = self.get(self.url_communities_v6)
            snmpv6_communities = x.resp.json()["data"]

            snmpv6_communities_id = []
            for communitiy in snmpv6_communities:
                snmpv6_communities_id.append(communitiy["id"])

            if len(snmpv6_communities_id) > 0:
                x = self.delete_data(self.url_communities_v6, snmpv6_communities_id)
                x.assert_code(200)

        with self.subTest("Test with SNMP communitiy"):
            sid = None
            with self.subTest("Create communitiy"):
                x = self.post_data(self.url_communities, {})
                sid = x.resp.json()["data"]["id"]

            with self.subTest("Enable SNMP service"):
                x = self.put_data(self.url_settings, {
                    "enabled": "1",
                    "v1mode": "1",
                    "port": "161",
                    "ip_type": "ipv4"
                })
                x.assert_code(200)

            with self.subTest("Try delete SNMP communitiy"):
                x = self.delete(self.url_communities + "/" + sid)
                x.assert_error("Validation", "SNMP service requires at least one community instance when it is enabled.", 1)

            with self.subTest("Disable SNMP service"):
                x = self.put_data(self.url_settings, {
                    "enabled": "0"
                })
                x.assert_code(200)

            with self.subTest("Delete SNMP communitiy"):
                x = self.delete(self.url_communities + "/" + sid).assert_code(200)

        with self.subTest("Test with SNMPV6 communitiy"):
            sid = None
            with self.subTest("Create communitiy"):
                x = self.post_data(self.url_communities_v6, {})
                sid = x.resp.json()["data"]["id"]

            with self.subTest("Enable SNMP service"):
                x = self.put_data(self.url_settings, {
                    "enabled": "1"
                })
                x.assert_code(200)

            with self.subTest("Try delete SNMP communitiy"):
                x = self.delete(self.url_communities_v6 + "/" + sid)
                x.assert_error("Validation", "SNMP service requires at least one community instance when it is enabled.", 1)

            with self.subTest("Disable SNMP service"):
                x = self.put_data(self.url_settings, {
                    "enabled": "0"
                })
                x.assert_code(200)

            with self.subTest("Delete SNMP communitiy"):
                x = self.delete(self.url_communities_v6 + "/" + sid).assert_code(200)

        if len(snmp_communities) > 0:
            with self.subTest("Revert SNMP communitiy"):
                for communities in snmp_communities:
                    x = self.post_data(self.url_communities, communities)
                    x.assert_code(201)

        if len(snmpv6_communities) > 0:
            with self.subTest("Revert SNMPV6 communitiy"):
                for communities in snmpv6_communities:
                    x = self.post_data(self.url_communities_v6, communities)
                    x.assert_code(201)