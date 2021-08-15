import { MODULE_ID } from "./libruler_patching.js";
import { collectTerrainEdges, debugEdges, measureDistances } from "./measure.js";

/*
 * Wrap libRuler's RulerSegment.addProperties method.
 * This is called when the measurement first starts, and again for each RulerSegment.
 * Set properties to the RulerSegment or the RulerSegment.ruler that will be needed later.
 * - Set the token elevation if there is one at the start of the ruler measure.
 *   Used by terrainRulerModifyDistanceResult to set the starting elevation when not
 *   already set.
 * - Store the terrain edges for use when measuring RulerSegments. Avoids re-calculating
 *   for every segment.
 */
export function terrainRulerAddProperties(wrapped, ...args) {
  console.log(`${MODULE_ID}|addProperties`);
  if(!this.ruler.isTerrainRuler) { 
   //console.log(`${MODULE_ID}| returning without adding properties.`);
   return wrapped(...args); }

  // set certain properties for the ruler when starting a measurement
  if(this.segment_num === 0) {
    // store edges used for measuring on gridless maps
    if (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || options.ignoreGrid) {
      this.ruler.setFlag(MODULE_ID, "terrainEdges", collectTerrainEdges());

      if (CONFIG.debug.terrainRuler) {
        debugEdges(this.ruler.getFlag(MODULE_ID, "terrain_edges"));
      }
    }
  }

  return wrapped(...args);
}


/*
 * Wrap libRuler's RulerSegment.modifyDistanceResult method to account for terrain.
 * This will be called when measuring a specific RulerSegment.
 * @param {Number} measured_distance The distance measured for the physical path.
 *                                   The physical path is two or more points representing
 *                                   the path for the segment. In the default case, the
 *                                   physical path would have two points equal to
 *                                   this.ray.A and this.ray.B for the segment.
 * @param {Object} physical_path  An object that contains {origin, destination}.
 *                                Each has {x, y}. May have other properties.
 *                                In particular, Elevation Ruler adds a "z" dimension.
 * @return {Number} The distance as modified.
 */
export function terrainRulerModifyDistanceResult(wrapped, measured_distance, physical_path) {
  //console.log(`${MODULE_ID}|modifyDistanceResult`);
  measured_distance = wrapped(measured_distance, physical_path);

  console.log(`${MODULE_ID}|Measured distance: ${measured_distance} for path ${physical_path.origin.x}, ${physical_path.origin.y} to ${physical_path.destination.x}, ${physical_path.destination.y}`);
  if(!this.ruler.getFlag(MODULE_ID, "isTerrainRuler")) {
    console.log(`${MODULE_ID}|Returning unmodified distance`);
    return measured_distance; 
  }

  // convert the physical path to a 2-D ray
  // for compatibility with old terrain measurement code that expects an array of segment rays
  // ignore any 3-D data if provided by physical_path
  // TO-DO: measureDistances should really return the cost or otherwise account for the
  //   measured_distance parameter, for better compatibility with other modules.
  //   Right now, it is just overriding measured_distance with its own measure, which
  //   may not be correct depending on what other modules are enabled (such as Elevation Ruler)

  let segment = { ray: new Ray(physical_path.origin, physical_path.destination) };
  const terrain_distance = measureDistances([ segment ]);
  console.log(`${MODULE_ID}|terrain distance is ${terrain_distance}`);

  return terrain_distance;  // should really be: return measured_distance + terrain_cost;
}
