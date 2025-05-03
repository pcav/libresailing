<?php

declare(strict_types=1);
require_once('track_config.php');
require_once('track_include.php');

// TODO: Add a prefix for error_log() messages.

// Always use UTC timezone.
date_default_timezone_set('UTC');

// Force logout if request.
if (array_key_exists('logout', $_REQUEST)) basicAuthFailed();

// Get date time with milliseconds.
$date_time = new DateTime();
$request_date_time = $date_time->format('Y-m-d H:i:s.v');

// Get Basic Auth credentials.
$credentials = getBasicAuthCredentials($config['auth_mandatory']);
error_log(sprintf('Username: "%s", Password: "%s"', $credentials['username'], $credentials['password']));

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


//---------------------------------------------------------------
// Get data from the $_REQUEST array.
// Example from GPSLogger:
//   time=%TIME            =>  time=2025-04-26T19:12:32.000Z
//   timestamp=%TIMESTAMP  =>  timestamp=
//---------------------------------------------------------------
$data = [];
$keys = array('lat', 'lon', 'alt', 'time', 'timestamp', 'speed', 'dir', 'sat', 'accuracy', 'hdop', 'vdop');
foreach ($keys as $key) {
    $data[$key] = null;
    if (array_key_exists($key, $_REQUEST)) {
        try {
            if ($key == 'time') {
                $data[$key] = new DateTime($_REQUEST[$key]);
            } elseif ($key == 'sat') {
                $data[$key] = intval($_REQUEST[$key]);
            } else {
                $data[$key] = floatval($_REQUEST[$key]);
            }
        } catch (Exception $e) {
            error_log(sprintf('ERROR: key: "%s", val: "%s"', $key, $_REQUEST[$key]));
        }
    }
}


//---------------------------------------------------------------
// Validate input and discard invalid records.
//---------------------------------------------------------------
if ($data['time'] == null and $data['timestamp'] == null) {
    json_http_response(400, 'Invalid time or timestamp');
}
if (!validLat($data['lat']) or !validLon($data['lon'])) {
    json_http_response(400, 'Invalid lon/lat values');
}

//---------------------------------------------------------------
// More input sanitizations.
//---------------------------------------------------------------
// Validate direction.
if (!validDirection($data['dir'])) {
    error_log(sprintf('Invalid direction: "%s"', $data['dir']));
    $data['dir'] = null;
}
// Make rounding for the SQL statement.
if ($data['alt'] != null) $alt = round($data['alt'], 1);
$wkt = sprintf('POINT(%0.9f %0.9f)', $data['lon'], $data['lat']);
// Prefer UTC time (if present) over epoch timestamp.
if ($data['time'] != null) {
    $wpt_timestamp = $data['time']->format('Y-m-d H:i:s.v');
} else {
    $date_time = new DateTime('@' . $data['timestamp']);
    $wpt_timestamp = $date_time->format('Y-m-d H:i:s.v');
}

//---------------------------------------------------------------
// Prepare the SQL for the INSERT statement.
// The table structure should be:
//
// CREATE TABLE trackpoints (
//     rcv_timestamp TIMESTAMP (3) WITHOUT TIME ZONE NOT NULL,
//     timestamp     TIMESTAMP (3) WITHOUT TIME ZONE UNIQUE NOT NULL,
//     geom          GEOMETRY(POINT, 4326) NOT NULL,
//     elevation     REAL,
//     speed         REAL,
//     direction     REAL,
//     satellites    INTEGER,
//     accuracy      REAL,
//     hdop          REAL,
//     vdop          REAL
// );
// CREATE INDEX ON trackpoints (timestamp);
//
// INSERT INTO trkpoints
//     (rcv_timestamp, timestamp, geom)
// VALUES
//     ('2025-04-28 14:55:51.12', '2025-04-28 10:00:00.456', ST_GeomFromText('POINT(43.12 10.28)', 4326));
//---------------------------------------------------------------
$sql  = sprintf('INSERT INTO %s (rcv_timestamp, timestamp, geom, elevation, speed, direction, satellites, accuracy, hdop, vdop)', $config['dbtable']);
$sql .= ' VALUES (:rcv_timestamp, :timestamp, ST_GeomFromText(:wkt, 4326), :elevation, :speed, :direction, :satellites, :accuracy, :hdop, :vdop)';
$parameters = [
    'rcv_timestamp' => $request_date_time,
    'timestamp'     => $wpt_timestamp,
    'wkt'           => $wkt,
    'elevation'     => $data['alt'],
    'speed'         => $data['speed'],
    'direction'     => $data['dir'],
    'satellites'    => $data['sat'],
    'accuracy'      => $data['accuracy'],
    'hdop'          => $data['hdop'],
    'vdop'          => $data['vdop']
];
$stmt = $pdo->prepare($sql);
try {
    $stmt->execute($parameters);
} catch (Exception $e) {
    if ($e->errorInfo) {
        $sqlstate = $e->errorInfo[0];
        $driver_error_code = $e->errorInfo[1];
        $driver_error_message = $e->errorInfo[2];
        if ($sqlstate == 42501) {
            // SQLSTATE[42501]: Insufficient privilege.
            error_log($e->getMessage());
            json_http_response(400, $driver_error_message);
        } elseif ($sqlstate == 23505) {
            // SQLSTATE[23505]: Unique violation.
            json_http_response(202, (strstr($driver_error_message, "\n", true) ?: $driver_error_message));
        } else {
            error_log($e->getMessage());
            json_http_response(500, $driver_error_message);
            //echo "getMessage: "           . $e->getMessage()      . "<br>\n";;
            //echo "SQLSTATE: "             . $sqlstate             . "<br>\n";
            //echo "Driver Error Code: "    . $driver_error_code    . "<br>\n";
            //echo "Driver Error Message: " . $driver_error_message . "<br>\n";
        }
    } else {
        json_http_response(500, 'Unknwon Exception->errorInfo');
    }
}

// Debug SQL query.
//echo "<pre>\n";
//echo $sql . "\n";
//echo print_r($parameters, true) . "\n";
//echo "</pre>\n";

json_http_response(200, 'OK');

?>
