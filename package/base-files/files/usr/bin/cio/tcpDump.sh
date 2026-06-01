#!/bin/sh

case "$1" in
    dataTracking )
        ct=${2:-10}  # Default to 10 files if $2 is not provided
        mac=$(cat /sys/class/net/eth0/address | cut -d: -f4- | sed 's/[:^]//g' | tr 'a-z' 'A-Z')
        timestamp=$(date +'%Y-%m-%d_%H-%M-%S')
        filePath="/etc/dataTrack/Capture_${mac}_${timestamp}.pcap"

        # Run tcpdump with rotating files
        tcpdump -U -i any -G 15 -w "$filePath" -W "$ct" -z gzip &
    ;;

    dataTrackingOff )
        killall tcpdump
    ;;
esac
