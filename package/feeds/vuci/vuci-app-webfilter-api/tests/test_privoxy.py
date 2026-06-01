import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes

class test_webfilter_privoxy(util.WrapTest):
    url = "/webfilter/privoxy/config"
    def test_webfilter_functionality(self):
        with self.subTest("test_get_section"):
            x = self.get(self.url)
            x.assert_data([{
                "enabled": "0",
                ".type": "privoxy",
                "id": "general",
            }])
        with self.subTest("edit_general_config"):
            x = self.put_data(f"{self.url}/general", {
                "enabled": "0",
                ".type": "privoxy",
                "mode": "blacklist",
                "url": ["*.com", "*.lt"]
            })
            x.assert_data({
                "id": "general",
                "enabled": "0",
                ".type": "privoxy",
                "mode": "blacklist",
                "url": ["*.com", "*.lt"]
            })
        with self.subTest("reset"):
            x = self.put_data(f"{self.url}/general", {
                "enabled": "0",
                ".type": "privoxy",
                "url": [],
                "mode": ""
            })
            x.assert_data({
                "id": "general",
                "enabled": "0",
                ".type": "privoxy",
            })