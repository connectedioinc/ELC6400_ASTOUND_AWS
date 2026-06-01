import sys
import utility_integration as util
import response_codes as codes
from utils.ssh import get_ssh
http = util.Env.http
api_url = util.Env.get_api_url()

sys.path.append("../../../../tests")

STATUS_CODES = {
    "SME_ENABLED": 4,
}

TEST_BACKUP_PATH = "./files/backup.tar.gz"
TEST_BACKUP_ENCRYPTED_PATH = "./files/backup_encrypted.tar.zip"

class test_backup(util.WrapTest):
    @classmethod
    def setUpClass(cls):
        cls.ssh = get_ssh()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.ssh.logout()

    def test_backup_base(self):
        base_url = "/backup"
        date = ""
        md5 = ""
        sha256 = ""
        with self.subTest("create_default_date"):
            x = self.post(base_url + "/actions/create_default", None)
            resp = x.resp
            date = resp.json()["data"]["date"]
            self.assertIn("date", resp.json()["data"])
        with self.subTest("get_default_date"):
            x = self.get(base_url + "/status/default")
            x.assert_data({
                "date":date
            })
        with self.subTest("generate_encrypted_backup"):
            x = self.post_data(base_url + "/actions/generate", {"encrypt":"1", "password": "Backup123"})
            x.assert_code(200)
            resp = x.resp
            md5 = resp.json()["data"]["md5"]
            sha256 = resp.json()["data"]["sha256"]
            self.assertIn("md5", resp.json()["data"])
            self.assertIn("sha256", resp.json()["data"])
        with self.subTest("get_checksums_encrypted"):
            x = self.get(base_url + "/status/backup")
            x.assert_data({
                "md5":md5,
                "sha256":sha256
            })
        with self.subTest("download_encrypted_backup"):
            resp = http.post(api_url + base_url + "/actions/download")
            f = open(TEST_BACKUP_ENCRYPTED_PATH, "wb")
            f.write(resp.content)
            f.close()
        with self.subTest("validate_encrypted_backup_valid"):
            x = self.send_file(base_url + "/actions/upload", TEST_BACKUP_ENCRYPTED_PATH, None, {"encrypt": "1","password": "Backup123"})
            x.assert_data({
                "md5":md5,
                "sha256":sha256
            })
        with self.subTest("validate_encrypted_backup_invalid"):
            x = self.send_file(base_url + "/actions/upload", TEST_BACKUP_ENCRYPTED_PATH, None, {"encrypt": "1","password": "bad_password"})
            x.assert_error("file", "Invalid password provided.", 120)
        with self.subTest("generate_backup"):
            x = self.post_data(base_url + "/actions/generate", {"encrypt":"0"})
            resp = x.resp
            md5 = resp.json()["data"]["md5"]
            sha256 = resp.json()["data"]["sha256"]
            self.assertIn("md5", resp.json()["data"])
            self.assertIn("sha256", resp.json()["data"])
        with self.subTest("get_checksums"):
            x = self.get(base_url + "/status/backup")
            x.assert_data({
                "md5":md5,
                "sha256":sha256
            })
        with self.subTest("download_backup"):
            resp = http.post(api_url + base_url + "/actions/download")
            f = open(TEST_BACKUP_PATH, "wb")
            f.write(resp.content)
            f.close()
        with self.subTest("validate_backup"):
            x = self.send_file(base_url + "/actions/upload", TEST_BACKUP_PATH, None, {"encrypt": "0"})
            x.assert_data({
                "md5":md5,
                "sha256":sha256
            })
        with self.subTest("get_all"):
            x = self.get(base_url + "/status")
            x.assert_data({
                "date":date,
                "md5":md5,
                "sha256":sha256
            })
        with self.subTest("remove_default_date"):
            x = self.post(base_url + "/actions/remove_default", None)
            x.assert_data({
                "date":""
            })
        with self.subTest("remove_backup"):
            x = self.post(base_url + "/actions/delete")
            x.assert_data({
                "md5":"-",
                "sha256":"-"
            })
        with self.subTest("remove_backup_not_found"):
            x = self.post(base_url + "/actions/delete", None)
            x.assert_error("Request", "Backup not found.", codes.ResponseCodes.INCORRECT_REQUEST.val())

    def test_backup_sme(self):
        base_url = "/backup"
        expanded = False
        with self.subTest("set_memory_expansion"):
            res = self.ssh.send_cmd("uci -q get fstab.overlay.sme")
            if res.strip() == "1":
                expanded = True
            else:
                self.ssh.send_cmd("uci set fstab.overlay=\"mount\"; uci set fstab.overlay.target=\"/overlay\"; uci set fstab.overlay.sme=\"1\"; uci commit")
        with self.subTest("generate_backup"):
            x = self.post(base_url + "/actions/generate", {"data": {"encrypt": "0"}})
            x.assert_code(200)
        with self.subTest("unset_memory_expansion"):
            if expanded == False:
                self.ssh.send_cmd("uci delete fstab.overlay; uci commit")
