local fs = require("nixio.fs")
local extra_validators = require("lua_extra_validators")
local rex_pcre2 = require "rex_pcre2" -- NOTE: use regex.new(pattern):exec(val) (or tfind) to avoid lua captures and get true regex behaviour
local regex_cache = {}
local regex = {
	new = function(r)
		if(regex_cache[r]) then return regex_cache[r] end
		regex_cache[r] = rex_pcre2.new(r)
		return regex_cache[r]
	end
}

local Validators = {}
Validators.regex = regex
local HOSTNAME_LEN = 253

-- local PROTO_REGEX = "((https?)|(opc\\.tcp)|(ftp))://"
local PROTO_REGEX = "[a-zA-Z][a-zA-Z0-9+.-]*://"
local IPV6_REGEX = "(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))"
local IPV4_REGEX = "((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])\\.\\b){3}((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])\\b)"
local HOSTNAME_REGEX = "([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])(\\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9]))*"
local SYSTEM_HOSTNAME_REGEX = "([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])((?!(?=\\..*)[0-9.]+$)\\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9]))*"
local PORT_REGEX = "([1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])"

-- URL_PATH_REGEX , URL_QUERY_REGEX and URL_FRAGMENT_REGEX are all very similar with slight differences
local URL_ENCODE_REGEX = "%[0-9a-fA-F]{2}"
local URL_SHARED_REGEX = "(([]a-zA-Z0-9!$&'()*+,./;=:@_~\\[\\-"
local URL_PATH_REGEX = URL_SHARED_REGEX.."])|("..URL_ENCODE_REGEX.."))*"
local URL_QUERY_REGEX = URL_SHARED_REGEX.."\\?])|("..URL_ENCODE_REGEX.."))*"
-- URL_FRAGMENT_REGEX is the thing that's after '#' in the url
local URL_FRAGMENT_REGEX = URL_SHARED_REGEX.."\\?#])|("..URL_ENCODE_REGEX.."))*"

local URL_REGEX = "("..IPV4_REGEX.."|\\["..IPV6_REGEX.."\\]|"..HOSTNAME_REGEX..")(:"..PORT_REGEX..")?(/"..URL_PATH_REGEX..")?(\\?"..URL_QUERY_REGEX..")?(#"..URL_FRAGMENT_REGEX..")?"

Validators.MAX_LENGTH_DEFAULT = 4096

local POSIX_PATH_ERROR_CODES = {
	INVALID_TYPE = 201,
	EMPTY_PATH = 202,
	PATH_TOO_LONG = 203,
	CONTROL_CHARACTERS = 204,
	PATH_TRAVERSAL = 205,
	ENDS_WITH_PERIOD = 206,
	ESCAPE_SEQUENCES = 207,
	ENDS_WITH_SLASH = 208,
	CONSECUTIVE_SLASHES = 209,
	FILENAME_TOO_LONG = 210,
	PATH_EXISTS_DIR = 211,
	PATH_EXISTS_NO_OVERWRITE = 212,
	FILETYPE_MISMATCH = 213,
	PATH_NOT_EXIST = 214,
	PARENT_NOT_DIR = 215
}

local FILE_NAME_VALIDATION_ERROR_CODES = {
	INVALID_TYPE = 221,
	EMPTY_NAME = 222,
	NAME_TOO_LONG = 223,
	CONTROL_CHARACTERS = 224,
	ESCAPE_SEQUENCES = 225,
	ENDS_WITH_PERIOD = 226,
	INVALID_CHARACTERS = 227,
	NAME_EXISTS_NO_OVERWRITE = 228
}

-- returns nil if value contains space or value is -0 or value ends with '.'
local function _tonumber(val)
	if val == "-0" then return nil end
	local str_val = tostring(val)
	if val and (str_val:match("%s") or str_val:match("%.$")) then
		return nil
	end
	return tonumber(val)
end


local function ip4prefix(val)
    val = _tonumber(val)
    if not val then return false end
    return ( val and val >= 0 and val <= 32 )
end

