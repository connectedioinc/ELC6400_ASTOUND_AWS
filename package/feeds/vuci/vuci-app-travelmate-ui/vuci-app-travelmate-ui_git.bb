inherit vuci-app-ui package-bundle

APP_TITLE = "TravelMate"
BUNDLE_TITLE = "TravelMate"

# Uncomment when package becomes available
# RDEPENDS:${PN} += "travelmate vuci-app-wireless-ui"

# drop -api runtime depend
RDEPENDS:${PN}:remove = "${@d.getVar('PN').replace('-ui', '-api')}"
