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
import {getTopLeft, getWidth} from 'ol/extent.js';
import {get as getProjection} from 'ol/proj.js';
import WMTS from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import ImageTile from 'ol/source/ImageTile.js';
import Feature from 'ol/Feature.js';

import WMTSCapabilities from 'ol/format/WMTSCapabilities.js';
import {optionsFromCapabilities} from 'ol/source/WMTS.js';

const projectionWebMercator = getProjection('EPSG:3857');
const projectionExtent = projectionWebMercator.getExtent();
const size = getWidth(projectionExtent) / 256;
const resolutions = new Array(19);
const matrixIds = new Array(19);
for (let z = 0; z < 19; ++z) {
  // generate resolutions and matrixIds arrays for this WMTS
  resolutions[z] = size / Math.pow(2, z);
  matrixIds[z] = z;
}

const parser = new WMTSCapabilities();

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
    if ( !ol3d.getEnabled() ) {
      document.querySelectorAll(".ol-overlaycontainer").forEach(e => {
        if ( e.parentElement.getAttribute("class") != "ol-viewport" ) e.style.display = 'none'
      });
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

    this.overlay.setPosition(coords);
    console.log(coords)
    this.setOverlayContent(this.overlay, olLayer, olFeature);
    this.clickedFeat = olFeature
    this.clickedFeat.setStyle(selectionStyle);
  }

  setOverlayContent(overlay, layer, feature) {
      const element = overlay.getElement();
      element.innerHTML = "";
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
    const element = document.getElementById('popup').cloneNode(true);
    this.overlay = new olOverlay({element:element, stopEvent: false});
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
    })
  })
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

