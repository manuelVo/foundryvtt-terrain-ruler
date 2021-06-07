[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/staebchenfisch)

# Terrain Ruler

This module makes Foundry's rulers respect difficult terrain that was put down using the [Enhanced Terrain Layer module](https://foundryvtt.com/packages/enhanced-terrain-layer). In addition, other modules can use it as a library to easily perform measurements that take into account difficult terrain.

![A ruler measuring distance including difficult terrain](https://raw.githubusercontent.com/manuelVo/foundryvtt-terrain-ruler/media/media/measurement_with_difficult_terrain.webp)

## Using this module as a library to measure difficult terrain
*This section is not intended for users of the Enhanced Terrain Ruler module, but for module authors that want to use difficult terrain as a library to easily measure difficult terrain in their module.*

### Switching a ruler to difficult terrain mode
To make any ruler that your module spawns make use of difficult terrain, you can set the `isTerrainRuler` attribute of that ruler to `true`. This will cause it to make measurements that take into account difficult terrain.

### Measuring distances via `measureDistances`
Terrain Ruler offers a method to measure distances using difficult terrain: `terrainRuler.measureDistances`. This method will behave exactly the same way as `canvas.grid.measureDistances`, but will take difficult terrain into account. In addition `terrainRuler.measureDistances` will modify the rays it gets passed onto, and attach the attribute `terrainRulerVisitedSpaces` to them. This attribute will contain an array of all grid spaces that were visited by the measured path, including the distance measured from the starting space to the listed space (cumulative distance).
