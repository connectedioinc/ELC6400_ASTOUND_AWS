#!/bin/sh

# Wait a brief moment for late-boot configuration generation to settle
sleep 5

# 1. Patch the certificates config text file directly
if [ -f "/etc/config/certificates" ]; then
    sed -i "s/option name 'Teltonika'/option name 'Elleco_Networks'/g" /etc/config/certificates
fi
uci commit certificates
# 2. Patch or override the siteman_wireless config
if [ -f "/etc/config/siteman_wireless" ]; then
    sed -i "s/Teltonika/Elleco_Networks/g" /etc/config/siteman_wireless
else
    cat << 'EOF' > /etc/config/siteman_wireless
config siteman_wireless 'default'
	option ssid 'Elleco_Networks'
EOF
fi
uci commit siteman_wireless
# 3. Patch the siteman commonname config text file directly
if [ -f "/etc/config/siteman" ]; then
    sed -i "s/option commonname 'Teltonika'/option commonname 'Elleco_Networks'/g" /etc/config/siteman
fi

# 4. Clean up after itself so it NEVER runs again
# This removes this script and its execution link in rc.local
sed -i '/elleco-firstboot.sh/d' /etc/rc.local
rm -f "$0"

exit 0
