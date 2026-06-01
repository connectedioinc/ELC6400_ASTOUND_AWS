import unittest
import sys
import subprocess
import time
# spooky action at a distance
sys.path.append("../../tests")
import utility_integration as util
from utility_integration import Env, test_suite_title
import response_codes as codes

RC = codes.ResponseCodes

TODO = "TODO connection gets reset because the python lib or my usage of it does not expect that the connection will be cut and response provided if some file validation fails"
# creates or checks if a tmp file is in router to see if the core has been initialized
# if it was then testing begins, else all files are uploaded and paths are updated
SSH_FLAGS = '-o LogLevel=ERROR  -o "UserKnownHostsFile /dev/null" -o "StrictHostKeyChecking no" '
def init_core():
    def send_command(cmd):
        out, err = subprocess.Popen(f'sshpass -p {Env.password} ssh {SSH_FLAGS}root@{Env.ip} {cmd}', shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()
        return out.decode('ascii'), err.decode('ascii')
    def send_file(file, location):
        out, err = subprocess.Popen(f"sshpass -p {Env.password} scp -r {SSH_FLAGS} {file} root@{Env.ip}:{location}", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()
        return out.decode('ascii'), err.decode('ascii')
    out, _ = send_command("ls /tmp/.core_test")
    # if backend testing endpoints are initialized the no further modification is made
    if out:
        return
    print("Initializing Core helper endpoints")
    send_command("touch /tmp/.core_test")
    send_file("../api-core/files/usr/lib/lua/api/paths_index.lua", "/usr/lib/lua/api/paths_index.lua")
    send_file("Postman/files/*", "/")
    # TODO failed to move SED logic to python due to quotes, using script for now
    subprocess.Popen(f"../scripts/init_core.sh -p {Env.password} -a {Env.ip}", shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).communicate()
    # sleep is to give time for rpcd to restart
    time.sleep(1)
    # A new session is created due to rpcd restart that is needed for helper endpoint acls
    Env.refresh_token()
    print("Core initialization is finished")


init_core()
@unittest.skip("For manual testing")
@test_suite_title("API Core: performance")
class test_performance(util.WrapTest):
    # Initial
    # Result in seconds: 0.03515 for GET after 100 iterations
    # Result in seconds: 0.03569 for GET after 10 iterations
    # Logger and Query
    # Result in seconds: 0.03134 for GET after 10 iterations
    def test_firewall_get_speed(self):
        iterations = 10
        sum_time = 0

        for i in range(iterations):
            x = self.get('/firewall/traffic_rules/config')
            sum_time = sum_time + x.resp.elapsed.total_seconds()

        result_time = sum_time / iterations
        self.fail(f"Result in seconds: {result_time:2.4} for GET after {iterations} iterations")

    # Initial
    # Result in seconds: 0.3774 for PUT after 100 iterations
    # Result in seconds: 0.3716 for PUT after 10 iterations
    # Logger and Query
    # Result in seconds: 0.3706 for PUT after 10 iterations
    def test_firewall_put_speed(self):
        iterations = 10
        sum_time = 0
        data = []

        for i in range(5, 14):
            data.append(
                {
                    "id": str(i),
                    "target": "ACCEPT"
                }
            )

        for i in range(iterations):
            x = self.put_data('/firewall/traffic_rules/config',data)
            sum_time = sum_time + x.resp.elapsed.total_seconds()

        result_time = sum_time / iterations
        self.fail(f"Result in seconds: {result_time:2.4} for PUT after {iterations} iterations")

@test_suite_title("API Core: info")
class test_unauthorized_info(util.WrapTest):
    def test_info(self):
        x = self.get('/unauthorized/status')
        x.assert_code(200)
        x = x.resp
        self.assertIn("lang", x.json()['data'])
        self.assertIn("device_name", x.json()['data'])
        self.assertIn("api_version", x.json()['data'])
        self.assertIn("device_identifier", x.json()['data'])

@test_suite_title("API Core: Login")
class test_login(util.WrapTest):
    url = "/login"

    def test_incorrect_method(self):
        x = self.delete(self.url)
        x.assert_code(501)
        x.assert_error("Request", "HTTP method not supported for this endpoint, please use POST", RC.INCORRECT_REQUEST.val())

    def test_incorrect_info(self):
        x = self.post(self.url, {"username": "x", "password": "y"})
        x.assert_code(401)
        x.assert_error("Authorization", "Login failed", RC.UNAUTHORIZED.val())

    def test_incorrect_data_type(self):
        x = self.post(self.url, {"username": [], "password": {}})
        x.assert_code(400)
        x.assert_error("Authorization", "Username and/or password must be a string", RC.INVALID_OPT.val())

    def test_no_info(self):
        x = self.post(self.url, {})
        x.assert_code(400)
        x.assert_error("Authorization", "Username and/or password is missing", RC.UNAUTHORIZED.val())

    def test_success(self):
        x = self.post(self.url, {"username": Env.username, "password": Env.password})
        x.assert_code(200)
        x = x.resp
        # self.assertIn("jwt_token", x.json()["data"])
        self.assertIn("data", x.json())
        self.assertIn("ubus_rpc_session", x.json())
        self.assertIn("acls", x.json())
        self.assertIn("timeout", x.json())
        self.assertIn("expires", x.json())

# JWT removed, leaving tests just in case JWT returns
# @test_suite_title("API Core: JWT")
# class test_jwt(util.WrapTest):
#     def test_incorrect_token(self):
#         headers = {"Authorization": "Bearer aaaa.bbbbb.cccc"}
#         x = Env.http.get(Env.get_api_url() + "/services/test", headers=headers, json={})
#         self.response_format(x)
#         wrap_x = util.WrapResponse(x, self)
#         wrap_x.assert_error("Authorization", "Malformed or incorrect token", RC.INVALID_TOKEN.val())

#     def test_unauthorized_access(self):
#         x = self.post("/services/test_unauthorized/config", {})
#         x.assert_error("Authorization", "Unauthorized", RC.UNAUTHORIZED.val())

# TODO need a good way to get a an expired token as between FW reinstalls the hardcoded one is simply incorrect due to the changed secret in FW
    # def test_expired_token(self):
    #     # this is an old valid token
    #     headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwiZ3JvdXAiOiJyb290Iiwic2lkIjoiNTY5OGEwYzI4OTg4NmIzZjVhMWMwZjE0ZTM2MGI4YjMifQ.UsT-43r-dsk5F06V6EMhvVSeWJ2Tq_ehpzbyQ2vTOOQ"}
    #     x = Env.http.get(self.env.get_full_url_api() + "/services/test", headers=headers, json={})
    #     self.general_tests(x)
    #     wrap_x = util.WrapResponse(x, self)
    #     wrap_x.assert_error("Authorization", "Expired bearer token", RC.INVALID_TOKEN.val())


@test_suite_title("API Core: Dispatcher")
class test_dispatcher(util.WrapTest):
    def test_empty_route(self):
        x = self.get("")
        x.assert_code(404)
        x.assert_error("Request", "Endpoint not specified", RC.INCORRECT_REQUEST.val())

    def test_empty_route_with_slash(self):
        x = self.get("/")
        x.assert_code(404)
        x.assert_error("Request", "Endpoint not specified", RC.INCORRECT_REQUEST.val())

    def test_incorrect_route(self):
        x = self.get("/afffafa")
        x.assert_code(404)
        x.assert_error( "Request", "Endpoint not implemented", RC.INCORRECT_REQUEST.val())

    def test_unsupported_method(self):
        x = self.request("patch", "/services/test")
        x.assert_error("Request", "HTTP method not supported. Supported methods: [POST, PUT, GET, DELETE]", RC.INCORRECT_REQUEST.val())

    def test_post_no_body(self):
        x = self.post("/services/test/config")
        x.assert_code(400)
        x.assert_error("Validation", "Invalid POST structure, data object is missing", RC.INVALID_STRUCT.val())

    def test_put_incorrect_json(self):
        x = Env.http.put(f'{Env.get_api_url()}/services/test/config/options',
            headers={"content-type": "application/json"},
            data='{{{"data":{"list": ["aa "b"}}'
        )
        wrap_x = util.WrapResponse(x, self)
        wrap_x.assert_code(400)
        wrap_x.assert_error("JSON body", "quoted object property name expected", RC.INCORRECT_REQUEST.val())

    def test_post_unsupported_body_type(self):
        x = Env.http.put(Env.get_api_url() + "/services/test", data={'key': 'value'})
        x = util.WrapResponse(x, self)
        x.assert_code(400)
        x.assert_error("Request", "Content type not supported or malformed.", RC.INCORRECT_REQUEST.val())

    def test_incorrect_token(self):
        headers = {"Authorization": f"Bearer asassas"}
        x = Env.http.get(Env.get_api_url() + "/services/test/config", headers=headers)
        x = util.WrapResponse(x, self)
        x.assert_code(401)
        x.assert_error("Authorization", "Expired bearer token", RC.INVALID_TOKEN.val())

    def test_missing_token(self):
        x = Env.http.get(Env.get_api_url() + "/services/test", headers={"Authorization": f""})
        x = util.WrapResponse(x, self)
        x.assert_code(401)
        x.assert_error("Authorization", "Missing bearer token", RC.LOGIN_FAILED.val())

    @unittest.skip(TODO)
    def test_incorrect_file_upload_http_method(self):
        files = {'file': open("files/small_file", 'rb')}
        x = Env.http.put(Env.get_api_url() + "/services/test", files=files)
        self.general_tests(x)

        wrap_x = util.WrapResponse(x, self)
        wrap_x.assert_code(400)
        wrap_x.assert_error("Request", "Files can only be uploaded through a POST", RC.INCORRECT_REQUEST.val())


    def test_missing_package(self):
        x = self.get("/services/test_package/config")
        x.assert_code(404)
        x.assert_error("Request", "Service does not exist in device", RC.INCORRECT_REQUEST.val())

@test_suite_title("API Core: General Section")
class test_config_service_general_section(util.WrapTest):
    def test_general(self):
        url = "/services/test_general/config"
        with self.subTest("get_general"):
            x = self.get(f"{url}/general")
            x.assert_data({"id": "general","opt": "1",".type": "test_general"})

        with self.subTest("get_general_multiple"):
            x = self.get(url)
            x.assert_data([{"id": "general","opt": "1",".type": "test_general"}])

        with self.subTest("update_general_sid"):
            x = self.put_data(f"{url}/general", {"opt": "0"})
            x.assert_data({"id": "general","opt": "0",".type": "test_general"})

        with self.subTest("update_general_multiple"):
            x = self.put_data(url, [{"id":"general", "opt": "1"}])
            x.assert_data([{"id": "general","opt": "1",".type": "test_general"}])

@test_suite_title("API Core: File options")
class test_config_service_file_options(util.WrapTest):
    @util.skip_file()
    def test_file_upload(self):
        with self.subTest("test_file_upload"):
            x = self.send_file("/services/test_upload/config/t_id", "files/small_file", "file2")
            x.assert_data({"path": "/etc/vuci-uploads/cbid.test_conf.t_id.file2small_file"})
        with self.subTest("test_file_setting"):
            x = self.put_data("/services/test_upload/config/t_id", {"file2": "/etc/vuci-uploads/cbid.test_conf.t_id.file2small_file"})
            x.assert_data({".type": "test_section",
                "id": "t_id",
                "file2": "/etc/vuci-uploads/cbid.test_conf.t_id.file2small_file",
                "file2:file_size": 1048576
            })


    def test_non_existing_file_setting(self):
        x = self.put_data("/services/test_upload/config/t_id", {"file2": "/etc/vuci-uploads/cbid.test_conf.t_id.filesmall_file"})
        x.assert_code(422)
        x.assert_error("file2", "Provided file does not exist in the device", RC.INVALID_OPT.val(), "/etc/vuci-uploads/cbid.test_conf.t_id.filesmall_file", "t_id")

    @util.skip_file()
    def test_file_option_clearing(self):
        x = self.put_data("/services/test_upload/config/t_id", {"file2": ""})
        x.assert_data({
            "id": "t_id",
            ".type": "test_section"
        })

@test_suite_title("API Core: Core ConfigService")
class test_config_service(util.WrapTest):
    def test_disallow_creation(self):
        x = self.post("/services/test_flags/config", None)
        x.assert_code(405)
        x.assert_error("Validation", "Section creation is not allowed", RC.NO_CREATE.val())

    def test_disallow_deletion(self):
        x = self.delete("/services/test_flags/config")
        x.assert_code(405)
        x.assert_error("Validation", "Section deletion is not allowed", RC.NO_DELETE.val())

    def test_section_not_found(self):
        x = self.get("/services/test/config/definitely_does_not_exist")
        x.assert_code(404)
        x.assert_error("UCI", "Section: definitely_does_not_exist for service does not exist", RC.INVALID_SECTION.val())

    def test_put_no_data_provided(self):
        x = self.put("/services/test/config", {})
        x.assert_code(400)
        x.assert_error("Validation", "Invalid PUT structure, data object is missing", RC.INVALID_STRUCT.val())

    def test_put_empty_data(self):
        x = self.put_data("/services/test/config", {})
        x.assert_code(200)

    def test_create_section_without_name(self):
        x = self.post_data("/services/test/config/t_id", {})
        x.assert_code(422)
        x.assert_error("Validation", "Section id not provided", RC.NAME_NOT_PROVIDED.val())

    def test_section_life_cycle(self):
        with self.subTest("Section creation"):
            x = self.post_data("/services/test/config", {"id": "integrat"})
            x.assert_data({"id": "integrat", ".type": "test_section"}, 201)
        with self.subTest("Section creation with duplicated name"):
            x = self.post_data("/services/test/config", {"id": "integrat"})
            x.assert_error("Validation", "Name already used for a configuration", RC.NAME_USED.val())
        with self.subTest("Section child creation"):
            x = self.post_data("/services/test/config/integrat/child", {"id": "child"})
            x.assert_data({"id": "child", ".type": "test_child"}, 201)
        with self.subTest("Child section Deletion"):
            x = self.delete("/services/test/config/integrat/child/child")
            x.assert_data({"id": "child"})
        with self.subTest("Section Deletion"):
            x = self.delete("/services/test/config/integrat")
            x.assert_data({"id": "integrat"})
        with self.subTest("Child section Deletion without parent"):
            x = self.delete("/services/test/config/integrat/child/child")
            x.assert_error("UCI", "Parent section 'integrat' does not exist", RC.INVALID_SECTION.val())

    def test_multiple_section_functionality(self):
        with self.subTest("Section creation"):
            x = self.post_data("/services/test/config", {"id": "integra1"})
            x.assert_data({"id": "integra1", ".type": "test_section"}, 201)
            x = self.post_data("/services/test/config", {"id": "integra2"})
            x.assert_data({"id": "integra2", ".type": "test_section"}, 201)

        # Test moved to a subtest because due to getting all configuration sometimes `opt` key is missing and sometimes is present
        # test become unreliable
        with self.subTest("Delete key with put"):
            x = self.put_data("/services/test/config/t_id", {"opt": ""})
            x.assert_data({"id": "t_id", ".type": "test_section"})

        with self.subTest("Get sections"):
            x = self.get("/services/test/config")
            x.assert_data([{'id': 't_id', '.type': 'test_section'}, {'id': 'options', '.type': 'test_section'}, {"id": "integra1", ".type": "test_section"}, {"id": "integra2", ".type": "test_section"}])

        with self.subTest("Update sections"):
            x = self.put_data("/services/test/config", [
                {
                    "id": "integra1",
                    "no_validation": "222"
                },
                {
                    "id": "integra2",
                    "no_validation": "333"
                }
            ])
            x.assert_data([{"id": "integra1", ".type": "test_section", "no_validation": "222"}, {"id": "integra2", ".type": "test_section", "no_validation": "333"}])
        with self.subTest("Delete multiple"):
            x = self.delete_data("/services/test/config", ["integra1", "integra2"])
            x.assert_data([
                {
                    "id": "integra1"
                },
                {
                    "id": "integra2"
                }
            ])
        with self.subTest("Delete multiple invalid data format"):
            x = self.delete_data("/services/test/config", {
                "": "integra1",
                "1": "integra2"
            })
            x.assert_error("Validation", "Invalid data structure, only an array is acceptable", RC.INVALID_STRUCT.val())
        with self.subTest("Delete multiple empty data"):
            x = self.delete_data("/services/test/config", {})
            x.assert_error("Validation", "Invalid data structure, only an array is acceptable", RC.INVALID_STRUCT.val())

    def test_anonymous_section(self):
        new_id = None
        with self.subTest("Section creation"):
            x = self.post("/services/test_anon/config", {})
            x.assert_code(201)
            x = x.resp
            self.assertIn("id", x.json()['data'])
            self.assertIn(".type", x.json()['data'])
            new_id = x.json()['data']['id']
        with self.subTest("Section Deletion"):
            x = self.delete( f"/services/test_anon/config/{new_id}")
            x.assert_data({"id": new_id})

    def test_action(self):
        x = self.post("/services/test/actions/test_action", {})
        x.assert_data({"response": "OK"})

    def test_deletion_without_section(self):
        x = self.delete("/services/test/config")
        x.assert_error("Validation", "Deletion of whole configuration is not allowed", RC.CONF_DEL_DISALLOWED.val())

    def test_deletion_nonexistent_section(self):
        x = self.delete("/services/test/config/integration_section")
        x.assert_error("UCI", "Section: integration_section for service does not exist", RC.INVALID_SECTION.val())

    def test_get_without_service_group(self):
        x = self.get("/services/test")
        x.assert_error("Request", "Endpoint not implemented", RC.INCORRECT_REQUEST.val())

    def test_post_without_service_group(self):
        x = self.post("/services/test", {})
        x.assert_error("Request", "Endpoint not implemented", RC.INCORRECT_REQUEST.val())

    def test_put_without_service_group(self):
        x = self.put("/services/test", {})
        x.assert_error("Request", "Endpoint not implemented", RC.INCORRECT_REQUEST.val())

    def test_delete_without_service_group(self):
        x = self.delete("/services/test")
        x.assert_error("Request", "Endpoint not implemented", RC.INCORRECT_REQUEST.val())

    def test_incremental_section(self):
        with self.cleanup():
            x = self.post("/services/test_increment/config", {})
            x.assert_data({".type": "test_interate"}, 201, ["id"])
            first_id = x.json["data"]["id"]

            x = self.post("/services/test_increment/config", {})
            x.assert_data({
                "id": str(int(first_id) + 1),
                ".type": "test_interate"
            }, 201, ["id"])

@test_suite_title("API Core: Core BasicService")
class test_basic_service(util.WrapTest):
    def test_action_not_available(self):
        x = self.post("/services/test/actions/asd", {})
        x.assert_error("Request", "Provided action is not available. Available actions: [test_action_opt, test_action]", RC.INCORRECT_REQUEST.val())

    def test_delete_not_implemented(self):
        x = self.delete("/services/test_function/config")
        x.assert_error("Request", "DELETE not implemented", RC.NOT_IMPLEMENTED.val())

    def test_put_not_implemented(self):
        x = self.put("/services/test_function/config", {})
        x.assert_error("Request", "PUT not implemented", RC.NOT_IMPLEMENTED.val())

    def test_post_not_implemented(self):
        x = self.post("/services/test_function/config", {})
        x.assert_error("Request", "POST not implemented", RC.NOT_IMPLEMENTED.val())

@test_suite_title("API Core: Core FunctionService")
class test_function_service(util.WrapTest):
    def test_upload_not_implemented(self):
        x = self.request("post", "/services/test_function/config", files={"file": "daasdasdasd"})
        x.assert_code(501)
        x.assert_error("Request", "File upload is not implemented", RC.NOT_IMPLEMENTED.val())

    def test_upload_file_not_provided(self):
        # None is passed so the `filename` key would not be present in the form-data request
        x = self.post("/certificates/config", files={"file":(None,  "daasdasdasd")})
        x.assert_code(422)
        x.assert_error("Upload", "Incorrect request format", RC.INVALID_OPT.val())

@test_suite_title("API Core: Action Options")
class test_action_options(util.WrapTest):
    def test_incorrect_action_option(self):
        resp = self.post_data("/services/test/actions/test_action_opt", { "b": "1", "opt_required": "1"})
        resp.assert_error("b", "Invalid option", RC.INVALID_OPT.val(), None, "test_action_opt")

    def test_required_option(self):
        resp = self.post_data("/services/test/actions/test_action_opt", {})
        resp.assert_error("opt_required", "Missing required option: opt_required", RC.INVALID_OPT.val(), None, "test_action_opt")

    def test_correct_options(self):
        resp = self.post_data("/services/test/actions/test_action_opt", { "opt_a": "1", "opt_required": "1"})
        resp.assert_data("OK")

    def test_empty_option(self):
        resp = self.post_data("/services/test/actions/test_action_opt", { "opt_a": "", "opt_required": "1"})
        resp.assert_data("OK")

    def test_validation(self):
        resp = self.post_data("/services/test/actions/test_action_opt", { "opt_a": "2", "opt_required": "1"})
        resp.assert_error("opt_a", "Provided value is not '1' or '0'.", RC.INVALID_OPT.val(), None, "test_action_opt")

@test_suite_title("API Core: Query")
class test_query(util.WrapTest):
    def test_malformed_query(self):
        resp = self.get("/services/test/config/?a=1&b")
        resp.assert_code(200)

    def test_offset_validation_no_limit(self):
        resp = self.get("/services/test/config/?offset=1")
        resp.assert_error("Query", "Limit must be provided with offset", RC.INVALID_QUERY.val())

    def test_offset_validation_incorrect_type(self):
        resp = self.get("/services/test/config/?offset=a&limit=2")
        resp.assert_error("Query", "Provided offset is not a number", RC.INVALID_QUERY.val())

    def test_limit_validation_no_offset(self):
        resp = self.get("/services/test/config/?limit=1")
        resp.assert_data([{'id': 'options', '.type': 'test_section'}])

    def test_limit_validation_incorrect_type(self):
        resp = self.get("/services/test/config/?limit=a")
        resp.assert_error("Query", "Provided limit is not a number", RC.INVALID_QUERY.val())

    def test_offset_correct(self):
        resp = self.get("/services/test/config/?offset=1&limit=1")
        resp.assert_data([{'id': 't_id', '.type': 'test_section'}])

    def test_search_non_existing_key(self):
        resp = self.get("/services/test/config/?piotr=1")
        resp.assert_data([])

    def test_search_existing_key(self):
        with self.subTest("Search section Creation"):
            resp = self.post_data("/services/test/config", {"id": "search", "opt": "0"})
            print(resp.json)
        with self.subTest("Search test"):
            resp = self.get("/services/test/config/?opt=0")
            resp.assert_data([{'.type': 'test_section', 'id': 'search', 'opt': '0'}])
        with self.subTest("Search section Deletion"):
            resp = self.delete("/services/test/config/search")

# TODO add action option validations
@test_suite_title("API Core: Options")
class test_options(util.WrapTest):
    def test_post_index_provided(self):
        resp = self.post_data("/services/test/config", { "id": "index", ".index": "10"})
        resp.assert_error(".index", "Invalid option", RC.INVALID_OPT.val(), None, "index")

    def test_min_length_validation(self):
        val = "abc"
        resp = self.put_data("/services/test/config/options", { "min": val})
        resp.assert_error("min", f"Provided value is too short. Is {len(val)} characters, but can not be shorter than 5 characters", RC.INVALID_OPT.val(), val, "options")

    def test_max_length_validation(self):
        val = "abcdefgh"
        resp = self.put_data("/services/test/config/options", { "max": val})
        resp.assert_error("max", f"Provided value is too long. Is {len(val)} characters, but can be up to 5 characters", RC.INVALID_OPT.val(), val, "options")

    def test_non_string_provided(self):
        resp = self.put_data("/services/test/config/options", { "opt": 654})
        resp.assert_error("opt", "Value must be a string", RC.INVALID_OPT.val())

    def test_non_lits_option_provided(self):
        resp = self.put_data("/services/test/config/options", { "no_validation": ["1", "2"]})
        resp.assert_error("no_validation", "Option does not accept arrays", RC.INVALID_OPT.val())

    def test_string_list_to_option_provided(self):
        resp = self.put_data("/services/test/config/options", { "list": "1.1.1.1/24"})
        resp.assert_error("list", "Option only accepts arrays", RC.INVALID_OPT.val())

    def test_empty_array_to_list_option_provided(self):
        resp = self.put_data("/services/test/config/options", { "list": []})
        json = resp.resp.json()
        self.assertNotIn("list", json['data'])

    def test_correct_setting(self):
        with self.subTest("set"):
            resp = self.put_data("/services/test/config/options", { "list": ["1.1.1.1/24", "2.2.2.2/24"], "opt": "1"})
            resp.assert_data({
                    ".type": "test_section",
                    "list": [
                        "1.1.1.1/24",
                        "2.2.2.2/24"
                    ],
                    "id": "options",
                    "opt": "1"
                })
        with self.subTest("unset"):
            resp = self.put_data("/services/test/config/options", { "list": [], "opt": ""})

    def test_correct_overridden_get_set(self):
        with self.subTest("set"):
            resp = self.put_data("/services/test/config/options", { "list_name": ["1.1.1.1/24", "2.2.2.2/24"] })
            json = resp.resp.json()
            self.assertIn("list_name", json['data'])
        with self.subTest("unset"):
            resp = self.put_data("/services/test/config/options", { "list_name": [] })
            json = resp.resp.json()
            self.assertNotIn("list_name", json['data'])

    def test_array_with_empty_string(self):
        resp = self.put_data("/services/test/config/options", { "list": [""] })
        resp.assert_data({
                ".type": "test_section",
                "id": "options",
            })

    def test_empty_string_to_array(self):
        resp = self.put_data("/services/test/config/options", { "list": "" })
        resp.assert_data({
            "id": "options",
            ".type": "test_section"
        })

    def test_array_duplicate(self):
        resp = self.put_data("/services/test/config/options", { "list": ["1", "1"] })
        resp.assert_error("list", "No duplicate values allowed. Found duplicate values [1].", RC.INVALID_OPT.val(), ["1","1"], "options")

    def test_to_many_values(self):
        resp = self.put_data("/services/test/config/options", { "list": ["1", "2", "3", "4", "5"] })
        resp.assert_error("list", "Provided array of length 5 exceeds allowed limit of 4 values", RC.INVALID_OPT.val(), ["1", "2", "3","4", "5"], "options")

    def test_allow_duplicates(self):
        with self.subTest("set"):
            resp = self.put_data("/services/test/config/options", { "list_dup": ["1", "1"] })
            resp.assert_data({
                "id": "options",
                "list_dup": [
                    "1",
                    "1"
                ],
                ".type": "test_section"
            })
        with self.subTest("unset"):
            resp = self.put_data("/services/test/config/options", { "list_dup": [] })

    @unittest.skip(TODO)
    def test_file_upload_without_section_sid(self):
        resp = self.send_file("/services/test_upload/config", "files/small_file", "file2")
        resp.assert_error("Upload", "Configuration name must be provided", RC.NAME_NOT_PROVIDED.val())

    def test_require(self):
        resp = self.put_data("/services/test/config/options", { "require": "1" })
        resp.assert_error("require", "Missing required option: depend", RC.INVALID_OPT.val(), None, "options")

    def test_require_dependency(self):
        with self.subTest("set"):
            resp = self.put_data("/services/test/config/options", { "require": "1", "depend": "depend"})
            resp.assert_data({
                "depend": "depend",
                "id": "options",
                ".type": "test_section",
                "require": "1",
            })
        with self.subTest("unset"):
            resp = self.put_data("/services/test/config/options", { "require": "", "depend": ""})

@test_suite_title("API Core: Bulk")
class test_bulk(util.WrapTest):
    url = "/bulk"

    def test_no_body(self):
        resp = self.post(self.url, None)
        resp.assert_error("Request", "Invalid POST structure, body is missing", RC.INCORRECT_REQUEST.val())

    def test_incorrect_method(self):
        resp = self.put(self.url, {})
        resp.assert_error("Request", "HTTP method not supported for this endpoint, please use POST", RC.INCORRECT_REQUEST.val())

    def test_no_data_in_body(self):
        resp = self.post(self.url, {"foo": "bar"})
        resp.assert_error("Request", "Invalid POST structure, data object is missing", RC.INCORRECT_REQUEST.val())

    def test_data_not_array(self):
        resp = self.post_data(self.url, {"asda": "asdad"})
        resp.assert_error("Request", "Invalid data structure, only an array is acceptable", RC.INCORRECT_REQUEST.val())

    def test_empty_data_array(self):
        resp = self.post_data(self.url, [])
        resp.assert_data([], 207)

    def test_data_incorrect(self):
        resp = self.post_data(self.url, ["asda", "asdad"])
        resp.assert_data( [
            {
                "success": False,
                "errors": [
                    {
                        "source": "Request",
                        "error": "Method or endpoint not provided",
                        "code": RC.INCORRECT_REQUEST.val()
                    }
                ]
            },
            {
                "success": False,
                "errors": [
                    {
                        "source": "Request",
                        "error": "Method or endpoint not provided",
                        "code": RC.INCORRECT_REQUEST.val()
                    }
                ]
            }
        ], 207)

    def test_request_to_function_service(self):
        resp = self.post_data(self.url, [
            {
                "method": "GET",
                "endpoint": "/firewall/custom_rules/config"
            },
            {
                "method": "PUT",
                "endpoint": "/firewall/custom_rules/config",
                "data": {
                    "custom_rules": "tstas"
                }
            }
        ])

    def test_multiple_actions(self):
        resp = self.post_data(self.url,
        [
            {
                "method": "POST",
                "endpoint": "/services/test/actions/test_action"
            },
            {
                "method": "POST",
                "endpoint": "/services/test_general/actions/test_action"
            },
            {
                "method": "POST",
                "endpoint": "/services/test/actions/test_action"
            },
            {
                "method": "POST",
                "endpoint": "/services/test_general/actions/test_action"
            }
        ]
        )
        resp.assert_data([
            {
                "success": True,
                "data": {
                    "response": "OK"
                }
            },
            {
                "success": True,
                "data": {
                    "response": "OK2"
                }
            },
            {
                "success": True,
                "data": {
                    "response": "OK"
                }
            },
            {
                "success": True,
                "data": {
                    "response": "OK2"
                }
            }
        ], 207)

    def test_bulk_general(self):
        resp = self.post_data(self.url,
        [
            {
                "method": "GET",
                "endpoint": "/wireguard/config"
            },
            {
                "method": "GET",
                "endpoint": "/services/mqtt_pub/config"
            },
            {
                "method": "GET",
                "endpoint": "/services/mqtt_pub/config"
            }
        ]
        )

    def test_query_params(self):
        resp = self.post_data(self.url, [
            {
                "method": "GET",
                "endpoint": "/events_log/config?limit=0"
            }
        ])
        print(resp.json)
        self.assertIn("metadata", resp.json['data'][0])
        self.assertIn("total", resp.json['data'][0]['metadata'])
        self.assertIn("limit", resp.json['data'][0]['metadata'])

    def test_incorrect_query_params(self):
        time.sleep(1) # sleep here is needed, because database is locked after test_query_params test
        resp = self.post_data(self.url, [
            {
                "method": "GET",
                "endpoint": "/events_log/config?limit=0?test=15&test2=15"
            }
        ])
        error_element = resp.json['data'][0]["errors"][0]
        self.assertEqual(error_element, {
            "source": "Query",
            "error": "Invalid query",
            "code": 116
        })


    def test_sid_caching(self):
        resp = self.post_data(self.url,
        [
            {
                "method": "GET",
                "endpoint": "/services/test/config/aaaa"
            },
            {
                "method": "GET",
                "endpoint": "/services/test/config/bbb"
            }
        ])
        resp.assert_data(
            [
                {
                    "success": False,
                    "errors": [
                        {
                            "source": "UCI",
                            "section": "aaaa",
                            "error": "Section: aaaa for service does not exist",
                            "code": RC.INVALID_SECTION.val()
                        }
                    ]
                },
                {
                    "success": False,
                    "errors": [
                        {
                            "source": "UCI",
                            "section": "bbb",
                            "error": "Section: bbb for service does not exist",
                            "code": RC.INVALID_SECTION.val()
                        }
                    ]
                },
            ], 207)

@util.skip_file()
# TODO due to pythons inability to read responses from servers when they cancel the receiving of files
# TODO and due to uhttpd inability to consistently send out responses in a middle of receiving a file
# TODO only the happy path of upload will remain, otherwise there is no consistency with the tests
# TODO and although the file upload gets cancelled there is a high chance the python will not understand the cancellation or no msg will arrive
@test_suite_title("API Core: Upload")
class test_upload(util.WrapTest):
    # def test_no_file_provided(self):
    #     x = Env.http.post(self.url_api + "/services/test/config/sid", files={"ss":(None,  "daasdasdasd")})
    #     wrap_x = util.WrapResponse(x, self)
    #     wrap_x.assert_code(422)
    #     wrap_x.assert_error("Upload", "File not provided.", RC.INVALID_OPT.val())

    # TODO different devices have different free space, so error may vary
    # def test_file_too_big(self):
    #     resp = self.send_file("/services/test/config", "files/big_file")
    #     resp.assert_code(422)
    #     resp.assert_error("Upload", "The maximum allowed file size is 16.00 MB.", RC.FILE_MAX_SIZE.val())

    # def test_incorrect_file_key(self):
    #     x = Env.http.post(self.url_api + "/services/test/config/sid", files = {"fil": open("files/small_file", 'rb')})
    #     wrap_x = util.WrapResponse(x, self)
    #     wrap_x.assert_code(422)
    #     wrap_x.assert_error("Upload", "Incorrect file upload format", RC.INCORRECT_REQUEST.val())

    # @unittest.skip("TODO sometimes connection gets reset and also takes very long for no reason")
    # def test_upload_incorrect_path(self):
    #     resp = self.send_file("/services/test/configasdsdaad", "files/small_file")
    #     resp.assert_code(501)
    #     resp.assert_error("Request", "UPLOAD not implemented", RC.NOT_IMPLEMENTED.val())

    def test_correct_upload_sid(self):
        resp = self.send_file("/services/test/config/sid", "files/small_file")
        resp.assert_data({"path": "/tmp/test"})

    # def test_option_to_file_not_provided(self):
    #     resp = self.send_file("/services/test_upload/config/options", "files/small_file")
    #     resp.assert_code(422)
    #     resp.assert_error("option", "'option' must be provided for this upload endpoint.", RC.INVALID_OPT.val())

    # def test_incorrect_option_name(self):
    #     resp = self.send_file("/services/test_upload/config/options", "files/small_file", "aaa")
    #     resp.assert_error("option", "File option with the provided name was not found.", RC.INVALID_OPT.val())

@test_suite_title("API Core: Tables")
class test_tables(util.WrapTest):
    def test_hooks(self):
        with self.subTest("create_section"):
            resp = self.post_data("/services/test_tables/config", {"option": "cooking", "id": "test_tables"})
            resp.assert_data({
                ".type": "test_tables",
                "id": "test_tables",
                "option8": "cooking gauntlets"
            }, 201)
        with self.subTest("modify_section"):
            resp = self.put_data("/services/test_tables/config/test_tables", {"option":""})
            resp.assert_data({
                ".type": "test_tables",
                "id": "test_tables",
                "option7": "cooking gauntlets"
            })
        with self.subTest("create_extra_section"):
            resp = self.post_data("/services/test_tables/config", {"option": "cooking", "id": "test_tables_delete"})
            resp.assert_data({
                ".type": "test_tables",
                "id": "test_tables_delete",
                "option": "cooking"
            }, 201)
        with self.subTest("test_delete_hooks"):
            resp = self.delete("/services/test_tables/config/test_tables")
            resp.assert_data({
                "id": "test_tables"
            })
        with self.subTest("get_modified_section"):
            resp = self.get("/services/test_tables/config/test_tables_delete")
            resp.assert_data({
                ".type": "test_tables",
                "id": "test_tables_delete",
                "option7": "cooking gauntlets"
            })
        with self.subTest("delete_extra_sections"):
            self.delete_section("test_conf", "test_tables_delete")
            self.delete_section("test_conf", "test_failure_tables")

    def test_delete_hooks_failing(self):
        with self.subTest("create_section"):
            resp = self.post_data("/services/test_tables/config", {"option": "cooking", "id": "test_failure_tables"})
            resp.assert_data({
                ".type": "test_tables",
                "id": "test_failure_tables",
                "option": "cooking"
            }, 201)
        ## DELETE hooks have issue with action sequence, that's why it fails if any table functions with self.sid are present
        with self.subTest("test_delete_hooks"):
            resp = self.delete("/services/test_tables/config/test_failure_tables")
            resp.assert_code(422)

# Reordering only works when sending a request with many updates
@test_suite_title("API Core: Ordering Configuration")
class test_ordering(util.WrapTest):
    def setUp(self):
        for section in self.list_sections():
            self.delete_section("test_conf", section["id"])

    def create_section(self, priority: int):
        resp = self.post_data("/services/test_ordering/config", {
            "priority": str(priority)
        })
        resp.assert_code(201)
        section = resp.json["data"]
        self.assertEqual(section[".type"], "test_order")
        self.assertEqual(section["priority"], str(priority))
        return section

    def update_sections(self, sections: [dict], priorities: [int]):
        request_data = []
        for (section, priority) in zip(sections, priorities):
            request_data.append({
                "id": section["id"],
                "priority": section["priority"],
            })
        resp = self.put_data("/services/test_ordering/config", request_data)
        resp.assert_code(200)
        return resp.json["data"]

    def create_sections(self, priorities: [int]):
        sections = []
        for priority in priorities:
            sections.append(self.create_section(priority))
        # hack to make API reorder created sections
        self.update_sections(sections, priorities)
        return sections

    def list_sections(self):
        resp = self.ubus_call("uci", "get", {
            "config": "test_conf",
            "type": "test_order"
        })
        if not resp or resp.get('values') is None:
            raise Exception("Failed to get configuration 'test_conf'")
        sections = []
        for section in resp.get('values', {}).values():
            sections.append(section)
            section["id"] = section[".name"]
            del section[".anonymous"]
            del section[".name"]
        sections.sort(key=lambda s: s[".index"])
        for section in sections:
            del section[".index"]
        return sections

    def assert_increasing_priority(self):
        sections = self.list_sections()
        for i in range(len(sections) - 1):
            priority1 = int(sections[i + 0]["priority"])
            priority2 = int(sections[i + 1]["priority"])
            self.assertLess(priority1, priority2, "Priority is not in increasing order")

    def test_basic(self):
        sections = self.create_sections([1, 3])
        self.assert_increasing_priority()

        section = self.create_section(2)
        self.update_sections([sections[0], section, sections[1]], [1, 2, 3])
        self.assert_increasing_priority()

    def test_priority_with_gaps(self):
        self.create_sections([1, 3, 10, 8])
        self.assert_increasing_priority()

    def test_updating_priority(self):
        sections = self.create_sections([1, 3, 8])
        self.assert_increasing_priority()

        self.update_sections(sections, [5, 10, 1])
        self.assert_increasing_priority()

@test_suite_title("API Core: Ordering Response")
class test_ordering_response(util.WrapTest):
    def setUp(self):
        for section in self.list_sections():
            self.delete_section("test_conf", section["id"])

    def create_section(self, priority: int):
        resp = self.post_data("/services/test_ordering_response/config", {
            "priority": str(priority)
        })
        resp.assert_code(201)
        section = resp.json["data"]
        self.assertEqual(section[".type"], "test_order_response")
        self.assertEqual(section["priority"], str(priority))
        return section

    def update_sections(self, sections: [dict], priorities: [int]):
        request_data = []
        for (section, priority) in zip(sections, priorities):
            request_data.append({
                "id": section["id"],
                "priority": section["priority"],
            })
        resp = self.put_data("/services/test_ordering_response/config", request_data)
        resp.assert_code(200)
        return resp.json["data"]

    def create_sections(self, priorities: [int]):
        sections = []
        for priority in priorities:
            sections.append(self.create_section(priority))
        return sections

    def list_sections(self):
        resp = self.get("/services/test_ordering_response/config")
        resp.assert_code(200)
        return resp.json["data"]

    def assert_increasing_priority(self):
        sections = self.list_sections()
        for i in range(len(sections) - 1):
            priority1 = int(sections[i + 0]["priority"])
            priority2 = int(sections[i + 1]["priority"])
            self.assertLess(priority1, priority2, "Priority is not in increasing order")

    def test_basic(self):
        self.create_sections([3, 1])
        self.assert_increasing_priority()

        self.create_section(2)
        self.assert_increasing_priority()

    def test_priority_with_gaps(self):
        self.create_sections([1, 3, 10, 8])
        self.assert_increasing_priority()

    def test_updating_priority(self):
        sections = self.create_sections([1, 8, 3])
        self.assert_increasing_priority()

        self.update_sections(sections, [5, 10, 1])
        self.assert_increasing_priority()