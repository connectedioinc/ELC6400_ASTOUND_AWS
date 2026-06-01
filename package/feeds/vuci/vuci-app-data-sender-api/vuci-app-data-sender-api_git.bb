inherit vuci-app-api package-bundle

APP_TITLE = "Data Sender"
BUNDLE_TITLE = "Advanced data to server modules"

RDEPENDS:${PN} += "data-sender"

servicesdir = "${libdir}/lua/api/services"

ds_install_mods() {
    for m in ${WORKDIR}/files/usr/lib/lua/api/services/$1/*.lua; do
        install -D -m 0644 "$m" "${D}${base_prefix}${servicesdir}/$1/$(basename $m)"
    done
}

do_install:append(){
    install -D -m 0755 "${WORKDIR}/files/usr/lib/lua/vuci/ds_update_list.lua" \
            "${D}${base_prefix}${libdir}/lua/vuci/ds_update_list.lua"

    if ! ${@bb.utils.contains('MACHINE_FEATURES', 'mobile', 'true', 'false', d)}; then
        rm "${D}${base_prefix}${servicesdir}/ds_inputs/ds_input_sms.lua"
        rm "${D}${base_prefix}${servicesdir}/ds_outputs/ds_output_sms.lua"
    fi

    ds_install_mods "ds_inputs"
    ds_install_mods "ds_outputs"
    ds_install_mods "ds_formats"
}


# main data sender package
FILES:${PN} = "\
    ${servicesdir}/data_sender_collections.lua \
    ${servicesdir}/data_sender_inputs.lua \
    ${servicesdir}/data_sender_outputs.lua \
    ${servicesdir}/data_sender_format.lua \
    ${servicesdir}/data_sender_encoder.lua \
    ${servicesdir}/data_sender_utils.lua \
    ${libdir}/lua/vuci/ds_update_list.lua \
    ${datadir}/rpcd/acl.d/datasender.json \
"

POSTINST_SCRIPT = 'lua -e "ds_update = require \"vuci.ds_update_list\"; ds_update:update_list();" ; exit 0'

# data sender module generation
python () {
    modules = [
        {"name": "Format Custom",    "pkgname": "format-custom",   "dir": "ds_formats", "file": "ds_format_custom"},
        {"name": "Lua Format",       "pkgname": "lua-format",      "dir": "ds_formats", "file": "ds_format_lua"},
        {"name": "MQTT Input",       "pkgname": "mqtt-in",         "dir": "ds_inputs",  "file": "ds_input_mqtt"},
        {"name": "MQTT Output",      "pkgname": "mqtt-out",        "dir": "ds_outputs", "file": "ds_output_mqtt"},
        {"name": "HTTP",             "pkgname": "http",            "dir": "ds_outputs", "file": "ds_output_http"},
        {"name": "UBUS",             "pkgname": "ubus",            "dir": "ds_outputs", "file": "ds_output_ubus"},
        {"name": "Bluetooth",        "pkgname": "bluetooth",       "dir": "ds_inputs",  "file": "ds_input_bluetooth"},
        {"name": "Mbus",             "pkgname": "mbus",            "dir": "ds_inputs",  "file": "ds_input_mbus"},
        {"name": "Lua Script Input", "pkgname": "lua-in",          "dir": "ds_inputs",  "file": "ds_input_lua"},
        {"name": "GSM",              "pkgname": "gsm",             "dir": "ds_inputs",  "file": "ds_input_gsm"},
        {"name": "Mobile Usage",     "pkgname": "mdcollect",       "dir": "ds_inputs",  "file": "ds_input_mdcollect"},
        {"name": "Modbus Alarm",     "pkgname": "modbus-alarm",    "dir": "ds_inputs",  "file": "ds_input_modbus_alarm"},
        {"name": "Modbus",           "pkgname": "modbus",          "dir": "ds_inputs",  "file": "ds_input_modbus"},
        {"name": "DNP3",             "pkgname": "dnp3",            "dir": "ds_inputs",  "file": "ds_input_dnp3"},
        {"name": "OPCUA",            "pkgname": "opcua",           "dir": "ds_inputs",  "file": "ds_input_opcua"},
        {"name": "Impulse Counter",  "pkgname": "impulse-counter", "dir": "ds_inputs",  "file": "ds_input_impulse_counter"},
        {"name": "Dlms",             "pkgname": "dlms",            "dir": "ds_inputs",  "file": "ds_input_dlms"},
        {"name": "WifiScan",         "pkgname": "wifiscan",        "dir": "ds_inputs",  "file": "ds_input_wifiscan"},
        {"name": "I/O",              "pkgname": "io",              "dir": "ds_inputs",  "file": "ds_input_io"},
        {"name": "SMS Input",        "pkgname": "sms-input",       "dir": "ds_inputs",  "file": "ds_input_sms"},
        {"name": "GPS Input",        "pkgname": "gps",             "dir": "ds_inputs",  "file": "ds_input_gps"},
        {"name": "Azure",            "pkgname": "azure",           "dir": "ds_outputs", "file": "ds_output_azure"},
        {"name": "FTP",              "pkgname": "ftp",             "dir": "ds_outputs", "file": "ds_output_ftp"},
        {"name": "LUA Output",       "pkgname": "lua-out",         "dir": "ds_outputs", "file": "ds_output_lua"},
        {"name": "SMTP",             "pkgname": "smtp",            "dir": "ds_outputs", "file": "ds_output_smtp"},
        {"name": "Socket",           "pkgname": "socket",          "dir": "ds_outputs", "file": "ds_output_socket"},
        {"name": "SMS Output",       "pkgname": "sms-out",      "dir": "ds_outputs", "file": "ds_output_sms"},
    ]

    for mod in modules:
        fullpkgname = "${PN}" + "-mod-" + mod["pkgname"]
        d.appendVar("PACKAGES", " " + fullpkgname)
        d.setVar("FILES:" + fullpkgname, "${servicesdir}" + "/" + mod["dir"] + "/" + mod["file"] + ".lua")
        d.setVar("RDEPENDS:" + fullpkgname, "${PN}")
        d.setVar("SUMMARY:" + fullpkgname, "Vuci Data Sender API " + mod["name"] + " module")
        d.setVar("pkg_postinst_ontarget:" + fullpkgname, "${POSTINST_SCRIPT}")


        # TODO: uncomment this when data-sender-mod-* packages are available
        # if mod["pkgname"] != "azure":
        #     d.appendVar("RDEPENDS:" + fullpkgname, " data-sender-mod-" + mod["pkgname"])

}

PACKAGES += " ${PN}-mod-advanced ${PN}-core"
SUMMARY:${PN}-mod-advanced = "Vuci Data Sender API Advanced modules"
DESCRIPTION:${PN}-mod-advanced = "Includes advanced modules for data exchange between the router and external systems. \
    Supports data input via SMS, and I/O. Data output via FTP, SMTP, sockets, Lua scripts and SMS. \
    Optional modules enabled based on platform capabilities (e.g., SMS, GPS, I/O)."

ALLOW_EMPTY:${PN}-core = "1"
RDEPENDS:${PN}-core = " \
        vuci-app-data-sender-api-mod-ubus \
        vuci-app-data-sender-api-mod-format-custom \
        vuci-app-data-sender-api-mod-lua-format \
        vuci-app-data-sender-api-mod-http \
        vuci-app-data-sender-api-mod-mqtt-in \
        vuci-app-data-sender-api-mod-mqtt-out \
        vuci-app-data-sender-api-mod-mqtt-in \
        vuci-app-data-sender-api-mod-lua-in \
        ${@bb.utils.contains('MACHINE_FEATURES', 'mobile', 'vuci-app-data-sender-api-mod-mdcollect', '', d)} \
        ${@bb.utils.contains('MACHINE_FEATURES', 'mobile', 'vuci-app-data-sender-api-mod-gsm', '', d)} \
"

ALLOW_EMPTY:${PN}-advanced = "1"
RDEPENDS:${PN}-mod-advanced += "\
    vuci-app-data-sender-api-mod-ftp \
    vuci-app-data-sender-api-mod-lua-out \
    vuci-app-data-sender-api-mod-smtp \
    vuci-app-data-sender-api-mod-socket \
    ${@bb.utils.contains('MACHINE_FEATURES', 'mobile', 'vuci-app-data-sender-api-mod-sms-input', '', d)} \
    ${@bb.utils.contains('MACHINE_FEATURES', 'mobile', 'vuci-app-data-sender-api-mod-sms-out', '', d)} \
    ${@bb.utils.contains('MACHINE_FEATURES', 'io', 'vuci-app-data-sender-api-mod-io', '', d)} \
"

pkg_postinst_ontarget:${PN}-mod-advanced () {
    ${POSTINST_SCRIPT}
}
