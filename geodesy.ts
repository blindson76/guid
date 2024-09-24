import { Coordinate } from 'ol/coordinate';

export const destinationPoint = (
  x0: Coordinate,
  range: number,
  bearing: number
): Coordinate => {
  return [
    x0[0] + range * Math.sin((bearing / 180) * Math.PI),
    x0[1] + range * Math.cos((bearing / 180) * Math.PI),
  ];
};
export const sub = (from: Coordinate, to: Coordinate): Coordinate => {
  return [to[0] - from[0], to[1] - from[1]];
};

export const bearing = (x: Coordinate): number => {
  if (x[0] == 0 && x[1] == 0) {
    return 0;
  }
  let angle = 90 + (Math.atan2(-x[1], x[0]) * 180) / Math.PI;
  if (angle < 0) {
    angle += 360;
  }
  return angle;
};
