-- Copyright 2008 Steven Barth <steven@midlink.org>
-- Licensed to the public under the Apache License 2.0.

-- Modifications Copyright (C) 2021 Teltonika Networks

local io = require "io"
local math = require "math"
local table = require "table"
local debug = require "debug"
-- local ldebug = require "luci.debug"
local string = require "string"
local coroutine = require "coroutine"
-- local tparser = require "luci.template.parser"
local json = require "luci.jsonc"

local _ubus = require "ubus"
local _ubus_connection = nil

local getmetatable, setmetatable = getmetatable, setmetatable
local rawget, rawset, unpack, select = rawget, rawset, unpack, select
local tostring, type, assert, error = tostring, type, assert, error
local ipairs, pairs, next, loadstring = ipairs, pairs, next, loadstring
local require, pcall, xpcall = require, pcall, xpcall
local collectgarbage, get_memory_limit = collectgarbage, get_memory_limit
local tonumber, os = tonumber, os

module "vuci.util"

--
-- Pythonic string formatting extension
--
getmetatable("").__mod = function(a, b)
	local ok, res

	if not b then
		return a
	elseif type(b) == "table" then
		local k, _
		for k, _ in pairs(b) do if type(b[k]) == "userdata" then b[k] = tostring(b[k]) end end

		ok, res = pcall(a.format, a, unpack(b))
		if not ok then
			error(res, 2)
		end
		return res
	else
		if type(b) == "userdata" then b = tostring(b) end

		ok, res = pcall(a.format, a, b)
		if not ok then
			error(res, 2)
		end
		return res
	end
end


--
-- Class helper routines
--

-- Instantiates a class
local function _instantiate(class, ...)
	local inst = setmetatable({}, {__index = class})

	if inst.__init__ then
		inst:__init__(...)
	end

	return inst
end

-- The class object can be instantiated by calling itself.
-- Any class functions or shared parameters can be attached to this object.
-- Attaching a table to the class object makes this table shared between
-- all instances of this class. For object parameters use the __init__ function.
-- Classes can inherit member functions and values from a base class.
-- Class can be instantiated by calling them. All parameters will be passed
-- to the __init__ function of this class - if such a function exists.
-- The __init__ function must be used to set any object parameters that are not shared
-- with other objects of this class. Any return values will be ignored.
function class(base)
	return setmetatable({}, {
		__call  = _instantiate,
		__index = base
	})
end

function instanceof(object, class)
	local meta = getmetatable(object)
	while meta and meta.__index do
		if meta.__index == class then
			return true
		end
		meta = getmetatable(meta.__index)
	end
	return false
end


--
-- Scope manipulation routines
--

coxpt = setmetatable({}, { __mode = "kv" })

local tl_meta = {
	__mode = "k",

	__index = function(self, key)
		local t = rawget(self, coxpt[coroutine.running()]
		 or coroutine.running() or 0)
		return t and t[key]
	end,

	__newindex = function(self, key, value)
		local c = coxpt[coroutine.running()] or coroutine.running() or 0
		local r = rawget(self, c)
		if not r then
			rawset(self, c, { [key] = value })
		else
			r[key] = value
		end
	end
}

-- the current active coroutine. A thread local store is private a table object
-- whose values can't be accessed from outside of the running coroutine.
function threadlocal(tbl)
	return setmetatable(tbl or {}, tl_meta)
end


--
-- Debugging routines
--

function perror(obj)
	return io.stderr:write(tostring(obj) .. "\n")
end

function log_str(msg, sender, facility, level)
	if not facility then facility = "daemon" end
	if not sender then sender = "vuci" end
	if not level then level = "info" end
	file_exec("/usr/bin/logger", { "-p", facility .. "." .. level, "-t", sender, msg })
end

function log_warn(msg, sender, facility)
	return log_str(msg, sender, facility, "warn")
end

function dumptable(t, maxdepth, i, seen)
	if type(t) ~= "table" then return perror(t) end
	i = i or 0
	seen = seen or setmetatable({}, {__mode="k"})

	for k,v in pairs(t) do
		perror(string.rep("\t", i) .. tostring(k) .. "\t" .. tostring(v))
		if type(v) == "table" and (not maxdepth or i < maxdepth) then
			if not seen[v] then
				seen[v] = true
				dumptable(v, maxdepth, i+1, seen)
			else
				perror(string.rep("\t", i) .. "*** RECURSION ***")
			end
		end
	end
end


function shellquote(value)
	return string.format("'%s'", string.gsub(value or "", "'", "'\\''"))
end

