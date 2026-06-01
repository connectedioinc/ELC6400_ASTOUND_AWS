#!/bin/sh

hostsdetails=""
y="b"

# Get DHCP lease file
leaseFile=$(uci -q get dhcp.@dnsmasq[0].leasefile)
[ -z "$leaseFile" ] && leaseFile="/tmp/dhcp.leases"

# Iterate over all wireless interfaces
for interface in $(iw dev | awk '/Interface/ {print $2}'); do
  maclist=$(iw dev "$interface" station dump | awk '/Station/ {print $2}')
  t="1"
  c="p"
  tp=$t$c
  # Iterate over all MAC addresses connected to the interface
  for mac in $maclist; do
    rxlist=`iw dev $interface station dump | grep "rx bytes:" | cut -d: -f2 | awk '{print $1}' | sed -n $tp`
    txlist=`iw dev $interface station dump | grep "tx bytes:" | cut -d: -f2 | awk '{print $1}' | sed -n $tp`            
    # Get SSID
    ssid=$(iwinfo "$interface" info | awk -F'"' '/ESSID:/ {print $2}')

    # Get IP and hostname from DHCP leases
    lease_data=$(grep "$mac" "$leaseFile" | awk '{print $3, $4}')
    ip=$(echo "$lease_data" | awk '{print $1}')
    host=$(echo "$lease_data" | awk '{print $2}')

    [ -z "$ip" ] && ip="UNKN"
    [ -z "$host" ] && host=""

    # Append JSON-like data
    hostsdetails="${hostsdetails}\"$y\":{\"a\":\"$host\",\"b\":\"$ip\",\"c\":\"$mac\",\"d\":\"$ssid\",\"e\":\"$rxlist\",\"f\":\"$txlist\"},"

    # Increment letter in a cyclic manner
    y=$(echo "$y" | tr '[a-y]z' '[b-z]a')

    # Increment line counter
    t=$((t+1))
    tp=$t$c
  done
done

# Remove trailing comma and output result
echo "${hostsdetails%?}"
