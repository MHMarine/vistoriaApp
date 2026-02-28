<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'marine_marine');
define('DB_PASS', 'q1w2e3r4P0O9I8U7');
define('DB_NAME', 'marine_check');

define('API_TOKEN', '9f3b2c6a-1d2e-4b5c-9f2a-7e8b9c0d1e2f');

function db() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        die(json_encode(["error" => "Falha na conexão"]));
    }
    $conn->set_charset("utf8mb4");
    $conn->query("SET time_zone = '+00:00'");
    return $conn;
}