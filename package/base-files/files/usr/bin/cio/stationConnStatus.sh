#!/bin/sh
#Returns the list of connected hosts' data including connection status

BRIDGE="br-lan"
SEEN_MACS=""
JSON=""
lease_file="/tmp/dhcp.leases"
# --- BRIDGE CONFIGURATION ---
ip link set dev "$BRIDGE" type bridge ageing_time 1000 > /dev/null 2>&1
#LAN associated devices
while read -r line; do
    mac=$(echo "$line" | awk '{print tolower($1)}')
    # Skip if MAC already seen
    echo "$SEEN_MACS" | grep -q "$mac" && continue
    SEEN_MACS="$SEEN_MACS $mac"

    ip=$(ip neigh | awk -v mac="$mac" 'tolower($5)==mac {print $1; exit}')

    # Get hostname from dhcp.leases
    hostname="-"
    [ -f "$lease_file" ] && hostname=$(awk -v mac="$mac" 'tolower($2)==mac {print $4}' "$lease_file")
    if [ -z "$hostname" ] && [ -n "$ip" ]; then
        hostname=$(nslookup "$ip" 2>/dev/null | awk -F'name = ' '/name =/ {print $2}' | sed 's/\.$//')
        [ -z "$hostname" ] && hostname="-"
    fi
    tgtresult="true"
    if [ -x /usr/bin/cio/getFilterStatus.sh ]; then
        tgt=$(/usr/bin/cio/getFilterStatus.sh "$mac")
        [ "$tgt" = "1" ] && tgtresult="false"
    fi

    JSON="${JSON}{\"a\":\"$ip\",\"b\":\"$mac\",\"c\":\"$tgtresult\",\"d\":\"$hostname\"},"

done <<EOF
$(bridge fdb show br $BRIDGE | grep -i -v permanent)
EOF

#Wifi associated devices
# Iterate over all wireless interfaces
for interface in $(iw dev | awk '/Interface/ {print $2}'); do
  maclist=$(iw dev "$interface" station dump | awk '/Station/ {print $2}')
  # Iterate over all MAC addresses connected to the interface
  for mac in $maclist; do
    # Get IP and hostname from DHCP leases
    lease_data=$(grep "$mac" "$lease_file" | awk '{print $3, $4}')
    ip=$(echo "$lease_data" | awk '{print $1}')
    host=$(echo "$lease_data" | awk '{print $2}')

    [ -z "$ip" ] && ip="UNKN"
    [ -z "$host" ] && host=""

    tgtresult="true"
    if [ -x /usr/bin/cio/getFilterStatus.sh ]; then
        tgt=$(/usr/bin/cio/getFilterStatus.sh "$mac")
        [ "$tgt" = "1" ] && tgtresult="false"
    fi
    JSON="${JSON}{\"a\":\"$ip\",\"b\":\"$mac\",\"c\":\"$tgtresult\",\"d\":\"$host\"},"
  done
done

echo "${JSON%,}"
