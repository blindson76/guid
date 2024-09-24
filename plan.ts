import LatLon from 'geodesy/latlon-spherical.js';
import { add, distance } from 'ol/coordinate';
import { getLineCircleIntersections, intersection } from './utils';
import { fromLonLat } from 'ol/proj';
import { bearing, destinationPoint, sub } from './geodesy';
import ol from 'ol/dist/ol';
const CCMCourse = (u, v, theta, gamma, R, wLoc) => {
  let ccmR = Math.asin((u / v) * Math.sin(gamma - theta)) + theta;
  let ccmD = (ccmR * 180) / Math.PI;
  ccmD %= 360;

  const hitTime =
    R / (v * Math.cos(ccmR - theta) + u * Math.cos(Math.PI - gamma + theta));
  const hitPoint = destinationPoint(wLoc, hitTime * v, ccmD);
  return [ccmD >= 0 ? ccmD : ccmD + 360, hitTime, hitPoint];
};

export const CCM = ({ target, weapon, own, reba }) => {
  // console.log(weapon);
  const ownRelative = false;
  let wLoc = weapon.position.slice(),
    tLoc = target.position.slice(),
    oLoc = own.position.slice();
  const wTrajectories = [],
    tTrajectories = [],
    oTraejctories = [];
  wTrajectories.push([...wLoc]);
  tTrajectories.push([...tLoc]);

  const oStart = [...oLoc];
  let runTime = 0;
  let hitPoint = null;
  let orderedCourse = 0;
  for (let i = 0; ; i++) {
    const wpnRange = distance(oLoc, wLoc),
      gamma = (target.kinematics.course / 180) * Math.PI,
      u = target.kinematics.speed,
      v = weapon.kinematics.speed,
      theta = (bearing(sub(wLoc, tLoc)) / 180) * Math.PI,
      ownToWpnBearing = bearing(sub(oLoc, wLoc)),
      R = distance(wLoc, tLoc);
    // console.log(wpnRange);
    if (wpnRange <= reba) {
      weapon.kinematics.course = own.kinematics.course;
      if (i == 0) {
        // console.log('straight');
        orderedCourse = own.kinematics.course;
      }
    } else {
      const [ccmCourse, hitTime2, hitPoint2] = CCMCourse(
        u,
        v,
        theta,
        gamma,
        R,
        wLoc
      );
      // if (i == 0) {
      //   console.log(
      //     'wpn',
      //     ownToWpnBearing,
      //     'ccm',
      //     ccmCourse,
      //     'diff',
      //     ownToWpnBearing - ccmCourse
      //   );
      // }

      if (
        -90 < ownToWpnBearing - ccmCourse &&
        ownToWpnBearing - ccmCourse < 90
      ) {
        // console.log('FOUNDDD');
        const diff = ccmCourse - weapon.kinematics.course;
        const step = Math.min(weapon.kinematics.turnRate, Math.abs(diff));
        // console.log('step', step, weapon.kinematics.course);
        weapon.kinematics.course += diff > 0 ? step : -step;
        if (i == 0) {
          orderedCourse = weapon.kinematics.course;
          // console.log('CCM ORDER', ccmCourse);
        }

        if (ownRelative) {
          const oStart2 = destinationPoint(
            [...oStart],
            own.kinematics.speed * hitTime2,
            own.kinematics.course
          );
          wTrajectories.push(add([...oStart], sub([...oStart2], hitPoint2)));
          tTrajectories.push(add([...oStart], sub([...oStart2], hitPoint2)));
          hitPoint = add([...oStart], sub([...oStart2], hitPoint2));
        } else {
          wTrajectories.push([...hitPoint2]);
          tTrajectories.push([...hitPoint2]);
        }
        runTime += hitTime2 * 1000;
        hitPoint = hitPoint2;
        break;
      } else {
        // console.log('circle');
        const oNext = destinationPoint(
          oLoc,
          own.kinematics.speed,
          own.kinematics.course
        );
        let [x0, x1, y0, y1] = intersection(
          oNext[0],
          oNext[1],
          wpnRange,
          wLoc[0],
          wLoc[1],
          weapon.kinematics.speed
        );
        if (x0) {
          const newCourse = bearing(
            sub(wLoc, ownToWpnBearing - ccmCourse > 0 ? [x0, y0] : [x1, y1])
          );
          // console.log(weapon.kinematics.course, newCourse);
          const diff = newCourse - weapon.kinematics.course;
          const step = Math.min(weapon.kinematics.turnRate, Math.abs(diff));
          weapon.kinematics.course += diff > 0 ? step : -step;
          if (i == 0) {
            // console.log('CIRCLE', ccmCourse);
            orderedCourse = weapon.kinematics.course;
          }
        } else {
          // console.log('CIRCLE NOT POSSIBLE');
        }

        /*
        if (res?.points?.intersection1?.coords) {
          //circle
          const oNext = destinationPoint(oLoc, own.kinematics.speed, own.course);
          let [x0, x1, y0, y1] = intersection(
            oNext[0],
            oNext[1],
            wpnRange,
            wLoc[0],
            wLoc[1],
            weapon.kinematics.speed
          );
          if (x0) {
            const newCourse = bearing(sub(wLoc, [x0, y0]));
            weapon.course = newCourse;
            if (i == 0) {
              orderedCourse = newCourse;
            }
          }
        } else {
          console.log('NOT FOUND', ccmCourse);
          weapon.course = ccmCourse;
          if (i == 0) {
            orderedCourse = ccmCourse;
          }
          hitPoint = hitPoint2;

          if (ownRelative) {
            const oStart2 = destinationPoint(
              [...oStart],
              own.kinematics.speed * hitTime2,
              own.course
            );
            wTrajectories.push(add([...oStart], sub([...oStart2], hitPoint2)));
            tTrajectories.push(add([...oStart], sub([...oStart2], hitPoint2)));
            hitPoint = add([...oStart], sub([...oStart2], hitPoint2));
          } else {
            wTrajectories.push([...hitPoint2]);
            tTrajectories.push([...hitPoint2]);
          }
          // break;
        }

        */
      }
      hitPoint = hitPoint2;
      // break;
      // console.log(ccmCourse, own.course, courseDiff);
      // console.log('circle', (ccmCourse * 180) / Math.PI, own.course);
    }

    // wLoc = wLoc.destinationPoint((weapon.kinematics.speed * 1852) / 3600, weapon.course);
    // oLoc = oLoc.destinationPoint((own.kinematics.speed * 1852) / 3600, own.course);
    // tLoc = tLoc.destinationPoint((target.kinematics.speed * 1852) / 3600, target.course);
    wLoc = destinationPoint(
      wLoc,
      weapon.kinematics.speed,
      weapon.kinematics.course
    );
    oLoc = destinationPoint(oLoc, own.kinematics.speed, own.kinematics.course);
    tLoc = destinationPoint(
      tLoc,
      target.kinematics.speed,
      target.kinematics.course
    );
    // console.log(oStart, add([...oStart], sub(oLoc, wLoc)));
    if (ownRelative) {
      wTrajectories.push(add([...oStart], sub(oLoc, wLoc)));
      tTrajectories.push(add([...oStart], sub(oLoc, tLoc)));
    } else {
      wTrajectories.push([...wLoc]);
      tTrajectories.push([...tLoc]);
    }
    runTime += 1000;
  }
  // console.log(runTime / 1000, (runTime * weapon.kinematics.speed) / 1000);
  // const hit = destinationPoint(oStart, reba, own.course);
  return [hitPoint, wTrajectories, tTrajectories, orderedCourse, runTime];
};

