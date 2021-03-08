# Terrain Ruler

This module makes foundries rulers respect difficult terrain that was put down using the [TerrainLayer module](https://foundryvtt.com/packages/TerrainLayer/). In addition other modules can use this module as a library to easily perform measurements respecting difficult terrain as well.

![A ruler measuring a distance including difficult terrain](https://raw.githubusercontent.com/manuelVo/foundryvtt-terrain-ruler/media/media/measurement_with_difficult_terrain.webp)

## Using this module as a library to measure difficult terrain
*This section is not intended for users of the Terrain Ruler module, but for module authors that want to use difficult terrain as library to easily measure difficult terrain in their module.*

### Switching a ruler to difficult terrain mode
To make any ruler that your module spawns use difficult terrain, you can set the `isTerrainRuler` attribute of that ruler to `true`. This will cause that ruler to measure with respect to difficult terrain.

### Measuring distances via `measureDistances`
Terrain Ruler offers a method for measuring distances with difficult terrain: `game.terrainRuler.measureDistances`. This method will behave exactly the same as `canvas.grid.measureDistances`, but will take difficult terrain in account. In addtion `game.terrainRuler.measureDistances` will modify the rays it gets passed and attach the attribute `terrainRulerVisitedSpaces` to them. This attribute will contain a list of all grid spaces that were visited by the measured path, including the distance measured from the starting space to the listed space.
