local ConfigService = require("api/ConfigService")
local util = require("vuci.util")
local fs = require ("nixio.fs")

local ipsec_secret = ConfigService:new({ increment_name = true })

local s = ipsec_secret:section("ipsec", "secret")

local function fromhex(str)
    return (str:gsub('..', function(cc)
        if cc == "0x" then
            return string.gsub(cc, "0x", "")
        else
            return string.char(tonumber(cc, 16))
        end
    end))
end

-----------------------------------------------START OF OPTIONS---------------------------------------------------------------------------

    local id_selector = s:option("id_selector", { list = true })
    id_selector.maxlength = 255
        function id_selector:validate(_)
            return self.dt:string()
        end

    local type = s:option("type")
    type.require = {
        psk = {"secret"},
        xauth = {"secret"},
        eap = {"secret"},
        rsa = {"key"},
        pkcs12 = {"pkcs12_path"}
    }
        function type:validate(value)
            local type_options = { "psk", "xauth", "eap", "rsa", "pkcs12" }
            return self.dt:check_array(value, type_options)
        end

    local secret = s:option("secret", { sensitive = true })
    secret.minlength = 5
    secret.maxlength = 512
        function secret:validate(value)
            return self.dt:credentials_validate(value, true)
        end
        function secret:get(value)
            if value ~= "" and value ~= nil then
                return fromhex(value)
            else
                return value
            end
        end
        function secret:set(value)
            self:table_set(self.config, self.sid, self.api_key, "0x" .. util.tohex(value))
        end

    local key = s:option("key", { certificate = {
		type = "keys",
		cert_types = { "client", "server" },
		failsafe = true,
	}})

    local key_decrypt = s:option("key_decrypt", { sensitive = true })
    key_decrypt.minlength = 5
    key_decrypt.maxlength = 512
        function key_decrypt:validate(value)
            return self.dt:credentials_validate(value, true)
        end

    local pkcs12_path = s:option("pkcs12_path", { file = true })

    local pkcs12_decrypt = s:option("pkcs12_decrypt", { sensitive = true })
    pkcs12_decrypt.minlength = 5
    pkcs12_decrypt.maxlength = 512
        function pkcs12_decrypt:validate(value)
            return self.dt:credentials_validate(value, true)
        end

-----------------------------------------------END OF OPTIONS-----------------------------------------------------------------------------

function ipsec_secret:validate_request()
	local count = 0
	if self.request_method == "PUT" then count = count + 1 end
	self:table_foreach(self.main_config, "remote", function(t)
		local multiple_secrets = t.multiple_secrets
		local enabled = t.enabled

		if multiple_secrets == "1" and enabled == "1" then
			count = count + 1
		end
	end)
    if self.request_method == "DELETE" and count > 1 then
		local count_secret = self:table_count(self.main_config, "secret")
		if count_secret > 1 then return end
		self:add_critical_error(STD_CODES.NO_DELETE, "Cannot delete secret as at least one enabled instance has multiple_secrets enabled", self.sid)
	end
end

ipsec_secret.PUT_validate_section_hook = ipsec_secret.validate_request
ipsec_secret.DELETE_validate_section = ipsec_secret.validate_request

return ipsec_secret
