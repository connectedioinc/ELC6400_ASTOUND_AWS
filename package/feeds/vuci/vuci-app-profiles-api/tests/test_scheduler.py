import sys
import utility_integration as util
sys.path.append("../../../../tests")

class test_scheduler(util.WrapTest):

    def test_scheduler_base_functionality(self):
        base_url = "/profiles/scheduler/config"
        id = ""
        with self.subTest("create_profile"):
            x = self.post_data("/profiles/config", {
                "id":"schedulerProfile",
                "from_current_profile":"1"
            })
            x.assert_data({
                "id":"schedulerProfile",
                "profile_id":"1",
                ".type":"profile"
            }, 201, {"updated"})
        with self.subTest("create_section"):
            x = self.post_data(base_url, {})
            resp = x.resp.json()
            id = resp["data"]["id"]
            x.assert_data({
                ".type": "scheduler",
                "enabled": "0",
                ".type": "scheduler",
                "profile_id": "1",
                "period": "week",
                "end_day": "2",
                "start_time": "12:00",
                "end_time": "12:00",
                "start_day": "1"
            }, 201, {"id"})
        with self.subTest("delete_profile_error"):
            x = self.delete("/profiles/config/schedulerProfile")
            x.assert_error("UCI", "Profile 'schedulerProfile' is currently in use by the scheduler", 113)
        with self.subTest("edit_configuration"):
            x = self.put_data(base_url + "/" + id, {
                "enabled": "1",
                "profile_id":"0",
                "period":"month",
                "start_day":"10",
                "start_time":"04:20",
                "end_day":"20",
                "end_time":"14:20",
                "force_last":"1"
            })
            x.assert_data({
                "enabled": "1",
                "end_time": "14:20",
                "force_last": "1",
                "id": id,
                "period": "month",
                "end_day": "20",
                ".type": "scheduler",
                "start_time": "04:20",
                "profile_id": "0",
                "start_day": "10"
            })
        with self.subTest("get_single"):
            x = self.get(base_url + "/" + id)
            x.assert_data({
                "enabled": "1",
                "end_time": "14:20",
                "force_last": "1",
                "id": id,
                "period": "month",
                "end_day": "20",
                ".type": "scheduler",
                "start_time": "04:20",
                "profile_id": "0",
                "start_day": "10"
            })
        with self.subTest("get_multiple"):
            x = self.get(base_url)
            x.assert_data([{
                "enabled": "1",
                "end_time": "14:20",
                "force_last": "1",
                "id": id,
                "period": "month",
                "end_day": "20",
                ".type": "scheduler",
                "start_time": "04:20",
                "profile_id": "0",
                "start_day": "10"
            }])
        with self.subTest("delete_section"):
            x = self.delete(base_url + "/" + id)
            x.assert_data({
                "id":id
            })
        with self.subTest("delete_profile"):
            x = self.delete("/profiles/config/schedulerProfile")
            x.assert_data({
                "id":"schedulerProfile"
            })
