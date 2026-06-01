local ConfigService = require("api/ConfigService")
local fs = require("nixio.fs")

local rms = ConfigService:new({ create = false, delete = false })

function rms.t_func:commit()
	-- need to commit without causing service reload (rms server logic breaks otherwise)
	self.uci:commit_without_event("rms_mqtt")
end

local function wrap_opt(opt)
	function opt:validate(value)
		return self.dt:string(value)
	end

	opt._orig_set = opt.set
	function opt:set(value)
		self:_orig_set(value)
		fs.writefile("/log/" .. self.api_key, value)
	end

	opt._orig_get = opt.get
	function opt:get(value)
		return self:_orig_get(value) or fs.readfile("/log/" .. self.api_key)
	end
	return opt
end

local s = rms:section("rms_mqtt", "rms_mqtt")

wrap_opt(s:option("rms_id"))

wrap_opt(s:option("demo_rms_id"))

wrap_opt(s:option("local_rms_id"))

return rms
