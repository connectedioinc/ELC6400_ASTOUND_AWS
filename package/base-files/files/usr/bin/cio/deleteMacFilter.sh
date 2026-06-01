#!/bin/sh
# Script to delete a firewall rule blocking internet access for a given MAC address

# Ensure a MAC address is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <MAC_ADDRESS>"
    exit 1
fi

# Remove colons from MAC address for naming consistency
mac_cleaned=$(echo "$1" | tr -d ':')

# Delete the corresponding firewall rule
rule_name="block_$mac_cleaned"
if uci -q get "firewall.$rule_name" > /dev/null; then
    uci delete "firewall.$rule_name"
    uci commit firewall
    /etc/init.d/firewall restart
fi
~

