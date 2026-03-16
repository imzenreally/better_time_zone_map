/**
 * MapProjection handles coordinate transformation between geographic (lat/lon)
 * and canvas pixel coordinates using Miller Cylindrical projection.
 *
 * Miller Cylindrical provides a good balance between shape accuracy and
 * polar distortion, suitable for world overview maps.
 */
export class MapProjection {
  // Miller projection Y axis range computed from ±90° latitude
  // True Miller Y at ±90° latitude: 1.25 * ln(tan(π/4 + 0.4*π/2))
  private static readonly MILLER_Y_MAX =
    1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * Math.PI / 2));

  /**
   * Project geographic coordinates to canvas pixel coordinates.
   *
   * @param lon Longitude in degrees (-180 to 180)
   * @param lat Latitude in degrees (-90 to 90)
   * @param canvasWidth Width of canvas in pixels
   * @param canvasHeight Height of canvas in pixels
   * @returns Canvas coordinates {x, y}
   */
  static projectToCanvas(
    lon: number,
    lat: number,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    // Convert degrees to radians
    const lonRad = (lon * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;

    // Miller Cylindrical projection formulas
    const x = lonRad;
    const y = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * latRad));

    // Map projection coordinates to canvas pixels
    // X: -π to π → 0 to canvasWidth
    const canvasX = ((x + Math.PI) / (2 * Math.PI)) * canvasWidth;

    // Y: MILLER_Y_MAX to -MILLER_Y_MAX → 0 to canvasHeight
    // (Inverted because canvas Y increases downward)
    const canvasY =
      ((MapProjection.MILLER_Y_MAX - y) / (2 * MapProjection.MILLER_Y_MAX)) *
      canvasHeight;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Unproject canvas pixel coordinates to geographic coordinates.
   *
   * @param canvasX Canvas X coordinate
   * @param canvasY Canvas Y coordinate
   * @param canvasWidth Width of canvas in pixels
   * @param canvasHeight Height of canvas in pixels
   * @returns Geographic coordinates {lon, lat}
   */
  static unproject(
    canvasX: number,
    canvasY: number,
    canvasWidth: number,
    canvasHeight: number
  ): { lon: number; lat: number } {
    // Convert canvas pixels to projection coordinates
    const x = ((canvasX / canvasWidth) * 2 * Math.PI) - Math.PI;
    const y = MapProjection.MILLER_Y_MAX -
      ((canvasY / canvasHeight) * 2 * MapProjection.MILLER_Y_MAX);

    // Inverse Miller Cylindrical projection
    const lonRad = x;
    const latRad = 2.5 * (Math.atan(Math.exp(y / 1.25)) - Math.PI / 4);

    // Convert radians to degrees
    const lon = (lonRad * 180) / Math.PI;
    const lat = (latRad * 180) / Math.PI;

    return { lon, lat };
  }
}
