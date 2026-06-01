#
# Copyright 2024 Teltonika-Networks
#

DESCRIPTION = "Lua extra validators"
SECTION = "libs"

inherit tc-license

DEPENDS = "lua5.1"

FILESEXTRAPATHS:append := "${THISDIR}:"

SRC_URI = "\
    file://src/ \
"

SRC_URI += "\
    file://001-link-with-lua51.patch \
    file://002-pass-ldflags.patch \
    file://003-drop-includes.patch \
"

S = "${WORKDIR}/src"
B = "${S}"

TARGET_CFLAGS:append = " -I${STAGING_INCDIR}/lua5.1"

# include files under /usr/lib/lua
FILES:${PN} += "${libdir}/lua"

do_install() {
    mkdir -p "${D}${libdir}/lua"
    install -Dm 0644 "${B}/lua_extra_validators.so" "${D}${libdir}/lua"
}
