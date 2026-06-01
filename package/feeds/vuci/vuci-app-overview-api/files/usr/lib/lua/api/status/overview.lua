
local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local pkg = require("vuci.package_checker")
local md = require("vuci.modem")
local board = require("vuci.board")

local Overview = ConfigService:new({ create = false, delete = false })
Overview.sort_response_by = "position"
Overview.section_positions = {}

local last_position
function Overview:get_last_position()
	if last_position then
		last_position = last_position + 1
		return last_position
	end
	last_position = 0
	self.uci:foreach("overview", "overview", function(s)
		local current = tonumber(s.position) or 1
		last_position = current > last_position and current or last_position
	end)
	return last_position
end

---Returns if overview section with a given id and section_name exists
function Overview:section_exists(id, section_name)
	local found = false
	self.uci:foreach("overview", "overview", function(s_overview)
		if s_overview.id == id and s_overview.section_name == section_name then
			found = true
			return false -- break
		end
	end)
	return found
end

local s = Overview:section("overview", "overview")

local card_id = s:option("card_id")
	card_id.readonly = true
	function card_id:get()
		return self:table_get(self.config, self.sid, "id")
	end

local enabled = s:option("enabled")
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

local section_name = s:option("section_name")
	section_name.readonly = true

local position = s:option("position")
	function position:validate(value)
		return self.dt:uinteger(value)
	end

function Overview:PUT_validate_section_hook()
	local data = self.current_data_block
	if type(data) ~= "table" then return end
	if data.position then
		if self.section_positions[data.position] then
			self:add_critical_error(
				STD_CODES.INVALID_SECTION,
				"Position argument can not be the same for multiple sections",
				"Validation"
			)
		end
		self.section_positions[data.position] = true
	end
end

function Overview:PUT_section_init_hook()
	local options = self:table_get(self.config, self.sid)
	if not options then return end

	local prev_position = options.position
	if not self.current_data_block.position or prev_position == self.current_data_block.position then return end

	self:table_foreach(self.config, "overview", function(s)
		if s[".name"] ~= self.sid and s.position == self.current_data_block.position then
			self:table_set(self.config, s[".name"], "position", prev_position)
		end
	end)
end

