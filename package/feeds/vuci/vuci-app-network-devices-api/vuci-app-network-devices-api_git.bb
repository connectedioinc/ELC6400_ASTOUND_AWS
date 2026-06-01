inherit vuci-app-api

APP_TITLE = "Network devices"

do_install:append:tswos() {
    rm "${D}/usr/lib/lua/api/network/devices_bridge.lua"
    rm "${D}/usr/lib/lua/api/network/devices_ethernet.lua"
    rm "${D}/usr/lib/lua/api/network/devices_utils.lua"
    rm "${D}/usr/lib/lua/api/network/devices_port_based.lua"
}