const darkRedStyle = function (feature) {
  const style = new olStyleStyle({
    fill: new olStyleFill({
      color: "#a02e30"
    }),
    stroke: new olStyleStroke({
      color: "#a02e30",
      width: mobile ? 10 : 3,
      //lineDash: feature.get("SKIPPER") == 'y' ? undefined : [10, 10]
    }),    
    image: new CircleStyle({
      radius: mobile ? 20 : 10,
      fill: new olStyleFill({
          color: "#a02e30"
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
      font: mobile ? '24px Arial,sans-serif' : '14px Arial,sans-serif',
      textBaseline: 'middle',
      text: `${text}`,
      textAlign: 'center',
      fill: new Fill({
        color: [0, 153, 255, 1],
      }),
  })
  });
};


const gridStyle = function (feature) {
  const text = feature.get('right') == 180 ? feature.get('top') : feature.get('right');
  return new olStyleStyle({
    stroke: new olStyleStroke({
      color: "#aaaaaa",
      width: mobile ? 4 : 1
    }),
    text: new Text({
      font: mobile ? '24px Arial,sans-serif' : '14px Arial,sans-serif',
      textBaseline: 'middle',
      text: `${text}`,
      textAlign: 'center',
      fill: new Fill({
        color: "#888888",
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
  }),    
  image: new CircleStyle({
    radius: mobile ? 15 : 10,
    fill: new olStyleFill({
        color: [0, 153, 255, 1]
    })
  })
});

const highlight_style = function (feature) {
  console.log(feature.getProperties());
  const text = feature.get('name'); // + ' ' + feature.get('arrival');
  return new olStyleStyle({
    image: new CircleStyle({
        radius: 10,
        fill: new olStyleFill({
            color: "#009917"
        })
    }),
    text: new Text({
        font: mobile ? '24px Arial,sans-serif' : '14px Arial,sans-serif',
        textBaseline: 'middle',
        text: `${text}`,
        offsetX: 16,
        textAlign: 'left',
        //rotation: -0.785398164, //45
        fill: new Fill({
          color: "#009917",
        }),
    })
  })
}

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
        font: mobile ? '24px Arial,sans-serif' : '14px Arial,sans-serif',
        textBaseline: 'middle',
        text: `${text}`,
        offsetX: 16,
        textAlign: 'left',
        //rotation: -0.785398164, //45
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

const map = new Map({
  controls: defaultControls().extend([new FullScreen()]),
  layers: [],
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


fetch('https://gibs-c.earthdata.nasa.gov/wmts/epsg3857/all/?SERVICE=WMTS&REQUEST=GetCapabilities')
  .then(function (response) {
    return response.text();
  })
  .then(function (text) {
    const result = parser.read(text);
    const options = optionsFromCapabilities(result, {
      layer: 'Landsat_WELD_CorrectedReflectance_TrueColor_Global_Annual',
      matrixSet: 'GoogleMapsCompatible_Level12',
    });

    decode_layers.landsat = new TileLayer({
          opacity: 1,
          name: 'landsat',
          basemap: true,
          visible: false,
          source: new WMTS(options),
          zIndex: 2,
        })

    decode_layers.osm = new TileLayer({
        source: new OSM(),
        name: 'osm',
        basemap: true,
        visible: true,
        zIndex: 1,
      })


    Object.keys(decode_layers).forEach(function(key,index) {
      map.addLayer( decode_layers[key] )
      addTocItems({
        name: decode_layers[key].get('name'),
        visible: decode_layers[key].get('visible'),
        basemap: true,
      })
    })

  });

ol3d.setEnabled(true);
const scene = ol3d.getCesiumScene();
scene.globe.enableLighting = true;

const mapOH = new OverlayHandler(map, ol3d, scene);

$( ".frontover" ).on( "click", function() {
  ol3d.setEnabled( !ol3d.getEnabled() );
  const checkosm = map.getLayers().getArray().find(layer => layer.get('name') == layername);
  console.log(checkosm);
  map.removeLayer(checkosm);
  map.addLayer(osm);
  if ( !ol3d.getEnabled() ) {
    document.querySelectorAll(".ol-overlaycontainer-stopevent").forEach(e => e.style.display = 'none');
  }
} );

if (mobile) {
  $( "#menubtn" ).addClass('btn-lg');
} else {
  $( "#menubtn" ).addClass('btn-sm');
  $( ".dropdown-menu" ).addClass('dropdownsmall');
  $( ".dropdown-item" ).addClass('dropdownitemsmall');
}

function loadGeojson(params) {

    console.log(params.url);
    fetch(params.url, {
      mode: 'same-origin'
    })
    .then((response) => response.json())
    .then((json) => {
        console.log(json); // this will show the info it in firebug console
        addTocItems(params)
        const vectorSource = new VectorSource({
          features: new GeoJSON().readFeatures(json),
          // url: '/sailing_trips.geojson',
          // format: new GeoJSON(),
          projection:'EPSG:4326'
        });

        const vectorLayer = new VectorLayer({
          name: params.name,
          visible: params.visible,
          source: vectorSource,
          style: params.styleFunc,
          zIndex: params.zIndex
        });
        
        map.addLayer(vectorLayer);

        if (params.callback) params.callback(vectorLayer);

    })
    .catch((error) => {
      if (params.callback) params.callback();
    });
    ;
}

const addTocItems = function (params) {
  const anchor = document.createElement('a');
  anchor.classList.add('dropdown-item');
  anchor.setAttribute('href', '#')

  const div = document.createElement('div');
  div.classList.add('form-check');

  const input = document.createElement('input');
  input.classList.add('form-check-input');
  input.setAttribute('type', params.basemap ? 'radio' : 'checkbox');
  input.setAttribute('name', params.basemap ? 'basemap' : params.name);
  input.setAttribute('id', params.name);
  input.setAttribute('value', params.name);
  if (params.visible) input.setAttribute('checked', true);

  input.addEventListener('change', (event) => {  
    const layername = event.currentTarget.getAttribute( "id" );
    const layer = map.getLayers().getArray().find(layer => layer.get('name') == layername);

    if (event.currentTarget.getAttribute( "name" ) == 'basemap') {
        map.getLayers().getArray().forEach((layer) => { 
          if (layer.get("basemap")) {
            layer.setVisible(false) 
          }
        } );
    }

    if (event.currentTarget.checked) {
      layer.setVisible(true)
    } else {
      layer.setVisible(false)
    }
    console.log( "Toggle", layername,layer, event.currentTarget.checked);
  })


  const label = document.createElement('label');
  label.classList.add('form-check-label');
  label.setAttribute('for', params.name);
  if (params.label) {
    label.innerHTML = params.label
  } else {
    label.innerHTML = params.name
  }

  div.appendChild(input);
  div.appendChild(label);
  anchor.appendChild(div);

  const toc = document.getElementById(params.basemap ? 'basemap' : 'toc')
  toc.appendChild(anchor);
}

const addRecentTrackline = function (layer) {
  if ( layer ) {
    // fetch('data/trackline-api-mock.json')
    fetch('/tracking/track-api.php?trkline')
    .then((response) => response.json())
    .then((json) => {
        console.log(json); // this will show the info it in firebug console
        const newGeom = new GeoJSON().readGeometry(json);
        const newFeat = new Feature({geometry: newGeom});
        layer.getSource().addFeature(newFeat);
    })
    .catch((error) => {
      console.log("Error fetching recent trackline", error);
    });
  }
}

const centerMap = function (layer) {

  if ( layer ) {
    const currentFeats = layer.getSource().getFeatures()
    const currentLoc = currentFeats[0].getGeometry().getCoordinates();
    console.log ("CURRENT",currentLoc);
    ol3d.getCamera().setCenter(currentLoc);
  } else {
    loadGeojson({
      name:'current_dev',
      url: 'data/track-api.geojson',
      visible: true,
      label: '',
      callback: centerMap,
      styleFunc: current_loc_style
    });
  }
}

loadGeojson({
  name:'current',
  url: '/tracking/track-api.php?last=1&type=geojson',
  //url: '',
  visible: true,
  label: 'Current location</br>' +
         '<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">' +
         '<circle cx="10" cy="10" r="10" stroke-width="0" fill="#fc5603" /></svg>',
  styleFunc: current_loc_style,
  callback: centerMap,
  zIndex: 30,
});

/*
loadGeojson({
  name:'trips',
  url: 'data/rotte.geojson',
  visible: true,
  label: 'Sailing trips </br>' +
         '<svg height="10" width="100" xmlns="http://www.w3.org/2000/svg">' +
         '<path d="M 0,5 H 100"' +
         'style="fill:#fc5603;stroke:#fc5603;stroke-width:5;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dashoffset:0" />' +
         '</svg> as skipper</br>' +
         '<svg height="10" width="100" xmlns="http://www.w3.org/2000/svg">' +
         '<path d="M 0,5 H 100"' +
         'style="fill:#fc5603;stroke:#fc5603;stroke-width:5;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dasharray:15,15;stroke-dashoffset:0" />' +
         '</svg> as crew</br>',
  styleFunc: redStyle,
  zIndex: 20,
});*/

loadGeojson({
  name:'highlights',
  url: 'data/highlights.geojson',
  visible: true,
  label: 'Highlights</br>' +
         '<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">' +
         '<circle cx="10" cy="10" r="10" stroke-width="0" fill="#009917" /></svg>',
  styleFunc: highlight_style,
  zIndex: 21,
});

loadGeojson({
  name:'future',
  url: 'data/future.geojson',
  visible: true,
  label: 'Future</br>' +
         '<svg height="10" width="100" xmlns="http://www.w3.org/2000/svg">' +
         '<path d="M 0,5 H 100"' +
         'style="fill:#009917;stroke:#009917;stroke-width:5;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dashoffset:0" />' +
         '</svg> </br>',
  styleFunc: greenStyle,
  zIndex: 10,
});

loadGeojson({
  name:'tracks',
  url: 'data/tracks.geojson',
  visible: true,
  label: 'Tracks</br>' +
         '<svg height="10" width="100" xmlns="http://www.w3.org/2000/svg">' +
         '<path d="M 0,5 H 100"' +
         'style="fill:#a02e30;stroke:#a02e30;stroke-width:5;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dashoffset:0" />' +
         '</svg> </br>',
  styleFunc: darkRedStyle,
  callback: addRecentTrackline,
  zIndex: 10,
});

loadGeojson({
  name:'timezones',
  url: 'data/timezones.geojson',
  visible: false,
  label: 'Timezones</br>' +
         '<svg height="10" width="100" xmlns="http://www.w3.org/2000/svg">' +
         '<path d="M 0,5 H 100"' +
         'style="fill:#0099ff;stroke:#0099ff;stroke-width:2;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;stroke-miterlimit:4;stroke-dashoffset:0" />' +
         '</svg> </br>',
  styleFunc: timezonesStyle,
  zIndex: 10,
});

loadGeojson({
  name:'grid',
  url: 'data/latlongrid.geojson',
  visible: false,
  label: 'Grid',
  styleFunc: gridStyle,
  zIndex: 10,
});

