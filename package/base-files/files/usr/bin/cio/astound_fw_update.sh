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
    
    # Define target configurations based on current plan index
    case "$plan" in
        1)
		if uci get firewall.wwanzone.enabled | grep 0; then
                	wan_net=$(uci get firewall.@zone[1].network)
                	wan_net=$(echo "$wan_net" | sed 's: mob1s1a1::g')
                	wan_net=$(echo "$wan_net" | sed 's: mob1s2a1::g')
                	uci set firewall.@zone[1].network="$wan_net"
			uci set firewall.wwanzone.enabled='1'
                	uci set firewall.wwanforward.enabled='0'
                	apply_changes=1			
		elif uci get firewall.wwanzone.enabled | grep 1; then
			ens=`uci get firewall.wwanforward.enabled`
			if [[ "$ens" == "1" ]]; then			
                		uci set firewall.wwanforward.enabled='0'                	
				apply_changes=1
                	fi			
		fi
            ;;
        2)
		if uci get firewall.wwanzone.enabled | grep 0; then
                	wan_net=$(uci get firewall.@zone[1].network)
                	wan_net=$(echo "$wan_net" | sed 's: mob1s1a1::g')
                	wan_net=$(echo "$wan_net" | sed 's: mob1s2a1::g')
                	uci set firewall.@zone[1].network="$wan_net"
			uci set firewall.wwanzone.enabled='1'
			uci set firewall.wwanforward.src='lan'
                	uci set firewall.wwanforward.enabled='1'                	
                	apply_changes=1							
		elif uci get firewall.wwanzone.enabled | grep 1; then
			sce=`uci get firewall.wwanforward.src`
			ens=`uci get firewall.wwanforward.enabled`
			if [[ "$sce" == "lan wifi" || "$ens" == "0" ]]; then
				uci set firewall.wwanforward.src='lan'
                		uci set firewall.wwanforward.enabled='1'                	
                		apply_changes=1							
                	fi				
		fi
            ;;
        0|*)
		 if uci get firewall.wwanzone.enabled | grep 1; then
			wan_net="$(uci get firewall.@zone[1].network) mob1s1a1 mob1s2a1"
			uci set firewall.@zone[1].network="$wan_net"
			uci set firewall.wwanzone.enabled='0'	
                	apply_changes=1							
		fi
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
