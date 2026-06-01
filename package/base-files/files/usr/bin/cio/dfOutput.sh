#!/bin/sh
# Parse the output of df command and format it as JSON

dfJson=""
dfList=$(df | tail -n +2)

if [ -n "$dfList" ]; then
    while read -r line; do
        # Use awk to extract values efficiently
        ap=$(echo "$line" | awk '{print $1}')
        bp=$(echo "$line" | awk '{print $2}')
        cp=$(echo "$line" | awk '{print $3}')
        dp=$(echo "$line" | awk '{print $4}')
        ep=$(echo "$line" | awk '{print $5}' | tr -d '%')  # Remove percentage sign
        fp=$(echo "$line" | awk '{print $6}')

        # Format JSON entry
        dfListEach="{\"a\":\"$ap\",\"b\":\"$bp\",\"c\":\"$cp\",\"d\":\"$dp\",\"e\":\"$ep\",\"f\":\"$fp\"},"
        dfJson="${dfJson}${dfListEach}"
    done <<EOF
$dfList
EOF

    # Remove trailing comma and format final JSON output
    dfJson="\"b\":[${dfJson%,}]"
    echo "$dfJson"
fi
