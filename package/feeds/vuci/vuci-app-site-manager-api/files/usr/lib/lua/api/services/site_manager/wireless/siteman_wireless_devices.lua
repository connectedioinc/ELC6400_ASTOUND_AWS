local ConfigService = require "api/ConfigService"
local siteman_utils = require("api/services/site_manager/siteman_utils")

local wdevs = ConfigService:new({ create = false, delete = false })

-- Cache for device options to avoid multiple API calls
local device_options_cache = {}

-- Helper function to fetch device wireless options via API
local function get_device_options(dm_device_id)
	if not dm_device_id then
		return nil
	end
	
	-- Return cached options if available
	if device_options_cache[dm_device_id] then
		return device_options_cache[dm_device_id]
	end
	
	-- Convert device ID to MAC address
	local mac = siteman_utils:mac_from_flags({ id = dm_device_id })
	if not mac then
		return nil
	end
	
	-- Fetch options from remote device
	local response = siteman_utils:device_api_call({
		mac = mac,
		endpoint = "/wireless/devices/options",
		method = "GET"
	})
	
	-- Extract and cache the options data
	local options = response and response.resp_data and response.resp_data.data
	device_options_cache[dm_device_id] = options
	
	return options
end

local function transform_options(api_options)
	if not api_options then
		return nil
	end
	
	local transformed = {}
	
	if api_options.freqlist then
		transformed.channel_list = {}
		for _, freq in ipairs(api_options.freqlist) do
			table.insert(transformed.channel_list, tostring(freq.channel))
		end
	end
	
	if api_options.htmodelist then
		transformed.htmode_list = {}
		for mode, enabled in pairs(api_options.htmodelist) do
			if enabled then
				table.insert(transformed.htmode_list, mode)
			end
		end
	end
	
	if api_options.txpwrlist then
		transformed.txpower_list = {}
		for _, pwr in ipairs(api_options.txpwrlist) do
			table.insert(transformed.txpower_list, tostring(pwr.dbm))
		end
	end
	
	if api_options.countrylist then
		transformed.country_list = {}
		for _, country in ipairs(api_options.countrylist) do
			table.insert(transformed.country_list, country.alpha2)
		end
	end
	
	if api_options.hwmodelist then
		transformed.hwmode_list = {}
		for mode, enabled in pairs(api_options.hwmodelist) do
			if enabled then
				table.insert(transformed.hwmode_list, mode)
			end
		end
	end
	
	return transformed
end

-- Helper function to get radio-specific options for validation
local function get_radio_options(option_self)
	-- Parse dm_device_id and radio_id from section ID (format: {mac}_{radio_id})
	local dm_device_id, radio_id = option_self.sid:match("^(.+)_(.+)$")
	
	if not dm_device_id or not radio_id then
		return nil
	end
	
	local device_radios = get_device_options(dm_device_id)
	if not device_radios then
		return nil
	end
	
	for _, radio in ipairs(device_radios) do
		if radio.id == radio_id then
			return transform_options(radio.options)
		end
	end
	
	return nil
end