local function is_netmask(mask)
	local c = 0
	local addr = {}
	for token in string.gmatch(mask,"[^%.]+") do
		table.insert(addr, token)
	end
	while c < #addr and addr[c+1] == "255" do
		c = c + 1
	end
	if c == #addr then return true end
	c = c + 1
	local t = addr[c] --temp token
	if t == "254" or t == "252" or t == "248" or t == "240" or t == "224" or t == "192" or t == "128" or t == "0" then
		while c < #addr and addr[c+1] == "0" do
			c = c + 1
		end
	else
		return false
	end

	return c == #addr
end

function Validators:integer64(value)
	return extra_validators.integer64(value)
end

function Validators:uinteger64(value)
	return extra_validators.uinteger64(value)
end

function Validators:nospace(value)
	-- https://en.wikipedia.org/wiki/Whitespace_character#Unicode
	local unicode_whitespace_symbols = {
		"%s", -- Matches all white-space characters (Equivalent to [ \t\n\v\f\r]).
		" ",  -- no-break space
		" ",  -- en quad
		" ",  -- em quad
		" ",  -- en space
		" ",  -- em space
		" ",  -- three-per-em space
		" ",  -- four-per-em space
		" ",  -- six-per-em space
		" ",  -- figure space
		" ",  -- punctuation space
		" ",  -- thin space
		" ",  -- hair space
		" ",  -- narrow no-break space
		" ",  -- medium mathematical space
		"　", -- ideographic space
	}
	for _, v in ipairs(unicode_whitespace_symbols) do
		if string.match(value, v) then return false, "Value must not contain a space" end
	end
	return true
end

function Validators:default_validation(value)
    local res = (string.match(value, "[`'\"]") or not self:nospace(value))
    if not res then return true end
    return false, "Value can not contain `,',\" or space."
end

function Validators:is_bool(value)
    if value == "1" or value == "0" then
        return true
    else
        return false, "Provided value is not '1' or '0'."
    end
end

