local module = {}

function module:endpoint(service, s, bundle, output_type)

	-- output_type.requrie["ubus"] = {}

	function service:ubus_azure()
		local opt_ubus_object = self:get_abs_value(self.config, self.sid, "ubus_object") or ""
		return string.match(opt_ubus_object, "^azure")
	end

	local ubus_object = s:option("ubus_object")
		function ubus_object:validate(value)
			return self.dt:string(value)
		end
		ubus_object.orig_get = ubus_object.get
		function ubus_object:get(value)
			if self:ubus_azure() then return nil end
			self:orig_get(value)
		end
		ubus_object.orig_set = ubus_object.set
		function ubus_object:get(value)
			if self:ubus_azure() then return nil end
			self:orig_get(value)
		end

	local ubus_method = s:option("ubus_method")
		function ubus_method:validate(value)
			return self.dt:string(value)
		end
		ubus_method.orig_get = ubus_method.get
		function ubus_method:get(value)
			if self:ubus_azure() then return nil end
			self:orig_get(value)
		end
		ubus_method.orig_set = ubus_method.set
		function ubus_method:get(value)
			if self:ubus_azure() then return nil end
			self:orig_get(value)
		end

	local ubus_timeout = s:option("ubus_timeout")
		function ubus_timeout:validate(value)
			return self.dt:irange(value, 1, 120)
		end
		ubus_timeout.orig_get = ubus_timeout.get
		function ubus_timeout:get(value)
			if self:ubus_azure() then return nil end
			self:orig_get(value)
		end
		ubus_timeout.orig_set = ubus_timeout.set
		function ubus_timeout:get(value)
			if self:ubus_azure() then return nil end
			self:orig_get(value)
		end

end
return module