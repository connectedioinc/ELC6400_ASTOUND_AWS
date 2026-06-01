local HotspotUtils = {}
local fs = require("nixio.fs")

HotspotUtils.files = {
	"landing_page.css",
	"header.htm",
	"login.htm",
	"login_mac.htm",
	"login_sso.htm",
	"otp_login.htm",
	"signup.htm",
	"otp_signup.htm",
	"success.htm",
	"access_denied.htm",
	"tos.htm"
}

local function get_theme_control(theme)
	local file_names = { "hs_theme_" .. theme, "tlt_hs_theme_" .. theme, "hs-theme-" .. theme }
	for _, file in ipairs(file_names) do
		local path = "lib/opkg/info/" .. file .. ".control"
		path = fs.access("/usr/" .. path) and "/usr/" .. path or "/usr/local/" .. path
		if fs.access(path) then return path end
	end
	return nil
end

local function parse_pretty_name(theme)
	local file = get_theme_control(theme)
	if not file then return nil end

	local content = fs.readfile(file)
	if not content then return nil end

	local description = content:match("Description:%s*([^%s].-)%s*\n")
	if description then
		return description:gsub("Hotspot landing page", ""):gsub("^%s*(.-)%s*%.$", "%1"):gsub("^%l", string.upper)
	end
	return nil
end

function HotspotUtils:get_themes()
	local path = "/etc/chilli/hotspotlogin/themes"
	local themes = {}

	for theme in fs.dir(path) do
		local is_custom = "0"
		local title = nil
		if theme:sub(1, #"custom_theme") == "custom_theme" then
			local theme_number = theme:sub(#"custom_theme_" + 1)
			is_custom = "1"
			title = "Custom Theme " .. theme_number
		else
			title = parse_pretty_name(theme)
		end

		if title then
			table.insert(themes, { id = theme, name = title, custom = is_custom })
		end
	end

	return themes
end

return HotspotUtils
