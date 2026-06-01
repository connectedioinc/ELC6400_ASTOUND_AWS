import sys
sys.path.append("../../../../tests")
from utility_integration import WrapTest, Env

class test_snmp_settings(WrapTest):
    url_settings = "/snmp/agent/config/general"
    url_firewall = "/firewall/traffic_rules/config"
    url_communities = "/snmp/communities/config"
    url_communities_v6 = "/snmp/communities_v6/config"
    base_options = {
        "enabled": "0",
        "ip_type": "ipv4",
        "port": "69",
        "v1mode": "1",
        "v2cmode": "1",
        "v3mode": "1",
    }
    @classmethod
    def setUpClass(cls):
        x = Env.http.get(Env.get_api_url() + "/system/device/packages/status")
        cls.firewall_installed = "/usr/lib/opkg/info/firewall.control" in x.json()["data"]

    def test_basic_update_snmp_settings(self):
        x = self.put_data(self.url_settings, {
            **self.base_options,
            **({"allow_ra": "0"} if self.firewall_installed else {})
        })
        x.assert_data({
            **self.base_options,
            "id": "general",
            ".type": "agent",
            **({"allow_ra": "0"} if self.firewall_installed else {})
        })

    def test_check_firewall(self):
        self.get(self.url_settings) # for autoskip

        if not self.firewall_installed:
            self.skipTest("Firewall not installed, skipping")

        with self.subTest("enable snmp"):
            x = self.put_data(self.url_settings, {
                **self.base_options,
                "enabled": "1",
                "port": "420",
                "v3mode": "0",
                "allow_ra": "1"
            })
            x.assert_code(200)

        with self.subTest("check firewall"):
            x = self.get(self.url_firewall)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "SNMP_WAN_Access":
                    found = True
                    self.assertEqual(section["enabled"], "1")
                    self.assertEqual(section["target"], "ACCEPT")
                    self.assertListEqual(section["proto"], ["udp"])
                    self.assertListEqual(section["dest_port"], ["420"])

            if not found:
                self.fail("Firewall rule is not created")

        with self.subTest("update snmp"):
            x = self.put_data(self.url_settings, {
                **self.base_options,
                "v3mode": "0",
                "allow_ra": "0"
            })
            x.assert_code(200)

        with self.subTest("check firewall after update"):
            x = self.get(self.url_firewall)
            resp = x.resp
            found = False
            for section in resp.json()["data"]:
                if section["name"] == "SNMP_WAN_Access":
                    found = True
                    self.assertEqual(section["enabled"], "0")
                    self.assertEqual(section["target"], "ACCEPT")
                    self.assertListEqual(section["proto"], ["udp"])
                    self.assertListEqual(section["dest_port"], ["69"])

            if not found:
                self.fail("Firewall rule is not created")

    def test_check_is_snmpmode_enable(self):
        with self.subTest("check if all modes disabled"):
            x = self.put_data(self.url_settings, {
                ** self.base_options,
                "enabled": "1",
                "v1mode": "0",
                "v2cmode": "0",
                "v3mode": "0",
                ** ({"allow_ra": "0"} if self.firewall_installed else {})
            })
            self.assertListEqual(x.json["errors"], [{
                'source': 'Validation',
                'section': 'general',
                'error': "Can't enable SNMP, without selected SNMP mode",
                'code': 113
                }]
            )
        with self.subTest("check if v1mode enabled"):
            x = self.put_data(self.url_settings, {
                ** self.base_options,
                "enabled": "1",
                "v2cmode": "0",
                "v3mode": "0",
                ** ({"allow_ra": "0"} if self.firewall_installed else {})
            })
            x.assert_code(200)

        with self.subTest("check if v2cmode enabled"):
            x = self.put_data(self.url_settings, {
                ** self.base_options,
                "enabled": "1",
                "v1mode": "0",
                "v3mode": "0",
                ** ({"allow_ra": "0"} if self.firewall_installed else {})
            }).assert_code(200)

        with self.subTest("check if v3mode enabled"):
            x = self.put_data(self.url_settings, {
                ** self.base_options,
                "enabled": "1",
                "v1mode": "0",
                "v2cmode": "0",
                ** ({"allow_ra": "0"} if self.firewall_installed else {})
            }).assert_code(200)

        with self.subTest("check if all modes enabled"):
            x = self.put_data(self.url_settings, {
                ** self.base_options,
                "enabled": "1",
                ** ({"allow_ra": "0"} if self.firewall_installed else {})
            }).assert_code(200)

        with self.subTest("clear snmp settings config"):
            x = self.put_data(self.url_settings, {
                "enabled": "",
                "ip_type": "",
                "port": "",
                "v1mode": "",
                "v2cmode": "",
                "v3mode": "",
                ** ({"allow_ra": ""} if self.firewall_installed else {})
            }).assert_code(200)

    def test_communities_validation_snmp_settings(self):
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

        with self.subTest("Test validation"):
            x = self.put_data(self.url_settings, {
                "enabled": "1",
                "port": "69",
                "ip_type": "ipv4"
            })
            x.assert_error("Validation", "At least one community configuration must exist to enable the SNMP service.", 2)

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
