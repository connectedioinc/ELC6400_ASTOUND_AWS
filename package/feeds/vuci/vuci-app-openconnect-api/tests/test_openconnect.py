import sys
sys.path.append("../../../../tests")
import utility_integration as util
import response_codes as codes
from utils.vpn import firewall_must_be_clean
import response_codes as codes
RC = codes.ResponseCodes

class OpenConnect(util.WrapTest):
	url = "/openconnect/client/config"

	def test_clean_firewall(self):
		id = "tester"
		with firewall_must_be_clean(self):
			x = self.post_data(self.url, { "id": id })
			x.assert_data({
				"id": id,
				".type": "interface",
				"enabled": "0",
				"use_tpm": "0",
				"vpn_protocol": "anyconnect",
			}, 201)
			x = self.put_data(f"{self.url}/{id}", { "enabled": "1", "server": "example.com", "port": "443" })
			x.assert_data({
				"id": id,
				".type": "interface",
				"use_tpm": "0",
				"enabled": "1",
				"vpn_protocol": "anyconnect",
				"port": "443",
				"server": "example.com"
			}, 200)
			self.delete(f"{self.url}/{id}")

	def test_section(self):
		with self.subTest("create_without_port_and_server"):
			id = "tester"
			self.post_data(self.url, { "id": id })
			x = self.put_data(f"{self.url}/{id}", { "enabled": "0" })
			x.assert_data({
				"id": id,
				".type": "interface",
				"enabled": "0",
				"use_tpm": "0",
				"vpn_protocol": "anyconnect",
			}, 200)
			self.delete(f"{self.url}/{id}")

		with self.subTest("create_without_port_and_server_enabled"):
			id = "tester"
			x = self.post_data(self.url, { "id": id, "enabled": "1" })
			x.assert_error("enabled", "Missing required option: server", RC.INVALID_OPT.val())
			self.delete(f"{self.url}/{id}")

		with self.subTest("create_with_port_only"):
			id = "tester"
			x = self.post_data(self.url, { "id": id, "port": "443", "enabled": "1" })
			x.assert_error("enabled", "Missing required option: server", RC.INVALID_OPT.val())
			self.delete(f"{self.url}/{id}")

		with self.subTest("create_with_server_only"):
			id = "tester"
			x = self.post_data(self.url, { "id": id, "server": "example.com", "enabled": "1" })
			x.assert_error("enabled", "Missing required option: port", RC.INVALID_OPT.val())
			self.delete(f"{self.url}/{id}")

		with self.subTest("create_with_port_and_server"):
			id = "tester"
			x = self.post_data(self.url, { "id": id, "port": "443", "server": "example.com", "enabled": "1" })
			x.assert_data({
				"id": id,
				".type": "interface",
				"enabled": "1",
				"vpn_protocol": "anyconnect",
				"use_tpm": "0",
				"port": "443",
				"server": "example.com"
			}, 201)
			self.delete(f"{self.url}/{id}")

		with self.subTest("disable_and_remove_port_and_server"):
			id = "tester"
			x = self.post_data(self.url, { "id": id, "port": "443", "server": "example.com", "enabled": "1" })
			x.assert_data({
				"id": id,
				".type": "interface",
				"enabled": "1",
				"vpn_protocol": "anyconnect",
				"use_tpm": "0",
				"port": "443",
				"server": "example.com"
			}, 201)
			x = self.put_data(f"{self.url}/{id}", { "enabled": "0", "port": "", "server": "" })
			x.assert_data({
				"id": id,
				".type": "interface",
				"enabled": "0",
				"vpn_protocol": "anyconnect",
				"use_tpm": "0",
			}, 200)
			self.delete(f"{self.url}/{id}")

		with self.subTest("enable_without_port_and_server"):
			id = "tester"
			x = self.post_data(self.url, { "id": id, "enabled": "0" })
			x.assert_data({
				"id": id,
				".type": "interface",
				"enabled": "0",
				"vpn_protocol": "anyconnect",
				"use_tpm": "0",
			}, 201)
			x = self.put_data(f"{self.url}/{id}", { "enabled": "1" })
			x.assert_error("enabled", "Missing required option: server", RC.INVALID_OPT.val())
			self.delete(f"{self.url}/{id}")

		with self.subTest("enable_with_port_and_server"):
			id = "tester"
			x = self.post_data(self.url, { "id": id, "port": "443", "server": "example.com", "enabled": "0" })
			x.assert_data({
				"id": id,
				".type": "interface",
				"enabled": "0",
				"vpn_protocol": "anyconnect",
				"port": "443",
				"use_tpm": "0",
				"server": "example.com"
			}, 201)
			x = self.put_data(f"{self.url}/{id}", { "enabled": "1" })
			x.assert_data({
				"id": id,
				".type": "interface",
				"enabled": "1",
				"vpn_protocol": "anyconnect",
				"port": "443",
				"use_tpm": "0",
				"server": "example.com"
			}, 200)
			self.delete(f"{self.url}/{id}")
		
		with self.subTest("delete_enabled_section"):
			id = "tester"
			x = self.post_data(self.url, { "id": id, "port": "443", "server": "example.com", "enabled": "1" })
			x.assert_data({
				"id": id,
				".type": "interface",
				"enabled": "1",
				"vpn_protocol": "anyconnect",
				"port": "443",
				"use_tpm": "0",
				"server": "example.com"
			}, 201)
			x = self.delete(f"{self.url}/{id}")
			x.assert_code(200)

	def test_check_fingerprint_action(self):
		check_url  = "/openconnect/client/actions/check_fingerprint"
		with self.subTest("check_fingerprint_without_port_and_server"):
			x = self.post_data(check_url, {})
			# need to loop thorugh both errors, and check that two errors are present
			error_elements = x.json['errors']
			self.assertEqual(len(error_elements), 2)
			for error in error_elements:
				if error["source"] == "server":
					self.assertEqual(error["error"], "Missing required option: server")
					self.assertEqual(error["code"], RC.INVALID_OPT.val())
				elif error["source"] == "port":
					self.assertEqual(error["error"], "Missing required option: port")
					self.assertEqual(error["code"], RC.INVALID_OPT.val())
				else:
					self.fail(f"Unexpected error source: {error['source']}")

		with self.subTest("check_fingerprint_with_port_and_no_server"):
			x = self.post_data(check_url, { "port": "443" })
			x.assert_error("server", "Missing required option: server", RC.INVALID_OPT.val())

		with self.subTest("check_fingerprint_with_server_and_no_port"):
			x = self.post_data(check_url, { "server": "example.com" })
			x.assert_error("port", "Missing required option: port", RC.INVALID_OPT.val())

		with self.subTest("check_fingerprint_with_invalid_port"):
			x = self.post_data(check_url, { "port": "invalid", "server": "example.com" })
			x.assert_error("port", "Values between 1 and 65535 are accepted.", RC.INVALID_OPT.val())

		with self.subTest("check_fingerprint_with_valid_port_and_invalid_server"):
			x = self.post_data(check_url, { "port": "443", "server": "invalid_server" })
			x.assert_error("server", "Domain names or IP addresses accepted. E.g. 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com.", RC.INVALID_OPT.val())

		with self.subTest("check_fingerprint_with_valid_port_and_server"):
			x = self.post_data(check_url, { "port": "443", "server": "240.0.0.1" }) # i hope this ip is not in use...
			x.assert_error("Request", "Failed to check fingerprint", RC.INCORRECT_REQUEST.val())
