<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once('track_config.php');

// Configurazione database
$host = 'localhost';
$dbname = $config['dbname'];
$user = $config['dbuser'];
$password = $config['dbpass'];

try {
    $pdo = new PDO("pgsql:host=$host;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Parametri dalla richiesta
    $table = $_GET['table'] ?? null;
    $geom_column = $_GET['geom_column'] ?? 'geom';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
    
    if (!$table) {
        throw new Exception('Parametro "table" richiesto');
    }
    
    // Validazione nome tabella (prevenzione SQL injection)
    if (!preg_match('/^[a-zA-Z0-9_\.]+$/', $table)) {
        throw new Exception('Nome tabella non valido');
    }
    
    // Query per ottenere i dati in formato GeoJSON
    $sql = "
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', jsonb_agg(feature)
        ) as geojson
        FROM (
            SELECT jsonb_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON($geom_column)::jsonb,
                'properties', to_jsonb(row) - '$geom_column'
            ) as feature
            FROM (
                SELECT * FROM $table
                " . ($limit ? "LIMIT $limit" : "") . "
            ) row
        ) features
    ";
    
    $stmt = $pdo->query($sql);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result && $result['geojson']) {
        echo $result['geojson'];
    } else {
        echo json_encode([
            'type' => 'FeatureCollection',
            'features' => []
        ]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Errore database: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}
?>