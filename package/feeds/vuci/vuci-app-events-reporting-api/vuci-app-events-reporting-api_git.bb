inherit vuci-app-api

APP_TITLE = "Events Reporting"

DEPENDS += " lua5.1 libparam"

SRC_URI = "file://src"
S = "${WORKDIR}/src"

RDEPENDS:${PN} += " \
    event-juggler \
    libparam \
"

CLEANBROKEN = "1"

FILES:${PN} += "${libdir}/lua/lualibparam.so"

TARGET_CFLAGS:append = " -I${STAGING_INCDIR}/lua5.1"

do_install:append() {
    install -d ${D}${libdir}/lua

    install -m644 ${B}/lualibparam.so \
        ${D}${libdir}/lua/lualibparam.so
}
