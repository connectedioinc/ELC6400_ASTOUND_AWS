inherit vuci-app-api

APP_TITLE = "VuCI UI Support for SNMP application"

RDEPENDS:${PN} += "net-snmp-server-snmpd snmptrap"
