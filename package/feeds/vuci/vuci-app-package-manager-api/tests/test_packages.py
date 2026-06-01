import io
import os
import re
import time
import requests
from utils.ssh import get_ssh
import response_codes as codes
import utility_integration as util
import sys
Env = util.Env
http = Env.http
sys.path.append("../../../../tests")

BASE_CFG_URL = "/package_manager"
MULTI_INSTALL_URL = "/package_manager/actions/install_multiple_packages"
MULTI_REMOVE_URL = "/package_manager/actions/remove_multiple_packages"
MULTI_UPGRADE_URL = "/package_manager/actions/update_multiple_packages"
UPLOAD_PKG_URL = "/package_manager/actions/upload_package"
INSTALL_PKG_URL = "/package_manager/actions/install_package"
UPDATE_PKG_URL = "/package_manager/actions/update_package"
DELETE_PKG_FILES_URL = "/package_manager/actions/delete_install_files"
REMOVE_PKG_URL = "/package_manager/actions/remove_package"
ALL_PKG_STATUS_URL = "/package_manager/all_packages/status"
AVAILABLE_PKG_STATUS_URL = "/package_manager/available_packages/status"
BASE_STATUS_URL = "/package_manager/repository_link/options"
PACKAGE_RESTORE = "/package_manager/restore/config"
TEST_PKG = "german_language_support"
TEST_PKG_IPK_NAME = "vuci-i18n-german"
TEST_PKG_TAR = TEST_PKG + ".tar.gz"
TEST_PKG_PATH = "./files/" + TEST_PKG_TAR
TEST_INVALID_PKG_PATH = "./files/" + "invalid_" +TEST_PKG_TAR
TEST_PKG_DIR = "./files/" + TEST_PKG
PKG_STATUS_URLS = ["/all_packages/status", "/language_packages/status", "/installed_packages/status", "/pending_packages/status", "/available_packages/status"]
PKG_REBOOT = False
PKG_NETWORK_RESTART = False
SLEEP_TIME = 3
RETRIES = 36
RC = codes.ResponseCodes

PKG_TYPES = {
	"UNKNOWN": 0,
	"PENDING": 1,
	"AVAILABLE": 2,
	"INSTALLED": 3,
	"PENDING_ERRORED": 4,
	"INSTALLING": 5,
	"UPDATING": 6,
	"REMOVING": 7,
	"ERRORED": 8,
}

