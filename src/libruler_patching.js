const MODULE_ID = "terrain-ruler";

// Patch libRuler methods
// 1. RulerSegment.addProperties: store values such as edges for the ruler instance
// 2. RulerSegment.modifyDistanceResult: correct distance measurement for terrain traversed over the ruler segment
// 3. Ruler._onDragStart: set a flag that we are using terrainRuler for this ruler

import { terrainRulerAddProperties, terrainRulerModifyDistanceResult }

export function registerRuler() {
  libWrapper.register(MODULE_ID, 'window.libRuler.RulerSegment.prototype.addProperties', terrainRulerAddProperties, 'WRAPPER');
  libWrapper.register(MODULE_ID, 'window.libRuler.RulerSegment.prototype.modifyDistanceResult', terrainRulerModifyDistanceResult, 'WRAPPER');
  libWrapper.register(MODULE_ID, 'Ruler.prototype._onDragStart', function(wrapped, ...args) {
    this.setFlag(MODULE_ID, "isTerrainRuler", terrainRuler.active);
  }
}
