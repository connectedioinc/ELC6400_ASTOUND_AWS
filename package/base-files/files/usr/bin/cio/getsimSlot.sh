#!/bin/sh
#Returns active sim slot

get_sim_state() {
	ubus call network.interface.2_1 status 2>/dev/null | grep -q '"up": true' && echo "READY" || echo "NOT READY"
}

get_sim_slot() {
	slot_state=$(get_sim_state)
	if [ "$slot_state" = "READY" ]; then
        	# Run AT command to check the active SIM slot
        	SIM_SLOT=$(at.sh AT+QUIMSLOT? 2>/dev/null)
        	# Check for slot 1
        	if echo "$SIM_SLOT" | grep -q '1'; then
                	echo "1"
        	# Check for slot 2
        	elif echo "$SIM_SLOT" | grep -q '2'; then
                	echo "2"
        	# If neither slot 1 nor slot 2 is detected
        	else
                	echo "0"
        	fi
        else
        	echo "0"
        fi
}
get_sim_slot
