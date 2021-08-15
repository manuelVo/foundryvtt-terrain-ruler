export const MODULE_ID = "terrain-ruler";

// Patch libRuler methods
// 1. RulerSegment.addProperties: store values such as edges for the ruler instance
// 2. RulerSegment.modifyDistanceResult: correct distance measurement for terrain traversed over the ruler segment
// 3. Ruler._onDragStart: set a flag that we are using terrainRuler for this ruler

import { terrainRulerModifyDistanceResult } from "./libruler_methods.js";

export function registerRuler() {
  console.log(`${MODULE_ID}|patching libRuler`);
  //libWrapper.register(MODULE_ID, 'window.libRuler.RulerSegment.prototype.addProperties', terrainRulerAddProperties, 'WRAPPER'); // see discussion in libruler_methods.js
  libWrapper.register(MODULE_ID, 'window.libRuler.RulerSegment.prototype.modifyDistanceResult', terrainRulerModifyDistanceResult, 'WRAPPER');
  libWrapper.register(MODULE_ID, 'Ruler.prototype._onDragStart', function(wrapped, ...args) {
    console.log(`${MODULE_ID}|terrainRuler active: ${terrainRuler.active}`);
    this.setFlag(MODULE_ID, "isTerrainRuler", terrainRuler.active);
    return wrapped(...args);
  });
}