local s = wdevs:section("siteman_wireless", "wifi-device")


	local dm_device_id = s:option("dm_device_id")
		dm_device_id.readonly = true

	local radio_id = s:option("radio_id")
		radio_id.readonly = true

	local enabled = s:option("enabled")
		enabled.require = { ["1"] = {"channel"} }
		function enabled:validate(value) return self.dt:is_bool(value) end

	local channel = s:option("channel")
		function channel:validate(value)
			-- Auto channel is always valid
			if value == "auto" then
				return true
			end
			
			local radio_options = get_radio_options(self)
			
			if not radio_options then
				return false, "Unable to fetch device options for validation"
			end
			
			if radio_options.channel_list then
				local valid = self.dt:check_array(value, radio_options.channel_list)
				if not valid then
					return false, "Invalid channel for this device"
				end
			end
			
			local _, radio_id = self.sid:match("^(.+)_(.+)$")
			if radio_id == "radio1" then
				local htmode = self.current_data_block.htmode or self:table_get(self.config, self.sid, "htmode")
				if htmode then
					local parsed_width = htmode:match("%d+")
					if parsed_width then
						local max_channel_map = {
							["20"] = 165,
							["40"] = 161,
							["80"] = 161,
							["160"] = 128
						}
						local max_channel = max_channel_map[parsed_width]
						if max_channel and tonumber(value) and tonumber(value) > max_channel then
							return false, string.format("%s channel is not supported on %s MHz width. Maximum allowed value is %s.", 
								value, parsed_width, max_channel)
						end
					end
				end
			end
			
			return true
		end

	local htmode = s:option("htmode")
		function htmode:validate(value)
			local radio_options = get_radio_options(self)
			if not radio_options then
				return false, "Unable to fetch device options for validation"
			end
			
			if radio_options.htmode_list then
				local valid = self.dt:check_array(value, radio_options.htmode_list)
				if not valid then
					return false, "Invalid htmode for this device"
				end
			end
			
			return true
		end

	local hwmode = s:option("hwmode")
		hwmode.require = {
			["ac"] = {"htmode"},
			["n"] = {"htmode"},
			["ax"] = {"htmode"},
			["be"] = {"htmode"}
		}
		function hwmode:validate(value)
			local radio_options = get_radio_options(self)
			if not radio_options then
				return false, "Unable to fetch device options for validation"
			end
			
			-- Check against device's allowed hwmode list
			if radio_options.hwmode_list then
				local valid = self.dt:check_array(value, radio_options.hwmode_list)
				if not valid then
					return false, "Invalid hwmode for this device"
				end
			end
			
			local htmode = self.current_data_block.htmode or self:table_get(self.config, self.sid, "htmode")
			if htmode then
				if radio_options.htmode_list then
					local valid, msg = self.dt:check_array(htmode, radio_options.htmode_list)
					if not valid then
						return valid, "Invalid 'htmode' value. " .. (msg or "")
					end
				end
				
				if value == "be" and not htmode:match("^EHT") then
					return false, "Only EHT htmodes are accepted when be hwmode is selected."
				elseif value == "ax" and not htmode:match("^HE") then
					return false, "Only HE htmodes are accepted when ax hwmode is selected."
				elseif value == "ac" and not htmode:match("^VHT") then
					return false, "Only VHT htmodes are accepted when ac hwmode is selected."
				elseif value == "n" and not htmode:match("^HT") then
					return false, "Only HT htmodes are accepted when n hwmode is selected."
				end
			end
			
			return true
		end

	local country = s:option("country")
		function country:validate(value)
			local radio_options = get_radio_options(self)
			if not radio_options then
				return false, "Unable to fetch device options for validation"
			end
			
			if radio_options.country_list then
				local valid = self.dt:check_array(value, radio_options.country_list)
				if not valid then
					return false, "Invalid country for this device"
				end
			end
			
			return true
		end

	local txpower = s:option("txpower")
		function txpower:validate(value)
			local radio_options = get_radio_options(self)
			if not radio_options then
				return false, "Unable to fetch device options for validation"
			end
			
			if radio_options.txpower_list then
				local valid = self.dt:check_array(value, radio_options.txpower_list)
				if not valid then
					return false, "Invalid txpower for this device"
				end
			end
			
			return true
		end

	local legacy_rates = s:option("legacy_rates")
		function legacy_rates:validate(value)
			local _, radio_id = self.sid:match("^(.+)_(.+)$")
			if radio_id ~= "radio0" then
				return false, "This option is only available for 2.4GHz devices."
			end
			return self.dt:is_bool(value)
		end

	local distance = s:option("distance")
		function distance:validate(value) return self.dt:range(value, 0, 65535) end

	local frag = s:option("frag")
		function frag:validate(value)
			return self.dt:irange(value, 256, 2346)
		end

	local rts = s:option("rts")
		function rts:validate(value)
			return self.dt:irange(value, 0, 2347)
		end

	local noscan = s:option("noscan")
		function noscan:validate(value) return self.dt:is_bool(value) end

	local beacon_int = s:option("beacon_int")
		function beacon_int:validate(value) return self.dt:range(value, 15, 65535) end

	local acs_exclude_dfs = s:option("acs_exclude_dfs")
		function acs_exclude_dfs:validate(value)
			local _, radio_id = self.sid:match("^(.+)_(.+)$")
			-- TODO: properly check 2.4 or 5GHz, instead of using radio0/radio1
			if radio_id == "radio0" then
				return false, "This option is only available for 5GHz devices."
			end
			return self.dt:is_bool(value)
		end

siteman_utils:wrap_endpoint_sync_logic(wdevs)
return wdevs
