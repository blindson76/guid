import schenario from './schenario.json';
import { Tacsit } from './tacsit';
import schenario from './schenario.json';
import LinearModel from './object-model';
import { BRM, CCM } from './plan';
import { first, fromEvent, map, take, zip } from 'rxjs';
import SchenarioPlayer from './schenario-player';
import { distance } from 'ol/coordinate';
const tacsit = new Tacsit();

const sc = new SchenarioPlayer(schenario, 1000);
const [own, wpn, ...entities] = sc.load();
const {
  origin,
  zoom,
  platform: {
    wpn: { reba, speed },
  },
} = schenario;
tacsit.load2('map', {
  own,
  wpn,
  entities,
  reba,
  zoom,
  origin,
});
sc.setParam(1, { speed });
sc.start(1)
  .pipe(take(500))
  .subscribe(({ time, entities: [own, wpn, ...entities] }) => {
    const [hitPoint, wpnTrajectory, targetTrajectory, orderedCourse, runTime] =
      BRM({
        target: entities[0],
        weapon: {
          ...wpn,
          ...{ kinematics: { ...wpn.kinematics, speed: (20 * 1852) / 3600 } },
        },
        own,
        reba,
      });
    sc.setParam(1, { course: orderedCourse });
    // console.log(distance(own.position, wpn.position));
    tacsit.update({
      own,
      wpn,
      entities,
      wpnTrajectory,
      entityTrajectories: [targetTrajectory],
      hitPoint,
    });
  });

const lateralOffset = fromEvent(document.getElementById('offset'), 'change')
  .pipe(map((v) => v.target.value))
  .subscribe((e) => {
    console.log(e);
  });
