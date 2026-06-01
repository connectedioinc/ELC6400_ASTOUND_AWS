inherit vuci-app-api

APP_TITLE = "PAM authentication"

RDEPENDS:${PN} += "pam pam-radius pam-tacacs"
