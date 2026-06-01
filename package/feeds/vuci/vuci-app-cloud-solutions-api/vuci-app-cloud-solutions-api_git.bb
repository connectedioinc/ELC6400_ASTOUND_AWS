inherit vuci-app-api

APP_TITLE = "Cloud Solutions"

RDEPENDS:${PN} += " rms-mqtt"

do_install:append() {
    if [ "${DISTRO}" = "tapos" ] ; then
        rm -f ${D}${datadir}/rpcd/acl.d/cloudsolutions.json
    else
        rm -f ${D}${datadir}/rpcd/acl.d/cloudsolutions_system.json
    fi
}
