#!/bin/sh
# Script to disable internet access for a given MAC address on the router

# Ensure a MAC address is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <MAC_ADDRESS>"
    exit 1
fi

# Remove colons from MAC address for naming
mac_cleaned=$(echo "$1" | tr -d ':')

# Add firewall rule
cfg1=$(uci add firewall rule)
uci batch <<EOF
set firewall.$cfg1.name="block_$mac_cleaned"
set firewall.$cfg1.src="*"
set firewall.$cfg1.src_mac="$1"
set firewall.$cfg1.dest="wan"
set firewall.$cfg1.target="REJECT"
rename firewall.$cfg1="block_$mac_cleaned"
EOF

# Apply changes
uci commit firewall
/etc/init.d/firewall restart

