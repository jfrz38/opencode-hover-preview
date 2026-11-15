.DEFAULT_GOAL := help

BUN ?= bun
PACKAGE_DIRECTORY ?= .artifacts

.PHONY: help
help: ## show make targets
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {sub("\\\\n",sprintf("\n%22c"," "), $$2);printf " \033[36m%-20s\033[0m  %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: install install-frozen
install: ## install dependencies
	$(BUN) install

install-frozen: ## install dependencies from the lockfile without changes
	$(BUN) install --frozen-lockfile

.PHONY: typecheck build
typecheck: ## check TypeScript types
	$(BUN) run typecheck

build: typecheck ## validate the build without emitting artifacts

.PHONY: test package check
test: ## run tests
	$(BUN) test

package: ## create the npm package in PACKAGE_DIRECTORY
	rm -rf "$(PACKAGE_DIRECTORY)"
	mkdir -p "$(PACKAGE_DIRECTORY)"
	$(BUN) pm pack --destination "$(PACKAGE_DIRECTORY)"
	cd "$(PACKAGE_DIRECTORY)" && sha256sum *.tgz > package.sha256

check: build test ## run all project checks
	git diff --check
