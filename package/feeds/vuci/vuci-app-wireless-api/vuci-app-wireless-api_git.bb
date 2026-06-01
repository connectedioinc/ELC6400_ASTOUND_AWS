inherit vuci-app-api

APP_TITLE = "Wireless"

do_install:append () {
    chmod 0755 "${D}/usr/lib/lua/api/network/supplicant_control.lua"
}
