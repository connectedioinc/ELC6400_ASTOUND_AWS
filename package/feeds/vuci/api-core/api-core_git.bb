#
# Copyright 2024 Teltonika-Networks
#

DESCRIPTION = "WebUI API Core application"
SECTION = "web/api"

DEPENDS += "lua5.1 ubus"

# append lua5.1 include path; this should be fixed in the sources
TARGET_CFLAGS:append = " -I${STAGING_INCDIR}/lua5.1"

inherit tc-license cmake vuci-common

S = "${WORKDIR}/src"
SRC_URI += " \
    file://src/ \
    file://001-drop-unused-lcrypt-from-linker.patch \
"

# # set-up runtime depends
RDEPENDS:${PN} += "\
    uhttpd \
    lua5.1 \
    libubox-lua \
    luasec \
    lua-crypto \
    lua-extra-validators \
    lrexlib \
    luci-lib-jsonc \
    luci-lib-nixio \
    luci-lib-ip \
    openssl-bin \
    rpcd \
    rpcd-session \
    rpcd-mod-rrdns \
"

do_install:append() {
    install -D -m 0644 "${B}/vuci.so" "${D}${libdir}/lua/vuci.so"
}

do_install:append() {
    # Remove io.lua if not needed
    if [ "${REMOVE_IO_LUA}" = "1" ]; then
        rm -f ${D}${libdir}/lua/vuci/io.lua
    fi
    # Remove modbus_utils.lua if not needed
    if [ "${REMOVE_MODBUS_UTILS}" = "1" ]; then
        rm -f ${D}${libdir}/lua/vuci/modbus_utils.lua
    fi
    # Remove serial_status.lua and serial.lua if not needed
    if [ "${REMOVE_SERIAL_FILES}" = "1" ]; then
        rm -f ${D}${libdir}/lua/api/services/serial_status.lua
        rm -f ${D}${libdir}/lua/vuci/serial.lua
    fi
}

python __anonymous() {
    # TODO: Refactor this into modules when possible.
    # So that by default these files aren't installed. Instead of currently they are always installed
    # and need to be removed.
    #
    # For more details read this comment: https://git.teltonika.lt/teltonika/gui/vuci/-/merge_requests/12790#note_2152699

    distro_features = d.getVar('DISTRO_FEATURES', True) or ''
    io_features = ['io', 'gps', 'mobutils', 'serial', 'snmp']
    serial_features = ['serial', 'modbus', 'ntrip', 'mbus', 'dnp3', 'bacnet']

    remove_io = not any(f in distro_features for f in io_features)
    remove_modbus_utils = 'modbus' not in distro_features
    remove_serial = not any(f in distro_features for f in serial_features)
    d.setVar('REMOVE_IO_LUA', '1' if remove_io else '0')
    d.setVar('REMOVE_MODBUS_UTILS', '1' if remove_modbus_utils else '0')
    d.setVar('REMOVE_SERIAL_FILES', '1' if remove_serial else '0')
}
