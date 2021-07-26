import {terrainRulerAddProperties, terrainRulerModifyDistanceResult} from "./measure.js";

export function registerRuler() {
  libWrapper.register('terrain-ruler', 'window.libRuler.RulerSegment.prototype.addProperties', terrainRulerAddProperties, 'WRAPPER');
  libWrapper.register('terrain-ruler', 'window.libRuler.RulerSegment.prototype.modifyDistanceResult', terrainRulerModifyDistanceResult, 'WRAPPER');

  // patching to mark when a ruler is using terrain ruler
  // marking the end is probably unnecessary, b/c the ruler is going away
  libWrapper.register('terrain-ruler', 'Ruler.prototype._endMeasurement', function(wrapped, ...args) {
    this.isTerrainRuler = false;
    return wrapped(...args);
  }, 'WRAPPER');

  // TO-DO: Put this functionality in libRuler
  // Does this need to wrap all drag left start events ('Canvas.prototype._onDragLeftStart')
  //   or just Ruler._onDragStart?
  // Looks like a control-click on canvas will start the Ruler, so probably the latter.
  libWrapper.register('terrain-ruler', 'Ruler.prototype._onDragStart', function(wrapped, ...args) {
    // should really be set in the Ruler flag:
    // this.setFlag("terrain-ruler", "isTerrainRuler", terrainRuler.active);

    // For now, setting the old way until we can figure out if there are consequences for
    //   switching to a Ruler flag.
    this.isTerrainRuler = terrainRuler.active;
    return wrapped(...args);

  }, 'WRAPPER');

  // If isTerrainRuler was set in the ruler flag, this would not be necessary
  libWrapper.register('terrain-ruler', 'Ruler.prototype.toJSON', function(wrapped, ...args) {
    const json = wrapped(...args);
    json["isTerrainRuler"] = this.isTerrainRuler;
    return json;
  }, 'WRAPPER');

  // If isTerrainRuler was set in the ruler flag, this would not be necessary
  libWrapper.register('terrain-ruler', 'Ruler.prototype.update', function(wrapped, ...args) {
    this.isTerrainRuler = data.isTerrainRuler;
    return wrapped(data);
  });

}
