VERSION = $(shell node -p "require('./package.json').version")


changelog:
	@echo "Updating changelog..."
	@git-cliff --unreleased --tag v$(VERSION) --prepend changelog.md

format:
	@echo "Formatting files..."
	@npx eslint .
