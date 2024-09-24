import { Observable } from 'rxjs';
import LatLon from 'geodesy/latlon-spherical.js';
import { fromLonLat } from 'ol/proj';
import { add, Coordinate } from 'ol/coordinate';
export type Position = {
  lat: number;
  lon: number;
};
export type LinearObject = {
  course: number;
  speed: number;
  bearing: number;
  range: number;
  position: Position;
};
export type Kinematics = {
  bearing?: number;
  range?: number;
  course?: number;
  speed?: number;
  bearingRate?: number;
  position?: Coordinate;
};

export default class LinearModel {
  obj: LinearObject;
  start: number;
  lastUpdate: number;
  position: Coordinate;
  orderedCourse: number;
  speed: number;
  constructor(object: LinearObject, speed = 3) {
    this.obj = object;
    this.orderedCourse = object.course;
    this.speed = speed;
    this.position = object.position
      ? fromLonLat([object.position.lon, object.position.lat])
      : fromLonLat([0, 0]);
    this.position = add(this.position, [
      this.obj.range * 1852 * Math.sin((this.obj.bearing / 180) * Math.PI),
      this.obj.range * 1852 * Math.cos((this.obj.bearing / 180) * Math.PI),
    ]);
  }
  setCourse(course) {
    this.orderedCourse = course;
  }
  asObservable(interval: number = 1000 / this.speed): Observable<Kinematics> {
    return new Observable<Kinematics>((subsciber) => {
      this.start = Date.now().valueOf();
      this.lastUpdate = this.start;

      const id = setInterval(() => {
        const now = Date.now().valueOf(),
          elapsed = (now - this.lastUpdate) * this.speed;
        this.lastUpdate = now;
        this.position = add(this.position, [
          ((((this.obj.speed * 1852) / 3600) * elapsed) / 1000) *
            Math.sin((this.obj.course / 180) * Math.PI),
          ((((this.obj.speed * 1852) / 3600) * elapsed) / 1000) *
            Math.cos((this.obj.course / 180) * Math.PI),
        ]);
        // console.log(this.obj.course, this.obj.speed);
        subsciber.next({
          course: this.obj.course,
          speed: (this.obj.speed * 1852) / 3600,
          position: this.position,
        });
        let diff = (this.orderedCourse - this.obj.course) % 360;
        if (diff <= -180) {
          diff += 360;
        }
        if (diff > 180) {
          diff -= 360;
        }
        let step = Math.min(Math.abs(diff), 5);
        this.obj.course += Math.sign(diff) * step;
        this.obj.course %= 360;
      }, interval / this.speed);

      return () => {
        console.log('stop');
      };
    });
  }
}
