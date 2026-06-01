inherit vuci-app-api

APP_TITLE = "Certificates"

CONFFILES:${PN} = "/etc/config/certificates "
RDEPENDS:${PN} += " ${@bb.utils.contains('DISTRO_FEATURES', 'tpm', 'tpm2-importer', '', d)} lua5.1"
