inherit vuci-app-api

APP_TITLE = "UPnP"

RDEPENDS:${PN} += "miniupnpd"

pkg_prerm:${PN} () {
    #!/bin/sh
    uci -q get firewall.miniupnpd > /dev/null || exit 0
    uci -q delete firewall.miniupnpd
    uci -q commit firewall
    /etc/init.d/firewall reload
    exit 0
}
