import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes

RC = codes.ResponseCodes

class test_dot1x_api(util.WrapTest):
    base_url = "/dot1x"
    def test_radius_functionality(self):
        with self.subTest("radius_test_feature"):
            x = self.post_data(self.base_url + "/radius/actions/test", {
                "ip": "127.0.0.1",
                "secret": "-",
                "port": "1812"
            })
            json = x.resp.json()
            x.unit.assertIn("data", json)
            data = json['data']
            self.assertIn("status", data)
            self.assertIn("connected", data)
            self.assertIn("response", data)
            self.assertEqual(data['status'], "timed-out")
            self.assertEqual(data['connected'], False)
            self.assertEqual("RADIUS message: code=1 (Access-Request)" in data['response'], True)
            # simply testing that radius_test application exists and tries to connect
        with self.subTest("radius_test_feature_with_username"):
            x = self.post_data(self.base_url + "/radius/actions/test", {
                "ip": "127.0.0.1",
                "secret": "-",
                "port": "1812",
                "username": "bob",
                "password": "test"
            })
            json = x.resp.json()
            x.unit.assertIn("data", json)
            data = json['data']
            self.assertIn("status", data)
            self.assertIn("connected", data)
            self.assertIn("response", data)
            self.assertEqual(data['status'], "timed-out")
            self.assertEqual(data['connected'], False)
            self.assertEqual("RADIUS message: code=1 (Access-Request)" in data['response'], True)
            # simply testing that radius_test application exists and tries to connect

        with self.subTest("create_section"):
            x = self.post_data(self.base_url + "/radius/config", {
                "port": "1812",
                "secret": "testing123",
                "address": "192.168.1.100",
                "id": "primary"
            })
            x.assert_data({
                "id": "primary",
                "name": "primary", # automatically generated from id
                ".type": "radius",
                "port": "1812",
                "secret": "testing123",
                "address": "192.168.1.100"
            }, 201)

        with self.subTest("try_delete_used_radius"): 
            x = self.delete(self.base_url+"/radius/config/example")
            x.assert_code(422)
            x.assert_error("example", "RADIUS server is currently used by ports: _eth0, _eth1. Configure a different server on them before deleting this one", RC.NO_DELETE.val())

        with self.subTest("assign_radius_to_port"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "radius": "primary",
            })
            x.assert_code(200)

        with self.subTest("try_assign_non_existing_radius_to_port"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "radius": "non_existing",
            })
            x.assert_error("radius", "Must be one of the following values [example, primary].", RC.INVALID_OPT.val())
            x.assert_code(422)

        with self.subTest("try_delete_used_radius_new"): 
            x = self.delete(self.base_url+"/radius/config/primary")
            x.assert_code(422)
            x.assert_error("primary", "RADIUS server is currently used by ports: _eth0. Configure a different server on them before deleting this one", RC.NO_DELETE.val())

        with self.subTest("assign_example_radius_to_port"):
            x = self.put_data(self.base_url + "/ports/config/_eth0", {
                "radius": "example",
            })
            x.assert_code(200)

        with self.subTest("delete_unused_radius"): 
            x = self.delete(self.base_url+"/radius/config/primary")
            x.assert_code(200)

        with self.subTest("try_create_section_with_taken_id"):
            x = self.post_data(self.base_url + "/radius/config", {
                "port": "1812",
                "secret": "testing123",
                "address": "192.168.1.100",
                "id": "example"
            })
            x.assert_error("Validation", "Name already used for a configuration", RC.NAME_USED.val())

        anon_id = None
        with self.subTest("create_section_with_name_only"):
            x = self.post_data(self.base_url + "/radius/config", {
                "port": "1812",
                "secret": "testing123",
                "address": "192.168.1.100",
                "name": "radius1"
            })
            x.assert_code(201)
            anon_id = x.json["data"]["id"]
            x.assert_data({
                "id": anon_id,
                "name": "radius1",
                ".type": "radius",
                "port": "1812",
                "secret": "testing123",
                "address": "192.168.1.100"
            }, 201)
        with self.subTest("test_auto_name"):
            x = self.post_data(self.base_url + "/radius/config", {
                "port": "1812",
                "secret": "testing123",
                "address": "192.168.1.100",
                "id": "radius1"
            })
            x.assert_data({
                "id": "radius1",
                "name": "radius2",
                ".type": "radius",
                "port": "1812",
                "secret": "testing123",
                "address": "192.168.1.100"
            }, 201)
        with self.subTest("test_taken_name"):
            x = self.post_data(self.base_url + "/radius/config", {
                "port": "1812",
                "secret": "testing123",
                "address": "192.168.1.100",
                "id": "radius3",
                "name": "radius1"
            })
            x.assert_error("name", "Duplicate names are not allowed", RC.INVALID_OPT.val())
        with self.subTest("cleanup_name_tests"):
            x = self.delete(self.base_url + "/radius/config/radius1")
            x.assert_code(200)
            x = self.delete(self.base_url + "/radius/config/"+anon_id)
            x.assert_code(200)

