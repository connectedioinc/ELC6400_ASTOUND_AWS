#!/bin/sh
# Script to manage IPs and firewall rules based on ARP table and DHCP leases

leaseFile=$(uci -q get dhcp.@dnsmasq[0].leasefile)
[ -z "$leaseFile" ] && leaseFile="/tmp/dhcp.leases"

# Read DHCP lease file into memory for better performance
leaseData=$(cat "$leaseFile")

wifiiplist=""
for interface in $(iw dev | awk '/Interface/ {print $2}'); do
    for mac in $(iw dev "$interface" station dump | awk '/Station/ {print $2}'); do
        ip=$(echo "$leaseData" | awk -v mac="$mac" '$3 == mac {print $2}')
        wifiiplist="$wifiiplist$ip"
    done
done

iplist=$(awk '/0x2/ && /'"$1"'/ {print $1}' /proc/net/arp)

for ip in $iplist; do
    macadd=$(echo "$leaseData" | awk -v ip="$ip" '$2 == ip {print $3}' | tr '\n' ',' | sed 's/,$//')
    hostname=$(echo "$leaseData" | awk -v ip="$ip" '$2 == ip {print $4}' | tr '\n' ',' | sed 's/,$//')

    if [ -n "$macadd" ] && [ -n "$hostname" ] && [[ "$wifiiplist" != *"$ip"* ]]; then
        iptables -t mangle -D FORWARD -s "$ip" 2>/dev/null
        iptables -t mangle -D FORWARD -d "$ip" 2>/dev/null
        iptables -t mangle -A FORWARD -s "$ip"
        iptables -t mangle -A FORWARD -d "$ip"
    fi
done
