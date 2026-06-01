local Firewall_lib = {}

FIREWALL_CONFIG = "firewall"
TRAFFIC_RULE_OPTS = nil

-- Returns all available zones
function Firewall_lib:get_zones(cs)
	local zones = {}
	cs:table_foreach(FIREWALL_CONFIG, "zone", function (s)
		zones[s.name] = s
	end)
	return zones
end

-- Check if a zone exists with a certain name
function Firewall_lib:has_zone(cs, zone_name)
	local result = false
	cs:table_foreach(FIREWALL_CONFIG, "zone", function (s)
		if s.name == zone_name then
			result = true
			return false -- break
		end
	end)
	return result
end

-- Returns zone and networks list for specified zone
function Firewall_lib:get_zone_networks(cs, zone, net)
	local function add_net(nets, n)
		if n == net then return end
		table.insert(nets, n)
	end

	local zones = self:get_zones(cs)
	local z = zones[zone]
	if not z then return end

	local nets = {}
	if type(z.network) == "table" then
		for _, n in pairs(z.network) do
			add_net(nets, n)
		end
	else
		for n in string.gmatch(z.network or "", "%S+") do
			add_net(nets, n)
		end
	end
	return z, nets
end

-- Adds specified network to the zone
function Firewall_lib:add_net_to_zone(cs, zone, net)
	local iface = cs:table_get("network", net)
	if not iface or iface[".type"] ~= "interface" then return end
	local z, nets = self:get_zone_networks(cs, zone, net)
	if not z or not nets then return end
	table.insert(nets, net)
	self:del_net_from_zones(cs, net)
	cs:table_set(FIREWALL_CONFIG, z[".name"], "network", table.concat(nets, " "))
end

-- Deletes specified network from the zone
function Firewall_lib:del_net_from_zone(cs, zone, net)
	local iface = cs:table_get("network", net)
	if not iface or iface[".type"] ~= "interface" then return end
	local z, nets = self:get_zone_networks(cs, zone, net)
	if not z or not nets then return end
	cs:table_set(FIREWALL_CONFIG, z[".name"], "network", table.concat(nets, " "))
end

-- Deletes specified network from all zones
function Firewall_lib:del_net_from_zones(cs, net)
	if not net then return end
	for zone in pairs(self:get_zones(cs)) do
		self:del_net_from_zone(cs, zone, net)
	end
end

---Creates or updates a firewall traffic rule using provided options. Uses the same setters and validation as traffic_rules API
---@param cs table ConfigService
---@param rule table Table containing rule options.
---@param sid string Optional. If provided specified rule will be edited
---@param owner_type string Optional. Used to denote which service owns the rule. To add more services edit "owners" list traffic_rules_options.lua file
---@param owner_id string Optional. Used to denote which service's config section owns the rule
---@return string sid Section id of rule or nil on failure
function Firewall_lib:set_rule(cs, rule, sid,owner_type, owner_id)
	TRAFFIC_RULE_OPTS = TRAFFIC_RULE_OPTS or require("api.network.firewall.traffic_rules_options")()

	local dummy_cs = {
		sid = sid or cs:next_id(FIREWALL_CONFIG),
		config = FIREWALL_CONFIG,
		api_key = ""
	}

	rule.owner_type = owner_type
	rule.owner_id = owner_id

	setmetatable(dummy_cs, { __index = cs })

	--Validate options
	for option, value in pairs(rule) do
		if not TRAFFIC_RULE_OPTS.options[option] then return nil end
		if value ~= "" and TRAFFIC_RULE_OPTS.options[option].validate then
			for _, list_val in ipairs(type(value) == "table" and value or { value }) do
				if not TRAFFIC_RULE_OPTS.options[option].validate(dummy_cs, list_val) then return nil end
			end
		end
	end

	--Create new section and set options
	if not dummy_cs:table_get(dummy_cs.config, dummy_cs.sid) then
		dummy_cs:table_section(FIREWALL_CONFIG, "rule", dummy_cs.sid, {})
	end

	for option, value in pairs(rule) do
		dummy_cs.api_key = option
		if TRAFFIC_RULE_OPTS.options[option].set then
			TRAFFIC_RULE_OPTS.options[option].set(dummy_cs, value)
		else
			dummy_cs:table_set(FIREWALL_CONFIG, dummy_cs.sid, option, value)
		end
	end

	return dummy_cs.sid
end

function Firewall_lib:is_rule(cs, rule_id, owner_type, owner_id)
	local section_type = cs:table_get(FIREWALL_CONFIG, rule_id, ".type")
	if section_type ~= "rule" then
		return false
	end

	if owner_type then
		local rule_owner_type = cs:table_get(FIREWALL_CONFIG, rule_id, "_owner_type")
		if rule_owner_type ~= owner_type then
			return false
		end
	end

	if owner_id then
		local rule_owner_id = cs:table_get(FIREWALL_CONFIG, rule_id, "_owner_id")
		if owner_id ~= rule_owner_id then
			return false
		end
	end

	return true
end

function Firewall_lib:list_rules(cs, owner_type, owner_id)
	local rule_ids = {}
	cs:table_foreach(FIREWALL_CONFIG, "rule", function(rule)
		local rule_id = rule[".name"]
		if self:is_rule(cs, rule_id, owner_type, owner_id) then
			table.insert(rule_ids, rule_id)
		end
	end)
	return rule_ids
end

function Firewall_lib:rule_create_defaults(cs, owner_type, owner_id, extra_rule_options)
	local rule_options = {}
	rule_options._owner_type = owner_type
	rule_options._owner_id = owner_id

	for k, v in pairs(extra_rule_options) do
		rule_options[k] = v
	end

	return rule_options
end

return Firewall_lib
