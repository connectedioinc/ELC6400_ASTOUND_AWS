-- Copyright 2014-2018 Christian Schoenebeck <christian dot schoenebeck at gmail dot com>
-- Licensed to the public under the Apache License 2.0.

-- Modifications Copyright (C) 2021 Teltonika Networks

local NX   = require("nixio")
local NXFS = require("nixio.fs")
local UCI  = require("uci")
local SYS  = require("vuci.sys")
local os     = require("os")

local M = {}

function call(...)
	return os.execute(...) / 256
end

function M.env_info_full()
	local res = {}
	local function has_wgetssl()
		return (call( [[which wget-ssl >/dev/null 2>&1]] ) == 0)	-- and true or nil
	end

	local function has_curlssl()
		return (call( [[$(which curl) -V 2>&1 | grep "Protocols:" | grep -qF "https"]] ) ~= 0)
	end

	local function has_fetch()
		return (call( [[which uclient-fetch >/dev/null 2>&1]] ) == 0)
	end

	local function has_fetchssl()
		return NXFS.access("/lib/libustream-ssl.so")
	end

	local function has_curl()
		return (call( [[which curl >/dev/null 2>&1]] ) == 0)
	end

	local function has_curlpxy()
		return (call( [[grep -i "all_proxy" /usr/lib/libcurl.so* >/dev/null 2>&1]] ) == 0)
	end

	local function has_bbwget()
		return (call( [[$(which wget) -V 2>&1 | grep -iqF "busybox"]] ) == 0)
	end

	res.has_wgetssl = has_wgetssl()
	res.has_curl = has_curl()
	res.has_curlssl = has_curlssl()
	res.has_curlpxy = has_curlpxy()
	res.has_fetch = has_fetch()
	res.has_fetchssl = has_fetchssl()
	res.has_bbwget = has_bbwget()
	res.has_ssl = has_wgetssl() or has_curlssl() or (has_fetch() and has_fetchssl())
	res.has_proxy = has_wgetssl() or has_curlssl() or has_fetch() or has_bbwget()
	res.has_forceip = has_wgetssl() or has_curlssl() or has_fetch()
	res.has_bindnet = has_curl() or has_wgetssl()

	local function has_bindhost()
		if (call( [[which host >/dev/null 2>&1]] ) == 0) then return true end
		if (call( [[which khost >/dev/null 2>&1]] ) == 0) then return true end
		if (call( [[which drill >/dev/null 2>&1]] ) == 0) then return true end
		return false
	end

	local function has_hostip()
		return (call( [[which hostip >/dev/null 2>&1]] ) == 0)
	end

	local function has_nslookup()
		return (call( [[$(which nslookup) localhost 2>&1 | grep -qF "(null)"]] ) ~= 0)
	end

	res.has_bindhost = has_bindhost()
	res.has_hostip = has_hostip()
	res.has_nslookup = has_nslookup()
	res.has_dnsserver = has_bindhost() or has_hostip() or has_nslookup()
	res.has_ipv6 = (NXFS.access("/proc/net/ipv6_route") and NXFS.access("/usr/sbin/ip6tables"))
	res.has_cacerts = false
	local _, v = NXFS.glob("/etc/ssl/certs/*.crt")
	if v == 0 then _, v = NXFS.glob("/etc/ssl/certs/*.pem") end
	res.has_cacerts = (v > 0)

	return res
end

