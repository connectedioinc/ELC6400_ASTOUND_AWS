local ConfigService = require("api/ConfigService")
local util = require "vuci.util"

local AWS = ConfigService:new({ increment_name = true })
local opt_enabled

local ERR_CODES = {
	PROV_MISSING_OPTS = 1
}

function AWS:POST_validate_hook()
	local cfg_count = 0
	self:table_foreach("aws_jobs", "aws_jobs", function(s)
		cfg_count = cfg_count + 1
	end)
	if cfg_count >= 50 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 50 instances are allowed")
	end
end

function AWS:validate_provisioning()
	local enabled = self:get_abs_value(self.config, self.sid, "enabled")
	local aws_provisioning_id = self:getter_wrapped_abs_value(self.config, self.sid, "aws_provisioning_id")
	if enabled == "1" and aws_provisioning_id ~= "0" then
		local s = self:table_get(self.config, aws_provisioning_id) or {}
		if (not s.template or not s.type or not s.creation_type) or
		(s.type == "1" and (not s.certfile or not s.keyfile)) or
		(s.type == "2" and (not s.access_key or not s.secret_key)) then
			self:add_error(ERR_CODES.PROV_MISSING_OPTS, "Selected provisioning is missing required options. Please configure it fully.",
				"aws_provisioning_id", self.sid, aws_provisioning_id)
		end
	end
end

function AWS:PUT_validate_section_hook()
	if self:get_abs_value(self.config, self.sid, "enabled") ~= "1" then
		opt_enabled.require = nil
		return
	end

	local required_opts = {"endpoint", "thing_name", "cafile"}
	local aws_provisioning_id = self:getter_wrapped_abs_value(self.config, self.sid, "aws_provisioning_id")
	if aws_provisioning_id == "0" then
		table.insert(required_opts, "certfile")
		table.insert(required_opts, "keyfile")
	end

	opt_enabled.require = required_opts

	self:validate_provisioning()
end

function AWS:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "aws")
	return { path = path }
end

function AWS:GET_TYPE_status()
	local status = util.ubus("aws", "status", nil, 2) or {}
	local res = {}
	for _, job in ipairs(status.status or {}) do
		table.insert(res, {
			id = job.id,
			state = job.state,
			state_id = job.state_id,
		})
	end
	return self:ResponseOK(res)
end

local s = AWS:section("aws_jobs", "aws_jobs")

function s:create_defaults()
	return {
		mqtt_port = "8883",
		mqtt_qos = "1",
		mqtt_keepalive = "120",
		mqtt_max_loops = "50",
		aws_provisioning_id = "0",
		aws_provisioning_id_real = "0"
	}
end

	opt_enabled = s:option("enabled")
		function opt_enabled:validate(value)
			return self.dt:is_bool(value)
		end

	local thing_name = s:option("thing_name")
		thing_name.maxlength = 128
		function thing_name:validate(value)
			return self.dt:uciname(value)
		end

	local endpoint = s:option("endpoint")
		function endpoint:validate(value)
			return self.dt:hostname(value)
		end

	local cafile = s:option("cafile", { file = true })

	local certfile = s:option("certfile", { file = true })
		certfile.orig_get = certfile.get
		certfile.orig_validate = certfile.validate
		function certfile:get(value)
			value = self:orig_get(value)
			if value and value:match("^/etc/aws/") then return end
			return value
		end
		function certfile:validate(value)
			local aws_provisioning_id = self:getter_wrapped_abs_value(self.config, self.sid, "aws_provisioning_id")
			if aws_provisioning_id ~= "0" then
				return false, "certfile can not be used when provisioning is selected"
			end
			return self:orig_validate(value)
		end


	local keyfile = s:option("keyfile", { file = true })
		keyfile.orig_get = keyfile.get
		keyfile.orig_validate = keyfile.validate
		function keyfile:get(value)
			value = self:orig_get(value)
			if value and value:match("^/etc/aws/") then return end
			return value
		end
		function keyfile:validate(value)
			local aws_provisioning_id = self:getter_wrapped_abs_value(self.config, self.sid, "aws_provisioning_id")
			if aws_provisioning_id ~= "0" then
				return false, "certfile can not be used when provisioning is selected"
			end
			return self:orig_validate(value)
		end

	local mqtt_port = s:option("mqtt_port")
		function mqtt_port:validate(value)
			return self.dt:port(value)
		end

	local mqtt_qos = s:option("mqtt_qos")
		function mqtt_qos:validate(value)
			return self.dt:check_array(value, {"0", "1"})
		end

	local mqtt_keepalive = s:option("mqtt_keepalive")
		function mqtt_keepalive:validate(value)
			return self.dt:irange(value, 30, 65535)
		end

	local mqtt_max_loops = s:option("mqtt_max_loops")
		function mqtt_max_loops:validate(value)
			return self.dt:irange(value, 10, 200)
		end

	local aws_provisioning_id = s:option("aws_provisioning_id")
		function aws_provisioning_id:validate(value)
			local ids = {"0"}
			self:table_foreach(self.config, "aws_provisioning", function(s)
				table.insert(ids, s[".name"])
			end)
			return self.dt:check_array(value, ids)
		end
		function aws_provisioning_id:get(value)
			-- aws_provisioning_id gets changed by application so we need to save actual value to aws_provisioning_id_real
			return self:table_get(self.config, self.sid, "aws_provisioning_id_real") or "0"
		end
		function aws_provisioning_id:set(value)
			local certfile_val = self:table_get(self.config, self.sid, "certfile") or ""
			local keyfile_val = self:table_get(self.config, self.sid, "keyfile") or ""
			if certfile_val:match("^/etc/aws/") then os.remove(certfile_val) end
			if keyfile_val:match("^/etc/aws/") then os.remove(keyfile_val) end
			self:table_set(self.config, self.sid, self.api_key, value)
			self:table_set(self.config, self.sid, "aws_provisioning_id_real", value)
		end

return AWS
