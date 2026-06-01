local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local Hotspot2 = ConfigService:new({
	create = false,
	delete = false
})

Hotspot2.venue_types = {
	["0"] = { -- Unspecified
		"0" -- Unspecified
	},
	["1"] = { -- Assembly
		"0", -- Unspecified Assembly
		"1", -- Arena
		"2", -- Stadium
		"3", -- Passenger Terminal (e.g., airport, bus, ferry, train station)
		"4", -- Amphitheater
		"5", -- Amusement Park
		"6", -- Place of Worship
		"7", -- Convention Center
		"8", -- Library
		"9", -- Museum
		"10", -- Restaurant
		"11", -- Theater
		"12", -- Bar
		"13", -- Coffee Shop
		"14", -- Zoo or Aquarium
		"15" -- Emergency Coordination Center
	},
	["2"] = { -- Business
		"0", -- Unspecified Business
		"1", -- Doctor or Dentist office
		"2", -- Bank
		"3", -- Fire Station
		"4", -- Police Station
		"6", -- Post Office
		"7", -- Professional Office
		"8", -- Research and Development Facility
		"9" -- Attorney Office
	},
	["3"] = { -- Educational
		"0", -- Unspecified
		"1", -- School, Primary
		"2", -- School, Secondary
		"3" -- University or College
	},
	["4"] = { -- Factory and Industrial
		"0", --Unspecified Factory and Industrial
		"1" --Factory
	},
	["5"] = { -- Institutional
		"0", -- Unspecified Institutial
		"1", -- Hospital
		"2", -- Long-Term Care Facility (e.g., Nursing home, Hospice, etc.)
		"3", -- Alcohol and Drug Rehabilitation Center
		"4", -- Group Home
		"5" -- Prison or Jail
	},
	["6"] = { -- Mercantile
		"0", -- Unspecified Mercantile
		"1", -- Retail Store
		"2", -- Grocery Market
		"3", -- Automotive Service Station
		"4", -- Shopping Mall
		"5" -- Gas Station
	},
	["7"] = { -- Residential
		"0", -- Unspecified Residential
		"1", -- Private Residence
		"2", -- Hotel or Motel
		"3", -- Dormitory
		"4" -- Boarding House
	},
	["8"] = { -- Storage
		"0", -- Unspecified Storage
	},
	["9"] = { -- Utility and Miscellaneous
		"0", -- Unspecified Utility and Miscellaneous
	},
	["10"] = { -- Vehicular
		"0", -- Unspecified Vehicular
		"1", -- Automobile or Truck
		"2", -- Airplane
		"3", -- Bus
		"4", -- Ferry
		"5", -- Ship or Boat
		"6", -- Train
		"7" -- Motor Bike
	},
	["11"] = { -- Outdoor
		"0", -- Unspecified Outdoor
		"1", -- Muni-mesh Network
		"2", -- City Park
		"3", -- Rest Area
		"4", -- Traffic Control
		"5", -- Bus Stop
		"6" -- Kiosk
	}
}

-- Function to split language:value option.
---@param name string Section option that has value seperated by ':' symbol.
---@return string lang Language value.
---@return string value Data value.
function Hotspot2:parse_lang_value(name)
	local abs_val = self:table_get(self.config, self.sid, name)
	if abs_val then
		local lang, value = string.match(abs_val, "^(.-):(.-)$")
		return lang or "", value or ""
	end
	return "", ""
end

local Hotspot2General = Hotspot2:section("wireless", "wifi-iface")
function Hotspot2General:create_defaults()
	return {
		ipaddr_type_availability = "7"
	}
