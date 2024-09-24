import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';
import Point from 'ol/geom/Point.js';
import View from 'ol/View.js';
import {
  Circle as CircleStyle,
  Fill,
  Icon,
  RegularShape,
  Stroke,
  Style,
} from 'ol/style.js';
import { OSM, Vector as VectorSource } from 'ol/source.js';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js';
import { easeOut } from 'ol/easing.js';
import {
  fromLonLat,
  getPointResolution,
  METERS_PER_UNIT,
  transform,
} from 'ol/proj.js';
import { getVectorContext } from 'ol/render.js';
import { unByKey } from 'ol/Observable.js';
import { getLength } from 'ol/sphere';
import { Circle, LineString } from 'ol/geom';
import { add, distance } from 'ol/coordinate';
import { sub } from './geodesy';
import { fromCircle } from 'ol/geom/Polygon';
const COLORS = ['blue', 'gray', 'red'];
export class Tacsit {
  map;
  ownBoat;
  ownCourse;
  rebaCircle;
  entities;
  sch;
  hitPoint;
  wpnTrajectory;
  wpn;
  wpnCourse;
  wpnS;
  targetTrajectory;
  counter = 0;
  vectorLayer;
  load2(target, { origin, zoom, ...sch }) {
    const tileLayer = new TileLayer({
      source: new OSM({
        wrapX: false,
      }),
    });
    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: this.loadFeatures(sch),
      }),
    });
    this.vectorLayer = vectorLayer;
    const map = new Map({
      layers: [tileLayer, vectorLayer],
      target: 'map',
      view: new View({
        zoom,
        multiWorld: true,
        minZoom: 0,
        maxZoom: 50000,
        center: fromLonLat([origin.lon, origin.lat]),
        projection: 'EPSG:3857',
      }),
    });
    this.map = map;

    this.map.on('pointermove', (evt) => {
      let coordinate = evt.coordinate;
      document.getElementById('coord').textContent = distance(
        coordinate,
        this.ownBoat.getGeometry().getCoordinates()
      ).toString();
    });
  }
  loadFeatures({ own: o, reba: rebaRadius, entities, ...sch }) {
    const own = new Feature({
      geometry: new Point(o.position),
    });
    own.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 10,
          stroke: new Stroke({ color: 'blue', width: 2 }),
        }),
      })
    );
    this.ownBoat = own;

    const ownCourse = new Feature({
      geometry: new Point(o.position),
    });
    this.ownCourse = ownCourse;
    ownCourse.setStyle(
      new Style({
        image: new RegularShape({
          radius: 20,
          radius2: 0,
          points: 1,
          angle: 0,
          displacement: [0, 0],
          rotation: (o.kinematics.course / 180) * Math.PI,
          stroke: new Stroke({
            width: 2,
            color: 'blue',
          }),
        }),
      })
    );

    //wpn

    const wpn = new Feature({
      geometry: new Point(o.position),
    });
    wpn.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: 'red' }),
        }),
      })
    );
    this.wpn = wpn;

    const wpnCourse = new Feature({
      geometry: new Point(o.position),
    });
    this.wpnCourse = wpnCourse;
    wpnCourse.setStyle(
      new Style({
        image: new RegularShape({
          radius: 20,
          radius2: 0,
          points: 1,
          angle: 0,
          displacement: [0, 0],
          rotation: (o.kinematics.course / 180) * Math.PI,
          stroke: new Stroke({
            width: 2,
            color: 'blue',
          }),
        }),
      })
    );
    const wpnS = new Feature({
      geometry: new LineString(
        fromCircle(new Circle(o.position, 100), 32, Math.PI / 4)
          .getCoordinates()[0]
          .slice(0, 16)
      ),
    });
    wpnS.setStyle(
      new Style({
        stroke: new Stroke({ color: 'black' }),
      })
    );
    this.wpnS = wpnS;
    //reba
    const reba = new Feature({
      geometry: new Circle(
        [...o.position],
        rebaRadius / getPointResolution('EPSG:3857', 1, [...o.position], 'm')
      ),
    });
    reba.setStyle(
      new Style({
        stroke: new Stroke({
          color: 'red',
          lineDash: [5, 3],
        }),
      })
    );
    this.rebaCircle = reba;
    this.rebaCircle.getGeometry().setRadius(rebaRadius);

    this.entities = entities.map((e) => {
      const entity = new Feature({
        geometry: new Point(e.position),
      });
      entity.setStyle(
        new Style({
          image: new RegularShape({
            radius: 12,
            points: 4,
            rotation: Math.PI / 4,

            stroke: new Stroke({ color: 'red', width: 2 }),
          }),
        })
      );

      const entityCourse = new Feature({
        geometry: new Point(e.position),
      });
      entityCourse.setStyle(
        new Style({
          image: new RegularShape({
            radius: 20,
            radius2: 0,
            points: 1,
            angle: 0,
            displacement: [0, 0],
            rotation: (e.kinematics.course / 180) * Math.PI,
            stroke: new Stroke({
              width: 2,
              color: 'red',
            }),
          }),
        })
      );
      const trajectories = new Feature({
        geometry: new LineString([]),
      });
      trajectories.setStyle(
        new Style({
          stroke: new Stroke({
            color: 'black',
          }),
        })
      );
      return { entity, course: entityCourse, trajectories };
    });

    const hitPoint = new Feature({
      geometry: new Point(fromLonLat([null, null])),
    });
    hitPoint.setStyle(
      new Style({
        image: new RegularShape({
          radius: 12,
          radius2: 0,
          points: 4,
          rotation: Math.PI / 4,

          stroke: new Stroke({ color: 'red', width: 2 }),
        }),
      })
    );
    this.hitPoint = hitPoint;

    const wpnTrajectory = new Feature({
      geometry: new LineString([]),
    });
    wpnTrajectory.setStyle(
      new Style({
        stroke: new Stroke({
          color: 'black',
        }),
      })
    );
    this.wpnTrajectory = wpnTrajectory;

    return [
      own,
      ownCourse,
      wpn,
      wpnCourse,
      // wpnS,
      reba,
      ...[].concat(...this.entities.map((e) => Object.values(e))),
      hitPoint,
      wpnTrajectory,
    ];
  }

  update({ own, wpn, entities, wpnTrajectory, hitPoint, entityTrajectories }) {
    this.setOwnBoat({ position: own.position, course: own.kinematics.course });
    this.setWpn({ position: wpn.position, course: wpn.kinematics.course });
    entities.forEach((e, i) => {
      this.entities[i].entity.getGeometry().setCoordinates(e.position);
      this.entities[i].course.getGeometry().setCoordinates(e.position);
      this.entities[i].course
        .getStyle()
        .getImage()
        .setRotation((e.kinematics.course / 180) * Math.PI);
    });
    this.setWpnTrajectory(wpnTrajectory);
    this.setHitPoint(hitPoint);
    this.setEntityTrajectory(entityTrajectories);
    if (this.counter++ % 10 !== 0) {
      return;
    }
    [].concat(own, wpn, ...entities).forEach((e, i) => {
      const src = this.vectorLayer.getSource();
      const traj = new Feature({
        geometry: new Point(e.position),
      });
      traj.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 3,
            fill: new Fill({ color: COLORS[i] }),
          }),
        })
      );
      src.addFeature(traj);
    });
    this.counter++;
  }

  setOwnBoat({ position: pos, course }) {
    this.ownCourse.getGeometry().setCoordinates(pos);
    this.ownBoat.getGeometry().setCoordinates(pos);
    this.rebaCircle.getGeometry().setCenter(pos);
    this.ownCourse
      .getStyle()
      .getImage()
      .setRotation((course / 180) * Math.PI);
    // this.hitPoint.getGeometry().setCoordinates([pos[0], pos[1] + 300]);

    // this.map.getView().setCenter(pos);
  }
  setWpn({ position: pos, course }) {
    this.wpnCourse.getGeometry().setCoordinates(pos);
    this.wpn.getGeometry().setCoordinates(pos);
    this.wpnCourse
      .getStyle()
      .getImage()
      .setRotation((course / 180) * Math.PI);
    // this.hitPoint.getGeometry().setCoordinates([pos[0], pos[1] + 300]);

    // this.map.getView().setCenter(pos);
  }

  setHitPoint(pos) {
    this.hitPoint.getGeometry().setCoordinates(pos);
  }
  setWpnTrajectory(coords) {
    this.wpnTrajectory.getGeometry().setCoordinates(coords);
  }
  setEntityTrajectory(trajectories) {
    trajectories.forEach((t, i) => {
      this.entities[i].trajectories.getGeometry().setCoordinates(t);
    });
  }
}
