inherit vuci-app-ui package-bundle

APP_TITLE = "TCP dump"
BUNDLE_TITLE = "TCPdump"

RDEPENDS:${PN} += "tcpdump vuci-app-troubleshoot-ui"

# drop -api runtime depend
RDEPENDS:${PN}:remove = "${@d.getVar('PN').replace('-ui', '-api')}"
