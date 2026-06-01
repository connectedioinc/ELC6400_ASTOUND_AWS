import sys
from time import sleep
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import generate_require_error_messages
http = util.Env.http
api_url = util.Env.get_api_url()

CONFIG_URL = "/aws/jobs/config"

class test_aws_jobs(util.WrapTest):

    def test_aws_jobs_limit(self):
        with self.subTest("Create 50 instances"):
            bulk = {"data": []}
            for x in range(0, 50):
                bulk["data"].append(
                    {
                        "method": "POST",
                        "endpoint": CONFIG_URL,
                        "data": {},
                    }
                )
            x = self.post("/bulk", bulk)
            x.assert_code(207)
            sleep(2)  # Ensure the previous bulk operation is processed because bulk commit forks to background

        with self.subTest("try to create 51st instance"):
            x = self.post_data(CONFIG_URL, {})
            x.assert_code(422)

        with self.subTest("Delete 50 instances"):
            x = self.delete_data(f"{CONFIG_URL}", [str(i) for i in range(1, 51)])
            x.assert_code(200)

    def test_aws_jobs_required_fields(self):
        sid = None
        with self.subTest("Create instance"):
            x = self.post_data(CONFIG_URL, {})
            sid = x.json["data"]["id"]
            x.assert_code(201)

        with self.subTest("Check dependency"):
            x = self.put_data(f"{CONFIG_URL}/{sid}", {
                "enabled": "1",
                "endpoint": "",
                "thing_name": "",
                "cafile": "",
                "certfile": "",
                "keyfile": ""
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", sid, ["endpoint", "thing_name", "cafile", "certfile", "keyfile"]))

        with self.subTest("Delete instance"):
            x = self.delete(f"{CONFIG_URL}/{sid}")
            x.assert_code(200)

    def test_aws_jobs_default_values(self):
        sid = None
        with self.subTest("Check default values"):
            x = self.post_data(CONFIG_URL, {})
            res_body = x.json
            sid = res_body["data"]["id"]
            self.assertEqual(res_body["data"]["mqtt_port"], "8883")
            self.assertEqual(res_body["data"]["mqtt_qos"], "1")
            self.assertEqual(res_body["data"]["mqtt_keepalive"], "120")
            self.assertEqual(res_body["data"]["mqtt_max_loops"], "50")

        with self.subTest("Delete instance"):
            x = self.delete(f"{CONFIG_URL}/{sid}")
            x.assert_code(200)
