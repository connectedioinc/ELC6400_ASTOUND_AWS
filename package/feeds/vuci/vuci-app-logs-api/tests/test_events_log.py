import sys
import utility_integration as util
sys.path.append("../../../../tests")

class events_log(util.WrapTest):

    def check_endpoint(self, endpoint:str = ""):
        base_url = "/events_log/config"
        keys = ["type", "id", "event", "event_type", "date", "timestamp"]
        if endpoint == "":
            keys.insert(1, "group")
        x = self.get(base_url + endpoint)
        data = x.resp.json()["data"]
        for d in data:
            self.assertCountEqual(list(d.keys()), keys)
        x.assert_code(200)

    def test_events_log_base_functionality(self):

        with self.subTest("get_all"):
            self.check_endpoint()
        with self.subTest("get_system"):
            self.check_endpoint("/system")
        with self.subTest("get_events"):
            self.check_endpoint("/events")
        with self.subTest("get_connections"):
            self.check_endpoint("/connections")
        with self.subTest("get_network"):
            self.check_endpoint("/network")

    def test_events_log_limit_query(self):
        base_url = "/events_log/config"
        keys = ["type", "group", "id", "event", "event_type", "date", "timestamp"]
        x = self.get(base_url + "?limit=5")
        data = x.resp.json()["data"]
        for d in data:
            self.assertCountEqual(list(d.keys()), keys)
        metadata = x.resp.json()["metadata"]
        self.assertEqual(metadata["limit"], "5")
        self.assertIn("total", metadata)
        x.assert_code(200)

    def test_events_log_limit_and_offset_query(self):
        base_url = "/events_log/config"
        keys = ["type", "group", "id", "event", "event_type", "date", "timestamp"]
        x = self.get(base_url + "?limit=5&offset=10")
        data = x.resp.json()["data"]
        for d in data:
            self.assertCountEqual(list(d.keys()), keys)
        metadata = x.resp.json()["metadata"]
        self.assertEqual(metadata["limit"], "5")
        self.assertEqual(metadata["offset"], "10")
        self.assertIn("total", metadata)
        x.assert_code(200)