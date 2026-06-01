#!/bin/sh
# Astound specific plan setting watcher
/usr/bin/cio/astound_fw_update.sh >/tmp/astound_fw.log 2>&1

LAST=$(uci -q get system.astound.business)
while true
do
    CUR=$(uci -q get system.astound.business)
    # Initialize first run
    if [ -z "$LAST" ]; then
        LAST="$CUR"
    fi
    # Detect change
    if [ "$CUR" != "$LAST" ]; then
        logger -t ASTOUND "Business mode changed: $LAST -> $CUR"
        LAST="$CUR"
        /usr/bin/cio/astound_fw_update.sh >/tmp/astound_fw.log 2>&1
    fi
    sleep 5
done
