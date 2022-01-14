## 1.6.0
### New features
- When measuring with difficult terrain, the terrain layer will now be shown (if the "Show on Drag" setting is enabled in Enhanced Terrain Layer)
- There is now a setting that allows to configure the default state of the terrain ruler toggle after joining a game (possible options: on, off, remember last)
- The Terrain Ruler toggle can now be bound to a key

### Game Systems
- Terrain Ruler now supports the measuring style of "Legend of the Five Rings 5e"

### Compatibility
- Drag Ruler now utilizes libwrapper


## 1.5.1
### Compatibility
- Terrain Ruler is now compatible with Foundry v9

### Translation
- Added french translation (thanks to Elfenduil)


## 1.5.0
### API changes
- There is now an API endpoint for pinpointing the pixel coordinates of given distances along a measured path


## 1.4.0
### API changes
- Measurement options are now passed to the cost function to allow for finer grained control over enhanced terrain layer's behavior (thanks to Michael Clavell!)


## 1.3.2
### Compatibility
- Terrain Ruler is now compatible with 0.8.8


## 1.3.1
### Compatibility
- Terrian Ruler is now compatible with 0.8.6
- Support for the old `TerrainLayer` module has been dropped, as that module has been confirmed to not receive updates for 0.8 compatibility. From now on only `Enhanced Terrain Layer` is supported. That module will now be tagged as a dependency.
- This version drops support for foundry 0.7, to prevent users of the `TerrainLayer` module from updating accidentaly and loosing the `TerrainLayer` support.


## 1.3.0
### New features
- Measuring difficult terrain on gridless maps is now supported ([#11](https://github.com/manuelVo/foundryvtt-terrain-ruler/issues/11))

### API changes
- Terrain ruler now exposes it's internal state to allow to continue measurements over multiple `measureDistance` calls

### Translation
- Added german translation (thanks CarnVanBeck!)



## 1.2.5
### Other
- The deprecation warning in the console now correctly refers to `game.terrainRuler` instead of `game.terrianLayer`.


## 1.2.4
### API changes
- Terrain Ruler's API now is just called `terrainRuler` instead of `game.terrainRuler`. `game.terrainRuler` will continue to work until the next major release.
- `terrainRuler.getCost` now accepts options that will be passed to the active terrain layer module, if supported.


## 1.2.3
### Compatibility
- Terrain Ruler can now work together with the [Enhanced Terrain Layer module](https://foundryvtt.com/packages/enhanced-terrain-layer). The original TerrainLayer module will stay supported for now as well. ([#7](https://github.com/manuelVo/foundryvtt-terrain-ruler/issues/7))


## 1.2.2
### Compatibility
- Terrain Ruler is now compatible with Hex Token Size Support. For compatibility Hex Token Size Support Version 0.5.5 or higher is required. Thanks to Ourobor for helping making this possible.


## 1.2.1
### Bugfixes
- Fixed a bug that made the ruler look broken on gridless maps if Terrain Ruler is installed ([#4](https://github.com/manuelVo/foundryvtt-terrain-ruler/issues/4))


## 1.2.0
### New features
- Now provides a more accurate path on square grids if measurement isn't done from grid center to grid center (doing this is only possible via other modules that use this module's API)

## 1.1.0
### Game Systems
- Add support for the Pathfinder 2e way of measuring diagonal cost over difficult terrain

### Other
- Changes that allow Drag Ruler to better integrate Terrain Ruler


## 1.0.1
### Bugfixes
- Terrain Ruler no longer blocks other tools ([#3](https://github.com/manuelVo/foundryvtt-terrain-ruler/issues/3))

## 1.0.0
Initial release
