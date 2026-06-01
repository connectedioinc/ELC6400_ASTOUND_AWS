local ConfigService = require("api/ConfigService")
local board = require("vuci.board")
local md = require("vuci.modem")

if not board:has_gps()then
	return nil
end

local GPS = ConfigService:new({
	create = false,
	delete = false
})

local NMEARules = GPS:section("gps", "nmea_rule")

	local opt_forwarding_enabled = NMEARules:option("forwarding_enabled")
		function opt_forwarding_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_forwarding_interval = NMEARules:option("forwarding_interval")
		function opt_forwarding_interval:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end
			return tonumber(value) <= 2147483647, "Maximum allowed value is: 2147483647."
		end

	local opt_collecting_enabled = NMEARules:option("collecting_enabled")
		function opt_collecting_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_collecting_interval = NMEARules:option("collecting_interval")
		function opt_collecting_interval:validate(value)
			local ok, err = self.dt:uinteger(value)
			if not ok then return ok, err end
			return tonumber(value) <= 2147483647, "Maximum allowed value is: 2147483647."
		end

function GPS:GET_TYPE_options()
	local res = { available_nmea_sentences = {} }
	local unique_satellite_sentences = {}
	local available_prefixes = {}

	for modem in md:info_iterator() do
		if modem.gps_satellites then
			for _, val in pairs(modem.gps_satellites) do
				if type(val) == "table" and val.prefix and val.sentences then
					for _, prefix in ipairs(val.prefix) do
						for _, sentence in ipairs(val.sentences) do
							unique_satellite_sentences[prefix..sentence] = true
						end
						if #val.sentences > 0 then
							available_prefixes[prefix] = true
						end
					end
				end
			end
		end
	end
	for sentence in pairs(unique_satellite_sentences) do
		table.insert(res.available_nmea_sentences, sentence)
	end

	if available_prefixes.GN then
		local gpsd_section = self:table_get(self.config, "gpsd")
		local satellite_options = { 'enabled', 'galileo_sup', 'glonass_sup', 'beidou_sup' }
		local enabled_satellite_systems = 0
		for _, option in ipairs(satellite_options) do
			if gpsd_section[option] == "1" then
				enabled_satellite_systems = enabled_satellite_systems + 1
			end
		end
		if enabled_satellite_systems > 1 then
			self:add_message(1, "Detected multiple enabled satellite systems. Some NMEA sentences might only be available with a 'GN' prefix.")
		end
	end
	if available_prefixes.PQ and available_prefixes.GB then
		self:add_message(2, "'PQ' or 'GB' prefixed NMEA sentences are interchangeable, but one of them might not be available due to modem version.")
	end

	return self:ResponseOK(res, self.messages)
end

return GPS