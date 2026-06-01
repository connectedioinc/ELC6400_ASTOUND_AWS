local ConfigService = require("api/ConfigService")

local vrf = ConfigService:new({
	create = false,
	delete = false,
	general_section = "globals",
	global_settings = true
})

local s = vrf:section("network", "globals")

	local tcp_l3mdev = s:option("tcp_l3mdev")
		function tcp_l3mdev:validate(value)
			return self.dt:is_bool(value)
		end

        function tcp_l3mdev:get(value)
            return value or "0"
        end

        function tcp_l3mdev:set(value)
            if value == "" then value = "0" end
            self:table_set(self.config, self.sid, self.api_key, value)
        end

    local udp_l3mdev = s:option("udp_l3mdev")
		function udp_l3mdev:validate(value)
			return self.dt:is_bool(value)
		end

        function udp_l3mdev:get(value)
            return value or "0"
        end

        function udp_l3mdev:set(value)
            if value == "" then value = "0" end
            self:table_set(self.config, self.sid, self.api_key, value)
        end

return vrf
