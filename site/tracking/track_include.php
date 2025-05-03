<?php

declare(strict_types=1);

//---------------------------------------------------------------
// Register a global exception handler
//---------------------------------------------------------------
set_exception_handler(function (Throwable $e): void {
    http_response_code(500);
    header('Content-Type: application/json');

    echo json_encode([
        'status' => 'error',
        'message' => 'Internal Server Error'
    ]);

    // Log the real error somewhere (e.g., error log or file)
    error_log(sprintf(
        "[%s] %s in %s:%d\nStack trace:\n%s\n",
        date('Y-m-d H:i:s'),
        $e->getMessage(),
        $e->getFile(),
        $e->getLine(),
        $e->getTraceAsString()
    ));
});


//---------------------------------------------------------------
// Register shutdown handler for fatal errors.
//---------------------------------------------------------------
register_shutdown_function(function (): void {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        http_response_code(500);
        header('Content-Type: application/json');

        echo json_encode([
            'status' => 'error',
            'message' => 'Fatal Server Error'
        ]);

        // Log fatal error
        error_log(sprintf(
            "[%s] Fatal error: %s in %s:%d\n",
            date('Y-m-d H:i:s'),
            $error['message'],
            $error['file'],
            $error['line']
        ));
    }
});


//---------------------------------------------------------------
// Set the HTTP response code and emit the JSON result.
//---------------------------------------------------------------
function json_http_response($response_code, $message) {
    http_response_code($response_code);
    header('Content-Type: application/json');
    if ($response_code >= 200 and $response_code <= 299) {
        $status = 'success';
    } elseif ($response_code >= 400 and $response_code <= 499) {
        $status = 'error';
    } else {
        $status = 'unknown';
    }
    echo json_encode([
        'status' => $status,
        'message' => $message
    ]);
    //error_log('TODO: Logging the error!' . ' ' . $response_code . ' ' . $status);
    exit;
}


//---------------------------------------------------------------
// Send header to request Basic Authentication.
//---------------------------------------------------------------
function basicAuthFailed() {
    header('WWW-Authenticate: Basic realm="Protected Area"');
    header('HTTP/1.0 401 Unauthorized');
    echo 'Authentication required.';
    exit;
}


//---------------------------------------------------------------
// Get username and password from server Auth.
//---------------------------------------------------------------
function getBasicAuthCredentials($auth_mandatory=true): array {

    // Prefer the standard server variables first
    if (!empty($_SERVER['PHP_AUTH_USER']) && isset($_SERVER['PHP_AUTH_PW'])) {
        return [
            'username' => $_SERVER['PHP_AUTH_USER'],
            'password' => $_SERVER['PHP_AUTH_PW']
        ];
    }

    // Fallback to manually parsing HTTP_AUTHORIZATION
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

    if ($authHeader && str_starts_with(strtolower($authHeader), 'basic ')) {
        $encodedCredentials = substr($authHeader, 6); // Remove "Basic "
        $decodedCredentials = base64_decode($encodedCredentials, true); // strict decoding

        if ($decodedCredentials && str_contains($decodedCredentials, ':')) {
            [$username, $password] = explode(':', $decodedCredentials, 2);
            return [
                'username' => $username,
                'password' => $password
            ];
        }
    }

    // If credentials are missing, trigger authentication prompt
    if ($auth_mandatory) {
        error_log('getBasicAuthCredentials() failed; forcing re-auth');
        error_log(sprintf('PHP_AUTH_USER: "%s", PHP_AUTH_PW: "%s"', $_SERVER['PHP_AUTH_USER'], $_SERVER['PHP_AUTH_PW']));
        error_log(sprintf('authHeader: "%s"', $authHeader));
        basicAuthFailed();
    } else {
        error_log('getBasicAuthCredentials() failed; proceeding with NULL values');
        return [
            'username' => null,
            'password' => null
        ];
    }
}


//---------------------------------------------------------------
// Connect to the database.
//---------------------------------------------------------------
function createPostgresConnection($config): PDO {

    $dsn = sprintf('pgsql:host=localhost;port=5432;dbname=%s', $config['dbname']);
    $username = $config['dbuser'];
    $password = $config['dbpass'];

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Throw exceptions on errors
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Return associative arrays by default
        PDO::ATTR_EMULATE_PREPARES   => false,                  // Use native prepared statements
        PDO::ATTR_STRINGIFY_FETCHES  => false,                  // Fetch numeric values as real numbers
        PDO::ATTR_TIMEOUT            => 5,                      // 5 seconds connection timeout
    ];

    try {
        return new PDO($dsn, $username, $password, $options);
    } catch (PDOException $e) {
        throw new RuntimeException('Database connection failed: ' . $e->getMessage());
    }
}


//---------------------------------------------------------------
// Validate latitude and longitude values.
//---------------------------------------------------------------
function validLat($lat) {
    if ($lat != null) {
        if (is_numeric($lat)) {
            if (floatval($lat) >= -90.0 and floatval($lat) <= 90.0) {
                return true;
            }
        }
    }
    return false;
}
function validLon($lon) {
    if ($lon != null) {
        if (is_numeric($lon)) {
            if (floatval($lon) >= -180.0 and floatval($lon) <= 180.0) {
                return true;
            }
        }
    }
    return false;
}


//---------------------------------------------------------------
// Validate direction (heading) value.
//---------------------------------------------------------------
function validDirection($direction) {
    if ($direction != null) {
        if (is_numeric($direction)) {
            if (floatval($direction) >= 0.0 and floatval($direction) < 360.0) {
                return true;
            }
        }
    }
    return false;
}


//---------------------------------------------------------------
// Get a timestamp in the format "2025-04-29 06:59:42.916" and
// return the ISO 8601 format "2025-04-29T06:59:42.916Z".
//---------------------------------------------------------------
function iso8601($timestamp) {
    if (strpos($timestamp, ' ') == 10) {
        return str_replace(' ', 'T', $timestamp) . 'Z';
    } else {
        return $timestamp;
    }
}
