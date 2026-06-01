inherit vuci-app-api useradd

APP_TITLE = "Email Recipients"

USERADD_PACKAGES = "${PN}"
USERADD_PARAM:${PN} = "-u 611 -d /var/run/recipients -r -s /bin/false recipients"


pkg_postinst:${PN}() {
    chown recipients:recipients "$D${sysconfdir}/config/user_groups"
}
