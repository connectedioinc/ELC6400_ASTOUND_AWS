import response_codes as codes
import utility_integration as util
import sys
sys.path.append("../../../../tests")
HOST_FILE_PATH = "./files/hosts.txt"
DATA = 'example.com\n*.com'


class test_webfilter_hostnames(util.WrapTest):
    url = "/webfilter/config"

    def test_webfilter_functionality(self):
        id = ""
        id2 = ""
        with self.subTest("get_empty_file"):
            x = self.get(self.url)
            x.assert_data({"[]"})
        with self.subTest("test_create_blocking_rule"):
            x = self.post_data(self.url, {
                "enabled": "0",
                "host": "example.com"
            })
            id = x.resp.json()["data"]["id"]
            x.assert_data({
                "enabled": "0",
                ".type": "block",
                "id": id,
                "host": "example.com"
            }, 201)
        with self.subTest("put_blocking_rule"):
            x = self.put_data(f"{self.url}/{id}", {
                "enabled": "0",
                "host": "example123.com"
            })
            x.assert_data({
                "enabled": "0",
                ".type": "block",
                "id": id,
                "host": "example123.com"
            }, 200)
        with self.subTest("delete_blocking_rule"):
            x = self.delete(f"{self.url}/{id}")
            x.assert_data({
                "id": id
            }, 200)
        with self.subTest("test_create_anonymous_blocking_rule"):
            x = self.post_data(self.url, {})
            id = x.resp.json()["data"]["id"]
            x.assert_data({
                ".type": "block",
                "id": id
            }, 201)
        with self.subTest("test_bad_id_fail"):
            x = self.put_data(self.url, [{
                "id": id+"test",
                "enabled": "12",
                "host": "example.com"
            }])
            x.assert_error(
                'UCI', f"Section: {id}test for service does not exist", 113)
        with self.subTest("delete_anonymous_rule"):
            x = self.delete(f"{self.url}/{id}")
            x.assert_data({
                "id": id
            }, 200)
        with self.subTest("upload_file"):
            f = open(HOST_FILE_PATH, "w")
            f.write(DATA)
            f.close()
            x = self.send_file(self.url, HOST_FILE_PATH)
            id = x.resp.json()["data"][0]["id"]
            id2 = x.resp.json()["data"][1]["id"]
            x.assert_data([
                {
                    'id': id,
                    '.type': 'block',
                    'host': 'example.com',
                    'enabled': '1'
                },
                {
                    'id': id2,
                    '.type': 'block',
                    'host': '*.com',
                    'enabled': '1'
                }
            ], 201)
        with self.subTest("test_delete_file"):
            x = self.delete_data(self.url, [id, id2])
            x.assert_data([
                {
                    "id": id
                },
                {
                    "id": id2
                }
            ])

    def test_webfilter_errors(self):
        with self.subTest("test_create_blocking_rule_fail"):
            x = self.post_data(self.url, {
                "enabled": "0",
                "host": "1.1.1.1"
            })
            x.assert_error(
                'host', "Domain names with an optional wildcard (*) at the start are accepted. E.g. example.com or *.example.com .", 103)

        with self.subTest("test_wildcard_fail"):
            x = self.post_data(self.url, {
                "enabled": "0",
                "host": "ds.co.*"
            })
            x.assert_error(
                'host', "Domain names with an optional wildcard (*) at the start are accepted. E.g. example.com or *.example.com .", 103)
        with self.subTest("test_enable_fail"):
            x = self.post_data(self.url, {
                "enabled": "12",
                "host": "example.com"
            })
            x.assert_error('enabled', "Provided value is not '1' or '0'.", 103)
