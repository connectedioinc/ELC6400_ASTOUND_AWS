local BaseCumulocity = require("api.services.base_cumulocity")

local Cumulocity = BaseCumulocity:new("cumulocity")

local ssl = Cumulocity.sections[1]:option("ssl")
function ssl:validate(value)
	return self.dt:is_bool(value)
end

return Cumulocity
