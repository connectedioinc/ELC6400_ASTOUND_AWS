#
# Copyright 2025 Teltonika-Networks
#

DESCRIPTION = "WebUI UI Core application"
SECTION = "web/ui"

PR="r1"

inherit tc-license

DEPENDS += "vuci-ui-deps-native"
MENU_JSON_EXT = ""
MENU_JSON_EXT:tapos = ".tap"
MENU_JSON_EXT:tswos = ".tsw"

FILESEXTRAPATHS:append := "${THISDIR}:${THISDIR}/../:"

# automatically include all files in src directory
def get_src_files(d, d_name, base_path=""):
    import os

    files = []

    if base_path:
        src_dir = os.path.join(d.getVar('THISDIR'), base_path, d_name)
    else:
        src_dir = os.path.join(d.getVar('THISDIR'), d_name)

    if os.path.exists(src_dir):
        for root, dirs, file_list in os.walk(src_dir):
            for file in file_list:
                rel_path = os.path.relpath(os.path.join(root, file), src_dir)
                files.append(f"file://{d_name}/{rel_path}")

    return ' '.join(files)

SRC_URI = "\
    ${@get_src_files(d, 'src', '')} \
    ${@get_src_files(d, 'build', '..')} \
    ${@get_src_files(d, 'applications', '..')} \
    ${@get_src_files(d, 'tsconfigs', '..')} \
    file://tsconfig.json \
    file://.env \
    file://cypress.config.ts \
    file://gpl.vite.config.js \
    file://vite.config.ts \
    file://vite.base.config.ts \
    file://vite.storybook.config.ts \
    file://vitest.config.ts \
    file://vuci.config.json \
    file://menu_static.sh \
"

S = "${WORKDIR}"

# include everything under /www
FILES:${PN} += "\
    /www \
    ${datadir}/vuci/menu.d \
"

# set-up runtime depends
RDEPENDS:${PN} += "api-core"

# get a list of packages either built-in or external
def get_vuci_ui_packages(d, external=False):
    ui_pkgs = set()

    distro_features = (d.getVar('DISTRO_FEATURES') or "").split()
    external_features = (d.getVar('EXTERNAL_FEATURES') or "").split()

    for var in d.keys():
        if var.startswith('FEATURE_PACKAGES_'):
            feature = var.replace('FEATURE_PACKAGES_', '')
            pkgs = (d.getVar(var) or "").split()

            ui_pkgs_in_feature = {pkg for pkg in pkgs
                                if pkg.startswith('vuci-app-') and pkg.endswith('-ui')}

            if external and feature in external_features:
                ui_pkgs.update(ui_pkgs_in_feature)
            elif not external and feature in distro_features and feature not in external_features:
                ui_pkgs.update(ui_pkgs_in_feature)

    return ' '.join(sorted(ui_pkgs))

VUCI_APPS="${@get_vuci_ui_packages(d, external=False)}"

# set-up npm env: use node_modules, package.json and package-lock.json from deps
# prepare vuci-ui-core directory with src directory
python do_unpack:append() {
    import os
    import shutil

    workdir = d.getVar('WORKDIR')
    staging_dir = d.getVar('STAGING_DIR_NATIVE')
    datadir = d.getVar('datadir')

    vuci_deps_path = os.path.join(staging_dir + datadir, 'vuci')
    src_path = os.path.join(workdir, 'src')
    vuci_core_path = os.path.join(workdir, 'vuci-ui-core')
    vuci_core_src_path = os.path.join(vuci_core_path, 'src')

    # create vuci-ui-core directory
    os.makedirs(vuci_core_path, exist_ok=True)

    # move src directory into vuci-ui-core/src
    if os.path.exists(src_path):
        if os.path.exists(vuci_core_src_path):
            shutil.rmtree(vuci_core_src_path)
        shutil.move(src_path, vuci_core_src_path)
        bb.note(f"Moved {src_path} to {vuci_core_path}")
    else:
        bb.warn("{src_path} directory not found in WORKDIR")

    # create symlinks for dependencies from vuci-ui-deps-native
    deps_files = ['package.json', 'package-lock.json', 'node_modules']

    for dep_file in deps_files:
        src_file_path = os.path.join(vuci_deps_path, dep_file)
        dest_file_path = os.path.join(workdir, dep_file)

        # clean up existing symlinks
        if os.path.exists(dest_file_path) or os.path.islink(dest_file_path):
            if os.path.isdir(dest_file_path) and not os.path.islink(dest_file_path):
                shutil.rmtree(dest_file_path)
            else:
                os.unlink(dest_file_path)

        # create symlink
        if os.path.exists(src_file_path):
            os.symlink(src_file_path, dest_file_path)
            bb.note(f"Created symlink: {dep_file}")
        else:
            bb.warn(f"Missing dependency: {dep_file}")
}

do_unpack[depends] += "vuci-ui-deps-native:do_populate_sysroot"

do_configure() {
    sed -i '/^VUCI_\(APPS\|PLUGINS\|BUILD_HASH\)=/d' "${B}/.env"

    PKG_VERSION="$(git log -1 --pretty='%ci %h' | awk '{ print $1 "-" $4 }')"

    {
        echo "VUCI_APPS=${VUCI_APPS}"
        echo "VUCI_PLUGINS=${@get_vuci_ui_packages(d, external=True)}"
        echo "VUCI_BUILD_HASH=${PKG_VERSION}"
    } >> "${B}/.env"
}

do_compile() {
    MENU_PATH="${B}/applications/menu.d"

    mkdir -p "${MENU_PATH}"

    menu_apps="$(find \
        $(for app in ${VUCI_APPS}; do echo "${B}/applications/${app%-ui}/${app}"; done) \
            -name menu.d \
            -path "*/files/usr/share/vuci/*" \
            -type d)"

    for app_path in ${menu_apps}; do
        files=$(find "$app_path" -type f -name "*${MENU_JSON_EXT}.json")
        if [ -n "$files" ]; then
            find "$app_path" -type f -name "*${MENU_JSON_EXT}.json" -exec cp -a --no-preserve=ownership {} "$MENU_PATH/" \;
        else
            find "$app_path" -type f -name "*.json" ! -name "*.*.json" -exec cp -a --no-preserve=ownership {} "$MENU_PATH/" \;
        fi
    done
    "${B}/menu_static.sh" "${B}/menu.json" "${MENU_PATH}"
    npm run build-only
}

do_install() {
    mkdir -p "${D}/www" "${D}${datadir}/vuci/menu.d"

    cp -a --no-preserve=ownership "${B}/vuci-ui-core/src/dist/www/." "${D}/www"

    install -Dm 0644 "${B}/menu.json" "${D}${datadir}/vuci/menu.d"

    # todo: copy modem-icons by device name
    # todo: run minify json
}
