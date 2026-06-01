
inherit package-bundle tc-license

DESCRIPTION = "Data Sender advanced package group"
BUNDLE_TITLE = "Advanced data to server modules"

RDEPENDS:${PN} += "vuci-app-data-sender-api-advanced data-sender-package-group"
ALLOW_EMPTY:${PN} = "1"
