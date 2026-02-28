import Constants from "expo-constants";
import { getDatabase } from "../database/database";
import { uuidv4 } from "../utils/uuid";

// UUID do dispositivo apenas para buffer/cache local
const DEVICE_UUID =
  Constants.installationId || Constants.sessionId || "unknown-device";

/**
 * Cria uma nova vistoria e seus itens
 */
export async function criarVistoria(
  condominioUUID: string,
  sindicoUuid: string,
) {
  const db = await getDatabase();
  const vistoriaUUID = uuidv4();

  // 1. Cria a vistoria (pai)
  await db.runAsync(
    `
  INSERT INTO vistorias (
    uuid,
    device_uuid,
    condominio_uuid,
    sindico_uuid,
    data_vistoria,
    status,
    ativo
  ) VALUES (?, ?, ?, ?, STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW'), 'EM_ANDAMENTO', 1)
  `,
    [vistoriaUUID, DEVICE_UUID, condominioUUID, sindicoUuid],
  );

  // 2. Busca itens ativos (não deletados)
  const itens = await db.getAllAsync<{ uuid: string }>(
    `SELECT i.uuid 
     FROM itens i
     JOIN grupos g ON i.grupo_uuid = g.uuid
     WHERE g.condominio_uuid = ? AND i.ativo = 1`,
    [condominioUUID],
  );

  // 3. Cria os itens da vistoria usando UUIDs
  for (const item of itens) {
    await db.runAsync(
      `
      INSERT INTO vistoria_itens (
        uuid,
        device_uuid,
        vistoria_uuid,
        item_uuid,
        status,
        ativo,
        deleted_at
      ) VALUES (?, ?, ?, ?, 'ND', 1, NULL)
      `,
      [uuidv4(), DEVICE_UUID, vistoriaUUID, item.uuid],
    );
  }

  return {
    uuid: vistoriaUUID,
  };
}

export async function salvarProgressoVistoria(
  vistoriaUuid: string,
  condominioUuid: string,
  sindicoUuid: string,
  itemUuid: string,
  status: "OK" | "NOK" | "ND",
  observacao: string,
) {
  const db = await getDatabase();

  // 1. Validar se os UUIDs são válidos antes de tentar o banco
  if (!vistoriaUuid || !condominioUuid || !sindicoUuid || !itemUuid) {
    throw new Error("UUIDs obrigatórios não fornecidos para salvar progresso.");
  }

  await db.withTransactionAsync(async () => {
    // 2. Garantir que a VISTORIA (Pai) existe
    // Usamos INSERT OR IGNORE. Se o registro já existir, ele pula.
    await db.runAsync(
      `INSERT OR IGNORE INTO vistorias (
        uuid, device_uuid, condominio_uuid, sindico_uuid, data_vistoria, status, ativo
      ) VALUES (?, ?, ?, ?, STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW'), 'EM_ANDAMENTO', 1)`,
      [vistoriaUuid, DEVICE_UUID, condominioUuid, sindicoUuid],
    );

    // 3. Tentar atualizar o item caso ele já tenha sido inserido nesta sessão
    const result = await db.runAsync(
      `UPDATE vistoria_itens 
       SET status = ?, observacao = ? 
       WHERE vistoria_uuid = ? AND item_uuid = ?`,
      [status, observacao, vistoriaUuid, itemUuid],
    );

    // 4. Se nenhum registro foi atualizado (changes === 0), inserimos o novo
    if (result.changes === 0) {
      await db.runAsync(
        `INSERT INTO vistoria_itens (
          uuid, device_uuid, vistoria_uuid, item_uuid, status, observacao, ativo
        ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [uuidv4(), DEVICE_UUID, vistoriaUuid, itemUuid, status, observacao],
      );
    }
  });
}

/**
 * Lista itens de uma vistoria
 */
export async function listarItensDaVistoria(vistoriaUUID: string) {
  const db = await getDatabase();

  return db.getAllAsync<{
    vistoria_item_uuid: string;
    item_uuid: string;
    item_nome: string;
    grupo_nome: string;
    status: "OK" | "NOK" | "ND";
    observacao: string | null;
  }>(
    `
    SELECT
      vi.uuid AS vistoria_item_uuid,
      i.uuid AS item_uuid,
      i.nome AS item_nome,
      g.nome AS grupo_nome,
      vi.status,
      vi.observacao
    FROM vistoria_itens vi
    JOIN itens i ON i.uuid = vi.item_uuid
    JOIN grupos g ON g.uuid = i.grupo_uuid
    WHERE vi.vistoria_uuid = ?
      AND vi.ativo = 1
      AND vi.deleted_at IS NULL
    ORDER BY g.ordem, i.ordem, i.nome
    `,
    [vistoriaUUID],
  );
}

/**
 * Atualiza um item da vistoria
 * updated_at é tratado automaticamente via trigger
 */
export async function atualizarItemVistoria(
  vistoriaItemUUID: string,
  status: "OK" | "NOK" | "ND",
  observacao?: string,
) {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE vistoria_itens
    SET status = ?, observacao = ?
    WHERE uuid = ?
      AND deleted_at IS NULL
    `,
    [status, observacao ?? null, vistoriaItemUUID],
  );
}

/**
 * Finaliza a vistoria
 */
export async function finalizarVistoria(vistoriaUUID: string) {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE vistorias
    SET status = 'FINALIZADA'
    WHERE uuid = ?
      AND deleted_at IS NULL
    `,
    [vistoriaUUID],
  );

  return true;
}

/**
 * Soft delete da vistoria (opcional, já pensando no sync)
 */
export async function excluirVistoria(vistoriaUUID: string) {
  const db = await getDatabase();

  await db.runAsync(
    `
    UPDATE vistorias
    SET deleted_at = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW'),
        ativo = 0
    WHERE uuid = ?
    `,
    [vistoriaUUID],
  );
}
