#!/bin/sh 
# Yakov - version 1.2
# Do not start cioClient for the first two and a half minutes to avoid nasty race conditions

UPT=`cut -d' ' -f1 /proc/uptime`

up_int=${UPT%.*}

# Do not run in the first 2 minutes
if [ $up_int -le 150 ]; then
    exit 1
fi 

PROCESS="/bin/cioClient"
if pgrep -x "$PROCESS" >/dev/null
then
    echo "$PROCESS is running"
else
    killall -9 cioClient
    sleep 5
    /bin/cioClient
    echo $$ > /var/run/cioClient.pid
fi
