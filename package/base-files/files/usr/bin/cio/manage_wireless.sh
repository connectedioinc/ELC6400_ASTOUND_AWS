#!/bin/sh

ACTION="$1"
shift

if [ -z "$ACTION" ]; then
    echo "Error: Action is required."
    echo "Usage: $0 set [network] [device] [ssid] [mode] [encryption] [key] [disabled] [hidden]"
    echo "       $0 update <name> [network] [device] [ssid] [mode] [encryption] [key] [disabled] [hidden]"
    echo "       $0 delete <name>"
    echo "       $0 status"
    exit 1
fi

if [ "$ACTION" = "status" ]; then
    if command -v jsonfilter >/dev/null 2>&1; then
        ubus call uci get '{"config": "wireless"}'
    else
        ubus call uci get '{"config": "wireless"}'
    fi
    exit 0
fi

if [ "$ACTION" = "set" ]; then
    NETWORK="$1"
    DEVICE="$2"
    SSID="$3"
    MODE="$4"
    ENCRYPTION="$5"
    KEY="$6"
    DISABLED="$7"
    HIDDEN="$8"

    # Find the highest existing numeric id
    MAX_ID=0
    for section in $(uci show wireless | cut -d'.' -f2 | sort -u); do
        case "$section" in
            ''*[!0-9]*) ;; # Skip non-numeric sections
            *)
                if [ "$section" -gt "$MAX_ID" ]; then
                    MAX_ID="$section"
                fi
                ;;
        esac
    done
    
    NAME=$((MAX_ID + 1))

    echo "Creating new wifi-iface section '$NAME'"
    uci set wireless."$NAME"="wifi-iface"
elif [ "$ACTION" = "update" ]; then
    NAME="$1"
    shift
    NETWORK="$1"
    DEVICE="$2"
    SSID="$3"
    MODE="$4"
    ENCRYPTION="$5"
    KEY="$6"
    DISABLED="$7"
    HIDDEN="$8"

    if [ -z "$NAME" ]; then
        echo "Error: Interface name is required for update."
        echo "Usage: $0 update <name> [network] [device] [ssid] [mode] [encryption] [key] [disabled] [hidden]"
        exit 1
    fi

    if ! uci get wireless."$NAME" >/dev/null 2>&1; then
        echo "Error: Interface '$NAME' does not exist. Use 'set' to create a new one."
        exit 1
    fi

    echo "Updating existing wifi-iface section '$NAME'"

elif [ "$ACTION" = "delete" ]; then
    NAME="$1"
    if [ -z "$NAME" ]; then
        echo "Error: Interface name is required for deletion."
        echo "Usage: $0 delete <name>"
        exit 1
    fi

    if uci get wireless."$NAME" >/dev/null 2>&1; then
        echo "Deleting interface section '$NAME'"
        uci delete wireless."$NAME"
        uci commit wireless
        wifi reload
        echo "Interface deleted and changes applied successfully."
        exit 0
    else
        echo "Warning: Interface '$NAME' does not exist, nothing to delete."
        exit 0
    fi
else
    echo "Error: Unknown action '$ACTION'. Use 'set', 'update', 'delete', or 'status'."
    exit 1
fi

# Apply parameters safely for both 'set' and 'update' actions
[ -n "$NETWORK" ]    && uci set wireless."$NAME".network="$NETWORK"
[ -n "$DEVICE" ]     && uci set wireless."$NAME".device="$DEVICE"
[ -n "$SSID" ]       && uci set wireless."$NAME".ssid="$SSID"
[ -n "$MODE" ]       && uci set wireless."$NAME".mode="$MODE"
[ -n "$ENCRYPTION" ] && uci set wireless."$NAME".encryption="$ENCRYPTION"
[ -n "$KEY" ]        && uci set wireless."$NAME".key="$KEY"
[ -n "$DISABLED" ]   && uci set wireless."$NAME".disabled="$DISABLED"
[ -n "$HIDDEN" ]     && uci set wireless."$NAME".hidden="$HIDDEN"

# Commit changes and reload wireless
uci commit wireless
wifi reload
echo "Changes committed and wireless reloaded successfully for interface '$NAME'."
