#!/bin/sh
# Astound specific plan setting watcher
/usr/bin/cio/astound_fw_update.sh >/tmp/astound_fw.log 2>&1

LAST_PLAN=$(uci -q get system.astound.business)
LAST_INT=$(mwan3 status | sed -n '/mwan_default:/,/^$/p' | grep '(100%)' | awk '{print $1}')
[ -z "$LAST_INT" ] && LAST_INT="wan"
while true
do
    CUR_PLAN=$(uci -q get system.astound.business)
    CUR_INT=$(mwan3 status | sed -n '/mwan_default:/,/^$/p' | grep '(100%)' | awk '{print $1}')    
    if [ -z "$LAST_PLAN" ]; then
        LAST_PLAN="$CUR_PLAN"
    fi
    TRIGGER_UPDATE=0
    # Trigger Condition 1
    if [ "$CUR_PLAN" != "$LAST_PLAN" ]; then
        logger -t ASTOUND "Business mode changed: $LAST_PLAN -> $CUR_PLAN"
        LAST_PLAN="$CUR_PLAN"
        TRIGGER_UPDATE=1
    fi

    # Trigger Condition 2
    if [ -n "$CUR_INT" ]; then
    	if [ "$CUR_INT" != "$LAST_INT" ]; then
        	logger -t ASTOUND "Network interface transition detected: $LAST_INT -> $CUR_INT"
        	LAST_INT="$CUR_INT"
        	TRIGGER_UPDATE=1
    	fi
    fi
    if [ "$TRIGGER_UPDATE" -eq 1 ]; then
        /usr/bin/cio/astound_fw_update.sh >/tmp/astound_fw.log 2>&1
    fi
    sleep 5
done
