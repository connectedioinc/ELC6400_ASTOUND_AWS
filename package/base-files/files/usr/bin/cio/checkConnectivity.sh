#!/bin/sh

# Script to monitor connectivity and manage MQTT client
VERBOSE_MODE="on"

# Constants
COUNT_FILE_MODEM="/tmp/.modem_offline"
COUNT_FILE_CLIENT="/tmp/.client_offline"
UPTIME_DELAY=1800  # 30 minutes in seconds
PING_TARGET="8.8.8.8"
PING_COUNT=1
PING_TIMEOUT=1
REBOOT_THRESHOLD=3

log_message() {
    if [ "$VERBOSE_MODE" = "on" ]; then
        echo "$(date): $1" >> /tmp/check.log
    fi
}

increment_counter() {
    local count_file=$1
    [ -f "$count_file" ] || echo 0 > "$count_file"
    local count
    count=$(cat "$count_file")
    count=$((count + 1))
    echo "$count" > "$count_file"
    echo "$count"
}

check_and_add_cron_entry() {
    local cron_command="/usr/bin/cio/cioClientStart.sh"
    local cron_entry="*/1 * * * * $cron_command"

    # Check if the cron entry exists
    if crontab -l | grep -q "$cron_command"; then
        log_message "Cron entry for '$cron_command' already exists."
    else
        log_message "Cron entry for '$cron_command' not found. Adding it to crontab."
        # Add the cron entry
        (crontab -l; echo "$cron_entry") | crontab -
        log_message "Cron entry '$cron_command' added successfully."
    fi
}

# Check uptime to allow over-the-air firmware upgrades after reboot
current_uptime=$(cut -d' ' -f1 /proc/uptime | cut -d'.' -f1)
if [ "$current_uptime" -le "$UPTIME_DELAY" ]; then
    log_message "Skipping connectivity check due to initial delay."
    exit 1
fi

check_and_add_cron_entry

# Check connectivity using ping
if ping -q -c "$PING_COUNT" -W "$PING_TIMEOUT" "$PING_TARGET" > /dev/null 2>&1; then
    log_message "System is online."
    
    mqtt_server_ip=$(uci -q get mqtt.@mqtt[0].serverip)
    prod_ip=$(nslookup connector.connectedio.com | awk '/Address 1/{print $NF}' | tail -n 1)
    prod_conn=$(netstat -n | grep ESTABLISHED | grep "$prod_ip")

    if [ "$mqtt_server_ip" ]; then
        other_ip=$(nslookup "$mqtt_server_ip" | awk '/Address 1/{print $NF}' | tail -n 1)
        other_conn=$(netstat -n | grep ESTABLISHED | grep "$other_ip")
    else
        other_conn=""
    fi

    if [ -z "$prod_conn" ] && [ -z "$other_conn" ]; then
        client_retry_count=$(increment_counter "$COUNT_FILE_CLIENT")
        log_message "No active connections. Client retry count: $client_retry_count"

        if [ "$client_retry_count" -ge "$REBOOT_THRESHOLD" ]; then
            log_message "Killing MQTT client due to repeated failures."
            killall -9 cioClient
        fi
    else
        log_message "Connectivity established with server."
    fi
else
    log_message "No internet connectivity detected."
fi
