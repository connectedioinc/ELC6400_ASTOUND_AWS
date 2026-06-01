import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import delete_all
import response_codes as codes

RC = codes.ResponseCodes

class test_port_based_vlan(util.WrapTest):
    url = "/port_based_vlan/config"

    @util.allow_device("RUTX11")
    def test_port_based_vlan_base_functionality_rutx11(self):
        id = ""
        lan_vlan_id = ""
        wan_vlan_id = ""

        with self.subTest("create_configuration"):
            x = self.post_data(self.url, {
                'vid': "3"
            })
            id = x.resp.json()['data']['id']
            x.assert_data({
                '.type': "switch_vlan",
                'id': id,
                'vid': "3",
                'lan1': "",
                'lan2': "",
                'lan3': "",
                'wan': ""
            }, 201)
        with self.subTest("get_all_vlans"):
            x = self.get(self.url)
            for vlan in x.resp.json()['data']:
                if vlan['vid'] == "1":
                    lan_vlan_id = vlan['id']
                elif vlan['vid'] == "2":
                    wan_vlan_id = vlan['id']
        with self.subTest("edit_configuration_wan_port"):
            x = self.put_data(self.url, [
                {
                    'id': wan_vlan_id,
                    'wan': ""
                },
                {
                    'id': id,
                    'wan': "u"
                }
            ])
            x.assert_data([
                {
                    '.type': "switch_vlan",
                    'id': wan_vlan_id,
                    'vid': "2",
                    'lan1': "",
                    'lan2': "",
                    'lan3': "",
                    'wan': ""
                },
                {
                    '.type': "switch_vlan",
                    'id': id,
                    'vid': "3",
                    'lan1': "",
                    'lan2': "",
                    'lan3': "",
                    'wan': "u"
                }
            ])
        with self.subTest("edit_configuration_lan_port"):
            x = self.put_data(self.url, [
                {
                    'id': lan_vlan_id,
                    'lan3': ""
                },
                {
                    'id': id,
                    'lan3': "u"
                }
            ])
            x.assert_data([
                {
                    '.type': "switch_vlan",
                    'id': lan_vlan_id,
                    'vid': "1",
                    'lan1': "u",
                    'lan2': "u",
                    'lan3': "",
                    'wan': ""
                },
                {
                    '.type': "switch_vlan",
                    'id': id,
                    'vid': "3",
                    'lan1': "",
                    'lan2': "",
                    'lan3': "u",
                    'wan': "u"
                }
            ])
        with self.subTest("try_edit_configuration"):
            x = self.put_data(self.url + "/" + id, {
                'lan2': "u"
            })
            x.assert_code(422)
            x.assert_error("Validation", "Port (lan2) is untagged in multiple VLANs", RC.INVALID_OPT.val())
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + id)
            x.assert_data({
                'id': id
            })
        with self.subTest("restore_vlans_to_default"):
            options = [
                {
                    '.type': "switch_vlan",
                    'id': lan_vlan_id,
                    'vid': "1",
                    'lan1': "u",
                    'lan2': "u",
                    'lan3': "u",
                    'wan': ""
                },
                {
                    '.type': "switch_vlan",
                    'id': wan_vlan_id,
                    'vid': "2",
                    'lan1': "",
                    'lan2': "",
                    'lan3': "",
                    'wan': "u"
                }
            ]
            x = self.put_data(self.url, options)
            x.assert_data(options)

    @util.allow_device("RUTM11")
    def test_port_based_vlan_base_functionality_rutm11(self):
        id = ""
        lan_vlan_id = ""

        with self.subTest("create_configuration"):
            x = self.post_data(self.url, {
                'vid': "3"
            })
            id = x.resp.json()['data']['id']
            x.assert_data({
                '.type': "bridge-vlan",
                'id': id,
                'vid': "3",
                'lan1': "",
                'lan2': "",
                'lan3': "",
            }, 201)
        with self.subTest("check_lan_device_after_vlan_create"):
            x = self.get("/interfaces/config/lan")
            x.assert_code(200)
            section = x.resp.json()['data']
            self.assertEqual(section['ifname'], ["vlan.1"])
        with self.subTest("get_all_vlans"):
            x = self.get(self.url)
            for vlan in x.resp.json()['data']:
                if vlan['vid'] == "1":
                    lan_vlan_id = vlan['id']
        with self.subTest("edit_configuration_lan_port"):
            x = self.put_data(self.url, [
                {
                    'id': lan_vlan_id,
                    'lan3': ""
                },
                {
                    'id': id,
                    'lan3': "u"
                }
            ])
            x.assert_data([
                {
                    '.type': "bridge-vlan",
                    'id': lan_vlan_id,
                    'vid': "1",
                    'lan1': "u",
                    'lan2': "u",
                    'lan3': ""
                },
                {
                    '.type': "bridge-vlan",
                    'id': id,
                    'vid': "3",
                    'lan1': "",
                    'lan2': "",
                    'lan3': "u"
                }
            ])
        with self.subTest("try_edit_configuration"):
            x = self.put_data(self.url + "/" + id, {
                'lan2': "u"
            })
            x.assert_code(422)
            x.assert_error("Validation", "Port (lan2) is untagged in multiple VLANs", RC.INVALID_OPT.val())
        with self.subTest("restore_vlan_to_default"):
            options = ([
                {
                    '.type': "bridge-vlan",
                    'id': lan_vlan_id,
                    'vid': "1",
                    'lan1': "u",
                    'lan2': "u",
                    'lan3': "u"
                },
                {
                    '.type': "bridge-vlan",
                    'id': id,
                    'vid': "3",
                    'lan1': "",
                    'lan2': "",
                    'lan3': ""
                }
            ])
            x = self.put_data(self.url, options)
            x.assert_data(options)
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + id)
            x.assert_data({
                'id': id
            })
        with self.subTest("check_lan_device_after_vlan_delete"):
            x = self.get("/interfaces/config/lan")
            x.assert_code(200)
            section = x.resp.json()['data']
            self.assertEqual(section['ifname'], ["lan1", "lan2", "lan3"])
