import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
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
import Text from 'ol/style/Text.js';
import Style from 'ol/style/Style.js';
import FullScreen from 'ol/control/FullScreen.js';
import {defaults as defaultControls} from 'ol/control/defaults.js';
import OLCesium from 'olcs';
import olOverlay from 'ol/Overlay.js';
import olStyleStyle from 'ol/style/Style.js';
import olStyleStroke from 'ol/style/Stroke.js';
import olStyleFill from 'ol/style/Fill.js';

const Cesium = window.Cesium;

const styles = {
  'Point': new Style({
    image: new CircleStyle({
        radius: 10,
        fill: new olStyleFill({
            color: 'rgba(255,0,0,1)'
        }),
    }),
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
      width: 10,
    }),
    fill: new Fill({
      color: 'rgba(255,0,0,1)',
    }),
  }),
};

class OverlayHandler {
  constructor(ol2d, ol3d, scene) {
    this.ol2d = ol2d;
    this.ol3d = ol3d;
    this.scene = scene;
    this.setupOverlay()
    const eventHandler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    eventHandler.setInputAction(this.onClickHandlerCS.bind(this), Cesium.ScreenSpaceEventType['LEFT_CLICK']);
    
    this.ol2d.on('click', this.onClickHandlerOL.bind(this));

  }
  
  onClickHandlerOL(event) {
    if (this.clickedFeat) this.clickedFeat.setStyle(null);
    const coordinates = event.coordinate;
    console.log(event);
    this.setupOverlay()
    this.overlay.setPosition(coordinates);
    const features = [];
    const me = this;
    this.ol2d.forEachFeatureAtPixel(event.pixel, function(feature, layer) {
          features.push([layer, feature]);
    });
    if (features.length > 0) {
        console.log("CLICKEDFEATS", features);
        this.setOverlayContent(this.overlay, features[0][0], features[0][1]);
        this.clickedFeat = features[0][1]
        this.clickedFeat.setStyle(selectionStyle)
    }
    
  }

  onClickHandlerCS(event) {
    
    if (this.clickedFeat) {
        this.clickedFeat.setStyle(null);
    }
    if (event.position.x === 0 && event.position.y === 0) {
      this.resetFeature()
      return;image
    }
    const pickedFeature = this.scene.pick(event.position);
    let olFeature;
    let olLayer
    if (pickedFeature && pickedFeature.primitive) {
        olFeature = pickedFeature.primitive.olFeature
        olLayer = pickedFeature.primitive.olLayer
    } else {
        this.resetFeature()
        return
    }
    if (!olFeature) {
        return
    }
    const ray = this.scene.camera.getPickRay(event.position);
    const cartesian = this.scene.globe.pick(ray, scene);
    if (!cartesian) {
      this.resetFeature()
      return;
    }
    const cartographic = scene.globe.ellipsoid.cartesianToCartographic(cartesian);
    let coords = [Cesium.Math.toDegrees(cartographic.longitude), Cesium.Math.toDegrees(cartographic.latitude)];

    const height = scene.globe.getHeight(cartographic);
    if (height) {
      coords = coords.concat([height]);
    }

    // const transformedCoords = transform(coords, getProjection('EPSG:4326'), 'EPSG:3857');
    this.setupOverlay()
    this.overlay.setPosition(coords);
    console.log(coords)
    this.setOverlayContent(this.overlay, olLayer, olFeature);
    this.clickedFeat = olFeature
    this.clickedFeat.setStyle(selectionStyle);
  }

  setOverlayContent(overlay, layer, feature) {
      const element = overlay.getElement();
      const div = document.createElement('div');
      div.classList.add('popup-content');
      div.onclick = this.onCloseClick.bind(this);
      const fid = feature.get('BOAT');
      const title = layer.get('name')
      const fontSize = mobile ? '4vw' : '1vw';
      //$(element).prop('title', title);

      div.innerHTML += `<h3 style="font-size:${fontSize}">${title}</h3>`;
      const props = feature.getProperties()
      for (const key in props) {
        if (key == 'geometry') continue;
        let value 
        if (props[key]) {
            if (key == 'FOTO') {
              value = `<img class="ico rounded" src="${props[key]}" />`;
            } else {
              value = `<strong style="font-size:${fontSize}">${props[key]}<strong>`;
            }
            div.innerHTML += `<p style="font-size:${fontSize}">${key}: ${value}</p>`;
        }
      }

      element.appendChild(div);
      element.style.visibility = "visible";
      


      // div.innerHTML = `BOAT:<code><a src="https://www.libresailing.eu/map/#2/7.4/0.3" target="_blank">${fid}</a></code>`;
      /*
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
      */

  }

  resetFeature() {
    console.log("resetFeature")
    this.overlay.setPosition([1000,1000]);
    this.overlay.getElement().style.visibility = "hidden";
    if (this.clickedFeat) {
        this.clickedFeat.setStyle(null);
    }
  }

  onCloseClick() {
    console.log("onCloseClick")
    this.resetFeature()
  }

  setupOverlay() {
    if (this.overlay) this.ol2d.removeOverlay(this.overlay);
    const element = document.getElementById('popup').cloneNode(true);
    this.overlay = new olOverlay({element:element, stopEvent: true});
    this.ol2d.addOverlay(this.overlay);
    this.overlay.getElement().style.visibility = "hidden";
  }
}


const mobile = screen.width < 500;

