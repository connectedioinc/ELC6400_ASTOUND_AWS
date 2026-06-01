local ConfigService = require("api/ConfigService")

local MqttBroker = ConfigService:new({ increment_name = true })

local MqttBrokerTopic = MqttBroker:section("mosquitto", "topic")

function MqttBrokerTopic:create_defaults()
	local parent_section = self:table_get(self.main_config, self.binding)
	return {
		direction = "out",
		qos = "0",
		connection_name = parent_section["connection_name"],
		topic = require("vuci.util_tlt").get_next_name(self, self.config, self.section_type, "topic", "topic")
	}
end

function MqttBrokerTopic:POST_init_hook()
	if not self.binding then
		return self:add_critical_error(
			STD_CODES.NO_CREATE,
			"Section creation is not allowed",
			"Validation",
			HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
		)
	end
end

function MqttBrokerTopic:filter(s)
	if not self.binding then return true end
	local parent_section = self:table_get(self.main_config, self.binding)
	if s.connection_name == parent_section.connection_name then return true end
end

	local opt_topic = MqttBrokerTopic:option("topic")
		opt_topic.cfg_require = true
		opt_topic.maxlength = 64
		function opt_topic:validate(value)
			local name_exists = false
			local connection_name = self:table_get(self.main_config, self.binding, "connection_name")
			self:table_foreach("mosquitto", "topic", function(s)
				if s["topic"] == value and s[".name"] ~= self.sid and connection_name == s["connection_name"] then
					name_exists = true
				end
			end)
			if name_exists then
				return false, "Topic with name '" .. value .. "'already exists"
			end
			return true
		end

	local opt_direction = MqttBrokerTopic:option("direction")
		opt_direction.cfg_require = true
		function opt_direction:validate(value)
			return self.dt:check_array(value, {"out", "in", "both"})
		end

	local opt_qos = MqttBrokerTopic:option("qos")
		opt_qos.cfg_require = true
		function opt_qos:validate(value)
			return self.dt:check_array(value, {
				"0", --At most once
				"1", --At least once
				"2"  --Exactly once
			})
		end


function MqttBroker:POST_validate_section_hook()
	if not self.binding then
		return self:add_critical_error(
			STD_CODES.NO_CREATE,
			"Configuration can only be created through /mqtt/bridge/{id}/topics/config endpoint",
			"Validation",
			HTTP_STATUS_CODES.METHOD_NOT_ALLOWED
		)
	end
	local parent_section = self:table_get(self.main_config, self.binding) or {}
	if parent_section[".type"] ~= "bridge" then
		self:add_critical_error(
			STD_CODES.INVALID_SECTION,
			string.format("Parent section '%s' does not exist", self.binding),
			"UCI",
			HTTP_STATUS_CODES.NOT_FOUND
		)
	end
end

function MqttBroker:find_parent_section(connection_name)
	if not self.sid then return end
	local parent_section_id = nil
	self:table_foreach(self.config, "bridge", function(s)
		if s[".name"] and s["connection_name"] == connection_name then
			parent_section_id = s[".name"]
		end
	end)
	return parent_section_id
end

function MqttBroker:DELETE_before_section_delete_hook()
	local opt_connection_name = self:get_abs_value(self.config, self.sid, "connection_name")
	if not opt_connection_name then return end
	local parent_section_id = self.binding and self.binding or self:find_parent_section(opt_connection_name)
	if not parent_section_id then return end
	local opt_client_enabled = self:get_abs_value(self.config, parent_section_id, "client_enabled")
	if not opt_client_enabled or opt_client_enabled == "0" then return end
	local topic_count = 0
	self:table_foreach(self.config, "topic", function(s)
		if s[".name"] ~= self.sid and s["connection_name"] == opt_connection_name then
			topic_count = topic_count + 1
		end
	end)
	if topic_count < 1 then
		return self:add_critical_error(
			STD_CODES.NO_DELETE,
			string.format("Can't delete all topics which are appended to the MQTT Bridge (id = %s).", parent_section_id),
			"Validation"
		)
	end

end


return MqttBroker
