inherit vuci-app-ui

APP_TITLE = "Reset"

# drop -api runtime depend
RDEPENDS:${PN}:remove = "${@d.getVar('PN').replace('-ui', '-api')}"
