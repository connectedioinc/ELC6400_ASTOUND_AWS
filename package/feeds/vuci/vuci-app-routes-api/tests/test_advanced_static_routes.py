import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes

RC = codes.ResponseCodes

class test_advanced_static_routes(util.WrapTest):

    def create_route(self, url: str, options: dict):
        x = self.post_data(url, options)
        options['id'] = x.resp.json()['data']['id']
        x.assert_data(options, 201)

    def test_advanced_route_rule_base_functionality(self):
        sid = ""
        url = "/ip_rules/ipv4/config"
        options = {
            'priority': "5",
            'in': "lan",
            'out': "lan",
            'src': "192.168.5.254/24",
            'dest': "192.168.10.254/24",
            'tos': "16",
            'mark': "0xFF",
            'invert': "1",
            'action_group': "action",
            'action': "prohibit"
        }
        with self.subTest("create_configuration"):
            x = self.post_data(url, options)
            sid = x.resp.json()['data']['id']
            response_options = options.copy()
            response_options[".type"] = "rule"
            response_options["id"] = sid
            x.assert_data(response_options, 201)
        with self.subTest("edit_configuarion"):
            options['priority'] = "10"
            options['src'] = "192.168.10.254/24"
            options['dest'] = "192.168.5.254/24"
            options['tos'] = "8"
            options['mark'] = "0xAA"
            options['invert'] = "0"
            x = self.put_data(url + "/" + sid, options)
            options['.type'] = "rule"
            options['id'] = sid
            x.assert_data(options)
        with self.subTest("edit_configuration_set_any_none"):
            del options['id']
            options['priority'] = "10"
            options['src'] = "192.168.10.254/24"
            options['dest'] = "192.168.5.254/24"
            options['tos'] = "8"
            options['mark'] = "0xAA"
            options['invert'] = "0"
            options['in'] = "any"
            options['out'] = "none"
            x = self.put_data(url + "/" + sid, options)
            options['.type'] = "rule"
            options['id'] = sid
            x.assert_data(options)
        with self.subTest("delete_configuration"):
            x = self.delete(url + "/" + sid)
            x.assert_data({
                'id': sid
            })

    def test_advanced_route_table_base_functionality(self):
        sid = ""
        url = "/routing_tables/config"
        routes_ipv4 = "/ip_routes/ipv4/config"
        routes_ipv6 = "/ip_routes/ipv6/config"
        options = {
            'table_id': "11",
            'name': "test"
        }
        with self.subTest("create_configuration"):
            x = self.post_data(url, options)
            sid = x.resp.json()['data']['id']
            options['.type'] = "table"
            options['id'] = sid
            x.assert_data(options, 201)
        with self.subTest("create_table_routes"):
            ipv4_options = {
                '.type': "route",
                'interface': "lan",
                'target': "192.168.5.1",
                'netmask': "255.255.255.0",
                'gateway': "192.168.5.254",
                'metric': "21",
                'mtu': "690",
                'type': "local",
                "table": options['table_id']
            }
            ipv6_options = {
                '.type': "route6",
                'interface': "lan",
                'target': "2001:0DB8:ABCD:0012:0000:0000:0000:0000",
                'gateway': "2001:0DB8:ABCD:0012:0000:0000:0000:0002",
                'metric': "21",
                'mtu': "690",
                'type': "multicast",
                "table": options['table_id']
            }
            self.create_route(routes_ipv4, ipv4_options)
            self.create_route(routes_ipv6, ipv6_options)
        with self.subTest("edit_configuration"):
            edit_options = {
                'table_id': "12"
            }
            x = self.put_data(url + "/" + sid, edit_options)
            edit_options['.type'] = "table"
            edit_options['id'] = sid
            edit_options['name'] = options['name']
            x.assert_data(edit_options)
        with self.subTest("check_table_routes_after_edit"):
            x = self.get(routes_ipv4.format(sid))
            self.assertEqual(len(x.resp.json()['data']), 1)
            x = self.get(routes_ipv4.format(sid))
            self.assertEqual(len(x.resp.json()['data']), 1)
        with self.subTest("try_creating_table_with_same_name"):
            x = self.post_data(url, {'name': "test", 'table_id': '11'})
            x.assert_code(422)
            x.assert_error("name", "Table with this route table name already exists.", RC.INVALID_OPT.val())
        with self.subTest("try_creating_table_with_same_table_id"):
            x = self.post_data(url, {'name': "testas", 'table_id': '12'})
            x.assert_code(422)
            x.assert_error("table_id", "Table with this route table ID already exists.", RC.INVALID_OPT.val())
        with self.subTest("check_if_table_routes_are_deleted_with_table"):
            x = self.delete(url + "/" + sid)
            x.assert_data({
                'id': sid
            })
            new_options = {
                'table_id': "12",
                'name': "test"
            }
            x = self.post_data(url, new_options)
            sid = x.resp.json()['data']['id']
            new_options['.type'] = "table"
            new_options['id'] = sid
            x.assert_data(new_options, 201)
            x = self.get(routes_ipv4.format(sid))
            self.assertEqual(len(x.resp.json()['data']), 0)
            x = self.get(routes_ipv4.format(sid))
            self.assertEqual(len(x.resp.json()['data']), 0)
        with self.subTest("delete_configuration"):
            x = self.delete(url + "/" + sid)
            x.assert_data({
                'id': sid
            })
