#!/bin/sh
cmd="link: port:$1"
portSt=`swconfig dev switch0 show | grep "$cmd"`
status="up"
if [ -z "${portSt##*$status*}" ]; then
    echo "1"
else
    echo "0"
fi