const greenStyle = new olStyleStyle({
  fill: new olStyleFill({
    color: [255, 255, 255, 0.6]
  }),
  stroke: new olStyleStroke({
    color: "#009917",
    width: mobile ? 12 : 4
  }),    
  image: new CircleStyle({
    radius: mobile ? 15 : 10,
    fill: new olStyleFill({
        color: [0, 153, 23, 1]
    }),
}),
});

const redStyle = function (feature) {
  const style = new olStyleStyle({
    fill: new olStyleFill({
      color: [255, 255, 255, 0.6]
    }),
    stroke: new olStyleStroke({
      color: "#fc5603",
      width: mobile ? 10 : 3,
      lineDash: feature.get("SKIPPER") == 'y' ? undefined : [10, 10]
    }),    
    image: new CircleStyle({
      radius: mobile ? 20 : 10,
      fill: new olStyleFill({
          color: "#fc5603"
      }),
    }),
  });
  return style
}


const timezonesStyle = function (feature) {
  const text = feature.get('name');
  return new olStyleStyle({
    stroke: new olStyleStroke({
      color: "#0099ff",
      width: mobile ? 4 : 1
    }),
    text: new Text({
      font: '14px Arial,sans-serif',
      textBaseline: 'middle',
      text: `${text}`,
      textAlign: 'center',
      fill: new Fill({
        color: [0, 153, 255, 1],
      }),
  })
  });
};

const selectionStyle = new olStyleStyle({
  fill: new olStyleFill({
    color: [255, 255, 255, 0.6]
  }),
  stroke: new olStyleStroke({
    color: [0, 153, 255, 1],
    width: mobile ? 12 : 4
  })
});

const current_loc_style = function (feature) {
  console.log(feature.getProperties());
  const text = feature.get('time');
  return new olStyleStyle({
    image: new CircleStyle({
        radius: 10,
        fill: new olStyleFill({
            color: "#fc5603"
        })
    }),
    text: new Text({
        font: '12px Arial,sans-serif',
        textBaseline: 'middle',
        text: `${text}`,
        offsetX: 16,
        textAlign: 'left',
        rotation: -0.785398164, //45
        fill: new Fill({
          color: 'red',
        }),
    })
  })
}

const styleFunction = function (feature) {
  return styles[feature.getGeometry().getType()];
};

// vectorSource.addFeature(new Feature(new Circle([5e6, 7e6], 1e6)));

const decode_layers = {};


const osm = new TileLayer({
    source: new OSM()
  })

decode_layers["osm"] = osm

const map = new Map({
  controls: defaultControls().extend([new FullScreen()]),
  layers: [
    osm,
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

const mapOH = new OverlayHandler(map, ol3d, scene);

$( ".frontover" ).on( "click", function() {
  ol3d.setEnabled( !ol3d.getEnabled() );
} );

if (mobile) {
  $( "#menubtn" ).addClass('btn-lg');
} else {
  $( "#menubtn" ).addClass('btn-sm');
  $( ".dropdown-menu" ).addClass('dropdownsmall');
  $( ".dropdown-item" ).addClass('dropdownitemsmall');
}

function loadGeojson(name, url, styleFunc, visible, callback) {
    console.log(url);
    fetch(url, {
      mode: 'same-origin'
    })
    .then((response) => response.json())
    .then((json) => {
        console.log(json); // this will show the info it in firebug console
        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(json),
          // url: '/sailing_trips.geojson',
          // format: new GeoJSON(),
          projection:'EPSG:4326'
        });

        const vectorLayer = new VectorLayer({
          name: name,
          visible: visible,
          source: vectorSource,
          style: styleFunc,
        });
        
        map.addLayer(vectorLayer);

        if (callback) callback(vectorLayer);
    });
}

const centerMap = function (layer) {
  const currentLoc = layer.getSource().getFeatures()[0].getGeometry().getCoordinates();
  console.log ("CURRENT",currentLoc);
  ol3d.getCamera().setCenter(currentLoc);
}

loadGeojson('current', 'track-api.geojson',current_loc_style, true, centerMap)
loadGeojson('trips', 'sailing_trips.geojson',redStyle, true)
loadGeojson('highlights', 'highlights.geojson',greenStyle, true)
loadGeojson('future', 'future.geojson',greenStyle, true)
loadGeojson('timezones', 'timezones.geojson',timezonesStyle, false)
//loadGeojson('current', 'https://www.libresailing.eu/tracking/track-api.php?last=1&type=geojson',current_loc_style)

$(".dropdown-item").on( "click", function() {
  const formCheck  = $(this).children('div[class="form-check"]')
  const checkboxElem = $(formCheck).children('input');
  const checked = $(checkboxElem).is(":checked")
  const layername = $(checkboxElem).attr( "name" );
  const layer = map.getLayers().getArray().find(layer => layer.get('name') == layername);
  if (checked) {
    layer.setVisible(true)
  } else {
    layer.setVisible(false)
  }
  console.log( "Toggle", checkboxElem.attr( "name" ), layer, checked);
} );


//const lastLoc = [parseFloat(lastLocList[1]), parseFloat(lastLocList[0]), 100]
//console.log(lastLoc);
// const transformedCoords = transform(lastLoc, getProjection('EPSG:4326'), 'EPSG:3857')
// console.log(transformedCoords);
// map.getView().setCenter(transformedCoords);
//ol3d.getCamera().setCenter(lastLoc);