end

	local opt_interworking = Hotspot2General:option("interworking")
		function opt_interworking:validate(value)
			return self.dt:is_bool(value)
		end
		function opt_interworking:set(value)
			self:table_set(self.config, self.sid, self.api_key, value)
			self:table_set(self.config, self.sid, "hs20", value)
		end
		function opt_interworking:get()
			return self:table_get(self.config, self.sid, self.api_key) or "0"
		end

	local opt_internet = Hotspot2General:option("internet")
		function opt_internet:validate(value)
			return self.dt:is_bool(value)
		end

	local opt_access_network_type = Hotspot2General:option("access_network_type")
		function opt_access_network_type:validate(value)
			return self.dt:check_array(value, {
				"0", -- Private network
				"1", -- Private network with guest access
				"2", -- Chargeable public network
				"3", -- Free public network
				"4", -- Personal device network
				"5", -- Emergency services only network
				"14" -- Test or experimental
			})
		end

	local opt_hessid = Hotspot2General:option("hessid")
		function opt_hessid:validate(value)
			return self.dt:macaddr(value)
		end

	local opt_roaming_consortium = Hotspot2General:option("roaming_consortium", {list = true})
		function opt_roaming_consortium:validate(value)
			if #value == 6 or #value == 8 or #value == 10 then
				return self.dt:hexstring(value)
			end
			return false, "Only specific length values are accepted (6, 8, 10)"
		end

	local opt_network_auth_type = Hotspot2General:option("network_auth_type")
	opt_network_auth_type.require = { ["02"] = { "redirect_url" } }
		function opt_network_auth_type:validate(value)
			return self.dt:check_array(value, {
				"00", -- Acceptance of terms and conditions
				"01", -- On-line enrollment supported
				"02", -- http/https redirection
				"03", -- DNS redirection
			})
		end

	local opt_redirect_url = Hotspot2General:option("redirect_url")
		function opt_redirect_url:validate(value)
			return self.dt:protourl(value)
		end

	local opt_ipaddr_type_availability = Hotspot2General:option("ipaddr_type_availability")
		function opt_ipaddr_type_availability:validate(value)
			return self.dt:check_array(value, {
				"0", -- Address type not available
				"1", -- Public IPv4 address available
				"2", -- Port-restricted IPv4 address available
				"3", -- Single NATed private IPv4 address available
				"4", -- Double NATed private IPv4 address available
				"5", -- Port-restricted IPv4 address and single NATed IPv4 address available
				"6", -- Port-restricted IPv4 address and double NATed IPv4 address available
				"7", -- Availability of the address type is not known
			})
		end

	local opt_domain_name = Hotspot2General:option("domain_name", {list = true})
		function opt_domain_name:validate(value)
			return self.dt:hostname(value)
		end

	local opt_venue_group = Hotspot2General:option("venue_group")
		function opt_venue_group:validate(value)
			return self.venue_types[value] ~= nil, "Venue group not found."
		end

	local opt_venue_type = Hotspot2General:option("venue_type")
		function opt_venue_type:validate(value)
			local group = self:get_abs_value(self.config, self.sid, "venue_group")
			if not group then
				return false, "Venue group not set."
			end
			if not self.venue_types[group] then
				return false, "Venue type for specified group not found."
			end
			return self.dt:check_array(value, self.venue_types[group])
		end

	local opt_hs20_wan_status = Hotspot2General:option("hs20_wan_status")
		function opt_hs20_wan_status:validate(value)
			return self.dt:check_array(value, {
				"01", -- Link up
				"02", -- Link down
				"03", -- Link in test state
			})
		end

	local opt_hs20_wan_dw_speed = Hotspot2General:option("hs20_wan_dw_speed")
		function opt_hs20_wan_dw_speed:validate(value)
			return self.dt:range(value, 0, 4294967295)
		end

	local opt_hs20_wan_up_speed = Hotspot2General:option("hs20_wan_up_speed")
		function opt_hs20_wan_up_speed:validate(value)
			return self.dt:range(value, 0, 4294967295)
		end

	local opt_bssid = Hotspot2General:option("bssid")
		opt_bssid.readonly = true
		function opt_bssid:get()
			local device = self:get_abs_value(self.config, self.sid, "device")
			if device then
				local data = util.ubus("iwinfo", "info", {device = device})
				if data and data.bssid then
					return data.bssid
				end
			end
			return "00:00:00:00:00:00"
		end

	local opt_ssid = Hotspot2General:option("ssid")
		opt_ssid.readonly = true

return Hotspot2