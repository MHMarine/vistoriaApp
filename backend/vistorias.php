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

if ($method === 'POST') {
    switch($action) {
        case 'salvar_vistorias':
            salvarTabela('vistorias', true); // valida condominio_uuid e sindico_uuid
            break;
        case 'salvar_vistoria_itens':
            salvarTabela('vistoria_itens', true); // valida vistoria_uuid e item_uuid
            break;
        case 'salvar_sindicos':
            salvarTabela('sindicos');
            break;
        case 'salvar_condominios':
            salvarTabela('condominios');
            break;
        case 'salvar_grupos':
            salvarTabela('grupos');
            break;
        case 'salvar_itens':
            salvarTabela('itens');
            break;
        default:
            http_response_code(404);
            echo json_encode(["error" => "Rota não encontrada"]);
            exit;
    }
} elseif ($method === 'GET' && $action === 'listar_tudo') {
    listarTudo();
} else {
    http_response_code(404);
    echo json_encode(["error" => "Rota não encontrada"]);
    exit;
}

// -------------------------
// Funções
// -------------------------

/**
 * Salvar tabela genérica
 * @param string $table - nome da tabela
 * @param bool $validateFK - se deve validar FK (para vistorias e vistoria_itens)
 */
function salvarTabela($table, $validateFK = false) {
    $data = json_decode(file_get_contents('php://input'), true);

    $rowsKey = match($table) {
        'vistorias' => 'vistorias',
        'vistoria_itens' => 'vistoria_itens',
        default => 'rows'
    };

    if (!$data || !isset($data[$rowsKey]) || !is_array($data[$rowsKey])) {
        http_response_code(400);
        echo json_encode(["error" => "Payload inválido"]);
        return;
    }

    $conn = db();
    $conn->begin_transaction();

    try {
        foreach ($data[$rowsKey] as $row) {
            // Validação mínima de FK
            if ($validateFK) {
                if ($table === 'vistorias') {
                    $cond = $conn->query("SELECT 1 FROM condominios WHERE uuid = '{$row['condominio_uuid']}'")->fetch_assoc();
                    if (!$cond) throw new Exception("Condomínio não encontrado: {$row['condominio_uuid']}");

                    $user = $conn->query("SELECT 1 FROM sindicos WHERE uuid = '{$row['sindico_uuid']}'")->fetch_assoc();
                    if (!$user) throw new Exception("Usuário não encontrado: {$row['sindico_uuid']}");
                }

                if ($table === 'vistoria_itens') {
                    $vist = $conn->query("SELECT 1 FROM vistorias WHERE uuid = '{$row['vistoria_uuid']}'")->fetch_assoc();
                    if (!$vist) throw new Exception("Vistoria não encontrada: {$row['vistoria_uuid']}");

                    $item = $conn->query("SELECT 1 FROM itens WHERE uuid = '{$row['item_uuid']}'")->fetch_assoc();
                    if (!$item) throw new Exception("Item não encontrado: {$row['item_uuid']}");
                }
            }

            $cols = array_keys($row);
            $placeholders = implode(", ", array_fill(0, count($cols), "?"));
            $update = implode(", ", array_map(fn($c) => "$c = VALUES($c)", $cols));

            $stmt = $conn->prepare("
                INSERT INTO $table (" . implode(", ", $cols) . ")
                VALUES ($placeholders)
                ON DUPLICATE KEY UPDATE $update
            ");

            $types = str_repeat("s", count($cols));
            $stmt->bind_param($types, ...array_values($row));
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

/**
 * Listar tudo (pull)
 */
function listarTudo() {
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
