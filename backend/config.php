<?php
define('DB_HOST', 'localhost');
define('DB_USER', 'usuario_bd');
define('DB_PASS', 'senha_bd');
define('DB_NAME', 'nome_bd');

define('API_TOKEN', 'token_api_aqui!');

function db() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        die(json_encode(["error" => "Falha na conexão"]));
    }
    $conn->set_charset("utf8mb4");
    $conn->query("SET time_zone = '+00:00'");
    return $conn;
}