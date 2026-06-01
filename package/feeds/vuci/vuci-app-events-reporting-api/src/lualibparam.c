#include <lauxlib.h>
#include <string.h>
#include <libparam.h>
#include <libubus.h>
#ifdef MOBILE_SUPPORT
#include <libgsm_utils.h>
#endif
/* 
	params_str - string with params to be expanded
	modem_id - modem id to use for params (optional)
	inp_name - I/O pin name to use for params (optional)
*/
static int l_expand_params(lua_State *L)
{
	const char *params_str = lua_tostring(L, 1);
	const char *modem_id = lua_tostring(L, 2);
	const char *inp_name = lua_tostring(L, 3);
	char *out;
	int modem_num = 0;
	char input_name[64] = {0};

	if (inp_name) strncpy(input_name, inp_name, 63);

	struct ubus_context *ubus_ctx = ubus_connect(NULL);
	if (!ubus_ctx) {
		fprintf(stderr, "Failed to establish ubus connection");
		return EXIT_FAILURE;
	}
#ifdef MOBILE_SUPPORT
	if (modem_id) {
		modem_num = lgsmu_modem_id_to_num(ubus_ctx, modem_id);
	} else {
		modem_num = lgsmu_get_default_modem_num(ubus_ctx);
	}
#endif
	param_ctx ctx = { .input_name = inp_name ? input_name : NULL, .modem_num = modem_num };
	out = libparam_str_expand(ubus_ctx, &ctx, params_str); 
	lua_pushstring(L, out);

	free(out);
	ubus_free(ubus_ctx);

	return 1;
}

static const struct luaL_Reg func[] =
{
	{"expand_params", l_expand_params},
	{NULL, NULL}
};

LUALIB_API int luaopen_lualibparam(lua_State *L)
{
	luaL_register(L, "lualibparam", func);
	return 1;
}
