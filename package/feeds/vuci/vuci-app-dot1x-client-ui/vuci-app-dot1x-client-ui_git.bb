inherit vuci-app-ui

APP_TITLE = "802.1X Client UI"

# This package depends on a different API package
RDEPENDS:${PN} = " vuci-app-port-security-api"
