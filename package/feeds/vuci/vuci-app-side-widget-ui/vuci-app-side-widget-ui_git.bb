inherit vuci-app-ui

APP_TITLE = "Side Widget controller"

# drop files from SRC_URI
SRC_URI:remove = "file://files/"

# allow this package to be empty
ALLOW_EMPTY:${PN} = "1"
