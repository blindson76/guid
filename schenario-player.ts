import { Observable } from 'rxjs';
import { destinationPoint } from './geodesy';
import { fromLonLat } from 'ol/proj';

const OWN = 0;
const WPN = 1;
const KYD_TO_METERS = 1000 * 0.9144;
const KNOTS_TO_METERS = 1852 / 3600;
export default class SchenarioPlayer {
  platform;
  entities;
  speed = 1;
  interval = 1000;
  schenario;

  lastUpdate;
  schenarioTime = 0;

  timer = null;
  constructor(schenario, interval = 1000) {
    this.interval = interval;
    this.schenario = JSON.parse(JSON.stringify(schenario));
    this.entities = this.loadEntities(this.schenario);
  }
  start(speed = 1) {
    this.speed = speed;
    return new Observable((subscriber) => {
      this.lastUpdate = Date.now().valueOf();

      // subscriber.next(this.step(0));
      this.timer = setInterval(() => {
        const now = Date.now().valueOf(),
          delta = (now - this.lastUpdate) * this.speed;
        this.lastUpdate = now;
        subscriber.next(this.step(delta));
      }, this.interval / this.speed);

      return () => {
        clearInterval(this.timer);
        this.timer = null;
      };
    });
  }
  load() {
    return this.step(0).entities;
  }
  loadEntities(schenario) {
    const origin = fromLonLat([schenario.origin.lon, schenario.origin.lat]);
    return [
      {
        kinematics: {
          ...schenario.platform.kinematics,
          speed: schenario.platform.kinematics.speed * KNOTS_TO_METERS,
          course: schenario.platform.kinematics.course,
        },
        position: [...origin],
      },
      {
        kinematics: {
          ...schenario.platform.kinematics,
          speed: schenario.platform.kinematics.speed * KNOTS_TO_METERS,
          course: schenario.platform.kinematics.course,
        },
        position: [...origin],
      },
      ...schenario.entities.map((ent) => ({
        kinematics: {
          ...ent.kinematics,
          speed: ent.kinematics.speed * KNOTS_TO_METERS,
          course: ent.kinematics.course,
        },
        position: destinationPoint(
          [...origin],
          ent.position.range * KYD_TO_METERS,
          ent.position.bearing
        ),
      })),
    ];
  }
  step(delta: number) {
    this.entities.forEach((entity, i) => {
      const { speed, course } = entity.kinematics;
      entity.position = destinationPoint(
        [...entity.position],
        (speed * delta) / 1000,
        course
      );
    });
    this.schenarioTime += delta;
    return {
      time: this.schenarioTime,
      entities: JSON.parse(JSON.stringify(this.entities)),
    };
  }
  setParam(i, obj) {
    if (obj.speed) {
      obj.speed *= KNOTS_TO_METERS;
    }
    this.entities[i].kinematics = {
      ...this.entities[i].kinematics,
      ...obj,
    };
  }
}
