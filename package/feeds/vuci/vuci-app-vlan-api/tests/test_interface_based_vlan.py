import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import delete_all
import response_codes as codes

RC = codes.ResponseCodes

class test_interface_based_vlan(util.WrapTest):
    url = "/interface_based_vlan/config"
    device_url = "/interface_based_vlan/{}/devices/config"

    def tearDown(self):
        delete_all(self, self.url)

    def create_device(self, parent_sid: str, parent_name: str, options: dict):
        x = self.post_data(self.device_url.format(parent_sid), options)
        options['.type'] = "device"
        options['id'] = x.resp.json()['data']['id']
        options['ifname'] = parent_name
        x.assert_data(options, 201)

    def test_interface_based_vlan_basic_functionality(self):
        sid = ""
        parent_name = "test"
        with self.subTest("create_configuration"):
            options = {
                'name': parent_name,
                'vid': "11",
                'type': "8021ad",
                'ifname': "eth0"
            }
            x = self.post_data(self.url, options)
            sid = x.resp.json()['data']['id']
            options['.type'] = "device"
            options['id'] = sid
            x.assert_data(options, 201)
        with self.subTest("create_devices"):
            device1 = {
                'name': "device1",
                'vid': "420"
            }
            device2 = {
                'name': "device2",
                'vid': "421"
            }
            self.create_device(sid, parent_name, device1)
            self.create_device(sid, parent_name, device2)
        with self.subTest("try_change_name"):
            x = self.put_data(self.url + "/" + sid, {'name': "lalala"})
            x.assert_code(422)
            x.assert_error("Validation", "'name' cannot be edited", RC.INVALID_OPT.val())
        with self.subTest("delete_configuration"):
            x = self.delete(self.url + "/" + sid)
            x.assert_data({
                'id': sid
            })
        with self.subTest("check_devices_after_creating_same_parent"):
            options = {
                'name': parent_name,
                'vid': "11",
                'type': "8021ad",
                'ifname': "eth0"
            }
            x = self.post_data(self.url, options)
            sid = x.resp.json()['data']['id']
            options['.type'] = "device"
            options['id'] = sid
            x.assert_data(options, 201)
            x = self.get(self.device_url.format(sid))
            x.assert_data([], 200)
        with self.subTest("try_create_q_in_q_device_with_existing_name"):
            x = self.post_data(self.device_url.format(sid), { "name": "eth0" })
            x.assert_code(422)
            x.assert_error("Validation", "Name 'eth0' is already in use", RC.INVALID_OPT.val())
