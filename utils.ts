export function intersection(x0, y0, r0, x1, y1, r1) {
  var a, dx, dy, d, h, rx, ry;
  var x2, y2;

  /* dx and dy are the vertical and horizontal distances between
   * the circle centers.
   */
  dx = x1 - x0;
  dy = y1 - y0;

  /* Determine the straight-line distance between the centers. */
  d = Math.sqrt(dy * dy + dx * dx);

  /* Check for solvability. */
  if (d > r0 + r1) {
    /* no solution. circles do not intersect. */
    return false;
  }
  if (d < Math.abs(r0 - r1)) {
    /* no solution. one circle is contained in the other */
    return false;
  }

  /* 'point 2' is the point where the line through the circle
   * intersection points crosses the line between the circle
   * centers.
   */

  /* Determine the distance from point 0 to point 2. */
  a = (r0 * r0 - r1 * r1 + d * d) / (2.0 * d);

  /* Determine the coordinates of point 2. */
  x2 = x0 + (dx * a) / d;
  y2 = y0 + (dy * a) / d;

  /* Determine the distance from point 2 to either of the
   * intersection points.
   */
  h = Math.sqrt(r0 * r0 - a * a);

  /* Now determine the offsets of the intersection points from
   * point 2.
   */
  rx = -dy * (h / d);
  ry = dx * (h / d);

  /* Determine the absolute intersection points. */
  var xi = x2 + rx;
  var xi_prime = x2 - rx;
  var yi = y2 + ry;
  var yi_prime = y2 - ry;

  return [xi, xi_prime, yi, yi_prime];
}

export function pDistance(x, y, x1, y1, x2, y2) {
  var A = x - x1;
  var B = y - y1;
  var C = x2 - x1;
  var D = y2 - y1;

  var dot = A * C + B * D;
  var len_sq = C * C + D * D;
  var param = -1;
  if (len_sq != 0)
    //in case of 0 length line
    param = dot / len_sq;

  var xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  var dx = x - xx;
  var dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getLineCircleIntersections(a, b, c) {
  // Calculate the euclidean distance between a & b
  let eDistAtoB = Math.sqrt(
    Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2)
  );

  // compute the direction vector d from a to b
  let d = [(b[0] - a[0]) / eDistAtoB, (b[1] - a[1]) / eDistAtoB];

  // Now the line equation is x = dx*t + ax, y = dy*t + ay with 0 <= t <= 1.

  // compute the value t of the closest point to the circle center (cx, cy)
  let t = d[0] * (c[0] - a[0]) + d[1] * (c[1] - a[1]);

  // compute the coordinates of the point e on line and closest to c
  var e = { coords: [], onLine: false };
  e.coords[0] = t * d[0] + a[0];
  e.coords[1] = t * d[1] + a[1];

  // Calculate the euclidean distance between c & e
  let eDistCtoE = Math.sqrt(
    Math.pow(e.coords[0] - c[0], 2) + Math.pow(e.coords[1] - c[1], 2)
  );

  // test if the line intersects the circle
  if (eDistCtoE < c[2]) {
    // compute distance from t to circle intersection point
    let dt = Math.sqrt(Math.pow(c[2], 2) - Math.pow(eDistCtoE, 2));

    // compute first intersection point
    var f = { coords: [], onLine: false };
    f.coords[0] = (t - dt) * d[0] + a[0];
    f.coords[1] = (t - dt) * d[1] + a[1];
    // check if f lies on the line
    f.onLine = is_on(a, b, f.coords);

    // compute second intersection point
    var g = { coords: [], onLine: false };
    g.coords[0] = (t + dt) * d[0] + a[0];
    g.coords[1] = (t + dt) * d[1] + a[1];
    // check if g lies on the line
    g.onLine = is_on(a, b, g.coords);

    return { points: { intersection1: f, intersection2: g }, pointOnLine: e };
  } else if (parseInt(eDistCtoE) === parseInt(c[2])) {
    // console.log("Only one intersection");
    return { points: false, pointOnLine: e };
  } else {
    // console.log("No intersection");
    return { points: false, pointOnLine: e };
  }
}

// BASIC GEOMETRIC functions
function distance(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}
function is_on(a, b, c) {
  return distance(a, c) + distance(c, b) == distance(a, b);
}

function getAngles(a, b, c) {
  // calculate the angle between ab and ac
  let angleAB = Math.atan2(b[1] - a[1], b[0] - a[0]);
  let angleAC = Math.atan2(c[1] - a[1], c[0] - a[0]);
  let angleBC = Math.atan2(b[1] - c[1], b[0] - c[0]);
  let angleA = Math.abs((angleAB - angleAC) * (180 / Math.PI));
  let angleB = Math.abs((angleAB - angleBC) * (180 / Math.PI));
  return [angleA, angleB];
}
