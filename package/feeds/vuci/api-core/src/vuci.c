#include <lauxlib.h>
#include <dirent.h>
#include <arpa/inet.h>
#include <stdlib.h>
#include <string.h>

#if LUA_VERSION_NUM == 501
/* Adapted from Lua 5.2 */
void luaL_setfuncs (lua_State *L, const luaL_Reg *l, int nup)
{
	luaL_checkstack(L, nup+1, "too many upvalues");
	for (; l->name != NULL; l++) {  /* fill the table with given functions */
		int i;
		lua_pushstring(L, l->name);
		for (i = 0; i < nup; i++)  /* copy upvalues to the top */
			lua_pushvalue(L, -(nup + 1));
		lua_pushcclosure(L, l->func, nup);  /* closure with those upvalues */
		lua_settable(L, -(nup + 3));
	}
	lua_pop(L, nup);  /* remove upvalues */
}
#endif

static int l_parse_route_addr(lua_State *L)
{
	const char *addr = lua_tostring(L, 1);
	const char *mask = lua_tostring(L, 2);
	char as[sizeof("255.255.255.255/32\0")];
	struct in_addr a;
	int bits;

	if (!addr) {
		lua_pushnil(L);
		return 1;
	}

	a.s_addr = strtoul(addr, NULL, 16);
	inet_ntop(AF_INET, &a, as, sizeof(as));

	if (mask) {
		for (a.s_addr = ntohl(strtoul(mask, NULL, 16)), bits = 0;
			a.s_addr & 0x80000000;
			a.s_addr <<= 1)
			bits++;

		sprintf(as + strlen(as), "/%u", bits);
	}

	lua_pushstring(L, as);
	return 1;
}

static const struct luaL_Reg func[] =
{
	{"parse_route_addr", l_parse_route_addr},
	{NULL, NULL}
};

int luaopen_vuci_c(lua_State *L)
{
	lua_newtable(L);
	luaL_setfuncs(L, func, 0);

	return 1;
}
