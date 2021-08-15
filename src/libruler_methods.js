import { MODULE_ID } from "./libruler_patching.js";
import { measureDistances } from "./measure.js";

/*
 * Wrap libRuler's RulerSegment.addProperties method.
 * This is called when the measurement first starts, and again for each RulerSegment.
 * Set properties to the RulerSegment or the RulerSegment.ruler that will be needed later.
 */
// TO-DO: could measure edges here to use when measuring gridless terrain later.
//        Would avoid re-calculating edges repeatedly.
//        But requires modifying measureDistancesGridless to access the stored info.
// e.g.:
/*
export function terrainRulerAddProperties(wrapped, ...args) {
  if(this.ruler.getFlag(MODULE_ID, "isTerrainRuler") && this.segment_num === 0 && (canvas.grid.type === CONST.GRID_TYPES.GRIDLESS || options.ignoreGrid)) {
    this.ruler.setFlag(MODULE_ID, "terrainEdges", collectTerrainEdges());
  }
  return wrapped(...args);
}
*/

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
  measured_distance = wrapped(measured_distance, physical_path);

  if(!this.ruler.getFlag(MODULE_ID, "isTerrainRuler")) {
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

  return terrain_distance;  // should really be: return measured_distance + terrain_cost;
}
