-- Copyright 2016 David Thornley <david.thornley@touchstargroup.com>
-- Licensed to the public under the Apache License 2.0.

-- Modifications Copyright (C) 2021 Teltonika Networks

local netmod = vuci.network
local interface = vuci.network.interface
local proto = netmod:register_protocol("connm")

function proto.get_i18n(self)
	return "WWAN Cellular"
end

function proto.ifname(self)
	local base = netmod._M.protocol
	local ifname = base.ifname(self) -- call base class "protocol.ifname(self)"

	if ifname == nil then
		ifname = "connm-" .. self.sid
	end
	return ifname
end

function proto.get_interface(self)
	return interface(self:ifname(), self)
end

function proto.opkg_package(self)
	return "connm"
end

function proto.is_installed(self)
	return true
end

function proto.is_floating(self)
	return true
end

function proto.is_virtual(self)
	return true
end

function proto.get_interfaces(self)
	return nil
end

function proto.proto(self)
	return "connm"
end

function proto.contains_interface(self, ifc)
	 return (netmod:ifnameof(ifc) == self:ifname())
end

netmod:register_pattern_virtual("^connm%-%w")

netmod:register_error_code("CALL_FAILED",	("Call failed"))
netmod:register_error_code("NO_CID",		("Unable to obtain client ID"))
netmod:register_error_code("PLMN_FAILED",	("Setting PLMN failed"))
