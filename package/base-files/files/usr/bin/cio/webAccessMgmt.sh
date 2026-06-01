#!/bin/sh

# Script to block/unblock internet access from LAN and WiFi zones
# Requires zones: lan and wifi to be defined in firewall

BLOCK_RULE_NAME_LAN="block_lan_to_wan"
BLOCK_RULE_NAME_WIFI="block_wifi_to_wan"

case "$1" in
    disable)
        # Block all protocols from LAN to WAN
        if ! uci get firewall.$BLOCK_RULE_NAME_LAN >/dev/null 2>&1; then
            cfg=$(uci add firewall rule)
            uci set firewall.$cfg.name='Block LAN to WAN'
            uci set firewall.$cfg.src='lan'
            uci set firewall.$cfg.dest='wan'
            uci set firewall.$cfg.proto='all'
            uci set firewall.$cfg.target='DROP'
            uci rename firewall.$cfg=$BLOCK_RULE_NAME_LAN
        fi

        # Block all protocols from WiFi to WAN
        if ! uci get firewall.$BLOCK_RULE_NAME_WIFI >/dev/null 2>&1; then
            cfg=$(uci add firewall rule)
            uci set firewall.$cfg.name='Block WiFi to WAN'
            uci set firewall.$cfg.src='wifi'
            uci set firewall.$cfg.dest='wan'
            uci set firewall.$cfg.proto='all'
            uci set firewall.$cfg.target='DROP'
            uci rename firewall.$cfg=$BLOCK_RULE_NAME_WIFI
        fi
	uci set system.@system[0].enable_web_access=0
	uci commit system
        uci commit firewall
        /etc/init.d/firewall restart
        echo "Internet access blocked for LAN and WiFi."
        ;;

    enable)
        # Remove existing rules if they exist
        uci delete firewall.$BLOCK_RULE_NAME_LAN 2>/dev/null
        uci delete firewall.$BLOCK_RULE_NAME_WIFI 2>/dev/null
	uci set system.@system[0].enable_web_access=1
	uci commit system
        uci commit firewall
        /etc/init.d/firewall restart
        echo "Internet access restored for LAN and WiFi."
        ;;

    *)
        echo "Usage: $0 {enable|disable}"
        exit 1
        ;;
esac
