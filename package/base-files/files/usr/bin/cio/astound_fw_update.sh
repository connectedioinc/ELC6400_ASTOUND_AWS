#!/bin/sh
# Astound specific plan setter
 
# Initialize defaults if they do not exist
init_configs() {
    local fw_changed=0

    if ! uci -q get firewall.wwanzone >/dev/null; then
        uci set firewall.wwanzone=zone
        uci set firewall.wwanzone.name='wwan'
        uci set firewall.wwanzone.INPUT='REJECT'
        uci set firewall.wwanzone.OUTPUT='ACCEPT'
        uci set firewall.wwanzone.FORWARD='REJECT'
        uci set firewall.wwanzone.masq='1'
        uci set firewall.wwanzone.mtu_fix='1'
        uci set firewall.wwanzone.network='mob1s1a1 mob1s2a1'
        uci set firewall.wwanzone.enabled='0'
        fw_changed=1
    fi

    if ! uci -q get firewall.wwanforward >/dev/null; then
        uci set firewall.wwanforward=forwarding
        uci set firewall.wwanforward.src='lan wifi'
        uci set firewall.wwanforward.dest='wwan'
        uci set firewall.wwanforward.enabled='0'
        fw_changed=1
    fi

    if [ "$fw_changed" = "1" ]; then
        uci commit firewall
    fi

    if ! uci -q get system.astound.business >/dev/null; then
        uci set system.astound=plans
        uci set system.astound.business='0'
        uci commit system
    fi
}

# Logic to adjust system configurations 
apply_plan_logic() {
    local plan=$(uci -q get system.astound.business)
    [ -z "$plan" ] && plan="0"
    
    # State verification 
    local apply_changes=0

    WIFI_FWD=""
    LAN_FWD=""
    i=0
    while uci -q get firewall.@forwarding[$i] >/dev/null 2>&1
    do
    	SRC=$(uci -q get firewall.@forwarding[$i].src)
    	DEST=$(uci -q get firewall.@forwarding[$i].dest)
    	# Find Wifi to WAN forwarding index
    	if [ "$SRC" = "wifi" ] && [ "$DEST" = "wan" ]; then
        	WIFI_FWD=$i
    	fi
    	# Find LAN to WAN forwarding index
    	if [ "$SRC" = "lan" ] && [ "$DEST" = "wan" ]; then
        	LAN_FWD=$i
    	fi
    	# If both indexes are found
    	if [ -n "$WIFI_FWD" ] && [ -n "$LAN_FWD" ]; then
        	break
    	fi
    	i=$((i+1))
    done    
    # Define target configurations based on current plan index
    case "$plan" in
    1)
        CUR_WIFI=$(uci -q get firewall.@forwarding[$WIFI_FWD].enabled)
        CUR_LAN=$(uci -q get firewall.@forwarding[$LAN_FWD].enabled)
	[ -z "$CUR_WIFI" ] && CUR_WIFI="1"	
	[ -z "$CUR_LAN" ] && CUR_LAN="1"        
        [ "$CUR_WIFI" != "0" ] && {
            uci set firewall.@forwarding[$WIFI_FWD].enabled='0'
            apply_changes=1
        }
        [ "$CUR_LAN" != "0" ] && {
            uci set firewall.@forwarding[$LAN_FWD].enabled='0'
            apply_changes=1
        }
        ;;
    2)
	PRIORITY_INT=$(mwan3 status | sed -n '/mwan_default:/,/^$/p' | grep '(100%)' | awk '{print $1}')
	if [ -n "$PRIORITY_INT" ]; then
		if [ "$PRIORITY_INT" = "mob1s1a1" ] || [ "$PRIORITY_INT" = "mob1s2a1" ]; then
			CUR_WIFI=$(uci -q get firewall.@forwarding[$WIFI_FWD].enabled)
			[ -z "$CUR_WIFI" ] && CUR_WIFI="1"

			# Disable WiFi forwarding if it isn't already disabled
			if [ "$CUR_WIFI" != "0" ]; then
				uci set firewall.@forwarding[$WIFI_FWD].enabled='0'
				apply_changes=1
			fi
		else
			# INTERNET IS RUNNING THROUGH WIRED WAN		
			CUR_WIFI=$(uci -q get firewall.@forwarding[$WIFI_FWD].enabled)
			[ -z "$CUR_WIFI" ] && CUR_WIFI="1"
			if [ "$CUR_WIFI" != "1" ]; then
				uci set firewall.@forwarding[$WIFI_FWD].enabled='1'
				apply_changes=1
			fi
		fi
	else
            logger -t ASTOUND "mwan3 returned an empty active interface status"
        fi
	# Always ensure LAN forwarding remains enabled
	CUR_LAN=$(uci -q get firewall.@forwarding[$LAN_FWD].enabled)
	[ -z "$CUR_LAN" ] && CUR_LAN="1"
	if [ "$CUR_LAN" != "1" ]; then
		uci set firewall.@forwarding[$LAN_FWD].enabled='1'
		apply_changes=1
	fi
	;;
    0|*)
        CUR_WIFI=$(uci -q get firewall.@forwarding[$WIFI_FWD].enabled)
        CUR_LAN=$(uci -q get firewall.@forwarding[$LAN_FWD].enabled)
	[ -z "$CUR_WIFI" ] && CUR_WIFI="1"	
	[ -z "$CUR_LAN" ] && CUR_LAN="1"
        [ "$CUR_WIFI" != "1" ] && {
            uci set firewall.@forwarding[$WIFI_FWD].enabled='1'
            apply_changes=1
        }
        [ "$CUR_LAN" != "1" ] && {
            uci set firewall.@forwarding[$LAN_FWD].enabled='1'
            apply_changes=1
        }
        ;;
    esac

    # Trigger system adjustments 
    if [ "$apply_changes" = "1" ]; then
        logger -t astd_plan_adjuster "Astound plan configuration transition detected ($plan). Updating firewall rules."
        uci commit firewall        
        # Reloading the firewall applies zone interface mappings instantly.
        /etc/init.d/firewall reload
    fi
}
# Call functions
init_configs
apply_plan_logic
