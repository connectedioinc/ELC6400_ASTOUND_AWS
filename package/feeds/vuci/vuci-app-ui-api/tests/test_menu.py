import sys
sys.path.append("../../tests")
import utility_integration as util

class test_menu(util.WrapTest):

	def test_menu_structure(self):
		base_url = "/ui/config/menu"
		x = self.get(base_url)
		x.assert_code(200)
		data = x.resp.json()["data"]
		menu = data["menu"]

		def check_entries(m):
			for entry in m:
				if "children" in entry:
					check_entries(entry["children"])
				
				for key in ["path", "read_access", "write_access"]:
					self.assertIn(key, entry)

				if ":" not in entry["path"]:
					self.assertIn("title", entry)

				if "view" in entry["path"]:
					self.assertIn("index", entry)

		check_entries(menu[0])

		for path, entries in menu[1].items():
			check_entries(entries)
