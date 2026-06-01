inherit vuci-app-api

APP_TITLE = "Logs"

# set-up runtime depends
RDEPENDS:${PN} += "lua-sqlite3"
