#!/bin/sh

# 1. Identify which SIM is primary in config
P0=$(uci get simcard.@sim[0].primary)
if [ "$P0" = "1" ]; then
    CURR=0; NEXT=1; NEXT_POS=2
else
    CURR=1; NEXT=0; NEXT_POS=1
fi
echo "Switching to Slot $NEXT_POS..."
# 2. Update the config
uci delete simcard.@sim[$CURR].primary
uci set simcard.@sim[$NEXT].primary='1'
uci commit simcard
# 3. Apply changes via 'mobifd' 
/etc/init.d/mobifd restart
# 4. Restart cioClient
/etc/init.d/cioClient restart
