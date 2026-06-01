#!/bin/sh

hostsdetails=""
z=b
i=1
pt=0

# Get lease file
leaseFile=$(uci -q get dhcp.@dnsmasq[0].leasefile)
[ -z "$leaseFile" ] && leaseFile="/tmp/dhcp.leases"

# Interface header
intfdet="\"b\":{\"a\":\"br-lan\","

# Port status
pt_1=$(/etc/portstatus.sh 2)
pt_2=$(/etc/portstatus.sh 3)
pt_3=$(/etc/portstatus.sh 4)

# RX/TX once (no need inside loop)
rxlist=$(ifconfig br-lan | awk -F'[: ]+' '/RX bytes/{print $4}')
txlist=$(ifconfig br-lan | awk -F'[: ]+' '/TX bytes/{print $9}')

# Track unique MACs
seen_macs=""

while read -r expiry mac ip hostname clientid; do

    # Skip invalid entries
    [ -z "$mac" ] && continue
    [ "$mac" = "00:00:00:00:00:00" ] && continue

    # Deduplicate MAC
    echo "$seen_macs" | grep -qw "$mac" && continue
    seen_macs="$seen_macs $mac"

    # Check active ARP entry
    arp_entry=$(grep -w "$ip" /proc/net/arp | grep "0x2")
    [ -z "$arp_entry" ] && continue

    intf=$(echo "$arp_entry" | awk '{print $6}')

    # Only LAN interfaces
    echo "$intf" | grep -E 'eth0|br-lan' >/dev/null || continue

    # Port detection (first active port)
    pt=0
    for idx in 1 2 3; do
        eval ptv=\$pt_$idx
        if [ "$ptv" = "1" ]; then
            pt=$idx
            break
        fi
    done

    # Clean hostname
    [ -z "$hostname" ] && hostname="unknown"

    hostlist="\"$z\":{\"a\":\"$hostname\",\"b\":\"$ip\",\"c\":\"$mac\",\"d\":\"$rxlist\",\"e\":\"$txlist\",\"f\":\"$pt\"},"
    hostsdetails="${hostsdetails}${hostlist}"

    # Increment key
    z=$(echo "$z" | tr 'a-y' 'b-z')

done < "$leaseFile"

# Final JSON formatting
if [ -n "$hostsdetails" ]; then
    hostsdetails="${intfdet}${hostsdetails}"
fi

echo "${hostsdetails%?}"
