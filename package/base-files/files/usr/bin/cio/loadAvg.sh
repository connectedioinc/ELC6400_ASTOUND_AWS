#!/bin/sh
# Get and parse the ouput of cat /proc/loadang

loadAvg=`cat /proc/loadavg`
l1="0"
l2="0"
l3="0"
l4="0"
l5="0"
l6="0"
loadAvgList=""
if [ ! -z "$loadAvg" ]; then
        l1=`echo $loadAvg | cut -d'_' -f 1 | awk '{print $1}'`
        l2=`echo $loadAvg | cut -d'_' -f 2 | awk '{print $2}'`
        l3=`echo $loadAvg | cut -d'_' -f 3 | awk '{print $3}'`
        l4=`echo $loadAvg | cut -d'_' -f 4 | awk '{print $4}'`
        l5=`echo $loadAvg | cut -d'_' -f 5 | awk '{print $5}'`
        # Handle gsmctl -c command safely
        l6=`gsmctl -c`
        l6=$((l6 / 10))
fi
loadAvgList="\"b\":{\"a\":\"$l1\",\"b\":\"$l2\",\"c\":\"$l3\",\"d\":\"$l4\",\"e\":\"$l5\",\"f\":\"$l6\"}"
echo "${loadAvgList}"
