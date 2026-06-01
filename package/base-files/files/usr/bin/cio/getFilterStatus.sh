#!/bin/sh
#Script to get the status of MAC based restriction on router

macA=$1
fl="0"
cfg1=$(echo $1 | sed -e 's/://g')
macList=$(uci -q get firewall.block_$cfg1.src_mac)

if [ ! -z "$macList" -a ! -z "$macA" -a "$macList" == "$macA" ]; then
        fl="1"
fi

echo "$fl"