function Overview:GET_init_hook()
	local exclude_protos = {"relay", "sstp", "pptp", "gre", "l2tp", "l2tpv3", "wireguard", "mirror", "openconnect", "xfrm"}
	local vrf_map = {}
	local sections_to_generate = {
		{system = {
			system = {
				id = "system",
				no_config = true
			}
		}},
		{mobile = {
			mobile = {
				id = "mobile",
				no_config = true
			}
		}},
		{wireless = {
			["wifi-iface"] = {
				id = "wireless"
			}
		}},
		{network = {
			interface = {
				id = "interface"
			}
		}},
		{quota_limit = {
			interface = {
				id = "mobile_data_limit",
				package = "quota_limit"
			}
		}},
		{simcard = {
			sim = {
				id = "sms_limit_sim"
			}
		}},
		{access_control = {
			access_control = {
				id = "access_control",
				no_config = true,
				default_disabled = true,
				condition = board:get_default_wan_ifname() ~= nil or board:has_mobile() or board:is_industrial_ap()
			}
		}},
		{system_events = {
			system_events = {
				id = "system_events",
				no_config = true
			}
		}},
		{network_events = {
			network_events = {
				id = "network_events",
				no_config = true
			}
		}},
		{monitoring = {
			monitoring = {
				id = "monitoring",
				no_config = true,
				package = "rms_mqtt"
			}
		}},
		{chilli = {
			chilli = {
				id = "hotspot",
				package = "coova-chilli"
			}
		}},
		{connchecker = {
			globals = {
				id = "connchecker",
				package = "connchecker"
			}
		}},
		{failover_priority = {
			failover_priority = {
				id = "failover_priority",
				no_config = true,
				package = "mwan3"
			}
		}},
		{vrrpd = {
			vrrpd = {
				id = "vrrp",
				package = "vrrpd"
			}
		}},
		{openvpn = {
			openvpn = {
				id = "open_vpn",
				package = "vuci-app-openvpn-api"
			}
		}},
	}

	self.uci:foreach("network", "device", function (s)
		if s.type == "vrf" then vrf_map[s.name] = true end
	end)

	---Returns service section related to the given overview section
	local function find_section(s_overview)
		if s_overview.id == "mobile" then
			for modem in md:info_iterator() do
				if modem.usb_id == s_overview.section_name then return true end
			end
			return false
		end
		for _, wrapped in ipairs(sections_to_generate) do
			local config, sections = next(wrapped)
			for s_type, s_info in pairs(sections) do
				if s_overview.id == s_info.id then
					if (s_info.package and not pkg.is_installed(s_info.package)) or s_info.condition == false then
						return false
					end
					if s_info.no_config then return true end
					local sname = s_overview.section_name
					if s_overview.id == "hotspot" then
						-- hotspot doesnt use section_name
						return self.uci:get_all(config, "@chilli[0]")
					end
					if config == "network" and s_overview.id == "interface" then
						if vrf_map[self.uci:get(config, sname, "device")] or util.contains(exclude_protos, self.uci:get(config, sname, "proto")) or
						sname:match("_static$") or
						sname == "loopback" or
						self.uci:get(config, sname, "invisible") == "1" then
							return false
						end
					end
					return self.uci:get_all(config, sname)

				-- sms_limit_sim uses different id checking logic
				elseif s_overview.id and s_overview.id:match("sms_limit_sim") and s_info.id and s_info.id:match("sms_limit_sim") then
					return self.uci:get_all(config, s_overview.section_name)
				end
			end
		end
	end

	local function create_section(id, enabled, section_name)
		local options = {
			id = id,
			enabled = enabled,
			section_name = section_name,
			position = tostring(self:get_last_position() + 1)
		}
		self.uci:section("overview", "overview", nil, options)
	end

	-- create missing sections
	for _, wrapped in ipairs(sections_to_generate) do
		local config, sections = next(wrapped)
		for s_type, s_info in pairs(sections) do
			if s_info.no_config then
				if config == "mobile" then
					-- Generates cards for available and offline modems (from board.json)
					for modem in md:info_iterator() do
						if not self:section_exists(s_info.id, modem.usb_id) then
							create_section(s_info.id, s_info.default_disabled and "0" or "1", modem.usb_id)
						end
					end
				elseif not self:section_exists(s_info.id)
					and (not s_info.package or (s_info.package and pkg.is_installed(s_info.package)))
					and (s_info.condition == nil or s_info.condition == true) then
					create_section(s_info.id, s_info.default_disabled and "0" or "1")
				end
			else
				self.uci:foreach(config, s_type, function(s)
					-- if package is deleted do not create overview sections for it
					if (s_info.package and not pkg.is_installed(s_info.package)) or s_info.condition == false then
						return -- continue
					end

					local sname = s[".name"]
					local id = s_info.id
					local enabled = s_info.default_disabled and "0" or "1"

					-- filter/skip unneeded network sections
					if config == "network" and s_type == "interface" then
						if vrf_map[s.device] or util.contains(exclude_protos, s.proto) or
						sname:match("_static$") or
						sname == "loopback" or
						s.invisible == "1" then
							return -- continue
						end
					end

					-- sms_limit uses unique id for each sim position
					if id == "sms_limit_sim" then
						id = "sms_limit_sim" .. s.position
						enabled = s.enable_sms_limit == "1" and "1" or "0" -- sms_limit overview section is disabled by default
					end

					if s_info.id == "hotspot" then
						sname = nil -- hotspot doesn't need section_name
					end

					if not self:section_exists(id, sname) then
						if id == "mobile_data_limit" then
							local proto = self.uci:get("network", s[".name"], "proto")
							if proto ~= "wwan" then
								return -- continue
							end
							enabled = s.enabled == "1" and "1" or "0" -- mob limit overview section is disabled by default
						end
						create_section(id, enabled, sname)
					end
				end)
			end
		end
	end

	self.uci:foreach("overview", "overview", function (s_overview)
		local never_delete = {"ports"}
		if util.contains(never_delete, s_overview.id) then return end --continue

		if not find_section(s_overview) then
			self.uci:delete("overview", s_overview[".name"])
		end
	end)
end


return Overview