class test_packages(util.WrapTest):
    @classmethod
    def setUpClass(self):
        self.server_connection = False
        self.ssh = get_ssh()
        self.ssh.send_cmd("rm /tmp/pkgman/packages_cache.json") # clear cache
        self.rwrootfs_exists = self.ssh.send_cmd("rwrootfs &> /dev/null ; echo $?").strip() == "0" # TODO: remove this rwrootfs line when pipeline tests are moved to vuci
        res = self.ssh.send_cmd("curl -m 5 `head -n 1 /etc/opkg/teltonikafeeds.conf | awk '{print $3}'` &> /dev/null ; echo $?")
        self.server_connection = res.strip() == "0"
        if self.server_connection:
            res = self.ssh.send_cmd("opkg update &> /dev/null ; echo $?")
            self.server_connection = res.strip() == "0"
        
    @classmethod
    def tearDownClass(self):
        self.ssh.logout()

    def pkg_structure_test(self, pkg, url):
        required_keys = ["type", "description", "package", "tlt_name"]

        if "installed" in url:
            required_keys.append("installed_version")

        if "available" in url:
            required_keys.append("sha256")
            required_keys.append("size")
            required_keys.append("version")
            self.assertTrue(re.search("^[0-9]+$", pkg["size"]))

        if "pending" not in url:
            required_keys.append("depends")
            required_keys.append("installed_size")

            self.assertTrue(re.search("^[0-9]+$", pkg["installed_size"]))

        for key in required_keys:
            self.assertIn(key, pkg)

    def test_packages_url(self):
        x = self.get(BASE_STATUS_URL)
        x.assert_code(200)
        match = re.match(
            r'https://wiki.teltonika-networks.com/view/.+_Package_Downloads#.+', x.json["data"]["packages_url"])
        not match and self.fail("Invalid packages url.")

    def test_package_list_structure(self):
        if not self.server_connection:
            self.skipTest("Internet connection is required for this test.")

        for url in PKG_STATUS_URLS:
            x = self.get(BASE_CFG_URL + url)
            x.assert_code(200)

            for pkg in x.json["data"]:
                self.pkg_structure_test(pkg, url)

    def test_package_is_hidden_correctly(self):
        if not self.server_connection:
            self.skipTest("Internet connection is required for this test.")

        hidden_pkg = []
        pkg_list = self.ssh.send_cmd("gzip -cd /var/opkg-lists/tlt_packages 2>/dev/null").strip()

        for package in pkg_list.split("\r\n\r\n"):
            if "Hidden: 1" in package:
                for package_data in package.splitlines():
                    _ , success, pkg_name = package_data.partition("Package: ")
                    if success:
                        hidden_pkg.append(pkg_name)

        if len(hidden_pkg) == 0:
            self.skipTest("Hidden packages not found.")

        x = self.get(AVAILABLE_PKG_STATUS_URL)
        x.assert_code(200)
        for pkg in x.json["data"]:
            for h_pkg in hidden_pkg:
                self.assertNotEqual(pkg["package"], h_pkg)

    def test_package_SHA256(self):
        self.skipTest("zipped_packages is required for this test")

        if not self.server_connection:
            self.skipTest("Internet connection is required for this test.")

        x = self.get(BASE_CFG_URL + "/all_packages/status")
        x.assert_code(200)

        os.system(f"mkdir -p {TEST_PKG_DIR}")
        os.system(f"rm {TEST_PKG_DIR}/* &> /dev/null")
        os.popen(f"tar -xzvf {TEST_PKG_PATH} -C {TEST_PKG_DIR}").read()
        pkg_sha256 = os.popen(f"sha256sum {TEST_PKG_DIR}/{TEST_PKG_IPK_NAME}*.ipk").read().split()[0]

        pkg = next((pkg for pkg in x.json["data"] if pkg["package"] == TEST_PKG_IPK_NAME), None)
        self.assertTrue(pkg)
        self.assertEqual(pkg["sha256"], pkg_sha256)

    def test_package_install_offline(self):
        self.skipTest("zipped_packages is required for this test")

        with self.subTest("install pkg"):
            x = self.send_file(UPLOAD_PKG_URL, TEST_PKG_PATH)
            x.assert_code(200)
            pkg_data = x.json["data"]

            # test 'sha'
            pkg_sha256 = os.popen(f"sha256sum {TEST_PKG_PATH}").read().split()[0]
            self.assertEqual(pkg_sha256, pkg_data["sha256"])

            # test 'md5'
            pkg_md5 = os.popen(f"md5sum {TEST_PKG_PATH}").read().split()[0]
            self.assertEqual(pkg_md5, pkg_data["checksum"])

            self.assertEqual(pkg_data["package"], TEST_PKG_IPK_NAME)
            self.assertEqual(pkg_data["code"], 0)
            self.assertEqual(pkg_data["verified"], True)
            self.assertEqual(pkg_data["reboot"], PKG_REBOOT)
            self.assertEqual(pkg_data["network_restart"], PKG_NETWORK_RESTART)

            x = http.post(Env.get_api_url() + INSTALL_PKG_URL, json={"data": {"custom": "1", "package": TEST_PKG_IPK_NAME}})
            self.assertEqual(x.status_code, 200)

        with self.subTest("test pkg already installed error"):
            x = self.send_file(UPLOAD_PKG_URL, TEST_PKG_PATH)
            x.assert_code(200)

            x = http.post(Env.get_api_url() + INSTALL_PKG_URL, json={"data": {"custom": "1", "package": TEST_PKG_IPK_NAME}})
            self.assertEqual(x.status_code, 422)
            self.assertDictEqual(x.json()["errors"][0], {
                "code": 2,
                "error": "Package is already installed with same or newer version.",
                "source": "package",
                "section": "install_package"
            })

        if self.server_connection:
            with self.subTest("test pkg newest update error"):
                x = self.post_data(UPDATE_PKG_URL, {"package": TEST_PKG_IPK_NAME})
                x.assert_code(422)
                x.assert_error("package", "Package is already installed with same or newer version.", 2)

            with self.subTest("test invalid pkg name update error"):
                x = self.post_data(UPDATE_PKG_URL, {"package": "invalid_pkg"})
                x.assert_code(422)
                x.assert_error("package", "Invalid package.", 1)

        with self.subTest("delete pkg"):
            x = http.post(Env.get_api_url() + DELETE_PKG_FILES_URL)
            self.assertEqual(x.status_code, 200)
            x = self.post_data(REMOVE_PKG_URL, {"package": TEST_PKG_IPK_NAME})
            x.assert_code(200)

    def test_package_install_errors(self):
        self.skipTest("zipped_packages is required for this test")
        with self.subTest("invalid file error"):
            x = self.send_file(UPLOAD_PKG_URL, io.StringIO("invalid file content\n"))
            x.assert_code(422)
            x.assert_error("Request", "Invalid file.", 1)

        with self.subTest("missing pkg error"):
            x = self.post_data(INSTALL_PKG_URL, {"custom": "1", "package": TEST_PKG_IPK_NAME})
            x.assert_error("package", "Missing uploaded package data.", 8)
            x.assert_code(422)

        with self.subTest("upload invalid pkg"):
            x = self.send_file(UPLOAD_PKG_URL, TEST_INVALID_PKG_PATH)
            x.assert_code(200)

        with self.subTest("check invalid device error"):
            x = self.post_data(INSTALL_PKG_URL, {"custom": "1", "package": TEST_PKG_IPK_NAME})
            x.assert_code(422)
            x.assert_error("package", "Not compatible with Device.", 3)

        with self.subTest("upload valid pkg"):
            x = self.send_file(UPLOAD_PKG_URL, TEST_PKG_PATH)
            x.assert_code(200)

        with self.subTest("fake fw version"):
            self.ssh.send_cmd(f"echo invalid_version > /etc/version")
        with self.subTest("invalid fw version error"):
            x = self.post_data(INSTALL_PKG_URL, {"custom": "1", "package": TEST_PKG_IPK_NAME})
            x.assert_code(422)
            x.assert_error("package", "Not compatible with Firmware.", 4)
        with self.subTest("reset fw version"):
            self.ssh.send_cmd(f"echo {self.release_fw_version} > /etc/version")

        with self.subTest("delete uploaded pkg"):
            x = http.post(Env.get_api_url() + DELETE_PKG_FILES_URL)
            self.assertEqual(x.status_code, 200)

    def test_package_delete_errors(self):
        x = self.post_data(REMOVE_PKG_URL, {})
        x.assert_code(422)
        x.assert_error("package", "Missing required option: package", 103)

        x = self.post_data(REMOVE_PKG_URL, {"package": "not_found_pkg"})
        x.assert_code(422)
        x.assert_error("package", "Invalid package.", 1)


    def test_package_install_online(self):
        if not self.rwrootfs_exists:
            self.skipTest("rwrootfs is required for this test")
        if not self.server_connection:
            self.skipTest("Internet connection is required for this test.")

        x = self.get(ALL_PKG_STATUS_URL)
        x.assert_code(200)

        with self.subTest("delete pkg"):
            x = http.post(Env.get_api_url() + DELETE_PKG_FILES_URL)
            self.assertEqual(x.status_code, 200)
            x = self.post_data(REMOVE_PKG_URL, {"package": TEST_PKG_IPK_NAME})
            res = self.ssh.send_cmd(f"ls -1 /usr/local/usr/lib/opkg/info/{TEST_PKG_IPK_NAME}.control &> /dev/null ; echo $?")
            self.assertNotEqual(res.strip(), "0")

        with self.subTest("install pkg"):
            x = http.post(Env.get_api_url() + INSTALL_PKG_URL, json={"data": {"package": TEST_PKG_IPK_NAME}})
            self.assertEqual(x.status_code, 200)
            res = self.ssh.send_cmd(f"ls -1 /usr/local/usr/lib/opkg/info/{TEST_PKG_IPK_NAME}.control &> /dev/null ; echo $?")
            self.assertEqual(res.strip(), "0")

        with self.subTest("delete pkg"):
            x = http.post(Env.get_api_url() + DELETE_PKG_FILES_URL)
            self.assertEqual(x.status_code, 200)
            x = self.post_data(REMOVE_PKG_URL, {"package": TEST_PKG_IPK_NAME})
            res = self.ssh.send_cmd(f"ls -1 /usr/local/usr/lib/opkg/info/{TEST_PKG_IPK_NAME}.control &> /dev/null ; echo $?")
            self.assertNotEqual(res.strip(), "0")


    def test_package_update_online(self):
        if not self.rwrootfs_exists:
            self.skipTest("rwrootfs is required for this test")
        if not self.server_connection:
            self.skipTest("Internet connection is required for this test.")

        if self.ssh.send_cmd(f"cat /usr/local/usr/lib/opkg/info/{TEST_PKG_IPK_NAME}.control &> /dev/null ; echo $?").strip() != "0":
            with self.subTest("install pkg"):
                x = self.get(ALL_PKG_STATUS_URL)
                x = http.post(Env.get_api_url() + INSTALL_PKG_URL, json={"data": {"package": TEST_PKG_IPK_NAME}})
                self.assertEqual(x.status_code, 200)

        with self.subTest("fake pkg version to older"):
            self.ssh.send_cmd(f"sed -i 's/Version: .*/Version: 0/' /usr/local/usr/lib/opkg/info/{TEST_PKG_IPK_NAME}.control")

        with self.subTest("update pkg"):
            x = http.post(Env.get_api_url() + UPDATE_PKG_URL, json={"data": {"package": TEST_PKG_IPK_NAME}})
            self.assertEqual(x.status_code, 200)

        with self.subTest("delete pkg"):
            x = http.post(Env.get_api_url() + DELETE_PKG_FILES_URL)
            self.assertEqual(x.status_code, 200)
            x = self.post_data(REMOVE_PKG_URL, {"package": TEST_PKG_IPK_NAME})
            x.assert_code(200)

    def test_package_restore(self):
        with self.subTest("Simple update"):
            x = self.put_data(f'{PACKAGE_RESTORE}/package_restore', {
                "enabled": "0"
            })
            x.assert_code(200)

            x = self.put_data(f'{PACKAGE_RESTORE}/package_restore', {
                "enabled": "1"
            })
            x.assert_code(200)

        with self.subTest("Create test"):
            x = self.post(PACKAGE_RESTORE)
            x.assert_error("Validation", "Section creation is not allowed", RC.NO_CREATE.val())

        with self.subTest("Delete test"):
            x = self.delete(f'{PACKAGE_RESTORE}/package_restore')
            x.assert_error("Validation", "Section deletion is not allowed", RC.NO_DELETE.val())

    def test_status_url_validation(self):
        for url in PKG_STATUS_URLS:
            x = self.get(BASE_CFG_URL + url + "ayo")
            x.assert_code(501)
            x.assert_error("Request", "Endpoint for 'statusayo' not implemented.", 100)

        for url in PKG_STATUS_URLS:
            x = self.get(BASE_CFG_URL + url.replace("/status", ""))
            x.assert_code(501)
            x.assert_error("Request", f"Endpoint for '{url.split('/')[1]}' not implemented.", 100)

    def test_multi_actions(self):
        if not self.rwrootfs_exists:
            self.skipTest("rwrootfs is required for this test")
        if not self.server_connection:
            self.skipTest("Internet connection is required for this test.")

        lang_pkgs = []
        with self.subTest("get lang pkgs"):
            x = self.get(ALL_PKG_STATUS_URL)
            for pkg in x.json["data"]:
                if "vuci-i18n" in pkg["package"]:
                    lang_pkgs.append(pkg["package"])

        with self.subTest("ensure packages are removed"):
            x = self.post_data(MULTI_REMOVE_URL, { "packages": lang_pkgs })
            x.assert_code(200)

            retries = RETRIES
            done = False
            while not done and retries > 0:
                done = True
                x = self.get(ALL_PKG_STATUS_URL)
                for pkg in x.json["data"]:
                    if "vuci-i18n" in pkg["package"]:
                        if pkg["type"] != PKG_TYPES["AVAILABLE"]:
                            done = False
                time.sleep(SLEEP_TIME)
                retries -= 1
            self.assertTrue(done, "Remove should be done.")

        with self.subTest("test multi pkgs install"):
            x = self.post_data(MULTI_INSTALL_URL, { "packages": "bober" })
            x.assert_code(422)
            x = self.post_data(MULTI_INSTALL_URL, { "packages": ["bober"] })
            x.assert_code(422)

            x = self.post_data(MULTI_INSTALL_URL, { "packages": lang_pkgs })
            x.assert_code(200)

            with self.subTest("test pkg lock is working"):
                x = self.post_data("/package_manager/actions/install_package", { "package": lang_pkgs[len(lang_pkgs) - 1] })
                x.assert_code(422)
                x.assert_error("package", "Package service is busy, try again later.", 7)

            x = self.get(ALL_PKG_STATUS_URL)
            for pkg in x.json["data"]:
                if "vuci-i18n" in pkg["package"]:
                    self.assertEqual(pkg["type"], PKG_TYPES["INSTALLING"])

            retries = RETRIES
            done = False
            while not done and retries > 0:
                done = True
                x = self.get(ALL_PKG_STATUS_URL)
                for pkg in x.json["data"]:
                    if "vuci-i18n" in pkg["package"]:
                        if pkg["type"] != PKG_TYPES["INSTALLED"]:
                            done = False
                time.sleep(SLEEP_TIME)
                retries -= 1
            self.assertTrue(done, "Install should be done.")

            with self.subTest("test if pkgs can be installed again (install is ignored)"):
                x = self.post_data(MULTI_INSTALL_URL, { "packages": lang_pkgs })
                x.assert_code(200)

                time.sleep(SLEEP_TIME)
                x = self.get(ALL_PKG_STATUS_URL)
                for pkg in x.json["data"]:
                    if "vuci-i18n" in pkg["package"]:
                        self.assertEqual(pkg["type"], PKG_TYPES["INSTALLED"])

        with self.subTest("test multi pkgs upgrade"):
            x = self.post_data(MULTI_UPGRADE_URL, { "packages": "bober" })
            x.assert_code(422)
            x = self.post_data(MULTI_UPGRADE_URL, { "packages": ["bober"] })
            x.assert_code(422)

            x = self.post_data(MULTI_UPGRADE_URL, { "packages": lang_pkgs })
            x.assert_code(200)

            retries = RETRIES
            done = False
            while not done and retries > 0:
                done = True
                x = self.get(ALL_PKG_STATUS_URL)
                for pkg in x.json["data"]:
                    if "vuci-i18n" in pkg["package"]:
                        if pkg["type"] != PKG_TYPES["ERRORED"]:
                            done = False
                time.sleep(SLEEP_TIME)
                retries -= 1
            self.assertTrue(done, "Upgrade should be failed.")

            # fake older pkg versions
            self.ssh.send_cmd("sed 's/Version:.*/Version: 0/g' -i /usr/local/usr/lib/opkg/info/vuci-i18n-*.control")

            x = self.post_data(MULTI_UPGRADE_URL, { "packages": lang_pkgs })
            x.assert_code(200)

            x = self.get(ALL_PKG_STATUS_URL)
            for pkg in x.json["data"]:
                if "vuci-i18n" in pkg["package"]:
                    self.assertEqual(pkg["type"], PKG_TYPES["UPDATING"])

            retries = RETRIES
            done = False
            while not done and retries > 0:
                done = True
                x = self.get(ALL_PKG_STATUS_URL)
                for pkg in x.json["data"]:
                    if "vuci-i18n" in pkg["package"]:
                        if pkg["type"] != PKG_TYPES["INSTALLED"]:
                            done = False
                time.sleep(SLEEP_TIME)
                retries -= 1
            self.assertTrue(done, "Upgrade should be done.")

        with self.subTest("test multi pkgs remove"):
            x = self.post_data(MULTI_REMOVE_URL, { "packages": "bober" })
            x.assert_code(422)
            x = self.post_data(MULTI_REMOVE_URL, { "packages": ["bober"] })
            x.assert_code(422)

            x = self.post_data(MULTI_REMOVE_URL, { "packages": lang_pkgs })
            x.assert_code(200)
            
            with self.subTest("test if tlt_name is exists in packages_status.json when removing pkgs"):
                self.assertIn("Language Support", self.ssh.send_cmd("cat /tmp/pkgman/packages_status.json"))

            x = self.get(ALL_PKG_STATUS_URL)
            for pkg in x.json["data"]:
                if "vuci-i18n" in pkg["package"]:
                    self.assertEqual(pkg["type"], PKG_TYPES["REMOVING"])

            retries = RETRIES
            done = False
            while not done and retries > 0:
                done = True
                x = self.get(ALL_PKG_STATUS_URL)
                for pkg in x.json["data"]:
                    if "vuci-i18n" in pkg["package"]:
                        if pkg["type"] != PKG_TYPES["AVAILABLE"]:
                            done = False
                time.sleep(SLEEP_TIME)
                retries -= 1
            self.assertTrue(done, "Remove should be done.")

            with self.subTest("test if pkgs can be removed again (remove is ignored)"):
                x = self.post_data(MULTI_REMOVE_URL, { "packages": lang_pkgs })
                x.assert_code(200)

                time.sleep(SLEEP_TIME)

                x = self.get(ALL_PKG_STATUS_URL)
                for pkg in x.json["data"]:
                    if "vuci-i18n" in pkg["package"]:
                        self.assertEqual(pkg["type"], PKG_TYPES["AVAILABLE"])
