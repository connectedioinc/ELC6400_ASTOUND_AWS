local ConfigService = require("api/ConfigService")
local util = require("vuci.util")

local AWS = ConfigService:new({ increment_name = true })

local ERR_CODES = {
	PROV_USED = 1
}

function AWS:DELETE_validate_section_hook()
	local job = self:table_find(self.config, "aws_jobs", { aws_provisioning_id_real = self.sid })
	if job then
		self:add_error(ERR_CODES.PROV_USED, "Can not delete this provisioning configuration because it is used by a job." % job[".name"],
			"job", self.sid, { job_id = job[".name"], job_thing_name = job.thing_name })
	end
end

function AWS:POST_validate_hook()
	local cfg_count = 0
	self:table_foreach(self.config, "aws_provisioning", function(s)
		cfg_count = cfg_count + 1
	end)
	if cfg_count >= 50 then
		self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 50 instances are allowed")
	end
end

function AWS:POST_section_init_hook()
	-- disable requires on POST
	for _, sec in pairs(self.sections) do
		for _, pair in ipairs(sec.options) do
			local _, opt = next(pair)
			opt.cfg_require = nil
			opt.require = nil
		end
	end
end

function AWS:PUT_after_data_hook()
	-- if provisioning is modified, update all jobs that use this provisioning, so provisioning is redone
	self:table_foreach(self.config, "aws_jobs", function(s)
		if s.aws_provisioning_id_real == self.sid then
			self:table_set(self.config, s[".name"], "aws_provisioning_id", self.sid)
		end
	end)
end

function AWS:UPLOAD_after_upload_hook(upload_request)
	local path = upload_request.files[1].location
	util.set_file_permissions(path, "aws")
	return { path = path }
end

local s = AWS:section("aws_jobs", "aws_provisioning")

	local template = s:option("template")
		template.maxlength = 36
		template.cfg_require = true
		function template:validate(value)
			if not value:match("^%w") or not value:match("%w$")  then return false, "Value must start and end with an alphanumeric character" end
			return self.dt:fieldvalidation(value, "^[A-Za-z0-9_-]+$")
		end

	local _type = s:option("type")
		_type.require = { ["1"] = {"certfile", "keyfile"}, ["2"] = {"access_key", "secret_key"} }
		_type.cfg_require = true
		function _type:validate(value)
			return self.dt:check_array(value, {"1", "2"})
		end

	local creation_type = s:option("creation_type")
		creation_type.cfg_require = true
		function creation_type:validate(value)
			return self.dt:check_array(value, {"1", "2"})
		end

	s:option("certfile", { file = true })

	s:option("keyfile", { file = true })

	local access_key = s:option("access_key")
		function access_key:validate(value)
			local ok, err = self.dt:exact_length(value, {20})
			if not ok then return false, err end
			return self.dt:fieldvalidation(value, "^[A-Z0-9]+$")
		end

	local secret_key = s:option("secret_key")
		function secret_key:validate(value)
			local ok, err = self.dt:exact_length(value, {40})
			if not ok then return false, err end
			return self.dt:default_validation(value)
		end

	local param = s:option("param", { list = true })
		function param:validate(value)
			local ok, err = self.dt:fieldvalidation(value, "^[a-zA-Z0-9:%%_-]+$")
			if not ok then return false, err end

			local v = util.split(value, ":")
			if #v ~= 2 then return false, "Value must be in the format key:value" end
			local key = v[1]
			local val = v[2]

			local allowed_variables = {
				"device",
				"mac",
				"maceth",
				"batch",
				"hwver",
				"serial",
				"time",
				"thing"
			}
			for _, vv in ipairs({key, val}) do
				local _, count = vv:gsub("%%", "")
				if math.fmod(count, 2) == 0 then -- check if there is an even number of % characters
					for variable_name in vv:gmatch("%%([^%%]-)%%") do
						if not util.contains(allowed_variables, variable_name) then
							return false, "Parameter %s is invalid, allowed parameters: [%s]" % {"%"..variable_name.."%", table.concat(allowed_variables, ", ")}
						end
					end
				else
					return false, "Invalid value (unfinished % parameter)"
				end
			end
			return true
		end

return AWS
