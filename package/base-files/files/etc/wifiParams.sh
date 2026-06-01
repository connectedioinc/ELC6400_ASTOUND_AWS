#!/bin/sh
# Optimized script to fetch all Wireless interface details from OpenWrt

z=b
wifidetails=""

iface_count=$(uci show wireless | grep "=wifi-iface" | wc -l)

for i in $(seq 0 $((iface_count - 1))); do
    iface="wireless.@wifi-iface[$i]"
    device=$(uci -q get $iface.device) || continue

    type=$(uci -q get wireless.$device.type)
    channel=$(uci -q get wireless.$device.channel)
    disabled=$(uci -q get $iface.disabled)
    [ "$disabled" = "1" ] && disabled="true" || disabled="false"

    ssid=$(uci -q get $iface.ssid)
    mode=$(uci -q get $iface.mode)
    encryption=$(uci -q get $iface.encryption)
    key=$(uci -q get $iface.key)
    hidden=$(uci -q get $iface.hidden)
    [ "$hidden" = "1" ] && hidden="true" || hidden="false"

    wlan="wlan$i-1"
    if iwinfo $wlan info>/dev/null 2>&1; then
        wlan_info=$(iwinfo $wlan info)
	tx_power=$(echo "$wlan_info" | awk '/Tx-Power:/ {for(i=1;i<=NF;i++) if ($i=="Tx-Power:") print $(i+1) " dBm"}' | xargs)
	access_point=$(echo "$wlan_info" | awk '/Access Point:/ {print $3}')
	link_quality=$(echo "$wlan_info" | awk -F'Link Quality: ' '{print $2}' | awk '{print $1}' | tr -d '\n' | xargs)
        [ "$link_quality" = "unknown" ] && link_quality="0"
    else
        tx_power="0"
        access_point="-"
        link_quality="0"
    fi

    entry="\"$z\":{\"a\":\"$device\",\"b\":\"$type\",\"c\":\"$channel\",\"d\":{\"a\":\"$disabled\",\"b\":\"$ssid\",\"c\":\"$tx_power\",\"d\":\"$mode\",\"e\":\"$access_point\",\"f\":\"$encryption\",\"g\":\"$key\",\"h\":\"$link_quality\",\"i\":\"$hidden\"}},"
    wifidetails="${wifidetails}${entry}"
    z=$(echo $z | tr '[a-y]z' '[b-z]a') # Rotate alphabet
done

[ -n "$wifidetails" ] && echo "${wifidetails%,}"
