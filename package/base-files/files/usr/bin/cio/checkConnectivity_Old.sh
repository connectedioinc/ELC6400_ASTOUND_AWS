#!/bin/sh
# Yakov: this script is meant to run on CR42 devices running new SDK and ELC4200 devices
# Version 1.6 
# Clean up network restart in cases where both radio and wired WAN are present, added test_mode
# When test mode is on reboot/restart commands are not executed but only reported to the log file
# Added modem reset and network reset for cases where network connection goes down
# Added verbose mode
# Changed start up delay to 30 minutes from 60 minutes

VERBOSE_MODE="off"

count_retries(){
    COUNT_FILE=/tmp/.modem_offline
    [ -f $COUNT_FILE ] || echo 0 > $COUNT_FILE
    c=$(cat $COUNT_FILE)
    c=$(($c+1))
    echo $c > $COUNT_FILE
    echo $c
}

count_retries_client(){
    COUNT_FILE=/tmp/.client_offline
    [ -f $COUNT_FILE ] || echo 0 > $COUNT_FILE
    c=$(cat $COUNT_FILE)
    c=$(($c+1))
    echo $c > $COUNT_FILE
    echo $c
}


UPT=`cut -d' ' -f1 /proc/uptime`

up_int=${UPT%.*}

# Do not run in the first 30 minutes after reboot to let over the air firmware upgrades finish
if [ $up_int -le 1800 ]; then
    if [ "$VERBOSE_MODE" == "on" ]; then
        echo "`date`: Skipping connectivity check" >> /tmp/check.log
    fi
    exit 1
fi

# Check for connectivity - Cron runs every 10min. - a counter is maintained - reboot is applied at the third attempt.
# Reboot enforced cases (1) Connectivity is there but client is not connected to CIO portal (2) No connectivity and Sim is there in the slot.
# (3) No connectivity - SIM is not responding as "READY"
if ping -q -c 1 -W 1 8.8.8.8 >/dev/null; then
    echo "Online - checkConnectivity.sh"
    srIP=`uci -q get mqtt.@mqtt[0].serverip`
    prod_ip=$(nslookup connector.connectedio.com | grep 'Address 1' | tail -1 | cut -d' ' -f3)
    prod_conn=$(netstat -n | grep ESTABLISHED | grep "$prod_ip")

    if [ ! "$srIP" ]; then
        oth_conn=""
    else
        oth_ip=$(nslookup $srIP | grep 'Address 1' | tail -1 | cut -d' ' -f3)
        oth_conn=$(netstat -n | grep ESTABLISHED | grep "$oth_ip")
    fi

    if [ ! "$prod_conn" -a ! "$oth_conn" ]; then
            counter_clt=$(count_retries_client)
        if [ "$VERBOSE_MODE" == "on" ]; then
            echo "`date`: Reboot code 2" >> /tmp/check.log
        fi
        if [ $counter_clt -ge 3 ]; then
            uci set system.@system[0].rebootFg=2
            uci commit system
            reboot -f
        fi
    fi
    if [ "$VERBOSE_MODE" == "on" ]; then
        echo "`date`: Connectivity detected" >> /tmp/check.log
    fi
else
    counter=$(count_retries)
    if [ $counter -ge 3 ]; then
        if [ "$VERBOSE_MODE" == "on" ]; then
            echo "`date`: Reboot code 1" >> /tmp/check.log
        fi
        uci set system.@system[0].rebootFg=1
        uci commit system
        reboot -f
    else
        if [ "$VERBOSE_MODE" == "on" ]; then
            echo "`date`: Network restart" >> /tmp/check.log
        fi
        gsmctl -Q
        /etc/init.d/network restart
    fi
fi