function Validators:base64(val)
    local result = (val:match("^[a-zA-Z0-9/+]+=?=?$") ~= nil) and (math.fmod(#val, 4) == 0)
	if result then return true end
	return false, "A base64 symbol string made up of a-zA-Z0-9/+= characters is accepted."
end

function Validators:port(val)
	local err = "Values between 1 and 65535 are accepted."
	local res, _ = self:uinteger(val)
	if not res then return false, err end
	val = _tonumber(val)
    local result = ( val and val >= 1 and val <= 65535)
	if result then return true end
    return false, err
end

function Validators:portrange(val)
	local p1, p2 = val:match("^(%d+)%-(%d+)$")
	if not p1 or not p2 then
		return self:port(val)
	end
	local nump1 = tonumber(p1)
	local nump2 = tonumber(p2)
	if not self:port(p1) or not self:port(p2) or nump1 <= 0 then
		return false, "Port ranges with values from 1 to 65535 are accepted. E.g. 232-254."
	end
	if nump1 >= nump2 or nump2 > 65535 then
		return false, "Port range starting port must be lower than ending port."
	end
	return true
end

function Validators:cidr4(val)
	local ip, mask = val:match("^([^/]+)/([^/]+)$")
    local result = self:ip4addr(ip) and ip4prefix(mask)
    if result then return true end
	return false, "IPv4 addresses with netmask are accepted. E.g. 192.168.1.1/24 ."
end

function Validators:ip4addr(val)
	local msg = "IPv4 addresses are accepted. E.g. 192.168.1.1 ."
	if not val then return false, msg end
	local ok = regex.new("^"..IPV4_REGEX.."$"):exec(val)
	return not not ok, msg
end

function Validators:netmask(val)
    local msg = "IPv4 netmasks are accepted. E.g. 255.255.255.0 ."
	local ok, _ = self:ip4addr(val)
	if not ok then
		return false, msg
	end
	return is_netmask(val), msg
end

function Validators:cidr6(val)
	local ip, mask = val:match("^([^/]+)/([^/]+)$")
    local result = self:ip6addr(ip) and self:ip6prefix(mask)
	return result, "IPv6 addresses with netmask are accepted. E.g. ::0000:8a2e:0370:7334/24 ."
end

-- although for API the maxlength flag should be used, for more complicated validation scenarios
-- this validator is still usefull
function Validators:maxlength(val, max)
	val = tostring(val)
	max = _tonumber(max)
	if val ~= nil and max ~= nil then
        local result = (#val <= max)
	    if result then return true end
	end

	return false, string.format("Maximum length of value is %s.", max)
end

function Validators:ip6addr(val)
	local msg = "IPv6 addresses are accepted. E.g. ::0000:8a2e:0370:7334."
	if not val then return false, msg end
	local ok = regex.new("^"..IPV6_REGEX.."$"):exec(val)
	return not not ok, msg
end

function Validators:ip6prefix(val)
	val = _tonumber(val)
    if not val then return false end
	return ( val and val >= 0 and val <= 128 )
end

function Validators:number(val, allow_trailing_zero)
	local msg = "Numbers are accepted"
	if not val then return false, msg end
	if val == "-0" then return false, msg end
	local ok = regex.new(allow_trailing_zero and "^-?(0|[1-9]+[0-9]*)(\\.[0-9]+)?$" or "^-?(0|[1-9]+[0-9]*)(\\.0*[0-9]*[1-9]+)?$"):exec(val)
	return not not ok, msg
end

function Validators:range(val, min, max, allow_trailing_zero)
	local ok, msg = self:number(val, allow_trailing_zero)
	if not ok then return false, msg end
	ok = regex.new("^-?[0-9]{1,15}([.].*)?$"):exec(val)
	if not ok then return false, "Value is too large" end

	local v = tonumber(val)
	ok = min <= v and v <= max
	return ok, string.format("Range of the value must be from %s to %s", min, max)
end

function Validators:integer(val)
	local ok = #val < 19
	if not ok then return false, "Value is too long" end
	ok = regex.new("^((0)|(-?[1-9][0-9]*))$"):exec(val)
	if not ok then return false, "Value must be a valid integer" end
	local v = tonumber(val)
	ok = -70368744177664 <= v and v <= 70368744177664
	return not not ok, "Integer range is -2^46 to 2^46"
end

function Validators:uinteger(val)
	local ok = #val < 19
	if not ok then return false, "Value is too long" end
	ok = regex.new("^((0)|([1-9][0-9]*))$"):exec(val)
	if not ok then return false, "Value must be a valid unsigned integer" end
	local v = tonumber(val)
	ok = 0 <= v and v <= 70368744177664
	return not not ok, "Unsigned integer range is 0 to 2^46"
end


function Validators:irange(val, min, max)
	local msg = string.format("Value must be an integer and range of the value must be from %s to %s.", min, max)
	if min >= 0 then
		return self:uinteger(val) and self:range(val, min, max), msg
	else
		return self:integer(val) and self:range(val, min, max), msg
	end
end

function Validators:min(val, min)
	val = _tonumber(val)
	min = _tonumber(min)

	if val ~= nil and min ~= nil then
        local result = val >= min
		if result then return true end
	end

	return false, string.format("Minimum value is %s.", min)
end

function Validators:uciname(val)
    local value = tostring(val)
    local result = (value:match("^[a-zA-Z0-9_]+$") ~= nil)
    if result then return true end
	return false, "A string of a-Z, 0-9 and _ characters is accepted."
end

function Validators:ipmask4(val)
	return self:cidr4(val) or self:ipnet4(val) or self:ip4addr(val), "IPv4 addresses with or without mask prefix are accepted. E.g. 192.168.1.1/24 ."
end

function Validators:ipnet4(val)
	local ip, mask = val:match("^([^/]+)/([^/]+)$")

	return self:ip4addr(ip) and is_netmask(mask), "IPv4 addresses are accepted. E.g. 192.168.1.1 ."
end

function Validators:ipmask6(val)
	return self:cidr6(val) or self:ip6addr(val), "IPv6 addresses with or without mask prefix are accepted. E.g. ::0000:8a2e:0370:7334/24 ."
end

function Validators:ipmask(val)
	return (self:ipmask4(val) or self:ipmask6(val)),
			"IPv4 and IPv6 addresses with or without mask prefix are accepted. E.g 192.168.1.0/24."
end

function Validators:string(_)
	return true
end

function Validators:username(val)
	local ok = regex.new("^[a-z][a-z0-9-_.]{0,31}$"):exec(val)
	return not not ok, "A string of lowercase Latin letters, numbers, -, . and _ characters is accepted. First character must be a lowercase Latin letter. Length between 1 and 32 characters."
end

function Validators:hostname(val)
	-- Almost any hostname can be used (as long as it does not have spaces) as tested using /etc/hosts
	local msg = "Domain names are accepted. E.g. example.com ."
	if not val then return false, msg end

	-- hostname regex allows all number domains, that's why we need to check it here separately
	if val:match("^[0-9.]+$") then return false, msg end

	local ok = regex.new("^"..HOSTNAME_REGEX.."$"):exec(val)
	ok = ok and #val <= HOSTNAME_LEN
	return not not ok, msg
end

function Validators:system_host(val)
	local msg = "Domain names or IPv4 addresses accepted. E.g. 192.168.1.1 or example.com."

	if not val or type(val) ~= "string" then return false, msg end

	if val == "" or #val > HOSTNAME_LEN then return false, msg end

	if self:ip4addr(val) then
		return true
	end

	local ok = regex.new("^" .. SYSTEM_HOSTNAME_REGEX .. "$"):exec(val)

	return not not ok, msg
end

function Validators:host(val, ipv4only)
	if ipv4only then
		return self:hostname(val) or self:ip4addr(val), "Domain names or IP addresses accepted. E.g. 192.168.1.1 or example.com."
	else
		return self:hostname(val) or self:ipaddr(val), "Domain names or IP addresses accepted. E.g. 192.168.1.1 or ::0000:8a2e:0370:7334 or example.com."
	end
end

function Validators:ipaddr(val)
	local result = self:ip4addr(val) or self:ip6addr(val)
	if result then return true end
    return false, "IPv4 and IPv6 addresses are accepted. E.g. 192.168.1.1."
end

function Validators:credentials_validate(val, space)
    space = space or false
    local regex = "^[^` ]*$"
    local hint = "All characters are allowed except ` and space."
    if space then
        hint = "All characters are allowed except `."
        regex = "^[^`]*$"
    end

	local result = string.match(val, regex)
	if result then return true end
	return false, hint
end

function Validators:check_array(val, array)
    for _, v in pairs(array) do
        if v == val then return true end
    end
    return false, string.format("Must be one of the following values [%s].", table.concat(array, ", "))
end

function Validators:exact_length(val, allowed_lengths)
	local msg = string.format("Value must be exactly %s characters long, but is %s characters long.", table.concat(allowed_lengths, " or "), #val)
	local result = false
	for _, maxlen in ipairs(allowed_lengths) do
		if #val == maxlen then result = true end
	end
	return result, msg
end

function Validators:hexstring(val)
	return not not regex.new("^[a-fA-F0-9]+$"):exec(val), "A hexadecimal string of symbols: a-f, A-F and 0-9 is accepted."
end

function Validators:guid(val)
	local err_msg = "GUID which consists of five groups of hexadecimal digits which are seperated by hyphens is accepted."
	if val then
		local util = require("vuci.util")
		local split_guid = util.split(val, "-")
		if #split_guid ~= 5 then return false, err_msg end
		for _, v in pairs(split_guid) do
			if not v:match("^[a-fA-F0-9]+$") then return false, err_msg end
		end
		if #split_guid[1] ~= 8 or #split_guid[2] ~= 4 or #split_guid[3] ~= 4 or #split_guid[4] ~= 4 or #split_guid[5] ~= 12 then
			return false, err_msg
		end
		return true
	end
	return false, err_msg
end

function Validators:no_prefix(val, prefix)
    local result = val:find(prefix, 1, true) == 1
    if not result then return true end
    return false, string.format("Value with no leading %s is accepted", prefix)
end

function Validators:macaddr(val)
	local hint = "Mac address of six groups of two hexadecimal digits are accepted. E.g. 01:23:45:67:89:AB."
	return string.match(val, "^%x%x:%x%x:%x%x:%x%x:%x%x:%x%x$") and true or false, hint
end

function Validators:macaddr_range(val)
	local hint = "MAC address range accepted, two MAC addresses separated by a dash E.g 00:00:00:00:00:00-FF:FF:FF:FF:FF:FF"
	local util = require("vuci.util")
	local split_values = util.split(val, "-")
	if #split_values ~= 2 then return self:macaddr(val) end

	return self:macaddr(split_values[1]) and self:macaddr(split_values[2]) and string.lower(split_values[1]) < string.lower(split_values[2]), hint
end

function Validators:file_validation(val, path, seen)
	if val:match("%.%./") then return false, "File path can not contain ../" end

	local ok = false
	for _, p in ipairs(path[1] and path or {path}) do
		local start = val:find(p, 1, true)
		if start == 1 then
			ok = true
			break
		end
	end
	if not ok then return false, "File path can only start with: " .. table.concat(path, " or ") end

	local s = fs.stat(val)
	seen = seen or { }
	if s and not seen[s.ino] then
		seen[s.ino] = true
		if s.type == "reg" then
			return true
		elseif s.type == "lnk" then
			return self:file_validation(fs.readlink(val), path, seen)
		end
	end

	return false, "Provided file does not exist in the device"
end

function Validators:loglimit(value)
	if value then
		local val_str, type = value:match("^([0-9]+)/(.*)$")
		local val = _tonumber(val_str)
		if not val or (type ~= "second" and type ~= "minute" and type ~= "hour") then
			return false, "A time value with time interval(hour, minute, second) is accepted. E.g. 10/minute"
		end
		local max_val = 0
		if type == "second" then
			max_val = 1000
		elseif type == "minute" then
			max_val = 600000
		elseif type == "hour" then
			max_val = 36000000
		end
		if val > max_val then
			return false, string.format("Length of the value must be from 1 to %s.", tostring(max_val))
		end
	end
	return true
end

function Validators:fieldvalidation(val, valmat)
	local msg = "Value must match the format: " .. valmat
	val = tostring(val)
	valmat = tostring(valmat)
	if val:match(valmat) ~= nil then
		return true
	end
	return false, msg
end

function Validators:protourl(value)
	local ok = not not regex.new("^"..PROTO_REGEX):exec(value)
	if ok and self:url(value) then
		return true
	end
	return false, "A full URL is accepted. E.g. http://www.example.com/example or http://192.168.1.1/example or http://[::8a2e:370:7334]/example ."
end

function Validators:url(value)
	local msg = "URL is accepted. E.g. example.com/example or 192.168.1.1/example or [::8a2e:370:7334]/example ."
	if not value then return false, msg end

	local ok1, _, captures = regex.new("^("..PROTO_REGEX..")?"..URL_REGEX.."$"):tfind(value)
	ok1 = not not ok1
	local ip_or_hostname = (captures or {})[2]

	-- validate IP address if it is matched
	if ip_or_hostname then
		if ip_or_hostname:match("^[0-9.]+$") then
			local ok = self:ip4addr(ip_or_hostname)
			if not ok then return ok, msg end
		end
		if #ip_or_hostname > HOSTNAME_LEN then
			return false, msg
		end
	end

	return ok1, msg
end

function Validators:email(value)
	local ok = regex.new("^([\\w+-]+\\.)*[\\w+-]+@([\\w+-]+\\.)*[\\w+-]+\\.[a-zA-Z0-9]+$"):exec(value)
	return not not ok, "A valid email address is accepted. E.g. example@domain.com"
end

function Validators:time(val)
	if val and (val:match("^[0-1][0-9]:[0-5][0-9]$") or
		val:match("^[0-9]:[0-5][0-9]$") or
		val:match("^[0-2][0-3]:[0-5][0-9]$")) then
		return true
	end
	return false, "Time of format hh:mm is accepted."
end

function Validators:ufloat(val)
	local msg = "Only positive float numbers are accepted. E.g. 1.32."
	local n = _tonumber(val)
	if n == math.huge then return false, "Number is too big." end
	if not val:match("^[0-9.-]+$") then
		return false, msg
	end
	return ( n ~= nil and n >= 0 ), msg
end

function Validators:float(val)
	local msg = "Only float numbers are accepted. E.g. 1.32."
	local n = _tonumber(val)
	if n == math.huge or n == -math.huge then return false, "Number is too big." end
	if not val:match("^[0-9.-]+$") then
		return false, msg
	end
	return ( n ~= nil ), msg
end

function Validators:ufloat_scientific(val)
	local n = _tonumber(val)
	if n == math.huge then return false, "Number is too big." end
	return ( n ~= nil and n >= 0 ), "Only positive float numbers are accepted. E.g. 1.32."
end

function Validators:float_scientific(val)
	local n = _tonumber(val)
	if n == math.huge or n == -math.huge then return false, "Number is too big." end
	return ( n ~= nil ), "Only float numbers are accepted. E.g. 1.32."
end

function Validators:phonedigit(val)
	if #val > 16 then return false, "Maximum length of value is 16" end
	return (val:match("^%+?%d+$") ~= nil), "A phone number containing 0-9 and + characters is accepted."
end

function Validators:neg(val)
	local result, replaced = val:gsub("^%s*!%s*", "")
	if #result == 0 then
		return false, "Value after an exclamation mark is required."
	end
	return result
end

function Validators:hostport(val, ipv4only)
	local hint = "Values between 1 and 65535 or an IP address or domain name with a port is required E.g 192.168.1.1:80 ."
	return (self:port(val) or self:hostipport(val, ipv4only)), hint
end

function Validators:hostipport(value, ipv4only)
	local msg = "An IPv4"..(ipv4only and "" or " or IPv6").." address or domain name with a port is required E.g 192.168.1.1:80"
	if not value then return false, msg end
	local reg = "^("..PROTO_REGEX..")?("..IPV4_REGEX..(ipv4only and "" or "|\\["..IPV6_REGEX.."\\]").."|"..HOSTNAME_REGEX..")(:"..PORT_REGEX..")$"
	local ok = regex.new("^"..reg.."$"):exec(value)
	return not not ok, msg
end

function Validators:root_password(val)
	if val and (#val >= 8) and (#val <= 4094) and
		val:match("[a-z]") and
		val:match("[A-Z]") and
		val:match("[0-9]") then
		return true
	end
	return false, "A password of minimum 8 characters and maximum 4094 characters, at least one uppercase letter, one lowercase letter and one number is accepted."
end

function Validators:system_password(val)
	local uci = require("vuci.uci").cursor()

	local min_length = tonumber(uci:get("password_policy", "@policy[0]", "password_length") or 8)
	local require_lower_upper = uci:get("password_policy", "@policy[0]", "require_lower_upper") == "1"
	local require_digits = uci:get("password_policy", "@policy[0]", "require_digits") == "1"
	local require_special = uci:get("password_policy", "@policy[0]", "require_special") == "1"

	local validate_msg = {}
	if require_lower_upper then
		validate_msg[#validate_msg+1] = "one uppercase letter, one lowercase letter"
	end

	if require_digits then
		validate_msg[#validate_msg+1] = "one number"
	end

	if require_special then
		validate_msg[#validate_msg+1] = "one special character"
	end

	if val and (#val >= min_length) and (#val <= 4094) and
		((require_lower_upper and val:match("[a-z]") and val:match("[A-Z]")) or not require_lower_upper) and
		((require_digits and val:match("[0-9]")) or not require_digits) and
		((require_special and val:match("[!\"#$%%&'()*+%,%-%./:;<=>?@%[%]\\^_`{|}~]")) or not require_special) then
		return true
	end
	return false, string.format("A password of minimum %d characters and maximum 4094 characters%s is accepted.", min_length, #validate_msg > 0 and ", at least " .. table.concat(validate_msg, ", ") or "")
end

function Validators:timehhmmss(val)
	local value = val:match("^[0-1][0-9]:[0-5][0-9]:[0-5][0-9]$")
	if value then
		return true
	end
	value = val:match("^[0-2][0-3]:[0-5][0-9]:[0-5][0-9]$")
	if value then
		return true
	end
	return false, "Time of format hh:mm:ss is accepted."
end

function Validators:mqtt_client_id(val)
	if val:match("^[a-zA-Z0-9!@#:%$%%&%*%+%-/=%?%^_`%[%]{|}~%.]+$") then return true end
	return false, "Only letters, numbers, and allowed symbols (! @ # : % $ & * + - / = ? ^ _ ` [ ] { | } ~ .) are accepted"
end

function Validators:dateyyyymmdd(val, allow_past)
	local hint = "A date of format yyyy-mm-dd is accepted."
	if val == nil then
		return false, hint
	end
	local yearstr, monthstr, daystr = val:match("^(%d%d%d%d)-(%d%d)-(%d%d)$")
	if (yearstr == nil) or (monthstr == nil) or (daystr == nil) then
		return false, hint
	end
	local year = _tonumber(yearstr)
	local month = _tonumber(monthstr)
	local day = _tonumber(daystr)
	if (year == nil) or (month == nil) or (day == nil) then
		return false, hint
	end

	local days_in_month = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 }

	local function is_leap_year(year)
		return (year % 4 == 0) and ((year % 100 ~= 0) or (year % 400 == 0))
	end

	local function get_days_in_month(month, year)
		if (month == 2) and is_leap_year(year) then
			return 29
		else
			return days_in_month[month]
		end
	end
	local function month_to_days(month, year)
		local days = 0
		for i = 1, month do
			days = days + get_days_in_month(i, year)
		end
		return days
	end
	if ((month == 0) or (month > 12)) then
		return false, hint
	end
	local entered_month = get_days_in_month(month, year)
	if ((day == 0) or (day > entered_month)) then
		return false, hint
	end
	if not allow_past then
		local currentDate = os.date('*t')
		-- Y2K38 issue, where years later than 2038 result in os.time formatting bug with 32 bit systems https://en.wikipedia.org/wiki/Year_2038_problem
		local entered_days = (year * 365) + month_to_days(month, year) + day
		local current_days = (currentDate.year * 365) + month_to_days(currentDate.month, currentDate.year) + currentDate.day
		if entered_days < current_days then
			return false, "The provided date cannot be earlier than the current date. "
		end
	end
	return true
end

function Validators:pincode(val)
	local msg = "A PIN made out of numbers between 4 and 8 symbols is accepted."
	if #val < 4 or #val > 8 then
		return false, msg
	end

	return not not val:match("^[0-9]+$"), msg
end

function Validators:check_modem(val)
	local all_modems = require("vuci.modem"):get_all_modems()
	for _, v in pairs(all_modems) do
		if v.id == val then return true end
	end
	return false, "Provided modem does not exist"
end

function Validators:ipv4host(val)
	if self:ip4addr(val) or self:hostname(val) then
		return true
	end
	return false, "Domain names or IPv4 addresses accepted. E.g. 192.168.1.1 or example.com ."
end

function Validators:ipv6host(val)
	if self:ip6addr(val) or self:hostname(val) then
		return true
	end
	return false, "Domain names or IPv6 addresses accepted. E.g. ::0000:8a2e:0370:7334 or example.com ."
end

function Validators:ipmask6host(val)
	if self:ipmask6(val) or self:hostname(val) then
		return true
	end
	return false, "Domain names or IPv6 addresses with or without mask prefix accepted. E.g. ::0000:8a2e:0370:7334/24 or example.com ."
end

function Validators:precision(val, precision)
	precision = _tonumber(precision) or 6 
	return not not regex.new(string.format("^-?([0]|[1-9][0-9]*)\\.[0-9]{%d}$", precision)):exec(val),
		string.format("Floating part of number must contain %s digits E.g. 25.%s.", precision, string.rep("0", precision))
end

function Validators:precision_range(val, min, max, precision)
	local ok, msg = self:range(val, min, max, true)
	if not ok then return ok, msg end
	return self:precision(val, precision)
end

function Validators:validate_prefix(val, prefix)
	if not val:find("^" .. prefix) then
		return false, "Location must be prefixed with '" .. prefix .. "' to avoid wear out of device flash"
	end
	return true
end

function Validators:max_bytes(val, max)
	local v = tostring(val)
	if not val or #v > max then
		return false, string.format("Maximum length of value is %d bytes.", max)
	end
	return true
end

function Validators:pukcode(val)
	if type(val) ~= "string" or #val ~= 8 or val:match("[^0-9]") then
		return false, "A PUK made out of 8 digits is accepted."
	end
	return true
end

function Validators:wpakey(val)
	local value_length = #tostring(val)
	local hint = "This key may be entered either as a string of 64 hexadecimal digits, or as a passphrase of 8 to 63 printable ASCII characters."
	if value_length == 64 then
		return not not string.match(val, "^[a-fA-F0-9]+$"), hint
	end
	return value_length >= 8 and value_length <= 63, hint
end

function Validators:posix_filename(val)
	return not not (string.match(val, "^[%w._-]+$") and string.match(val, "%w")) and #val <= 255 , "A string of up to 255 a-Z, 0-9 and ._- characters in length that includes at least one alphanumeric character is accepted."
end

function Validators:posix_path(val, filetype, allow_create, prevent_overwrite, owner)
	if allow_create == nil then allow_create = true end
	if prevent_overwrite == nil then prevent_overwrite = true end

	if type(val) ~= "string" or val == "" then
		return false, "Path must be a non-empty string.", POSIX_PATH_ERROR_CODES.EMPTY_PATH
	end

	if #val > Validators.MAX_LENGTH_DEFAULT - 1 then
		return false, "Path exceeds maximum length (" .. Validators.MAX_LENGTH_DEFAULT - 1 .. " characters).", POSIX_PATH_ERROR_CODES.PATH_TOO_LONG
	end

	if val:match("[%z\1-\31]") then
		return false, "Path contains null bytes or control characters.", POSIX_PATH_ERROR_CODES.CONTROL_CHARACTERS
	end

	if val:match("^%.%./") or val:match("/%.%./") then
		return false, "Path contains path traversal sequences.", POSIX_PATH_ERROR_CODES.PATH_TRAVERSAL
	end

	if val:match("/%.$") or val:match("/%.%.$") or val:match("^%.$") or val:match("^%.%.$") then
		return false, "Path cannot end with a single or double period.", POSIX_PATH_ERROR_CODES.ENDS_WITH_PERIOD
	end

	if val:find("\\") then
		return false, "Path contains escape sequences.", POSIX_PATH_ERROR_CODES.ESCAPE_SEQUENCES
	end

	if val:sub(-1) == "/" and filetype ~= "dir" then
		return false, "Path cannot end with a forward slash unless it's a directory.", POSIX_PATH_ERROR_CODES.ENDS_WITH_SLASH
	end

	if val:find("//") then
		return false, "Path contains consecutive slashes.", POSIX_PATH_ERROR_CODES.CONSECUTIVE_SLASHES
	end

	for component in val:gmatch("([^/]+)") do
		if #component > 254 then
			return false, "Path contains a filename component that exceeds 254 characters.", POSIX_PATH_ERROR_CODES.FILENAME_TOO_LONG
		end
	end

	local stat = fs.stat(val)

	if stat then
		if stat.type == "dir" and filetype ~= "dir" then
			return false, "Path exists but is a directory.", POSIX_PATH_ERROR_CODES.PATH_EXISTS_DIR
		elseif prevent_overwrite and owner ~= stat.uid then
			return false, "Path already exists and overwriting is not allowed.", POSIX_PATH_ERROR_CODES.PATH_EXISTS_NO_OVERWRITE
		elseif filetype and stat.type ~= filetype then
			return false, "Path must be a " .. filetype .. ".", POSIX_PATH_ERROR_CODES.FILETYPE_MISMATCH
		end
	else
		local parent_dir = val:match("^(.+)/[^/]+$") or "/"
		if parent_dir then
			local parent_stat = fs.stat(parent_dir)
			if parent_stat and parent_stat.type ~= "dir" then
				return false, "Parent path is not a directory.", POSIX_PATH_ERROR_CODES.PARENT_NOT_DIR
			end

			if not parent_stat and not allow_create then
				return false, "Path does not exist.", POSIX_PATH_ERROR_CODES.PATH_NOT_EXIST
			end
		end
	end

	return true
end

function Validators:no_control_codes(val)
	if string.match(val, "%c") == nil then
		return true
	end
	return false, "Using control codes is not accepted."
end

return Validators
