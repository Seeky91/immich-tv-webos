VERSION := $(shell node -p "require('./package.json').version")

pack:
	npm run pack-p && ares-package dist/ -o ./build/ -n

install:
	ares-install --device lg-tv ./build/com.seeky91.immichtv_$(VERSION)_all.ipk

launch:
	ares-launch --device lg-tv com.seeky91.immichtv

inspect:
	ares-inspect --device lg-tv com.seeky91.immichtv
