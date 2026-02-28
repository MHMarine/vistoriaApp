<?php
require_once __DIR__ . "/config.php";

// Cabeçalhos CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Resposta rápida a OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Mostrar erros
ini_set('display_errors', 1);
error_reporting(E_ALL);

// -------------------------
// Validação do Token
// -------------------------
$headers = array_change_key_case(getallheaders(), CASE_LOWER);
$token = $headers['authorization'] ?? ($headers['x-api-key'] ?? null);

$expected = "Bearer " . API_TOKEN;
if (!$token || $token !== $expected) {
    http_response_code(401);
    echo json_encode([
        "error" => "Unauthorized",
        "debug_info" => "Token recebido: " . ($token ?: "nenhum"),
        "check" => "Esperado: " . $expected
    ]);
    exit;
}

// -------------------------
// Rotas
// -------------------------
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'salvar') {
    salvar();
} elseif ($method === 'GET' && $action === 'listar_tudo') {
    listar_tudo();
} else {
    http_response_code(404);
    echo json_encode(["error" => "Rota não encontrada"]);
    exit;
}

// -------------------------
// Funções
// -------------------------

function salvar() {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data || !isset($data['vistorias']) || !is_array($data['vistorias'])) {
        http_response_code(400);
        echo json_encode(["error" => "Payload inválido"]);
        return;
    }

    $conn = db();
    $conn->begin_transaction();

    try {
        $stmt = $conn->prepare("
            INSERT INTO vistorias
            (device_uuid, uuid, condominio_uuid, sindico_uuid, data_vistoria, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON DUPLICATE KEY UPDATE
                condominio_uuid = VALUES(condominio_uuid),
                sindico_uuid = VALUES(sindico_uuid),
                data_vistoria = VALUES(data_vistoria),
                status = VALUES(status),
                updated_at = datetime('now')
        ");

        foreach ($data['vistorias'] as $v) {
            $stmt->bind_param(
                "ssisss",
                $v['device_uuid'],
                $v['uuid'],
                $v['condominio_uuid'],
                $v['sindico_uuid'],
                $v['data_vistoria'],
                $v['status']
            );
            $stmt->execute();
        }

        $conn->commit();

        echo json_encode(["success" => true]);
    } catch (Throwable $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode([
            "error" => "Erro ao salvar",
            "message" => $e->getMessage()
        ]);
    }
}

function listar_tudo() {
    $conn = db();

    $data = [
        'sindicos' => $conn->query("SELECT * FROM sindicos")->fetch_all(MYSQLI_ASSOC),
        'condominios' => $conn->query("SELECT * FROM condominios")->fetch_all(MYSQLI_ASSOC),
        'grupos' => $conn->query("SELECT * FROM grupos")->fetch_all(MYSQLI_ASSOC),
        'itens' => $conn->query("SELECT * FROM itens")->fetch_all(MYSQLI_ASSOC),
        'vistorias' => $conn->query("SELECT * FROM vistorias ORDER BY updated_at DESC LIMIT 100")->fetch_all(MYSQLI_ASSOC),
        'vistoria_itens' => $conn->query("SELECT * FROM vistoria_itens")->fetch_all(MYSQLI_ASSOC)
    ];

    echo json_encode($data);
}
