<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'usuario');
define('DB_PASS', 'senha');
define('DB_NAME', 'nome_banco');

define('API_TOKEN', 'token_aqui');

function db() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        die(json_encode(["error" => "Falha na conexão"]));
    }
    $conn->set_charset("utf8mb4");
    $conn->query("SET time_zone = '+00:00'");
    return $conn;
}