const CircleCourse = ({ weapon, own }) => {
  (oLoc = own.position),
    (wLoc = weapon.position),
    (gamma = bearing(sub(oLoc, wLoc))),
    (theta = own.kinematics.course),
    (O = own.kinematics.speed),
    (V = weapon.kinematics.speed),
    (R = 300);

  const X = Math.sqrt(
      O ** 2 + R ** 2 - 2 * R * O * Math.cos(((theta - gamma) / 180) * Math.PI)
    ),
    O1 = Math.acos((X ** 2 + R ** 2 - O ** 2) / (2 * X * R)),
    O2 = Math.acos((X ** 2 + V ** 2 - R ** 2) / (2 * X * V));
  return 180 + gamma - ((O1 + O2) / Math.PI) * 180;
};
const BRMCourse = ({ target, weapon, own }) => {
  const tLoc = target.position,
    oLoc = own.position,
    wLoc = weapon.position,
    gamma = bearing(sub(oLoc, wLoc)),
    theta = own.kinematics.course,
    O = own.kinematics.speed,
    V = weapon.kinematics.speed,
    R = 300;

  const X = Math.sqrt(
      O ** 2 + R ** 2 - 2 * R * O * Math.cos(((theta - gamma) / 180) * Math.PI)
    ),
    O1 = Math.acos((X ** 2 + R ** 2 - O ** 2) / (2 * X * R)),
    O2 = Math.acos((X ** 2 + V ** 2 - R ** 2) / (2 * X * V));
  return 180 + gamma - ((O1 + O2) / Math.PI) * 180;
};
export const BRM = ({ target, weapon, own, reba }) => {
  // console.log(weapon);
  const ownRelative = false;
  let wLoc = weapon.position.slice(),
    tLoc = target.position.slice(),
    oLoc = own.position.slice();
  const wTrajectories = [],
    tTrajectories = [],
    oTraejctories = [];
  wTrajectories.push([...wLoc]);
  tTrajectories.push([...tLoc]);

  const oStart = [...oLoc];
  let runTime = 0;
  let hitPoint = null;
  let orderedCourse = 0;
  for (let i = 0; ; i++) {
    if (i > 2000) {
      hitPoint = [...oLoc];
      break;
    }
    const wpnRange = distance(oLoc, wLoc),
      gamma = (target.kinematics.course / 180) * Math.PI,
      u = target.kinematics.speed,
      v = weapon.kinematics.speed,
      theta = (bearing(sub(wLoc, tLoc)) / 180) * Math.PI,
      ownToWpnBearing = bearing(sub(oLoc, wLoc)),
      R = distance(wLoc, tLoc);
    // console.log(wpnRange);
    if (wpnRange <= reba) {
      weapon.kinematics.course = own.kinematics.course;
      if (i == 0) {
        // console.log('straight');
        orderedCourse = own.kinematics.course;
      }
    } else {
      // console.log(i);
      const res = CircleCourse({
        own: { ...own, position: [...oLoc] },
        weapon: { ...weapon, position: [...wLoc] },
        target: { ...target, position: [...tLoc] },
      });
      // console.log('res', res);
      weapon.kinematics.course = res;
      hitPoint = [...oLoc];
      if (i > 285) {
        // console.log('FINISH');
        break;
      }
      if (i == 0) {
        orderedCourse = weapon.kinematics.course;
      }
    }

    // wLoc = wLoc.destinationPoint((weapon.kinematics.speed * 1852) / 3600, weapon.course);
    // oLoc = oLoc.destinationPoint((own.kinematics.speed * 1852) / 3600, own.course);
    // tLoc = tLoc.destinationPoint((target.kinematics.speed * 1852) / 3600, target.course);
    wLoc = destinationPoint(
      wLoc,
      weapon.kinematics.speed,
      weapon.kinematics.course
    );
    oLoc = destinationPoint(oLoc, own.kinematics.speed, own.kinematics.course);
    tLoc = destinationPoint(
      tLoc,
      target.kinematics.speed,
      target.kinematics.course
    );
    // console.log(oStart, add([...oStart], sub(oLoc, wLoc)));
    if (ownRelative) {
      wTrajectories.push(add([...oStart], sub(oLoc, wLoc)));
      tTrajectories.push(add([...oStart], sub(oLoc, tLoc)));
    } else {
      wTrajectories.push([...wLoc]);
      tTrajectories.push([...tLoc]);
    }
    runTime += 1000;
  }
  // console.log(runTime / 1000, (runTime * weapon.kinematics.speed) / 1000);
  // const hit = destinationPoint(oStart, reba, own.course);
  return [hitPoint, wTrajectories, tTrajectories, orderedCourse, runTime];
};
