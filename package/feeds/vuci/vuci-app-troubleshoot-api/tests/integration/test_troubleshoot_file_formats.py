import sys
import utility_integration as util
import response_codes as codes
sys.path.append("../../../../tests")

class troubleshoot_file_formats(util.WrapTest):
    def test_troubleshoot_encrypted_file(self):
        generate_troubleshoot = "/troubleshoot/actions/generate"
        troubleshoot_url = "/troubleshoot/actions/download"
        with self.subTest("decrypted_get"):
            api_url = util.Env.get_api_url()
            generate = util.Env.http.request("POST", f'{api_url}{generate_troubleshoot}', json={"data": {"encrypt":"0","password":"Admin123"}}, files=None, timeout=300)
            response = util.Env.http.request("POST", f'{api_url}{troubleshoot_url}', json={"data": {"type":"troubleshoot"}}, files=None, timeout=30)
            filetype=response.headers['Content-Disposition'][-8:-1]
            self.assertEqual(filetype, ".tar.gz", "Expected to get a .tar.gz file")
