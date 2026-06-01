local ConfigService = require("api/ConfigService")
local pkg = require("vuci.package_checker")

local SideWidget = ConfigService:new({ create = false, delete = false })
SideWidget.sort_response_by = "position"

local last_position
function SideWidget:get_last_position(id)
	if not id and last_position then
		last_position = last_position + 1
		return last_position
	end
	last_position = 0
	self.uci:foreach(self.config, "widget", function(s)
		if id and s.id ~= id then return true end
		local current = tonumber(s.position)
		last_position = current > last_position and current or last_position
	end)
	if id and last_position == 0 then
		last_position = nil
		return self:get_last_position()
	end
	return last_position
end

function SideWidget:section_exists(id, section_name)
	local found = false
	self.uci:foreach(self.config, "widget", function(s)
		if s.id == id and s.section_name == section_name then
			found = true
			return false -- break
		end
	end)
	return found
end

function SideWidget:get_sorted_sections(from_position)
	local widgets = {}
	self.uci:foreach(self.config, "widget", function(s)
		if not from_position or tonumber(s.position) >= from_position then
			table.insert(widgets, s)
		end
	end)
	table.sort(widgets, function(a, b) return tonumber(a.position) < tonumber(b.position) end)
	return widgets
end

local s = SideWidget:section("widget", "widget")

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

local enabled = s:option("enabled")
	function enabled:validate(value)
		return self.dt:is_bool(value)
	end

local position = s:option("position")
	function position:validate(value)
		return self.dt:uinteger(value)
	end

local card_id = s:option("card_id")
	card_id.readonly = true
	function card_id:get(_)
		return self:table_get(self.config, self.sid, "id")
	end

local section_name = s:option("section_name")
	section_name.readonly = true

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function SideWidget:GET_init_hook()
	local sections_to_generate = {
		{mobile = {
			mobile = {
				id = "mobile",
				no_config = true
			}
		}},
		{system = {
			system = {
				id = "system",
				no_config = true
			}
		}},
		{wireless = {
			["wifi-iface"] = {
				id = "wifi"
			}
		}},
		{rms = {
			rms = {
				id = "rms",
				no_config = true,
				package = "rms_mqtt"
			}
		}},
		{ports = {
			ports = {
				id = "ports",
				no_config = true
			}
		}}

	}

	local all_modems = {}

	-- Add available modems
	for modem in require("vuci.modem"):info_iterator() do
		all_modems[modem.usb_id] = true
	end

	---Returns service section related to the given widget section
	local function find_section(section)
		if section.id == "mobile" then
			for modem in pairs(all_modems) do
				if modem == section.section_name then return true end
			end
			return false
		end
		for _, wrapped in ipairs(sections_to_generate) do
			local config, sections = next(wrapped)
			for _, s_info in pairs(sections) do
				if section.id == s_info.id then
					if s_info.package and not pkg.is_installed(s_info.package) then
						return false
					end
					if s_info.no_config then
						return true
					end
					return self.uci:get_all(config, section.section_name)
				end
			end
		end
	end

	local changed
	local function create_section(id, enabled, section_name, position)
		if position then
			local temp_position = position
			for _, s in ipairs(self:get_sorted_sections(position)) do
				temp_position = temp_position + 1
				self.uci:set(self.config, s[".name"], "position", tostring(temp_position))
			end
		end
		local options = {
			id = id,
			enabled = enabled,
			section_name = section_name,
			position = position and tostring(position) or tostring(self:get_last_position() + 1)
		}
		self.uci:section(self.config, "widget", nil, options)
		changed = true
	end

	local function generate_section(config, config_type, additonal)
		local id = additonal.id
		local enabled = additonal.default_disabled and "0" or "1"
		if not additonal.package or (additonal.package and pkg.is_installed(additonal.package)) then
			if additonal.no_config then
				if config == "mobile" then
					-- generate mobile cards from board.json
					for modem in pairs(all_modems) do
						if not self:section_exists(id, modem) then
							create_section(id, enabled, modem)
						end
					end
				elseif not self:section_exists(id) then
					create_section(id, enabled)
				end
			else
				local last_position_for_id = self:get_last_position(id)
				self.uci:foreach(config, config_type, function(s)
					local sname = s[".name"]
					if not self:section_exists(id, sname) then
						last_position = nil
						last_position_for_id = last_position_for_id + 1
						create_section(id, enabled, sname, last_position_for_id)
					end
				end)
			end
		end
	end

	for _, wrapped in ipairs(sections_to_generate) do
		local config, sections = next(wrapped)
		for s_type, s_info in pairs(sections) do
			generate_section(config, s_type, s_info)
		end
	end

	self.uci:foreach(self.config, "widget", function (section)
		if not find_section(section) then
			self.uci:delete(self.config, section[".name"])
			changed = true
		end
	end)

	if changed then self.uci:commit(self.config) end
end

return SideWidget