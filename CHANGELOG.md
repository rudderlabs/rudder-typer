# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.5.3](https://github.com/rudderlabs/rudder-typer/compare/v1.5.2...v1.5.3) (2025-03-13)


### Bug Fixes

* improve error message for failure ([#148](https://github.com/rudderlabs/rudder-typer/issues/148)) ([9eb6643](https://github.com/rudderlabs/rudder-typer/commit/9eb66437dd9afeb9b2cd2b566513133184a74f6d))
* remove prefix from property name ([#144](https://github.com/rudderlabs/rudder-typer/issues/144)) ([be2c393](https://github.com/rudderlabs/rudder-typer/commit/be2c3938da22d5f66bbdfe77280382e4ac28e9c9))

### [1.5.2](https://github.com/rudderlabs/rudder-typer/compare/v1.5.1...v1.5.2) (2025-03-04)

### [1.5.1](https://github.com/rudderlabs/rudder-typer/compare/v1.5.0...v1.5.1) (2025-02-25)


### Bug Fixes

* upgrade prettier from 3.3.3 to 3.4.2 ([#126](https://github.com/rudderlabs/rudder-typer/issues/126)) ([5491920](https://github.com/rudderlabs/rudder-typer/commit/5491920e210aeaf1ac6e3b740691ec18731786d3))

## [1.5.0](https://github.com/rudderlabs/rudder-typer/compare/v1.4.0...v1.5.0) (2025-02-14)


### Features

* add enum support for swift language iOS ([#129](https://github.com/rudderlabs/rudder-typer/issues/129)) ([cfd1121](https://github.com/rudderlabs/rudder-typer/commit/cfd11219b45f790006dc3e66933f83954a030a42))


### Bug Fixes

* tracking-plan v2 events fetch paginated ([#132](https://github.com/rudderlabs/rudder-typer/issues/132)) ([0a995c1](https://github.com/rudderlabs/rudder-typer/commit/0a995c139f8929369f3c801cab8c5b852db83873))

## [1.4.0](https://github.com/rudderlabs/rudder-typer/compare/v1.3.2...v1.4.0) (2025-01-23)


### Features

* include parameter details in Swift docstrings ([#118](https://github.com/rudderlabs/rudder-typer/issues/118)) ([5fdfa31](https://github.com/rudderlabs/rudder-typer/commit/5fdfa31b1a1497a552c9f19c48fe006da23f07eb))
* take scripts and client from tp level if exist or root level scripts ([#117](https://github.com/rudderlabs/rudder-typer/issues/117)) ([456921d](https://github.com/rudderlabs/rudder-typer/commit/456921db50c8b64e34eba26944d60e66ed67dd14))


### Bug Fixes

* android null exception ([#120](https://github.com/rudderlabs/rudder-typer/issues/120)) ([e40b595](https://github.com/rudderlabs/rudder-typer/commit/e40b59586d51f30022e1768c1930b0ac7fa1d89b))
* make field enum namespaced ([#119](https://github.com/rudderlabs/rudder-typer/issues/119)) ([06a1eb9](https://github.com/rudderlabs/rudder-typer/commit/06a1eb915b3fa1dfd07d41015b06af31179011ce))
* upgrade @rudderstack/rudder-sdk-node from 2.0.10 to 2.1.1 ([#89](https://github.com/rudderlabs/rudder-typer/issues/89)) ([8f64db9](https://github.com/rudderlabs/rudder-typer/commit/8f64db96f463685ccaa68d60dc8753312baf6bd5))

### [1.3.2](https://github.com/rudderlabs/rudder-typer/compare/v1.3.1...v1.3.2) (2025-01-10)


### Bug Fixes

* add nested prop for array type any and enum for union ([#110](https://github.com/rudderlabs/rudder-typer/issues/110)) ([55c22c1](https://github.com/rudderlabs/rudder-typer/commit/55c22c1ca8173d805e5fa08b85d8cbbdb28f84e8))
* enum insertion for android sdk ([#112](https://github.com/rudderlabs/rudder-typer/issues/112)) ([dfa0942](https://github.com/rudderlabs/rudder-typer/commit/dfa09426e83eb070dbc06a9418b7e99af722b32a))
* sanitize enum key ([#107](https://github.com/rudderlabs/rudder-typer/issues/107)) ([97b1d11](https://github.com/rudderlabs/rudder-typer/commit/97b1d116b1d539d007ebb364bcb866d29544b353))

### [1.3.1](https://github.com/rudderlabs/rudder-typer/compare/v1.3.0...v1.3.1) (2024-12-16)


### Bug Fixes

* handle enum names ([#94](https://github.com/rudderlabs/rudder-typer/issues/94)) ([6ef8b8f](https://github.com/rudderlabs/rudder-typer/commit/6ef8b8fd6b8a9e2eee9e3d5873d48dbf1b95a0d9))
* use with instead of assert as per latest node version ([#95](https://github.com/rudderlabs/rudder-typer/issues/95)) ([babc2b7](https://github.com/rudderlabs/rudder-typer/commit/babc2b7b2b6d7ce31bf1d0c7e10a9b2aae544e15))

## [1.3.0](https://github.com/rudderlabs/rudder-typer/compare/v1.2.0...v1.3.0) (2024-11-22)


### Features

* add support for non track event for js and node sdk ([#80](https://github.com/rudderlabs/rudder-typer/issues/80)) ([97d496f](https://github.com/rudderlabs/rudder-typer/commit/97d496f628ddc788e8d509e9c11e06ce268356be))


### Bug Fixes

* import assertion error ([#83](https://github.com/rudderlabs/rudder-typer/issues/83)) ([a1bed21](https://github.com/rudderlabs/rudder-typer/commit/a1bed2135d2f18fe2f933bc1d7f2a294d1af55c8))
* update readme and schema validation for version ([#84](https://github.com/rudderlabs/rudder-typer/issues/84)) ([28ff1aa](https://github.com/rudderlabs/rudder-typer/commit/28ff1aa7ecfc524f8c29d27d88cef917e49856f7))
* update sample apps for context - integrations to true ([#85](https://github.com/rudderlabs/rudder-typer/issues/85)) ([8274a2d](https://github.com/rudderlabs/rudder-typer/commit/8274a2dbaa80ab01ac7452bed128ef89689aacdf))

## [1.2.0](https://github.com/rudderlabs/rudder-typer/compare/v1.1.0...v1.2.0) (2024-10-15)


### Features

* add enum support for android ([#69](https://github.com/rudderlabs/rudder-typer/issues/69)) ([c40e69b](https://github.com/rudderlabs/rudder-typer/commit/c40e69b60daadef4f6baba0cbe8a58e15054348b))


### Bug Fixes

* upgrade @rudderstack/rudder-sdk-node from 2.0.9 to 2.0.10 ([#73](https://github.com/rudderlabs/rudder-typer/issues/73)) ([9b9fe62](https://github.com/rudderlabs/rudder-typer/commit/9b9fe621a87f9ca145c9432a4e6e1beb9cf3073f))

## [1.1.0](https://github.com/rudderlabs/rudder-typer/compare/v1.0.0...v1.1.0) (2024-09-30)


### Features

* add named enum for javascript ([#71](https://github.com/rudderlabs/rudder-typer/issues/71)) ([58d6894](https://github.com/rudderlabs/rudder-typer/commit/58d6894ab244f9d1ed640445b802e39bf88ecd6b))

## [1.0.0](https://github.com/rudderlabs/rudder-typer/compare/v1.0.0-beta.8...v1.0.0) (2024-09-12)


### Features

* add changelog during release ([#61](https://github.com/rudderlabs/rudder-typer/issues/61)) ([32b31ef](https://github.com/rudderlabs/rudder-typer/commit/32b31efeaab94deb58ea61356644cb517592012d))
* add enum support for js, ts  ([#60](https://github.com/rudderlabs/rudder-typer/issues/60)) ([ef40300](https://github.com/rudderlabs/rudder-typer/commit/ef403008ad638265ba505b74aec99d96b7cca8c8))
* add version and mode support for init ([#49](https://github.com/rudderlabs/rudder-typer/pull/49)) ([d8af9f9](https://github.com/rudderlabs/rudder-typer/commit/d8af9f977caac9c5932f565a0e13fd42d10231bc))


### Bug Fixes

* type generation with direct import from packages ([#63](https://github.com/rudderlabs/rudder-typer/issues/63)) ([b4c68c2](https://github.com/rudderlabs/rudder-typer/commit/b4c68c29d8dec1b50067c0ad6c878d819974392d))
* version as per master ([#48](https://github.com/rudderlabs/rudder-typer/pull/48)) ([f837951](https://github.com/rudderlabs/rudder-typer/commit/f8379514725366d0e3c4fab03f204662c8e10679))
