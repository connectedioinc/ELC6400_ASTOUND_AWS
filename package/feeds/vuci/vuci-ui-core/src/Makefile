NODE ?= node
NPM ?= npm
CP ?= cp
LN ?= ln
RM ?= rm
MKDIR ?= mkdir
DL_DIR ?=

all: install-only build-only

ifdef DL_DIR

define setup_node_modules
	$(MKDIR) -p "$(DL_DIR)/node_modules"
	$(CP) -f "$(CURDIR)/"package*.json "$(DL_DIR)"
	@$(NPM) install --prefix "$(DL_DIR)"
endef

$(DL_DIR)/node_modules:
	$(call setup_node_modules)

install-only:
	$(call setup_node_modules)

build-only: $(DL_DIR)/node_modules
	$(RM) -rf "$(CURDIR)/node_modules"
	$(LN) -s "$(DL_DIR)/node_modules" "$(CURDIR)/node_modules"
	@$(NPM) run build-only

else

define setup_node_modules
	$(RM) -rf "$(CURDIR)/node_modules"
	@$(NPM) install
endef

$(CURDIR)/node_modules:
	$(call setup_node_modules)

install-only:
	$(call setup_node_modules)

build-only: $(CURDIR)/node_modules
	@$(NPM) run build-only

endif
