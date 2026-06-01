import sys
import response_codes as codes
import utility_integration as util
from utils.ssh import get_ssh
from utils.general_api import is_package_installed
sys.path.append("../../../../tests")
http = util.Env.http
api_url = util.Env.get_api_url()

RC = codes.ResponseCodes

ERROR_CODES = {
	"WRONG_FILE_EXTENSION": 1,
	"FILE_NOT_EXISTS": 2,
	"INVALID_THEME_FILE": 4,
	"THEME_SELECTED": 5,
	"FAILED_TO_DELETE": 6,
	"UPLOAD_LIMIT": 7
}

TEST_THEME_PATH = "./files/hotspot_theme.tar.gz"
TEST_THEME_INVALID_PATH = "./files/hotspot_theme_bad.tar.gz"

class test_hotspot_themes(util.WrapTest):
    default_theme_id = "default"
    custom_theme_packages = ["airport", "airport2", "bus", "coffee_shop", "grocery_store", "office", "park", "ship", "station"]

    url_theme = "/hotspot/themes"
    url_download = f"{url_theme}/{default_theme_id}/actions/download"
    url_reset = f"{url_theme}/{default_theme_id}/actions/reset"
    url_config = f"{url_theme}/config/"
    url_default = f"{url_theme}/{default_theme_id}"
    url_files = f"{url_theme}/options"
    url_landing_page = f"{url_theme}/global"

    def setUp(self):
        if not is_package_installed(self, "hotspot"):
            self.skipTest("Hotspot package is not installed")

    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()
        cls.export_landing_page_theme()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    @classmethod
    def export_landing_page_theme(cls):
        resp = http.post(f"{api_url}{cls.url_download}")
        f = open(TEST_THEME_PATH, "wb")
        f.write(resp.content)
        f.close()

        f = open(TEST_THEME_INVALID_PATH, "wb")
        f.write(b"-")
        f.close()

    def get_installed_themes(self):
        themes = []
        for package in self.custom_theme_packages:
            if is_package_installed(self, f"hs_{package}"):
                pkg = self.ssh.send_cmd(f"cat /usr/lib/opkg/info/hs_theme_{package}.control").strip()
                name = pkg.split("Description: ")[1].split("\n")[0].strip().replace("Hotspot landing page", "").strip().rstrip(".")
                themes.append({
                    "id": package,
                    ".type": "theme",
                    "name": name,
                    "custom": "0"
                })
        return themes

    def test_base_functionality(self):
        files = []
        default_contents = {}
        with self.subTest("get_themes"):
            x = self.get(f"{self.url_theme}/config")
            x.assert_code(200)
            resp = x.resp.json()
            themes = self.get_installed_themes()
            themes.append({
                "id": self.default_theme_id,
                ".type": "theme",
                "name": "Default theme",
                'custom': '0'
            })
            self.assertListEqual(
                sorted(resp["data"], key=lambda x: x["id"]),
                sorted(themes, key=lambda x: x["id"])
            )

        with self.subTest("get_file_contents"):
            x = self.get(self.url_files)

            for file in x.resp.json()["data"]:
                name = file["file"].replace("landing_page.css", "css").replace(".htm", "")
                theme = self.get(f"{self.url_default}/config/{name}")
                theme.assert_code(200)
                self.assertTrue("file" in theme.resp.json()["data"], f"Expected '{name}' theme file to have data")

                files.append(name)
                default_contents[name] = theme.resp.json()["data"]["file"]
        with self.subTest("change_file_content"):
            
            for file in files:
                x = self.put_data(f"{self.url_default}/config/{name}", {
                    "file": "change"
                })
            for file in files:
                x = self.get(f"{self.url_default}/config/{name}")
                x.assert_data({
                    "file": "change\n"
                })

        with self.subTest("reset_file_content"):
            for file in files:
                x = self.post_data(self.url_reset, {
                    "file": f"{file}.htm"
                })
                x.assert_code(200)
                x.assert_data({
                    "file": default_contents[file]
                })

            for file in files:
                x = self.get(f"{self.url_default}/config/{file}")
                x.assert_data({
                    "file": default_contents[file]
                })

        with self.subTest("change_file_content_validation"):

            x = self.put_data(f"{self.url_default}/config/nonexisting", {
                "file": "change"
            })
            x.assert_error("Validation", "File not found.", 103)

        with self.subTest("reset_file_content_validation"):
            x = self.post_data(self.url_reset, {
                "file": "nonexisting.htm"
            })
            x.assert_error("file", "Must be one of the following values [landing_page.css, header.htm, login.htm, login_mac.htm, login_sso.htm, otp_login.htm, signup.htm, otp_signup.htm, success.htm, access_denied.htm, tos.htm, css.htm].", RC.INVALID_OPT.val())

    def test_custom_theme(self):
        with self.subTest("upload_custom_theme_validation"):
            x = self.send_file(f"{self.url_theme}/config", "files/small_file")
            x.assert_error("filename", "File extension is incorrect.", ERROR_CODES["WRONG_FILE_EXTENSION"])

            x = self.send_file(f"{self.url_theme}/config", TEST_THEME_INVALID_PATH)
            x.assert_error("Upload", "Invalid custom theme file.", ERROR_CODES["INVALID_THEME_FILE"])

        with self.subTest("upload_custom_theme"):
            x = self.send_file(f"{self.url_theme}/config", TEST_THEME_PATH)
            x.assert_code(200)

            self.assertTrue(self.ssh.send_cmd("ls /etc/chilli/hotspotlogin/cgi-bin/themes/custom_theme_1 &> /dev/null; echo $?").strip() == "0")
            self.assertTrue(self.ssh.send_cmd("ls /etc/chilli/hotspotlogin/themes/custom_theme_1 &> /dev/null; echo $?").strip() == "0")

        with self.subTest("check_custom_theme"):
            x = self.get(f"{self.url_theme}/config")
            x.assert_code(200)
            resp = x.resp.json()

            themes = self.get_installed_themes()
            themes.append({
                "id": self.default_theme_id,
                ".type": "theme",
                "name": "Default theme",
                'custom': '0'
            })
            themes.append({
                "id": "custom_theme_1",
                ".type": "theme",
                "name": "Custom Theme 1",
                "custom": "1"
            })
            self.assertListEqual(
                sorted(resp["data"], key=lambda x: x["id"]),
                sorted(themes, key=lambda x: x["id"])
            )

        with self.subTest("use_custom_theme"):
            x = self.put_data(self.url_landing_page, {
                "theme": "custom_theme_1"
            })
            x.assert_data({
                "theme": "custom_theme_1"
            }, 200)

        with self.subTest("delete_using_theme"):
            x = self.delete(f"{self.url_theme}/config/custom_theme_1")
            x.assert_error("custom_theme_1", "Theme is currently being used.", ERROR_CODES["THEME_SELECTED"])

        with self.subTest("delete_custom_theme"):
            self.put_data(self.url_landing_page, {"theme": self.default_theme_id}).assert_code(200)

            x = self.delete(f"{self.url_theme}/config/custom_theme_1")
            x.assert_code(200)

            self.assertTrue(self.ssh.send_cmd("ls /etc/chilli/hotspotlogin/cgi-bin/themes/custom_theme_1 &> /dev/null; echo $?").strip() == "1")
            self.assertTrue(self.ssh.send_cmd("ls /etc/chilli/hotspotlogin/themes/custom_theme_1 &> /dev/null; echo $?").strip() == "1")

        with self.subTest("delete_non_existing_theme"):
            x = self.delete(f"{self.url_theme}/config/custom_theme_1")
            x.assert_error("Validation", "ID: Must be one of the following values [].", RC.INVALID_SECTION.val())