function M.env_info(type)
	if ( type == "has_ssl" ) or ( type == "has_proxy" ) or ( type == "has_forceip" )
	    or ( type == "has_bindnet" ) or ( type == "has_fetch" )
		or ( type == "has_wgetssl" ) or ( type == "has_curl" )
		or ( type == "has_curlssl" ) or ( type == "has_curlpxy" )
		or ( type == "has_fetchssl" ) or ( type == "has_bbwget" ) then

		local function has_wgetssl()
			return (call( [[which wget-ssl >/dev/null 2>&1]] ) == 0)	-- and true or nil
		end

		local function has_curlssl()
			return (call( [[$(which curl) -V 2>&1 | grep "Protocols:" | grep -qF "https"]] ) ~= 0)
		end

		local function has_fetch()
			return (call( [[which uclient-fetch >/dev/null 2>&1]] ) == 0)
		end

		local function has_fetchssl()
			return NXFS.access("/lib/libustream-ssl.so")
		end

		local function has_curl()
			return (call( [[which curl >/dev/null 2>&1]] ) == 0)
		end

		local function has_curlpxy()
			return (call( [[grep -i "all_proxy" /usr/lib/libcurl.so* >/dev/null 2>&1]] ) == 0)
		end

		local function has_bbwget()
			return (call( [[$(which wget) -V 2>&1 | grep -iqF "busybox"]] ) == 0)
		end

		if type == "has_wgetssl" then
			return has_wgetssl()

		elseif type == "has_curl" then
			return has_curl()

		elseif type == "has_curlssl" then
			return has_curlssl()

		elseif type == "has_curlpxy" then
			return has_curlpxy()

		elseif type == "has_fetch" then
			return has_fetch()

		elseif type == "has_fetchssl" then
			return has_fetchssl()

		elseif type == "has_bbwget" then
			return has_bbwget()

		elseif type == "has_ssl" then
			if has_wgetssl() then return true end
			if has_curlssl() then return true end
			if (has_fetch() and has_fetchssl()) then return true end
			return false

		elseif type == "has_proxy" then
			if has_wgetssl() then return true end
			if has_curlpxy() then return true end
			if has_fetch() then return true end
			if has_bbwget() then return true end
			return false

		elseif type == "has_forceip" then
			if has_wgetssl() then return true end
			if has_curl() then return true end
			if has_fetch() then return true end -- only really needed for transfer
			return false

		elseif type == "has_bindnet" then
			if has_curl() then return true end
			if has_wgetssl() then return true end
			return false
		end

	elseif ( type == "has_dnsserver" ) or ( type == "has_bindhost" ) or ( type == "has_hostip" ) or ( type == "has_nslookup" ) then
		local function has_bindhost()
			if (call( [[which host >/dev/null 2>&1]] ) == 0) then return true end
			if (call( [[which khost >/dev/null 2>&1]] ) == 0) then return true end
			if (call( [[which drill >/dev/null 2>&1]] ) == 0) then return true end
			return false
		end

		local function has_hostip()
			return (call( [[which hostip >/dev/null 2>&1]] ) == 0)
		end

		local function has_nslookup()
			return (call( [[$(which nslookup) localhost 2>&1 | grep -qF "(null)"]] ) ~= 0)
		end

		if type == "has_bindhost" then
			return has_bindhost()
		elseif type == "has_hostip" then
			return has_hostip()
		elseif type == "has_nslookup" then
			return has_nslookup()
		elseif type == "has_dnsserver" then
			if has_bindhost() then return true end
			if has_hostip() then return true end
			if has_nslookup() then return true end
			return false
		end

	elseif type == "has_ipv6" then
		return (NXFS.access("/proc/net/ipv6_route") and NXFS.access("/usr/sbin/ip6tables"))

	elseif type == "has_cacerts" then
		--old _check_certs() local function
		local _, v = NXFS.glob("/etc/ssl/certs/*.crt")
		if ( v == 0 ) then _, v = NXFS.glob("/etc/ssl/certs/*.pem") end
		return (v > 0)
	else
		return
	end

end

-- function to calculate seconds from given interval and unit
function M.calc_seconds(interval, unit)
    if tonumber(interval) then
        if unit == "days" then
            return (tonumber(interval) * 86400)	-- 60 sec * 60 min * 24 h
        elseif unit == "hours" then
            return (tonumber(interval) * 3600)	-- 60 sec * 60 min
        elseif unit == "minutes" then
            return (tonumber(interval) * 60)	-- 60 sec
        elseif unit == "seconds" then
            return tonumber(interval)
        else
            return nil
        end
    else
        return nil
    end
end

-- convert epoch date to given format
function M.epoch2date(epoch, format)
	if not format or #format < 2 then
		local uci = UCI.cursor()
		format    = uci:get("ddns", "global", "ddns_dateformat") or "%F %R"
	end
	format = format:gsub("%%n", "<br />")	-- replace newline
	format = format:gsub("%%t", "    ")	-- replace tab
	return os.date(format, epoch)
end

-- read lastupdate from [section].update file
function M.get_lastupd(section)
	local uci   = UCI.cursor()
	local rdir  = uci:get("ddns", "global", "ddns_rundir") or "/var/run/ddns"
	local etime = tonumber(NXFS.readfile("%s/%s.update" % { rdir, section } ) or 0 )
	return etime
end

-- read registered IP from [section].ip file
function M.get_regip(section, chk_sec)
	local uci   = UCI.cursor()
	local rdir  = uci:get("ddns", "global", "ddns_rundir") or "/var/run/ddns"
	local ip = "NOFILE"
	if NXFS.access("%s/%s.ip" % { rdir, section }) then
		local ftime = NXFS.stat("%s/%s.ip" % { rdir, section }, "ctime") or 0
		local otime = os.time()
		-- give ddns-scripts time (9 sec) to update file
		if otime < (ftime + chk_sec + 9) then
			ip = NXFS.readfile("%s/%s.ip" % { rdir, section })
		end
	end
	uci:unload("ddns")
	return ip
end

-- read PID from run file and verify if still running
function M.get_pid(section)
	local uci  = UCI.cursor()
	local rdir = uci:get("ddns", "global", "ddns_rundir") or "/var/run/ddns"
	local pid  = tonumber(NXFS.readfile("%s/%s.pid" % { rdir, section } ) or 0 )
	if pid > 0 and not NXFS.access("/proc/%s/status" % pid) then
		pid = 0
	end
	return pid
end
    
return M
