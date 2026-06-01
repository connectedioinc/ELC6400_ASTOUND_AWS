import sys
import utility_integration as util
import response_codes as codes
sys.path.append("../../../../tests")

class test_fota(util.WrapTest):

    def test_fota_base_functionality(self):
        base_url = "/fota/config"
        with self.subTest("multiple_get"):
            x = self.get(base_url)
            x.assert_data([{
                ".type":"rut_fota",
                "id":"general",
                "enabled":"1",
                "notify": "1",
                "latest":"0",
            }])
        with self.subTest("single_get"):
            x = self.get(base_url + "/general")
            x.assert_data({
                ".type":"rut_fota",
                "id":"general",
                "enabled":"1",
                "notify": "1",
                "latest":"0",
            })
        with self.subTest("configure_fota"):
            x = self.put_data(base_url + "/general", {
                "enabled":"0"
            })
            x.assert_data({
                ".type":"rut_fota",
                "id":"general",
                "enabled":"0",
                "notify": "1",
                "latest":"0",
            })
        with self.subTest("get_configured"):
            x = self.get(base_url + "/general")
            x.assert_data({
                ".type":"rut_fota",
                "id":"general",
                "enabled":"0",
                "notify": "1",
                "latest":"0",
            })
        with self.subTest("return_configuration"):
            x = self.put_data(base_url + "/general", {
                "enabled":"1"
            })
            x.assert_data({
                ".type":"rut_fota",
                "id":"general",
                "enabled":"1",
                "notify": "1",
                "latest":"0",
            })
        
    def test_fota_deletion(self):
        x = self.delete("/fota/config")
        x.assert_error("Validation", "Section deletion is not allowed", codes.ResponseCodes.NO_DELETE.val(), None, None)

    def test_fota_creation(self):
        x = self.post_data("/fota/config", {})
        x.assert_error("Validation", "Section creation is not allowed", codes.ResponseCodes.NO_CREATE.val(), None, None)
