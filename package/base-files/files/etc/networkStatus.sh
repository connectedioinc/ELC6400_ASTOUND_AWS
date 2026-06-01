#!/bin/sh
# Returns the status of router ports

. /lib/functions/network.sh

status=0
ipWAN=""

case "$1" in
    "br-lan")
        stL1=`/etc/portstatus.sh 2`
        stL2=`/etc/portstatus.sh 3`
        stL3=`/etc/portstatus.sh 4`
        if [[ "$stL1" == "1" || "$stL2" == "1" || "$stL3" == "1" ]]; then
                status=1
        fi
        ;;
    "eth1" | "br-wan")
	# Check the physical carrier of the underlying hardware (eth1)
    	if [ -f /sys/class/net/eth1/carrier ] && [ "$(cat /sys/class/net/eth1/carrier)" = "1" ]; then
        	status=1
    	fi
        ;;
esac

echo "$status"
