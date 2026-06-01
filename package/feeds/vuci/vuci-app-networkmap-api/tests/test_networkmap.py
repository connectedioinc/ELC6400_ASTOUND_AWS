import sys
sys.path.append("../../../../tests")
import utility_integration as util
from utils.ssh import get_ssh
import response_codes as codes

RC = codes.ResponseCodes


class test_networkmap(util.WrapTest):
	@classmethod
	def setUpClass(cls):
		cls.ssh = get_ssh()
		cls.ssh.send_cmd("cp -p /etc/config/nlbwmon /tmp/nlbwmon_config &> /dev/null")

	@classmethod
	def tearDownClass(cls) -> None:
		cls.ssh.send_cmd("mv /tmp/nlbwmon_config /etc/config/nlbwmon &> /dev/null")
		cls.ssh.logout()

	def test_networkmap_interfaces_functionality(self):
		endpoint = "/topology/status"
		x = self.get(endpoint)
		x.assert_code(200)
		interfaces = x.json["data"]
		self.assertTrue('interfaces' in interfaces, "Interfaces array can't be empty")

	def test_networkmap_scan_status(self):
		endpoint = "/topology/scan/status"
		x = self.get(endpoint)
		x.assert_code(200)

	def test_networkmap_devices_lan_functionality(self):
		endpoint = "/topology/actions/devices_scan"
		x = self.post_data(endpoint, { "scan_type": "lan" })
		x.assert_code(200)

	def test_networkmap_devices_wan_functionality(self):
		endpoint = "/topology/actions/devices_scan"
		x = self.post_data(endpoint, { "scan_type": "wan" })
		x.assert_code(200)

	def test_networkmap_devices_functionality(self):
		endpoint = "/topology/actions/devices_scan"
		x = self.post_data(endpoint, { "scan_type": "all" })
		x.assert_code(200)

	def not_implemented_test_post(self, endpoint):
		x = self.post(endpoint)
		x.assert_code(404)
		x.assert_error("Request", "Endpoint not implemented", RC.INCORRECT_REQUEST.val())

	def not_implemented_test_get(self, endpoint):
		x = self.get(endpoint)
		x.assert_code(404)
		x.assert_error("Request", "Endpoint not implemented", RC.INCORRECT_REQUEST.val())

	def test_networkmap_response(self):
		with self.subTest("devices_scan_test"):
			self.not_implemented_test_post("/topology/actions/devices_scan/test")
		with self.subTest("start_scan_test"):
			self.not_implemented_test_post("/topology/actions/start_scan/test")
		with self.subTest("status_test"):
			self.not_implemented_test_get("/topology/status/test")
		with self.subTest("scan_test"):
			self.not_implemented_test_get("/topology/scan/test")
		with self.subTest("active_test"):
			self.not_implemented_test_get("/topology/active/test")
