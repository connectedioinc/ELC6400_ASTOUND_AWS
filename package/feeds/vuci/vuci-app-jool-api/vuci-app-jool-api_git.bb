inherit vuci-app-api

APP_TITLE = "Jool"

# Uncomment when package becomes available
# RDEPENDS:${PN} += "jool"

pkg_prerm:${PN} () {
    #!/bin/sh
    . /usr/share/libubox/jshn.sh
    . /lib/functions.sh

    id_array=""
    get_jool_rules() {
        local family
        local rule="$1"
        config_get family "$rule" "family"
        [ "$family" = "ipv4" ] && {
            [ "$id_array" = "" ] && id_array="\"$rule\"" || id_array="${id_array}, \"${rule}\""
        }
        return 0
    }

    config_load "firewall"
    config_foreach get_jool_rules "jool"

    [ "$id_array" = "" ] && exit 0

    json_payload='{"data": ['$id_array']}'

    api delete /jool/rules/config "$json_payload" > /dev/null 2>&1

    exit 0
}
