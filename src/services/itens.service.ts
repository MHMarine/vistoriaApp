import { getDatabase } from "../database/database";

export type ItemDoCondominio = {
  item_uuid: string;
  item_nome: string;
  grupo_uuid: string;
  grupo_nome: string;
  grupo_ordem: number;
  item_ordem: number;
};

export async function listarItensDoCondominio(
  condominioUuid: string,
): Promise<ItemDoCondominio[]> {
  const db = await getDatabase();

  const itens = await db.getAllAsync<ItemDoCondominio>(
    `
    SELECT
      i.uuid        AS item_uuid,
      i.nome        AS item_nome,
      i.ordem       AS item_ordem,
      g.uuid        AS grupo_uuid,
      g.nome        AS grupo_nome,
      g.ordem       AS grupo_ordem
    FROM itens i
    JOIN grupos g ON g.uuid = i.grupo_uuid
    WHERE g.condominio_uuid = ?
      AND g.ativo = 1
      AND i.ativo = 1
    ORDER BY g.ordem, i.ordem
    `,
    [condominioUuid],
  );

  return itens;
}
