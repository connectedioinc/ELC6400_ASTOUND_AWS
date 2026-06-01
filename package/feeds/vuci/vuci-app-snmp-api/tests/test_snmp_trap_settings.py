import utility_integration as util
import sys
from utils.general_api import generate_require_error_messages

sys.path.append("../../../../tests")


class test_snmp_trap_settings(util.WrapTest):
    BASE_URL = "/snmp/trap/global"

    def test_snmp_trap_settings_default_section_creation(self):
        self.get(self.BASE_URL) # for autoskip
        original_section = None

        def check_section():
            x = self.get(self.BASE_URL)
            x.assert_code(200)
            section = x.resp.json()["data"]
            return section

        with self.subTest("check_original_section"):
            original_section = check_section()

        with self.subTest("delete_original_section"):
            self.delete_section("snmptrap", "@server[0]")

        with self.subTest("check_created_section"):
            check_section()

        with self.subTest("restore_original_section"):
            original_section['hosts'] = None
            x = self.put_data(self.BASE_URL, original_section)
            x.assert_code(200)

    def test_basic_update_trap_settings(self):
        x = self.put_data(self.BASE_URL, {
            "enabled": "0",
            "host": "test1.com",
            "port": "410",
            "community": "testtest"
        })
        x.assert_data({
            "enabled": "0",
            "port": "410",
            "community": "testtest",
            "host": "test1.com",
            "hosts": ["test1.com;410"]
        }, 200)

    def test_enable_require_depedency_trap_settings(self):
        with self.subTest("clear config"):
            x = self.put_data(f"{self.BASE_URL}", {
                "enabled": "",
                "host": "",
                "port": "",
                "community": ""
            }).assert_code(200)

        with self.subTest("check depedency"):
            x = self.put_data(f"{self.BASE_URL}", {
                "enabled": "1",
            })
            self.assertListEqual(x.json["errors"], generate_require_error_messages("enabled", "general", ["host", "port", "community"]) )