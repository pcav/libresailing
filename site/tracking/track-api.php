<?php

declare(strict_types=1);
require_once('track_config.php');
require_once('track_include.php');

// Database fields that must be forced to float.
const FLOAT_FIELDS = ['elevation', 'speed', 'direction', 'accuracy', 'hdop', 'vdop'];

// Map database fieldname to GPX element name.
const TRKPT_ELEMENTS = [
        'timestamp' => 'time',
        'rcv_timestamp' => 'rcv_timestamp',
        'elevation' => 'ele',
        'speed' => 'speed',
        'satellites' => 'sat',
        'hdop' => 'hdop',
        'vdop' => 'vdop'
];

// Map database fieldname to GeoJSON properties.
const GEOJSON_PROPERTIES = [
        'timestamp' => 'time',
        'rcv_timestamp' => 'rcv_timestamp',
        'elevation' => 'ele',
        'speed' => 'speed',
        'direction' => 'heading',
        'satellites' => 'sat',
        'accuracy' => 'accuracy',
        'hdop' => 'hdop',
        'vdop' => 'vdop'
];

//-------------------------------------------------------------------------
// Initialize an XML object and write the opening GPX attributes.
//-------------------------------------------------------------------------
function gpx_begin() {
    $xw = xmlwriter_open_memory();
    xmlwriter_start_document($xw, '1.0', 'UTF-8');
    xmlwriter_start_element($xw, 'gpx');
    xmlwriter_start_attribute($xw, 'version');
    xmlwriter_text($xw, '1.1');
    xmlwriter_end_attribute($xw);
    xmlwriter_start_attribute($xw, 'creator');
    xmlwriter_text($xw, 'https://' . $_SERVER['HTTP_HOST'] . '/');
    xmlwriter_end_attribute($xw);
    xmlwriter_start_attribute($xw, 'xmlns');
    xmlwriter_text($xw, 'http://www.topografix.com/GPX/1/1');
    xmlwriter_end_attribute($xw);
    xmlwriter_start_attribute($xw, 'xmlns:xsi');
    xmlwriter_text($xw, 'http://www.w3.org/2001/XMLSchema-instance');
    xmlwriter_end_attribute($xw);
    xmlwriter_start_attribute($xw, 'xsi:schemaLocation');
    xmlwriter_text($xw, 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd');
    xmlwriter_end_attribute($xw);
    xmlwriter_start_element($xw, 'trk');
    xmlwriter_start_element($xw, 'trkseg');
    return $xw;
}


//-------------------------------------------------------------------------
// Close the XML elements opened by gpx_begin().
//-------------------------------------------------------------------------
function gpx_end($xw) {
    xmlwriter_end_element($xw);
    xmlwriter_end_element($xw);
    xmlwriter_end_element($xw);
    xmlwriter_end_document($xw);
}


//-------------------------------------------------------------------------
// Add the trackpoints to a GPX XML object.
//-------------------------------------------------------------------------
function gpx_add_points($xw, $points) {
    foreach ($points as $point) {
        // GPX trkpt with lon lat attributes.
        xmlwriter_start_element($xw, 'trkpt');
        xmlwriter_start_attribute($xw, 'lon');
        xmlwriter_text($xw, $point['lon']);
        xmlwriter_end_attribute($xw);
        xmlwriter_start_attribute($xw, 'lat');
        xmlwriter_text($xw, $point['lat']);
        xmlwriter_end_attribute($xw);
        // Optional trkpt elements.
        foreach (TRKPT_ELEMENTS as $key => $tag) {
            if ($point[$key] != null) {
                xmlwriter_start_element($xw, $tag);
                if ($key == 'timestamp' or $key =='rcv_timestamp') $point[$key] = iso8601($point[$key]);
                xmlwriter_text($xw, strval($point[$key]));
                xmlwriter_end_element($xw);
            }
        }
        xmlwriter_end_element($xw);
    }
}


//-------------------------------------------------------------------------
// Initialize an GeoJSON object containing a FeatureCollection.
//-------------------------------------------------------------------------
function geojson_begin() {
    // Initialize the GeoJSON array.
    return [
        'type' => 'FeatureCollection',
        'features' => []];
}


//-------------------------------------------------------------------------
// Add the Point Features to a GeoJSON object.
//-------------------------------------------------------------------------
function geojson_add_points(&$geojson, $points) {
    foreach ($points as $point) {
        $feature = [
            'type' => 'Feature',
            'properties' => [],
            'geometry' => [
                'type' => 'Point',
                'coordinates' => [floatval($point['lon']), floatval($point['lat'])]]
        ];
        foreach (GEOJSON_PROPERTIES as $key => $tag) {
            if ($point[$key] != null) {
                if ($key == 'timestamp' or $key =='rcv_timestamp') $point[$key] = iso8601($point[$key]);
                if (in_array($key, FLOAT_FIELDS)) $point[$key] = floatval($point[$key]);
                $feature['properties'][$tag] = $point[$key];
            }
        }
        array_push($geojson['features'], $feature);
    }
}


// Always use UTC timezone.
date_default_timezone_set('UTC');

// Force logout if request.
if (array_key_exists('logout', $_REQUEST)) basicAuthFailed();

// Get date time with milliseconds.
$date_time = new DateTime();
$request_date_time = $date_time->format('Y-m-d H:i:s.v');

// Get Basic Auth credentials.
//$credentials = getBasicAuthCredentials($config['auth_mandatory']);
$credentials = getBasicAuthCredentials(false);

// If Basic Auth succeeded, use the same credentials for DB access.
if ($credentials['username'] != null) $config['dbuser'] = $credentials['username'];
if ($credentials['password'] != null) $config['dbpass'] = $credentials['password'];
try {
    $pdo = createPostgresConnection($config);
} catch (Exception $e) {
    // Try to catch "FATAL: password authentication failed for user ..."
    if (str_contains($e->getMessage(), 'authentication failed')) {
        error_log(sprintf('Authentication failed for user "%s"', $credentials['username']));
        basicAuthFailed();
    } else {
        throw $e;
    }
}

//-------------------------------------------------------------------------
// Can output to GPX or GeoJSON format.
//-------------------------------------------------------------------------
$output_type = 'GPX';
if (array_key_exists('type', $_REQUEST)) {
    $req_type = strtoupper($_REQUEST['type']);
    switch ($req_type) {
        case 'GPX':
        case 'GEOJSON':
            $output_type = $req_type;
            break;
    }
}


//-------------------------------------------------------------------------
// $_REQUEST['last']: get the last N trackpoints.
//-------------------------------------------------------------------------
if (array_key_exists('last', $_REQUEST)) {

    // Default to empty result.
    $points = [];

    $last = 1;
    if (is_numeric($_REQUEST['last'])) $last = intval($_REQUEST['last']);
    if ($last < 1) $last = 1;
    if ($last > 10000) $last = 10000;

    // Database fields:
    // rcv_timestamp, timestamp, geom, elevation, speed, direction, satellites, accuracy, hdop, vdop)

    $sql = sprintf('SELECT rcv_timestamp, timestamp, ST_X(geom) AS lon, ST_Y(geom) AS lat, elevation, speed, direction, satellites, accuracy, hdop, vdop FROM %s ORDER BY timestamp DESC LIMIT %d', $config['dbtable'], $last);
    $stmt = $pdo->prepare($sql);
    $stmt->execute([]);
    $points = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Reverse the ORDER BY timestamp DESC.
    usort($points, function ($a, $b) {
        return $a['timestamp'] <=> $b['timestamp'];
    });

    //-------------------------------------------------------------------------
    // Produces the output in the requested format.
    //-------------------------------------------------------------------------
    if ($output_type == 'GPX') {
        // Initialize the GPX XML.
        $xw = gpx_begin();
        gpx_add_points($xw, $points);
        gpx_end($xw);
        header('Content-type: text/xml');
        echo xmlwriter_output_memory($xw);
    } elseif ($output_type == 'GEOJSON') {
        // Initialize the GeoJSON array.
        $geojson = geojson_begin();
        geojson_add_points($geojson, $points);
        header('Content-type: application/json');
        echo json_encode($geojson);
    }
    exit();
}

//-------------------------------------------------------------------------
// $_REQUEST['trkline']: get the trkline_ovnifsm view.
//-------------------------------------------------------------------------
if (array_key_exists('trkline', $_REQUEST)) {
    // geom SRID: 4326.
    $sql = sprintf('SELECT ST_AsGeoJSON(geom) AS trkline FROM trkline_ovnifsm');
    $stmt = $pdo->prepare($sql);
    $stmt->execute([]);
    $geom = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($geom === FALSE) {
        $geojson = [
            'type' => 'LineString',
            'coordinates' => []];
        header('Content-type: application/json');
        echo json_encode($geojson);
    } else {
        header('Content-type: application/json');
        echo $geom['trkline'];
    }
    exit();
}

?>
