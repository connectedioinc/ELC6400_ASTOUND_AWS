#
# Copyright 2025 Teltonika-Networks
#

DESCRIPTION = "WebUI UI Core application build dependencies"
SECTION = "web/ui"

inherit tc-license native

DEPENDS += "nodejs-native jq-native"

FILESEXTRAPATHS:append := "${THISDIR}/../:"

SRC_URI = "\
    file://package.json \
    file://package-lock.json \
"

S = "${WORKDIR}"

# allow fetching in do_compile
do_compile[network] = "1"

# suppress warnings about pre-stripped binaries from npm packages
INSANE_SKIP:${PN} = "already-stripped"

do_compile() {
    npm install --cache="${WORKDIR}/npm_cache"
}

do_install() {
    install -d "${D}${datadir}/vuci"

    cp -r "${B}/node_modules" "${D}${datadir}/vuci"
    install -m 0644 "${B}/package.json" "${D}${datadir}/vuci"
    install -m 0644 "${B}/package-lock.json" "${D}${datadir}/vuci"
}