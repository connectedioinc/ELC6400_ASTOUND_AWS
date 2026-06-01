local ConfigService = require("api/ConfigService")

local BacnetBdt = ConfigService:new({
  increment_name = true
})

local s = BacnetBdt:section("bacnet_router", "bdt_entry")

local address = s:option("address")
function address:validate(value)
  return self.dt:ip4addr(value)
end

local port = s:option("port")
function port:validate(value)
  return self.dt:port(value)
end
  
local mask = s:option("mask")
function mask:validate(value)
  return self.dt:netmask(value)
end

function BacnetBdt:POST_validate_hook()
  local sections = self:table_count("bacnet_router", "bdt_entry")
  if sections >= 128 then
    self:add_critical_error(STD_CODES.UCI_CREATE_ERROR, "Can't create more instances. Only 128 instances are allowed")
  end
end
return BacnetBdt
