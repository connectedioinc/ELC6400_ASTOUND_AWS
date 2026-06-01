local query_parsing = require("api/query")
local uci = require("vuci.uci")
local o = {}

function o:GET_TYPE_config()
	self:Get_TYPE()
end

function o:GET_TYPE_global()
	self:Get_TYPE()
end

function o:Get_TYPE()
	uci.show_commit_or_revert_warning = true
	self:GET_init_hook()

	self:populate_configs()

	self:GET_delegator()

	self:return_if_error()

	self:GET_before_commit_hook()

	self:auxiliary_sections()

	self:set_uci_values()

	self:_perform_reorder()

	self:GET_commit()

	if not self.bulk then
		self:GET_after_commit_hook()
	end

	self:GET_response()
end

function o:GET_init_hook()
end

-- GET delegator
-- uses queries for filtering
function o:GET_delegator()
	if self._single then
		self.response_table = self:GET_section_logic()
	else
		query_parsing:validate_query(self.query_parameters, self)
		for section, options in pairs(self.t_func:get_uci_config(self.main_config)) do
			-- if all values are to be get, then checks by type - if it is correct then sets sid and starts the
			-- accumulative getting of all described values
			if options[".type"] == self:_retrieve_main_section_type() and self:main_section_filter(options) then
				self.sid = section
				local response = self:GET_section_logic()
				query_parsing:query_filter(self.query_parameters, response, self.response_table)
			end
		end
		self.response_table = query_parsing:query_slice(self.query_parameters, self.response_table)
	end
end

function o:GET_response()
	self:general_response()
end

function o:GET_after_commit_hook()
end

function o:GET_section_logic()
	self:GET_section_init_hook()

	self:GET_validate_section()

	self:GET_validate_section_hook()

	local section_response = self:GET_data()

	self:GET_after_data_hook(section_response)

	return section_response
end

function o:GET_section_init_hook()
end

function o:GET_validate_section()
	self:Exists()
end

function o:GET_validate_section_hook()
end

function o:GET_before_commit_hook()
end

function o:GET_commit()
	self.t_func:general_commit()
end

function o:GET_data()
	return self:retrieve_section()
end

function o:GET_after_data_hook(_)
end

return o
