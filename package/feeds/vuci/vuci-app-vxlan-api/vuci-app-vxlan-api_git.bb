inherit vuci-app-api

APP_TITLE = "VXLAN"

# Uncomment when package becomes available
# RDEPENDS:${PN} += "kmod-vxlan vuci-app-network-devices-api"

pkg_prerm:${PN} () {
    #!/bin/sh
    . /usr/share/libubox/jshn.sh
    . /lib/functions.sh

    id_array=""
    get_vxlans() {
        local type
        local device="$1"
        config_get type "$device" "type"
        [ "$type" = "vxlan" ] && {
            [ "$id_array" = "" ] && id_array="\"$device\"" || id_array="${id_array}, \"${device}\""
        }
        return 0
    }

    config_load "network"
    config_foreach get_vxlans "device"

    [ "$id_array" = "" ] && exit 0  
                                    
    json_payload='{"data": ['$id_array']}'         
                                            
    api delete /network/devices/vxlan/config "$json_payload" > /dev/null 2>&1

    exit 0
}
