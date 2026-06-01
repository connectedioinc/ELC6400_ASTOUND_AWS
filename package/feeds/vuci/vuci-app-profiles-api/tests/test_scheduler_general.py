import sys
import utility_integration as util
sys.path.append("../../../../tests")

class test_scheduler_general(util.WrapTest):
    def test_scheduler_general_base_functionality(self):
        base_url = "/profiles/scheduler/global"
        with self.subTest("get_single"):
            x = self.get(base_url)
            x.assert_data({
                "enabled": "0"
            })
        with self.subTest("modify"):
            x = self.put_data(base_url, {
                "enabled": "1",
            })
            x.assert_data({
                "enabled": "1"
            })
        with self.subTest("return_configuration"):
            x = self.put_data(base_url, {
                "enabled": ""
            })
            x.assert_data({
                "enabled": "0"
            })

    def test_administration_general_deletion(self):
        x = self.delete("/profiles/scheduler/global")
        x.assert_error("Validation", "Section deletion is not allowed", 111, None, None)
    def test_administration_general_creation(self):
        x = self.post("/profiles/scheduler/global", {})
        x.assert_error("Request", "POST not implemented", 100, None, None)