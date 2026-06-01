inherit vuci-app-api

APP_TITLE = "NTP"

RDEPENDS:${PN} += "ntpclient"

do_install:append() {
	install -D -m 0755 "${WORKDIR}/files/usr/libexec/rpcd/date_time" "${D}${base_prefix}/usr/libexec/rpcd/date_time"
}
