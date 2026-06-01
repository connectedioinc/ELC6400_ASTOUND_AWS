local module = {}

function module:endpoint(service, s, bundle, input_type)
	input_type.require["mdcollect"] = { "mdc_period" }
	if bundle.all_modems and #bundle.all_modems > 1 then
		table.insert(input_type.require["mdcollect"], "mdc_modem_id")
		local flag = false
		for _, value in pairs(bundle.all_modems) do
			if value and value.sim_count and value.sim_count > 1 then
				flag = true
			end
		end
		if flag then
			table.insert(input_type.require["mdcollect"], "mdc_sim")
		end
	elseif bundle.all_modems and #bundle.all_modems == 1 then
		if bundle.all_modems[1] and bundle.all_modems[1].sim_count and bundle.all_modems[1].sim_count > 1 then
			table.insert(input_type.require["mdcollect"], "mdc_sim")
		end
	end

	local mdc_period = s:option("mdc_period")
		function mdc_period:validate(value)
			return self.dt:check_array(value, { "day", "week", "month" })
		end

	local mdc_current = s:option("mdc_current")
		function mdc_current:validate(value)
			return self.dt:is_bool(value)
		end

	local mdc_modem_id = s:option("mdc_modem_id")
		function mdc_modem_id:validate(value)
			return self.dt:check_modem(value)
		end

		local mdc_sim = s:option("mdc_sim")
		function mdc_sim:validate(value)
			local modem_id = self:get_abs_value(self.config, self.sid, "mdc_modem_id")
			local sim_count
			if #bundle.all_modems > 1 then
				if modem_id and modem_id ~= "" then
					for _, modem in ipairs(bundle.all_modems) do
						if modem.id == modem_id then
							sim_count = modem.sim_count
							break
						end
					end
				end
			elseif #bundle.all_modems == 1 then
				sim_count = bundle.all_modems[1].sim_count
			end

			if not sim_count then
				return false, "Modem not found."
			end

			local sims = {}
			for i = 1, sim_count do
				table.insert(sims, tostring(i))
			end
			return self.dt:check_array(value, sims)
		end
end

return module
