inherit vuci-app-api

APP_TITLE = "System info"

# set-up runtime depends
RDEPENDS:${PN} += "\
    mnfinfo-rpcd \
    lua5.1 \
"