-- for bash, ash and similar shells single-quoted strings are taken
-- literally except for single quotes (which terminate the string)
-- (and the exception noted below for dash (-) at the start of a
-- command line parameter).
function shellsqescape(value)
   local res
   res, _ = string.gsub(value, "'", "'\\''")
   return res
end

-- bash, ash and other similar shells interpret a dash (-) at the start
-- of a command-line parameters as an option indicator regardless of
-- whether it is inside a single-quoted string.  It must be backlash
-- escaped to resolve this.  This requires in some funky special-case
-- handling.  It may actually be a property of the getopt function
-- rather than the shell proper.
function shellstartsqescape(value)
	local res, _ = string.gsub(value, "^%-", "\\-")
	return shellsqescape(res)
end

-- containing the resulting substrings. The optional max parameter specifies
-- the number of bytes to process, regardless of the actual length of the given
-- string. The optional last parameter, regex, specifies whether the separator
-- sequence is interpreted as regular expression.
--					pattern as regular expression (optional, default is false)
function split(str, pat, max, regex)
	pat = pat or "\n"
	max = max or #str

	local t = {}
	local c = 1

	if #str == 0 then
		return {""}
	end

	if #pat == 0 then
		return nil
	end

	if max == 0 then
		return str
	end

	repeat
		local s, e = str:find(pat, c, not regex)
		max = max - 1
		if s and max < 0 then
			t[#t+1] = str:sub(c)
		else
			t[#t+1] = str:sub(c, s and s - 1)
		end
		c = e and e + 1 or #str + 1
	until not s or max < 0

	return t
end

function trim(str)
	if str then
		return (str:gsub("^%s*(.-)%s*$", "%1"))
	end
	return "nil"
end

function cmatch(str, pat)
	local count = 0
	for _ in str:gmatch(pat) do count = count + 1 end
	return count
end

-- one token per invocation, the tokens are separated by whitespace. If the
-- input value is a table, it is transformed into a string first. A nil value
-- will result in a valid iterator which aborts with the first invocation.
function imatch(v)
	if type(v) == "table" then
		local k = nil
		return function()
			k = next(v, k)
			return v[k]
		end

	elseif type(v) == "number" or type(v) == "boolean" then
		local x = true
		return function()
			if x then
				x = false
				return tostring(v)
			end
		end

	elseif type(v) == "userdata" or type(v) == "string" then
		return tostring(v):gmatch("%S+")
	end

	return function() end
end

-- value or 0 if the unit is unknown. Upper- or lower case is irrelevant.
-- Recognized units are:
--	o "y"	- one year   (60*60*24*366)
--  o "m"	- one month  (60*60*24*31)
--  o "w"	- one week   (60*60*24*7)
--  o "d"	- one day    (60*60*24)
--  o "h"	- one hour	 (60*60)
--  o "min"	- one minute (60)
--  o "kb"  - one kilobyte (1024)
--  o "mb"	- one megabyte (1024*1024)
--  o "gb"	- one gigabyte (1024*1024*1024)
--  o "kib" - one si kilobyte (1000)
--  o "mib"	- one si megabyte (1000*1000)
--  o "gib"	- one si gigabyte (1000*1000*1000)
function parse_units(ustr)

	local val = 0

	-- unit map
	local map = {
		-- date stuff
		y   = 60 * 60 * 24 * 366,
		m   = 60 * 60 * 24 * 31,
		w   = 60 * 60 * 24 * 7,
		d   = 60 * 60 * 24,
		h   = 60 * 60,
		min = 60,

		-- storage sizes
		kb  = 1024,
		mb  = 1024 * 1024,
		gb  = 1024 * 1024 * 1024,

		-- storage sizes (si)
		kib = 1000,
		mib = 1000 * 1000,
		gib = 1000 * 1000 * 1000
	}

	-- parse input string
	for spec in ustr:lower():gmatch("[0-9%.]+[a-zA-Z]*") do

		local num = spec:gsub("[^0-9%.]+$","")
		local spn = spec:gsub("^[0-9%.]+", "")

		if map[spn] or map[spn:sub(1,1)] then
			val = val + num * ( map[spn] or map[spn:sub(1,1)] )
		else
			val = val + num
		end
	end


	return val
end

-- also register functions above in the central string class for convenience
string.pcdata      = pcdata
string.striptags   = striptags
string.split       = split
string.trim        = trim
string.cmatch      = cmatch
string.parse_units = parse_units


function append(src, ...)
	for i, a in ipairs({...}) do
		if type(a) == "table" then
			for j, v in ipairs(a) do
				src[#src+1] = v
			end
		else
			src[#src+1] = a
		end
	end
	return src
end

function combine(...)
	return append({}, ...)
end

-- Converts provided value to table type
function to_table(value)
	if type(value) ~= "table" then
		return value and {value} or {}
	end
	return value
end

function contains(table, value)
	if type(table) ~= "table" or not value then return false end
	for k, v in pairs(table) do
		if value == v then
			return k
		end
	end
	return false
end

-- Both table are - in fact - merged together.
function update(t, updates)
	for k, v in pairs(updates) do
		t[k] = v
	end
end

function keys(t)
	local keys = { }
	if t then
		for k, _ in kspairs(t) do
			keys[#keys+1] = k
		end
	end
	return keys
end

function clone(object, deep)
	local copy = {}

	for k, v in pairs(object) do
		if deep and type(v) == "table" then
			v = clone(v, deep)
		end
		copy[k] = v
	end

	return setmetatable(copy, getmetatable(object))
end

function deep_compare(t1, t2)
	local ty1 = type(t1)
	local ty2 = type(t2)
	if ty1 ~= ty2 then return false end
	-- non-table types can be directly compared
	if ty1 ~= 'table' and ty2 ~= 'table' then return t1 == t2 end
	for k1, v1 in pairs(t1) do
		local v2 = t2[k1]
		if v2 == nil or not deep_compare(v1,v2) then return false end
	end
	for k2, v2 in pairs(t2) do
		local v1 = t1[k2]
		if v1 == nil or not deep_compare(v1,v2) then return false end
	end
	return true
end

-- Function which will find the lowest missing number in incrementing order table
-- f({1, 2, 4}) -> 3
function find_first_missing(arr)
	local present = {}
	for _, id in pairs(arr) do
		present[id] = true
	end
	local n = #present
	local max = 0
	for i = 1, n do
		if not present[i] then
			return tostring(i)
		else
			max = i
		end
	end
	return tostring(max + 1)
end

-- Generates a random key of `A-Za-z0-9` characters and given `length`
function generate_key (length)
	return exec("tr -dc A-Za-z0-9 </dev/urandom | head -c "..(length or "8"))
end

-- Gets a prettified or internal interface name hash map.
---@param cs table ConfigService or uci cursor
---@param pretty boolean Whether to return prettified mappping of interface names
---@param uci boolean Whether to iterate using uci instead of table function
---@param section string Section to iterate through
---@param key string Key that will be retrieved or set
---@param p_value string Pretty value that will be retrieved or set
---@return table network_map Map of interface names
function get_network_map(cs, pretty, uci, section, key, p_value)
	section = section or "interface"
	key = key or ".name"
	local network_map = {}
	local foreach = function (...)
		local uci_foreach = uci and cs.uci and cs.uci.foreach and cs.uci:foreach(...)
		local table_foreach
		if cs.table_foreach then
			table_foreach = cs:table_foreach(...)
		elseif cs.uci and cs.uci.foreach then
			table_foreach =  cs.uci:foreach(...)
		elseif cs.foreach then
			table_foreach = cs:foreach(...)
		else
			local uci_cursor = require("vuci.uci").cursor()
			uci_foreach = uci_cursor:foreach(...)
		end
		return uci_foreach or table_foreach
	end
	if pretty then
		foreach("network", section, function(s)
			network_map[s[key]] = s[p_value] or (section ~= "interface" and s.description) or s.name or s[".name"]
		end)
		return network_map
	end
	foreach("network", section, function(s)
		network_map[s[p_value] or (section ~= "interface" and s.description) or s.name or s[".name"]] = s[key]
	end)
	return network_map
end

-- Gets a prettified interface name value or values based on its type.
---@param cs table ConfigService or uci cursor
---@param value string Value which will be processed
---@param uci boolean Whether to iterate using uci instead of table function
---@param section string Section to iterate through
---@param key string Key that will be retrieved or set
---@param p_value string Pretty value that will be retrieved or set
---@return string | table interface prettified interface name or names
function network_mapper_get(cs, value, uci, section, key, p_value)
	local network_pretty = get_network_map(cs, true, uci, section, key, p_value)
	if type(value) == "table" then
		local values = {}
		for _, v in ipairs(value) do
			table.insert(values, network_pretty[v] or v)
		end
		return values
	end
	return network_pretty[value] or value
end

-- Sets an internal interface name value or values based on its type.
---@param cs table ConfigService
---@param value string Value which will be processed
---@param uci boolean Whether to iterate using uci instead of table function
---@param key string Key that will be retrieved or set
---@param p_value string Pretty value that will be retrieved or set
---@param section string Section to iterate through
function network_mapper_set(cs, value, uci, section, key, p_value)
	local network_internal = get_network_map(cs, false, uci, section, key, p_value)
	if type(value) == "table" then
		local values = {}
		for _, v in ipairs(value) do
			table.insert(values, network_internal[v] or v)
		end
		return cs:table_set(cs.config, cs.sid, cs.api_key, values)
	end
	cs:table_set(cs.config, cs.sid, cs.api_key, network_internal[value] or value)
end

local foreach = function (cs, options, ...)
	local uci_foreach = options.uci and cs.uci and cs.uci.foreach and cs.uci:foreach(...)
	local table_foreach
		if cs.table_foreach then
			table_foreach = cs:table_foreach(...)
		elseif cs.uci and cs.uci.foreach then
			table_foreach =  cs.uci:foreach(...)
		elseif cs.foreach then
			table_foreach = cs:foreach(...)
		else
			local uci_cursor = require("vuci.uci").cursor()
			uci_foreach = uci_cursor:foreach(...)
		end
	return uci_foreach or table_foreach
end

-- Gets new interface's id and area type.
---@param cs table ConfigService or uci cursor
---@param options table Interface options which will be used during creation
---@return string id, string area_type new interface's id and area type
function get_interface_id(cs, options)
	local area_type
	local lan_prefix, wan_prefix = "lan", "wan"
	if options.condition ~= nil then
		options.prefix = options.condition and lan_prefix or wan_prefix
		area_type = options.condition and "lan" or "wan"
	else
		options.prefix = options.area_type == "lan" and lan_prefix or wan_prefix
	end
	area_type = options.area_type or area_type
	return generate_name(cs, "network", "interface", options.prefix, { ".name", "name" }), area_type
end

-- Gets new interface's metric.
---@param cs table ConfigService or uci cursor
---@param options table Interface options which will be used during creation
---@return number metric new interface's metric
function get_interface_metric(cs, options)
	local max_metric = 0
	foreach(cs, options, "network", "interface", function(s)
		if s.metric and tonumber(s.metric) > max_metric then
			max_metric = tonumber(s.metric)
		end
	end)
	return max_metric + 1
end

-- Creates a network interface section with provided parameters.
---@param cs table ConfigService or uci cursor
---@param options table Interface options which will be used during creation
---@return string id created interface's id
function create_network_interface(cs, options)
	local section = function (...)
		local uci_section = options.uci and cs.uci and cs.uci.section and cs.uci:section(...)
		local table_section
		if cs.table_section then
			table_section = cs:table_section(...)
		elseif cs.uci and cs.uci.section then
			table_section =  cs.uci:section(...)
		elseif cs.section then
			table_section = cs:section(...)
		else
			local uci_cursor = require("vuci.uci").cursor()
			uci_section = uci_cursor:section(...)
		end
		return uci_section or table_section
	end
	local id, area_type = get_interface_id(cs, options)
	local metric = get_interface_metric(cs, options)
	section("network", "interface", id, {
		metric = area_type == "wan" and metric or nil,
		area_type = area_type,
		name = options.name,
		proto = options.proto,
		device = options.device,
		disabled = options.disabled
	})
	return id
end

-- generates a new name for the section based on the prefix
---@param cs table ConfigService
---@param config string Config name
---@param section string Section to iterate through
---@param prefix string Section name prefix that will be added
---@param opts table Options that will be checked to ensure unique name
---@return string name generated section name
function generate_name(cs, config, section, prefix, opts)
	opts = opts or { ".name" }
	local unique_nums, nums = {}, {}
	local missing_num = 1
	foreach(cs, {}, config, section, function(s)
		for _, opt in ipairs(opts) do
			if s[opt] then
				local num = string.match(s[opt], "^" .. prefix .. "(%d+)$")
				if num then unique_nums[num] = true end
			end
		end
	end)
	for num in pairs(unique_nums) do
		table.insert(nums, tonumber(num))
	end
	table.sort(nums)
	while nums[missing_num] == missing_num do
		missing_num = missing_num + 1
	end
	return prefix .. missing_num
end

-- filters out the keys from the 'tbl' table which are not defined in the 'keys' table (or inverse if the 'inverse' flag is passed)
function filter(tbl, keys, inverse)
	for key in pairs(tbl) do
		if inverse then
			if keys[key] then
				tbl[key] = nil
			end
		else
			if not keys[key] then
				tbl[key] = nil
			end
		end
	end
end

-- Serialize the contents of a table value.
function _serialize_table(t, seen)
	assert(not seen[t], "Recursion detected.")
	seen[t] = true

	local data  = ""
	local idata = ""
	local ilen  = 0

	for k, v in pairs(t) do
		if type(k) ~= "number" or k < 1 or math.floor(k) ~= k or ( k - #t ) > 3 then
			k = serialize_data(k, seen)
			v = serialize_data(v, seen)
			data = data .. ( #data > 0 and ", " or "" ) ..
				'[' .. k .. '] = ' .. v
		elseif k > ilen then
			ilen = k
		end
	end

	for i = 1, ilen do
		local v = serialize_data(t[i], seen)
		idata = idata .. ( #idata > 0 and ", " or "" ) .. v
	end

	return idata .. ( #data > 0 and #idata > 0 and ", " or "" ) .. data
end

-- with loadstring().
function serialize_data(val, seen)
	seen = seen or setmetatable({}, {__mode="k"})

	if val == nil then
		return "nil"
	elseif type(val) == "number" then
		return val
	elseif type(val) == "string" then
		return "%q" % val
	elseif type(val) == "boolean" then
		return val and "true" or "false"
	elseif type(val) == "function" then
		return "loadstring(%q)" % get_bytecode(val)
	elseif type(val) == "table" then
		return "{ " .. _serialize_table(val, seen) .. " }"
	else
		return '"[unhandled data type:' .. type(val) .. ']"'
	end
end

function restore_data(str)
	return loadstring("return " .. str)()
end


--
-- Byte code manipulation routines
--

-- will be stripped before it is returned.
function get_bytecode(val)
	local code

	if type(val) == "function" then
		code = string.dump(val)
	else
		code = string.dump( loadstring( "return " .. serialize_data(val) ) )
	end

	return code -- and strip_bytecode(code)
end

-- numbers and debugging numbers will be discarded. Original version by
-- Peter Cawley (http://lua-users.org/lists/lua-l/2008-02/msg01158.html)
function strip_bytecode(code)
	local version, format, endian, int, size, ins, num, lnum = code:byte(5, 12)
	local subint
	if endian == 1 then
		subint = function(code, i, l)
			local val = 0
			for n = l, 1, -1 do
				val = val * 256 + code:byte(i + n - 1)
			end
			return val, i + l
		end
	else
		subint = function(code, i, l)
			local val = 0
			for n = 1, l, 1 do
				val = val * 256 + code:byte(i + n - 1)
			end
			return val, i + l
		end
	end

	local function strip_function(code)
		local count, offset = subint(code, 1, size)
		local stripped = { string.rep("\0", size) }
		local dirty = offset + count
		offset = offset + count + int * 2 + 4
		offset = offset + int + subint(code, offset, int) * ins
		count, offset = subint(code, offset, int)
		for n = 1, count do
			local t
			t, offset = subint(code, offset, 1)
			if t == 1 then
				offset = offset + 1
			elseif t == 4 then
				offset = offset + size + subint(code, offset, size)
			elseif t == 3 then
				offset = offset + num
			elseif t == 254 or t == 9 then
				offset = offset + lnum
			end
		end
		count, offset = subint(code, offset, int)
		stripped[#stripped+1] = code:sub(dirty, offset - 1)
		for n = 1, count do
			local proto, off = strip_function(code:sub(offset, -1))
			stripped[#stripped+1] = proto
			offset = offset + off - 1
		end
		offset = offset + subint(code, offset, int) * int + int
		count, offset = subint(code, offset, int)
		for n = 1, count do
			offset = offset + subint(code, offset, size) + size + int * 2
		end
		count, offset = subint(code, offset, int)
		for n = 1, count do
			offset = offset + subint(code, offset, size) + size
		end
		stripped[#stripped+1] = string.rep("\0", int * 3)
		return table.concat(stripped), offset
	end

	return code:sub(1,12) .. strip_function(code:sub(13,-1))
end


--
-- Sorting iterator functions
--

function _sortiter( t, f )
	local keys = { }

	local k, v
	for k, v in pairs(t) do
		keys[#keys+1] = k
	end

	local _pos = 0

	table.sort( keys, f )

	return function()
		_pos = _pos + 1
		if _pos <= #keys then
			return keys[_pos], t[keys[_pos]], _pos
		end
	end
end

-- the provided callback function.
function spairs(t,f)
	return _sortiter( t, f )
end

-- The table pairs are sorted by key.
function kspairs(t)
	return _sortiter( t )
end

-- The table pairs are sorted by value.
function vspairs(t)
	return _sortiter( t, function (a,b) return t[a] < t[b] end )
end


--
-- System utility functions
--

function bigendian()
	return string.byte(string.dump(function() end), 7) == 0
end

-- LUA io.popen descriptor cannot handle interrupted system call,
-- it crashes for some reason
function exec(command)
	local pp   = io.popen(command)
	if not pp then return nil end
	local data = pp:read("*a")
	pp:close()

	return data
end

function dbg(string, ...)
	perror(string.format(string, ...))
end

function execi(command)
	local pp = io.popen(command)

	return pp and function()
		local line = pp:read()

		if not line then
			pp:close()
		end

		return line
	end
end

function file_exec(command, args, doas)
	local nixio = require("nixio")
	require("nixio.util")
	local read_stdout, write_stdout = nixio.pipe()
	local read_stderr, write_stderr = nixio.pipe()
	local pid = nixio.fork()
	if pid == 0 then
		nixio.dup(write_stdout, nixio.stdout)
		nixio.dup(write_stderr, nixio.stderr)
		read_stdout:close()
		read_stderr:close()
		if doas then
			local user_info = nixio.getpw(doas.username)
			if user_info then
				local setgid_res = nixio.setgid(user_info.gid)
				if not setgid_res and not doas.optional then
					nixio.write(nixio.stderr, "Failed to set group id")
					os.exit(1)
				end
				local setuid_res = nixio.setuid(user_info.uid)
				if not setuid_res and not doas.optional then
					print("Failed to set user id")
					os.exit(1)
				end
			elseif not doas.optional then
				nixio.write(nixio.stderr, "Failed to get user info")
				os.exit(1)
			end
		end
		nixio.exec(command, unpack(args))
		os.exit(1)
	end
	write_stdout:close()
	write_stderr:close()

	local stdout_str = read_stdout:readall() or ""
	local stderr_str = read_stderr:readall() or ""
	read_stdout:close()
	read_stderr:close()

	local _, _, exit_code = nixio.waitpid(pid)
	return {
		stdout = #stdout_str > 0 and stdout_str or nil,
		stderr = #stderr_str > 0 and stderr_str or nil,
		code = exit_code
	}
end

-- Deprecated
function execl(command)
	local pp   = io.popen(command)
	local line = ""
	local data = {}

	while true do
		line = pp:read()
		if (line == nil) then break end
		data[#data+1] = line
	end
	pp:close()

	return data
end


local ubus_codes = {
	"INVALID_COMMAND",
	"INVALID_ARGUMENT",
	"METHOD_NOT_FOUND",
	"NOT_FOUND",
	"NO_DATA",
	"PERMISSION_DENIED",
	"TIMEOUT",
	"NOT_SUPPORTED",
	"UNKNOWN_ERROR",
	"CONNECTION_FAILED"
}

local function ubus_return(...)
	if select('#', ...) == 2 then
		local rv, err = select(1, ...), select(2, ...)
		if rv == nil and type(err) == "number" then
			return nil, err, ubus_codes[err]
		end
	end

	return ...
end

function ubus(object, method, data, timeout)
	local connection
	if timeout == nil then
		if not _ubus_connection then
			_ubus_connection = _ubus.connect()
		end
		connection = _ubus_connection
	else
		connection = _ubus.connect(nil, timeout)
	end
	assert(connection, "Unable to establish ubus connection")

	if object and method then
		if type(data) ~= "table" then
			data = { }
		end
		return ubus_return(connection:call(object, method, data))
	elseif object then
		return connection:signatures(object)
	else
		return connection:objects()
	end
end

function fork_ubus(...)
	local nixio = require("nixio")
	local pid = nixio.fork()
	if pid > 0 then
		return
	elseif pid == 0 then
		local null = nixio.open("/dev/null", "w+")
		if null then
			nixio.dup(null, nixio.stderr)
			nixio.dup(null, nixio.stdout)
			nixio.dup(null, nixio.stdin)
			if null:fileno() > 2 then
				null:close()
			end
		end

		_ubus_connection = nil
		ubus(...)
		os.exit(0)
	end
end

function serialize_json(x, cb)
	local js = json.stringify(x)
	if type(cb) == "function" then
		cb(js)
	else
		return js
	end
end

-- Adds explicit "object" type annotation in the metatable of a table for correct empty table JSON parsing. 
---@param tbl table? Table which will be used in luci.jsonc.stringify
---@return table? returns nil for uninitialized table or table with updated metatable
function table_to_json_object(tbl)
	if not tbl then
		return nil
	end

	local mt = getmetatable(tbl)
	if mt then
		mt.__table_type = "object"
	else
		setmetatable(tbl, { __table_type = "object" })
	end

	return tbl
end

function libpath()
	return "/usr/lib/lua/vuci"
end

function checklib(fullpathexe, wantedlib)
	local fs = require "nixio.fs"
	local haveldd = fs.access('/usr/bin/ldd')
	local haveexe = fs.access(fullpathexe)
	if not haveldd or not haveexe then
		return false
	end
	local libs = exec(string.format("/usr/bin/ldd %s", shellquote(fullpathexe)))
	if not libs then
		return false
	end
	for k, v in ipairs(split(libs)) do
		if v:find(wantedlib) then
			return true
		end
	end
	return false
end

-------------------------------------------------------------------------------
-- Coroutine safe xpcall and pcall versions
--
-- Encapsulates the protected calls with a coroutine based loop, so errors can
-- be dealed without the usual Lua 5.x pcall/xpcall issues with coroutines
-- yielding inside the call to pcall or xpcall.
--
-- Authors: Roberto Ierusalimschy and Andre Carregal
-- Contributors: Thomas Harning Jr., Ignacio Burgueño, Fabio Mascarenhas
--
-- Copyright 2005 - Kepler Project
--
-- $Id: coxpcall.lua,v 1.13 2008/05/19 19:20:02 mascarenhas Exp $
-------------------------------------------------------------------------------

-------------------------------------------------------------------------------
-- Implements xpcall with coroutines
-------------------------------------------------------------------------------
local coromap = setmetatable({}, { __mode = "k" })

local function handleReturnValue(err, co, status, ...)
	if not status then
		return false, err(debug.traceback(co, (...)), ...)
	end
	if coroutine.status(co) == 'suspended' then
		return performResume(err, co, coroutine.yield(...))
	else
		return true, ...
	end
end

function performResume(err, co, ...)
	return handleReturnValue(err, co, coroutine.resume(co, ...))
end

local function id(trace, ...)
	return trace
end

function coxpcall(f, err, ...)
	local current = coroutine.running()
	if not current then
		if err == id then
			return pcall(f, ...)
		else
			if select("#", ...) > 0 then
				local oldf, params = f, { ... }
				f = function() return oldf(unpack(params)) end
			end
			return xpcall(f, err)
		end
	else
		local res, co = pcall(coroutine.create, f)
		if not res then
			local newf = function(...) return f(...) end
			co = coroutine.create(newf)
		end
		coromap[co] = current
		coxpt[co] = coxpt[current] or current or 0
		return performResume(err, co, ...)
	end
end

function copcall(f, ...)
	return coxpcall(f, id, ...)
end

function fromhex(str)
	return (string.gsub(str, '..', function (cc)
		return string.char(tonumber(cc, 16))
	end))
end

function tohex(str)
	return (string.gsub(str, '.', function (c)
		return string.format('%02x', string.byte(c))
	end))
end

function tobase64(str)
	local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	return ((str:gsub('.', function(x)
		local r,b='',x:byte()
		for i=8,1,-1 do r=r..(b%2^i-b%2^(i-1)>0 and '1' or '0') end
		return r;
	end)..'0000'):gsub('%d%d%d?%d?%d?%d?', function(x)
		if (#x < 6) then return '' end
		local c=0
		for i=1,6 do c=c+(x:sub(i,i)=='1' and 2^(6-i) or 0) end
		return b:sub(c+1,c+1)
	end)..({ '', '==', '=' })[#str%3+1])
end

function frombase64(str)
	local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	str = string.gsub(str, '[^'..b..'=]', '')
	return (str:gsub('.', function(x)
		if (x == '=') then return '' end
		local r,f='',(b:find(x)-1)
		for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
		return r;
	end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
		if (#x ~= 8) then return '' end
		local c=0
		for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
		return string.char(c)
	end))
end

function urldecode(s)
	s = s:gsub('+', ' '):gsub('%%(%x%x)', function(h)
		return string.char(tonumber(h, 16))
	end)

	local null_byte_pos = s:find("\0")
	if null_byte_pos then
		s = s:sub(1, null_byte_pos - 1)
	end

	return s
end

function setpasswd(username, password, encrypted)
	encrypted = encrypted or false
	local res = ubus("rpc-sys", "password_set", { user = username, password = password, encrypted = encrypted })
	if res and res.res == "0" then
		return 0
	end
	return 1
end


function getpasswd(username)
	local nixio = require("nixio")
	local pwe = nixio.getsp and nixio.getsp(username) or nixio.getpw(username)
	local pwh = pwe and (pwe.pwdp or pwe.passwd)
	if not pwh or #pwh < 1 or pwh == "!" or pwh == "x" then
		return nil, pwe
	else
		return pwh, pwe
	end
end

function checkpasswd(username, pass)
	local nixio = require("nixio")
	local pwh, pwe = getpasswd(username)
	if pwe then
		return (pwh == nil or nixio.crypt(pass, pwh) == pwh)
	end
	return false
end

function password_expired(username, password_lifetime)
	local nixio = require("nixio")
	if not nixio.getsp then return false end

	local shadow = nixio.getsp(username)
	if not shadow or not shadow.lstchg then return false end

	if not password_lifetime then
		local uci = require("vuci.uci").cursor()
		password_lifetime = uci:get("password_policy", "@policy[0]", "password_lifetime")

		if not password_lifetime or password_lifetime == "0" then
			password_lifetime = shadow.max
		end
	end
	password_lifetime = tonumber(password_lifetime)
	if not password_lifetime or password_lifetime <= 0 or password_lifetime > 365 then return false end

	local current_days = math.floor(os.time() / (24*60*60))
	local days_since_change = current_days - shadow.lstchg
	if days_since_change < 0 then return true end

	local days_left = password_lifetime - days_since_change
	if days_left <= 0 then return true end
	return false, days_left
end

function load_rights(group)
	local rights = { target_write = "", target_read = "", read = {}, write = {}}
	local uci = require("vuci.uci").cursor()
	local current_user_rights = uci:get_all("rpcd", group)
	rights.target_write = current_user_rights.target_write
	rights.target_read = current_user_rights.target_read
	for _, read in ipairs(current_user_rights.read) do
		rights.read[read] = true
	end
	for _, write in ipairs(current_user_rights.write) do
		rights.write[write] = true
	end
	return rights
end

function insert_to_set(set, value)
	local key = contains(set, value)
	if not key then
		table.insert(set, value)
		return true
	else
		return false
	end
end

function round(number, precision)
	local scalar = 10^(precision or 0)
	return math.floor(number*scalar+0.5)/scalar
end

-- Sets the permissions, owner, and group for a specified file.
---@param file_path string The path to the file.
---@param group string The group of the file.
---@param permissions number? The permissions to set for the file (optional, defaults to 0770).
function set_file_permissions(file_path, group, permissions)
	local fs = require "nixio.fs"
	permissions = permissions or 0770
	if not file_path or not group or not fs.access(file_path) then return end
	fs.chmod(file_path, permissions)
	fs.chown(file_path, nil, group)
end

function log_connection_webui(username, success, env)
	local uci = require("vuci.uci").cursor()
	local log = require("vuci/log")
	local proto = env.HTTPS and "HTTPS" or "HTTP"
	local REMOTE_ADDR = env.REMOTE_ADDR
	local SERVER_ADDR = env.SERVER_ADDR
	local text, err
	if success then
		text = "User \"%s\" successfully authenticated on %s from %s to %s" % { username, proto, REMOTE_ADDR, SERVER_ADDR }
		err = "accepted login for %s from %s\n" % { username, REMOTE_ADDR or "?" }
		log_str(err, "vuci", "auth")
		-- fork unblock, because it's not neccessary
		-- to wait for return and it will take a long
		-- time when ip_block has a large block list
		fork_ubus("ip_block", "unblock", { ip = REMOTE_ADDR, port = env.SERVER_PORT, destination_ip = env.SERVER_ADDR })
	else
		err = "vuci: failed login for %s from %s\n" % { username:gsub("%s+", ""), REMOTE_ADDR or "?" }
		log_str(err, "vuci", "auth")
		local res = ubus("ip_block", "push",
			{ ip = REMOTE_ADDR, port = env.SERVER_PORT, destination_ip = env.SERVER_ADDR, proto = proto })
		if res and res.count then
			text = "Invalid password attempt for \"%s\" from %s to %s via %s, attempt %s of %s" %
			{ username, REMOTE_ADDR, SERVER_ADDR, proto, res.count, uci:get("ip_blockd", "ip_blockd", "max_attempt_count") }
		else
			text = "Invalid password attempt for %s from %s to %s via %s" % { username, REMOTE_ADDR, SERVER_ADDR, proto }
		end
	end
	log:insert_eventslog({
		table = "connections",
		sender = "Web UI",
		priority = "notice",
		text = text
	})
end

---Parses output for a certain command from vtysh json to lua table
---@param cmd string Command for which the output should be parsed
---@param response string Output from vtysh. Can have multiple commands that were ran
---@param enclosing string Enclosing that the response uses {} for object and [] for array 
---@return table data Parsed json output
function parse_vtysh_json(response, cmd, enclosing)
	enclosing = enclosing or "{}"
	local data = {}
	if not response then return data end
	local start_index = response:find(cmd)
	if not start_index then return data end
	local output = response:sub(start_index):match(cmd.."%s*(%b" .. enclosing .. ")")
	if not output then return data end
	return json.parse(output) or data
end