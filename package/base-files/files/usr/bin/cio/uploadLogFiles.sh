#!/bin/sh
# Elleco - version 2.0
# Do not run in the first 30 minutes since uptime to avoid race conditions
#For CR42NA

UPT=`cut -d' ' -f1 /proc/uptime`

up_int=${UPT%.*}

# Do not run in the first 30 minutes after reboot to let over the air firmware upgrades finish
if [ $up_int -le 1800 ]; then
    exit 1
fi 

imei=`gsmctl -i`
cloudURL=`uci -q get log_upload.logupload.url`
filePath=`uci -q get log_upload.logupload.filepath`
userId=`uci -q get log_upload.logupload.userId`
if [ -z "$imei" ]; then
    echo "Error: IMEI is empty"
    exit 1
fi

if [ -z "$cloudURL" ]; then
    echo "Error: cloudURL is empty"
    exit 1
fi

if [ -z "$filePath" ]; then
    echo "Error: filePath is empty"
    exit 1
fi

logread > $filePath/syslog.log
dmesg > $filePath/kernellog.log


SYS_LOG="syslog.log"
KERNAL_LOG="kernellog.log"
CIO_LOG="cioClient.log"
DATA_USAGE="mdcollectd.db"
EVENT_LOG="log.db"

type_syslog="syslog"
type_kernallog="kernallog"
type_ciolog="ciolog"
type_datausage="datausage"
type_event="event"
cio_log="/overlay/cioClient.log"
datausage_log="/var/mdcollectd.db"
events_log="/log/log.db"
request_interval=5
max_size=$((5 * 1024 * 1024)) # 5 MB in bytes

create_tar_gz() {
    if [ "$#" -ne 1 ]; then
        echo "Usage: $0 <filename>"
        return 1
    fi
    filename="$1"
    base_name=$(basename "$filename")
    extension="${base_name##*.}"
    if [ ! -e "$filename" ]; then
        return 1
    fi
    if [ ! -f "$filename" ]; then
        return 1
    fi

    file_size=$(ls -l "$filename" | awk '{print $5}')
    if [ "$file_size" -gt "$max_size" ]; then
        echo "Error: File size exceeds 5 MB limit - $filename"
        return 1
    fi

    tar -czf "$filePath/$base_name.tar.gz" "$filename"
    echo "$filePath/$base_name.tar.gz"
}
 
upload(){
    type="$1";
    file_path="$2";
    upload_url="$cloudURL/$imei/$type"
    result=$(curl -o /dev/null -s -w "%{http_code}" -X POST -F "backup=@$file_path" "$upload_url");
    if [ $? -eq 0 ]; then
        return 1
    else
        return 0
    fi
}

uploadNew(){
    type="$1";
    payload="$2";
	fileName="$3";
	result=$(curl -o /dev/null -s -w "%{http_code}" -X POST -F "user_id=$userId" -F "imei=$imei" -F "type=$type" -F "fileName=$fileName" -F "payload=@$payload" "$cloudURL")
    if [ $? -eq 0 ]; then
        return 1
    else
        return 0
    fi
}

fileExists(){
    file_location="$1";
    if [ -e "$file_location" ]; then
        return 1
    else
        return 0
    fi
}

delete_file() {
    file_path="$1"
    if [ -z "$file_path" ]; then
        return 0
    fi

    if [ -e "$file_path" ]; then
        rm "$file_path"
        return 1
    else
        return 0
    fi
}

upload_log(){
    file_path="$1"
    type="$2"
	fileName="$3"
    zip_path=$(create_tar_gz "$file_path")
    exists=$(fileExists $zip_path)
    if [ $? -eq 1 ]; then
        uploadNew "$type" "$zip_path" "$fileName"
        delete_file "$zip_path"
    else
        echo "$type tar not available."
    fi
}

#Uploading system log
upload_log "$filePath/syslog.log" "$type_syslog" "$SYS_LOG"
delete_file "$filePath/syslog.log"

sleep "$request_interval"

#Uploading kernal log
upload_log "$filePath/kernellog.log" "$type_kernallog" "$KERNAL_LOG"
delete_file "$filePath/kernellog.log"

sleep "$request_interval"

#Uploading cio client log
upload_log "$cio_log" "$type_ciolog" "$CIO_LOG"

sleep "$request_interval"

#Uploading data usage log
upload_log "$datausage_log" "$type_datausage" "$DATA_USAGE"

sleep "$request_interval"

#Uploading events log
upload_log "$events_log" "$type_event" "$EVENT_LOG"
