inherit vuci-app-api

APP_TITLE = "Mobile Utilities"

SRC_URI += "file://files/etc/hotplug.d/gsm/1-new_modem"

FILES:${PN} += "\
    ${sysconfdir}/hotplug.d/gsm/1-new_modem \
"

do_install:append() {
    install -d ${D}${sysconfdir}/hotplug.d/gsm

    install -m644 ${B}/files/etc/hotplug.d/gsm/1-new_modem \
        ${D}${sysconfdir}/hotplug.d/gsm/1-new_modem
}
