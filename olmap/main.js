import Feature from 'ol/Feature.js';
import Map from 'ol/Map.js';
import View from 'ol/View.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import Circle from 'ol/geom/Circle.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import OSM from 'ol/source/OSM.js';
import VectorSource from 'ol/source/Vector.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';
import FullScreen from 'ol/control/FullScreen.js';
import {defaults as defaultControls} from 'ol/control/defaults.js';
import OLCesium from 'olcs';
import olOverlay from 'ol/Overlay.js';
import {transform, get as getProjection} from 'ol/proj.js';
import olStyleStyle from 'ol/style/Style.js';
import olStyleStroke from 'ol/style/Stroke.js';
import olStyleFill from 'ol/style/Fill.js';

import geojsonObject from './data/sailing_trips.json';

const Cesium = window.Cesium;

const image = new CircleStyle({
  radius: 5,
  fill: null,
  stroke: new Stroke({color: 'red', width: 1}),
});

const styles = {
  'Point': new Style({
    image: image,
  }),
  'LineString': new Style({
    stroke: new Stroke({
      color: 'green',
      width: 1,
    }),
  }),
  'MultiLineString': new Style({
    stroke: new Stroke({
      color: 'green',
      width: 1,
    }),
  }),
  'MultiPoint': new Style({
    image: image,
  }),
  'MultiPolygon': new Style({
    stroke: new Stroke({
      color: 'yellow',
      width: 1,
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 0, 0.1)',
    }),
  }),
  'Polygon': new Style({
    stroke: new Stroke({
      color: 'blue',
      lineDash: [4],
      width: 3,
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0.1)',
    }),
  }),
  'GeometryCollection': new Style({
    stroke: new Stroke({
      color: 'magenta',
      width: 2,
    }),
    fill: new Fill({
      color: 'magenta',
    }),
    image: new CircleStyle({
      radius: 10,
      fill: null,
      stroke: new Stroke({
        color: 'magenta',
      }),
    }),
  }),
  'Circle': new Style({
    stroke: new Stroke({
      color: 'red',
      width: 2,
    }),
    fill: new Fill({
      color: 'rgba(255,0,0,0.2)',
    }),
  }),
};

class OverlayHandler {
  constructor(ol2d, ol3d, scene) {
    this.ol2d = ol2d;
    this.ol3d = ol3d;
    this.scene = scene;

    this.staticBootstrapPopup = new olOverlay({
      element: document.getElementById('popup-bootstrap')
    });
    
    this.ol2d.addOverlay(this.staticBootstrapPopup);
    
    $('.popover-content a').click(function(event){
        console.log("EVENT", event);
    })
    
    const eventHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    eventHandler.setInputAction(this.onClickHandlerCS.bind(this), Cesium.ScreenSpaceEventType['LEFT_CLICK']);

  }

  onClickHandlerCS(event) {
    
    if (this.clickedFeat) {
        this.clickedFeat.setStyle(null);
    }
      
    if (event.position.x === 0 && event.position.y === 0) {
      this.onCloseClick()
      return;
    }

    const pickedFeature = this.scene.pick(event.position);
    let olFeature;
    let olLayer
    if (pickedFeature && pickedFeature.primitive) {
        olFeature = pickedFeature.primitive.olFeature
        olLayer = pickedFeature.primitive.olLayer
    } else {
        this.onCloseClick()
        return
    }
    const ray = this.scene.camera.getPickRay(event.position);
    const cartesian = this.scene.globe.pick(ray, scene);
    if (!cartesian) {
      this.onCloseClick()
      return;
    }
    const cartographic = scene.globe.ellipsoid.cartesianToCartographic(cartesian);
    let coords = [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude)];

    const height = scene.globe.getHeight(cartographic);
    if (height) {
      coords = coords.concat([height]);
    }

    // const transformedCoords = transform(coords, getProjection('EPSG:4326'), 'EPSG:3857');
    const overlay = this.getOverlay();
    overlay.setPosition(coords);
    
    this.setOverlayContent(overlay, olLayer, olFeature);
    this.clickedFeat = olFeature
    this.clickedFeat.setStyle(selectionStyle);
  }

  getOverlay() {
    return this.staticBootstrapPopup;
  }

  setOverlayContent(overlay, layer, feature) {
      const element = overlay.getElement();
      const div = document.createElement('div');
      div.onclick = this.onCloseClick.bind(this);
      const fid = feature.get('BOAT');
      const title = layer.get('name')
      $(element).prop('title', title);
      div.innerHTML = `BOAT:<code><a src="https://www.libresailing.eu/map/#2/7.4/0.3" target="_blank">${fid}</a></code>`;
      $(element).popover('destroy');
      $(element).popover({
        'placement': 'right',
        'animation': true,
        'html': true,
        'content': div
      });
      $(element).popover('show');
      $(element).find('.popover').each(function(i){
        i.css('left', '-12.5px')
      });
      $(element).find('.arrow').each(function(i){
        i.css('left', '15px')
      });

  }

  onCloseClick() {
    this.staticBootstrapPopup.setPosition(undefined);
    if (this.clickedFeat) {
        this.clickedFeat.setStyle(null);
    }
  }

  addOverlay() {
    const element = document.getElementById('popup-bootstrap').cloneNode(true);
    const overlay = new olOverlay({element});
    this.ol2d.addOverlay(overlay);
    return overlay;
  }
}

const selectionStyle = new olStyleStyle({
  fill: new olStyleFill({
    color: [255, 255, 255, 0.6]
  }),
  stroke: new olStyleStroke({
    color: [0, 153, 255, 1],
    width: 5
  })
});

const styleFunction = function (feature) {
  return styles[feature.getGeometry().getType()];
};

const vectorSource = new VectorSource({
  features: new GeoJSON().readFeatures(geojsonObject),
  projection:'EPSG:4326'
});

// vectorSource.addFeature(new Feature(new Circle([5e6, 7e6], 1e6)));

const vectorLayer = new VectorLayer({
  name: "Sail trips",
  source: vectorSource
  // style: styleFunction,
});

const map = new Map({
  controls: defaultControls().extend([new FullScreen()]),
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    vectorLayer,
  ],
  target: 'map',
  view: new View({
    center: [0, 0],
    projection: 'EPSG:4326',
    zoom: 2,
  }),
});

const ol3d = new OLCesium({
    map: map,
    time() {
        return Cesium.JulianDate.now();
  }
});
ol3d.setEnabled(true);
const scene = ol3d.getCesiumScene();
scene.globe.enableLighting = true;

new OverlayHandler(map, ol3d, scene);
