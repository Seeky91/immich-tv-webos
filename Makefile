pack:
	npm run pack-p && ares-package dist/ -o ./build/ -n

install:
	ares-install --device lg-tv ./build/*.ipk

launch:
	ares-launch --device lg-tv com.seeky91.immichtv

inspect:
	ares-inspect --device lg-tv com.seeky91.immichtv
