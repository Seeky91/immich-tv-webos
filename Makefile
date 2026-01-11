pack:
	npm run pack-p && ares-package dist/ -o ./build/ -n

install:
	ares-install --device lg-tv ./build/*.ipk

launch:
	ares-launch --device lg-tv immich-tv-webos

inspect:
	ares-inspect --device lg-tv immich-tv-webos
