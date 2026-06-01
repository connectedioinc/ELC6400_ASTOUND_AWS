inherit vuci-app-api

APP_TITLE = "802.1X API"

RDEPENDS:${PN} += "\
    ${@bb.utils.contains('DISTRO_FEATURES', 'dot1x-client', 'dot1x-client', '', d)} \
    ${@bb.utils.contains('DISTRO_FEATURES', 'dot1x-server', 'dot1x-server wpad-radius-test', '', d)} \
"
