import sys
from time import sleep
sys.path.append("../../../../tests")
import utility_integration as util
from utils.general_api import get_modems, generate_require_error_messages, delete_all
http = util.Env.http
api_url = util.Env.get_api_url()

PING_URL = "/auto_reboot/ping_wget/config"
PERIODIC_URL = "/auto_reboot/scheduler/config"

class test_auto_reboot(util.WrapTest):
	modems_id = []
	ping_reboot_data = []
	periodic_reboot_data = []

	def save_and_remove(url, save):
		delete_id = []
		x = http.get(api_url + url)
		if x.status_code == 200:
			for instance in x.json()["data"]:
				save.append(dict(filter(lambda elem: elem[0] != "id", instance.items())))
				delete_id.append(instance["id"])
		if len(delete_id) > 0:
			x = http.delete(f"{api_url}{url}", json={"data": delete_id})

	def revert(url, data):
		bulk = {"data": []}
		for instance in data:
			bulk["data"].append(
				{
					"method": "POST",
					"endpoint": url,
					"data": instance,
				}
			)
		if len(bulk["data"]) > 0:
			x = http.post(f"{api_url}/bulk", json=bulk)

	@classmethod
	def setUpClass(cls):
		cls.save_and_remove(PING_URL, cls.ping_reboot_data)
		cls.save_and_remove(PERIODIC_URL, cls.periodic_reboot_data)

	@classmethod
	def tearDownClass(cls):
		cls.revert(PING_URL, cls.ping_reboot_data)
		cls.revert(PERIODIC_URL, cls.periodic_reboot_data)

	def test_ping_reboot_limit(self):
		bulk = {"data": []}
		for x in range(0, 31):
			bulk["data"].append(
				{
					"method": "POST",
					"endpoint": PING_URL,
					"data": {},
				}
			)
		with self.subTest("Try create 31 instances"):
			x = self.post("/bulk", bulk)
			res_body = x.resp.json()
			self.assertEqual(res_body["data"][30]["errors"][0]["error"], "Can't create more instances. Only 30 instances are allowed")

		sleep(1)
		with self.subTest("Delete all"):
			delete_all(self, PING_URL)

	def test_periodic_reboot_limit(self):
		bulk = {"data": []}
		for x in range(0, 31):
			bulk["data"].append(
				{
					"method": "POST",
					"endpoint": PERIODIC_URL,
					"data": {},
				}
			)
		res_body = None
		with self.subTest("Try create 31 instances"):
			x = self.post("/bulk", bulk)
			res_body = x.resp.json()
			self.assertEqual(res_body["data"][30]["errors"][0]["error"], "Can't create more instances. Only 30 instances are allowed")

		sleep(1)
		with self.subTest("Delete all"):
			delete_all(self, PERIODIC_URL)

	def test_require_test_periodic_reboot(self):
		modems = get_modems(self)
		sid = None
		with self.subTest("Create instance"):
			x = self.post_data(PERIODIC_URL,{})
			sid = x.resp.json()["data"]["id"]
			x.assert_code(201)

		with self.subTest("Check dependecy"):
			x = self.put_data(f"{PERIODIC_URL}/{sid}", {
				"enable": "1",
				"action": ""
			})
			self.assertListEqual(x.json["errors"], generate_require_error_messages("enable", sid, ["period", "action", "time"]))

			x = self.put_data(f"{PERIODIC_URL}/{sid}", {
				"enable": "1",
				"action": "",
				"period": "week"
			})
			self.assertListEqual(x.json["errors"], generate_require_error_messages("enable", sid, ["action", "time", "days"]))

			x = self.put_data(f"{PERIODIC_URL}/{sid}", {
				"enable": "1",
				"action": "",
				"period": "month"
			})
			self.assertListEqual(x.json["errors"], generate_require_error_messages("enable", sid, ["action", "time", "month_day", "months"]))

			if len(modems) > 1:
				x = self.put_data(f"{PERIODIC_URL}/{sid}", {
					"enable": "1",
					"action": "2"
				})
				self.assertListEqual(x.json["errors"], generate_require_error_messages("enable", sid, ["period", "time", "modem"]))

		with self.subTest("Delete instance"):
			x = self.delete(f"{PERIODIC_URL}/{sid}")
			x.assert_code(200)


	def test_require_test_ping_reboot(self):
		modems = get_modems(self)
		sid = None
		with self.subTest("Create instance"):
			x = self.post_data(PING_URL,{})
			sid = x.resp.json()["data"]["id"]
			x.assert_code(201)

		with self.subTest("Check dependecy"):
			x = self.put_data(f"{PING_URL}/{sid}", {
				"enable": "1",
				"time_out": "",
				"packet_size": "",
				"retry": ""
			})
			self.assertListEqual(x.json["errors"], generate_require_error_messages("enable", sid, ["type", "action", "time", "retry", "time_out"]))

			x = self.put_data(f"{PING_URL}/{sid}", {
				"enable": "1",
				"type": "wget",
				"time_out": "",
				"packet_size": "",
				"retry": ""
			})
			self.assertListEqual(x.json["errors"], generate_require_error_messages("enable", sid, ["action", "time", "retry", "time_out", "url"]))


		with self.subTest("Delete instance"):
			x = self.delete(f"{PING_URL}/{sid}")
			x.assert_code(200)

	def test_periodic_reboot_base_functionality(self):

		if len(self.modems_id) == 1:
			with self.subTest("single_modem_test"):
				x = self.post_data(PERIODIC_URL,{
					".type": "reboot_instance",
					"modem": self.modems_id[0]
				})
				if x.resp.status_code != 422:
					self.assertFalse(x.resp.status_code, "Expected config not to be saved with 'modem' value when device has one modem")

		elif len(self.modems_id) > 1:
			with self.subTest("multi_modem_test"):
				self.crud_test(PERIODIC_URL,{
					".type": "reboot_instance",
					"modem": self.modems_id[0],
					"action": "1"
				},
				{
					".type": "reboot_instance",
					"enable": "0", 
					"action": "1",
					"period": "month",
					"force_last": "0",
					"months": ["1", "10"],
					"month_day": ["6"],
					"time" : ["12:00"],
					"modem": self.modems_id[1]
				})

		with self.subTest("month"):
			self.crud_test(PERIODIC_URL, {
				".type": "reboot_instance",
				"action": "1"
			},
			{
				".type": "reboot_instance",
				"enable": "0", 
				"action": "1",
				"period": "month",
				"force_last": "0",
				"months": ["1", "10"],
				"month_day": ["6"],
				"time" : ["12:00"]
			})

		with self.subTest("week"):
			self.crud_test(PERIODIC_URL, {
				".type": "reboot_instance",
				"action": "1"
			},
			{
				".type": "reboot_instance",
				"enable": "0", 
				"action": "1",
				"period": "week",
				"days": ["wed", "fri"],
				"time" : ["14:00", "18:00"]
			})

	def test_ping_reboot_base_functionality(self):
		base_url = "/auto_reboot/ping_wget/config"

		with self.subTest("ping"):
			self.crud_test(PING_URL,{
				".type":"ping_reboot",
				"retry": "2",
				"packet_size": "56",
				"host": "1.1.1.1",
				"ip_type": "ipv4",
				"type": "ping",
				"interface": "1",
				"time_out": "10"
			},
			{
				".type":"ping_reboot",
				"retry": "2",
				"packet_size": "69",
				"host": "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
				"ip_type": "ipv6",
				"type": "ping",
				"interface": "1",
				"time_out": "10"
        	})

		with self.subTest("wget"):
			self.crud_test(PING_URL,{
				".type":"ping_reboot",
				"retry": "2",
				"packet_size": "56",
				"ip_type": "ipv4",
				"type": "wget",
				"time_out": "10"
			},
			{
				".type":"ping_reboot",
				"retry": "2",
				"packet_size": "56",
				"ip_type": "ipv4",
				"type": "wget",
				"time_out": "10",
				"url": "http://www.example.com"
			})

		if len(self.modems_id) == 1:
			with self.subTest("single_modem_test"):
				x = self.post_data(PING_URL,{
					".type":"ping_reboot",
					"retry": "2",
					"packet_size": "56",
					"host": "1.1.1.1",
					"ip_type": "ipv4",
					"type": "ping",
					"interface": "1",
					"time_out": "10",
					"modem": self.modems_id[0]
				})
				if x.resp.status_code != 422:
					self.assertFalse(x.resp.status_code, "Expected config not to be saved with 'modem' value when device has one modem")

		elif len(self.modems_id) > 1:
			with self.subTest("multi_modem_test"):
				self.crud_test(PING_URL,{
					".type":"ping_reboot",
					"retry": "2",
					"packet_size": "56",
					"host": "1.1.1.1",
					"ip_type": "ipv4",
					"type": "ping",
					"interface": "1",
					"time_out": "10",
					"modem": self.modems_id[0]
				},
				{
					".type":"ping_reboot",
					"retry": "2",
					"packet_size": "56",
					"type": "ping",
					"time_out": "10",
					"interface": "2",
					"ip_type1": "ipv4",
					"host1": "8.8.8.8",
					"ip_type2": "ipv6",
					"host2": "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
					"host": "1.1.1.1",
					"ip_type": "ipv4",
					"modem": self.modems_id[1]
				})

	def test_ping_reboot_option_require_references(self):
		"""In api-core option requires were using the wrong option references in self:_get_value(optname) function
		and this caused incorrect checking if options had custom getters (the value of the option which requires
		another option was returned instead of the required option's value). This test
		checks if option requires are using correct references"""
		section_id = None
		with self.subTest("create section"):
			x = self.post(PING_URL, {"data": {"enable": "0", "type": "wget", "action": "1", "interface": "1", "url": "http://8.8.8.8", "retry": "2", "time_out": "10", "time": "5"}})
			section_id = x.json["data"]["id"]

		with self.subTest("main test"):
			x = self.put(f"{PING_URL}/{section_id}", {"data": {"enable": "1"}})
			x.assert_code(200)
			
		with self.subTest("delete section"):
			self.delete(f"{PING_URL}/{section_id}").assert_code(200)