#
# Copyright 2024 Teltonika-Networks
#

DESCRIPTION = "Lua crypto bindings"
SECTION = "libs"

DEPENDS = "lua5.1 openssl"

FILESEXTRAPATHS:append := "${THISDIR}:"

SRC_URI = "\
    file://src/ \
"

SRC_URI += "\
    file://001-link-with-lua51.patch \
    file://002-add-clean-target.patch \
    file://003-pass-ldflags.patch \
"

S = "${WORKDIR}/src"
B = "${S}"

# append lua5.1 include path; this should be fixed in the sources
TARGET_CFLAGS:append = " -I${STAGING_INCDIR}/lua5.1"

inherit tc-license

# include files under /usr/lib/lua
FILES:${PN} += "${libdir}/lua"

do_install() {
    mkdir -p "${D}${libdir}/lua"
    install -Dm 0644 "${B}/lua_crypto.so" "${D}${libdir}/lua"
}
