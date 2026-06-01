inherit vuci-hs-theme

THEME_NAME = "default"
THEME_TITLE = "Default theme"

pkg_prerm:${PN}() {
    #!/bin/sh
    if [ -d "/etc/chilli/hotspotlogin/backup" ]; then
        rm -rf /etc/chilli/hotspotlogin/backup/
    fi
    exit 0
}

pkg_postinst_ontarget:${PN}() {
    #!/bin/sh
    if [ ! -d "/rom/etc/chilli/hotspotlogin" ]; then
        mkdir -p /etc/chilli/hotspotlogin/backup/themes/default /etc/chilli/hotspotlogin/backup/cgi-bin/themes/default
        cp -rf /etc/chilli/hotspotlogin/themes/default/style /etc/chilli/hotspotlogin/backup/themes/default/
        cp -rf /etc/chilli/hotspotlogin/cgi-bin/themes/default /etc/chilli/hotspotlogin/backup/cgi-bin/themes/
        chown -R chilli:chilli /etc/chilli/hotspotlogin/backup/themes/default
        chown -R chilli:chilli /etc/chilli/hotspotlogin/backup/cgi-bin/themes/default
        chmod 0774 /etc/chilli/hotspotlogin/backup/themes/default
        chmod 0774 /etc/chilli/hotspotlogin/backup/cgi-bin/themes/default
    fi
    exit 0
}
