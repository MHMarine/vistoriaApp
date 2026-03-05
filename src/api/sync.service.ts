import Constants from 'expo-constants';
import * as SQLite from 'expo-sqlite';
import { getDatabase } from '../database/database';

const API_URL = 'url_backend_aqui/vistorias.php';
const API_TOKEN = 'meu_token_aqui!';

const DEVICE_UUID =
  Constants.installationId || Constants.sessionId || 'unknown-device';

type VistoriaLocal = {
  uuid: string;
  device_uuid: string;
  condominio_uuid: string; // UUID
  sindico_uuid: string; // UUID
  data_vistoria: string;
  status: 'EM_ANDAMENTO' | 'FINALIZADA';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type VistoriaItemLocal = {
  uuid: string;
  vistoria_uuid: string;
  item_uuid: string;
  valor: string | number;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/* ------------------------------------------------------------------ */
/* SINCRONIZAÇÃO PRINCIPAL */
/* ------------------------------------------------------------------ */
export async function syncNow(sindicoUuid?: string) {
  const db: SQLite.SQLiteDatabase = await getDatabase();
  let uuidParaUso = sindicoUuid;

  if (!uuidParaUso) {
    const result = await db.getFirstAsync<{ uuid: string }>(
      'SELECT uuid FROM sindicos LIMIT 1',
    );
    uuidParaUso = result?.uuid;
  }

  if (!uuidParaUso) {
    console.warn('Sincronização abortada: Nenhum síndico encontrado.');
    return;
  }

  console.log(
    '🔄 Iniciando Sync de dados para o síndico:',
    uuidParaUso.toUpperCase(),
  );

  const lastSync = await getLastSync(db, uuidParaUso);

  await pushTable(db, uuidParaUso, lastSync, 'sindicos');
  await pushTable(db, uuidParaUso, lastSync, 'condominios');
  await pushTable(db, uuidParaUso, lastSync, 'grupos');
  await pushTable(db, uuidParaUso, lastSync, 'itens');

  await pushLocalVistorias(db, uuidParaUso, lastSync);
  await pushLocalVistoriaItens(db, uuidParaUso, lastSync);

  await pullServerChanges(db, uuidParaUso, lastSync);

  await updateLastSync(db, uuidParaUso);

  console.log('✅ Sync finalizado');
}

/* ------------------------------------------------------------------ */
/* LAST SYNC */
/* ------------------------------------------------------------------ */
async function getLastSync(
  db: SQLite.SQLiteDatabase,
  uuidParaUso: string,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ last_sync_at: string | null }>(
    `SELECT last_sync_at FROM sync_control WHERE sindico_uuid = ? AND device_uuid = ?`,
    [uuidParaUso, DEVICE_UUID],
  );
  return row?.last_sync_at ?? null;
}

async function updateLastSync(db: SQLite.SQLiteDatabase, uuidParaUso: string) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  await db.runAsync(
    `
    INSERT INTO sync_control (sindico_uuid, device_uuid, last_sync_at)
    VALUES (?, ?, ?)
    ON CONFLICT(sindico_uuid, device_uuid)
    DO UPDATE SET last_sync_at = excluded.last_sync_at
    `,
    [uuidParaUso, DEVICE_UUID, now],
  );
}

/* ------------------------------------------------------------------ */
/* PUSH GENÉRICO DE TABELAS PAI */
/* ------------------------------------------------------------------ */
async function pushTable(
  db: SQLite.SQLiteDatabase,
  uuidParaUso: string,
  lastSync: string | null,
  table: string,
) {
  const rows = await db.getAllAsync<any>(
    `
    SELECT *
    FROM ${table}
    WHERE 1=1
      ${lastSync ? 'AND updated_at > ?' : ''}
    `,
    lastSync ? [lastSync] : [],
  );

  if (!rows.length) return;

  console.log(`⬆️ Push local → servidor (${table})`);

  await callApi(`salvar_${table}`, {
    sindico_uuid: uuidParaUso,
    device_uuid: DEVICE_UUID,
    rows,
  });
}

/* ------------------------------------------------------------------ */
/* PUSH VISTORIAS COM UUID CORRETO */
/* ------------------------------------------------------------------ */
async function pushLocalVistorias(
  db: SQLite.SQLiteDatabase,
  uuidParaUso: string,
  lastSync: string | null,
) {
  console.log('⬆️ Push local → servidor (vistorias)');

  const vistorias = await db.getAllAsync<VistoriaLocal>(
    `
    SELECT *
    FROM vistorias
    WHERE deleted_at IS NULL
      ${lastSync ? 'AND updated_at > ?' : ''}
    `,
    lastSync ? [lastSync] : [],
  );

  if (!vistorias.length) return;

  const vistoriasPrepared = [];
  for (const v of vistorias) {
    const condominioRow = await db.getFirstAsync<{ uuid: string }>(
      `SELECT uuid FROM condominios WHERE uuid = ?`,
      [v.condominio_uuid],
    );
    if (!condominioRow) {
      console.warn(`⚠️ Condomínio local não encontrado: ${v.condominio_uuid}`);
      continue;
    }

    vistoriasPrepared.push({
      ...v,
      device_uuid: DEVICE_UUID,
      condominio_uuid: condominioRow.uuid,
      data_vistoria: formatForMySQL(v.data_vistoria),
      updated_at: formatForMySQL(v.updated_at),
      created_at: formatForMySQL(v.created_at),
      status: normalizeStatus(v.status),
    });
  }

  if (!vistoriasPrepared.length) return;

  await callApi('salvar_vistorias', {
    sindico_uuid: uuidParaUso,
    device_uuid: DEVICE_UUID,
    vistorias: vistoriasPrepared,
  });
}

/* ------------------------------------------------------------------ */
/* PUSH VISTORIA_ITENS COM UUID CORRETO */
/* ------------------------------------------------------------------ */
async function pushLocalVistoriaItens(
  db: SQLite.SQLiteDatabase,
  uuidParaUso: string,
  lastSync: string | null,
) {
  console.log('⬆️ Push local → servidor (vistoria_itens)');

  const items = await db.getAllAsync<VistoriaItemLocal>(
    `
    SELECT *
    FROM vistoria_itens
    WHERE deleted_at IS NULL
      ${lastSync ? 'AND updated_at > ?' : ''}
    `,
    lastSync ? [lastSync] : [],
  );

  if (!items.length) return;

  const itemsPrepared = [];
  for (const i of items) {
    const vistoriaRow = await db.getFirstAsync<{ uuid: string }>(
      `SELECT uuid FROM vistorias WHERE uuid = ?`,
      [i.vistoria_uuid],
    );
    if (!vistoriaRow) {
      console.warn(`⚠️ Vistoria local não encontrada: ${i.vistoria_uuid}`);
      continue;
    }

    const itemRow = await db.getFirstAsync<{ uuid: string }>(
      `SELECT uuid FROM itens WHERE uuid = ?`,
      [i.item_uuid],
    );
    if (!itemRow) {
      console.warn(`⚠️ Item local não encontrado: ${i.item_uuid}`);
      continue;
    }

    itemsPrepared.push({
      ...i,
      vistoria_uuid: vistoriaRow.uuid,
      item_uuid: itemRow.uuid,
      updated_at: formatForMySQL(i.updated_at),
      created_at: formatForMySQL(i.created_at),
    });
  }

  if (!itemsPrepared.length) return;

  await callApi('salvar_vistoria_itens', {
    sindico_uuid: uuidParaUso,
    device_uuid: DEVICE_UUID,
    vistoria_itens: itemsPrepared,
  });
}

/* ------------------------------------------------------------------ */
/* PULL / MERGE */
/* ------------------------------------------------------------------ */
async function pullServerChanges(
  db: SQLite.SQLiteDatabase,
  sindicoUuid: string,
  lastSync: string | null,
) {
  console.log('⬇️ Pull servidor → local');

  const data = await callApi('listar_tudo', undefined, 'GET');

  if (!data) return;

  await mergeTable(db, 'sindicos', data.sindicos);
  await mergeTable(db, 'condominios', data.condominios);
  await mergeTable(db, 'grupos', data.grupos);
  await mergeTable(db, 'itens', data.itens);
  await mergeTable(db, 'vistorias', data.vistorias);
  await mergeTable(db, 'vistoria_itens', data.vistoria_itens);
}

/* ------------------------------------------------------------------ */
/* MERGE GENÉRICO */
/* ------------------------------------------------------------------ */
async function mergeTable(
  db: SQLite.SQLiteDatabase,
  table: string,
  rows: any[] = [],
) {
  if (!rows.length) return;

  for (const row of rows) {
    const local = await db.getFirstAsync<{ updated_at: string }>(
      `SELECT updated_at FROM ${table} WHERE uuid = ?`,
      [row.uuid],
    );

    if (!local) {
      await insertRow(db, table, row);
    } else if (row.updated_at > local.updated_at) {
      await updateRow(db, table, row);
    }
  }
}

async function insertRow(db: SQLite.SQLiteDatabase, table: string, row: any) {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(',');
  const values = keys.map((k) => row[k]);

  await db.runAsync(
    `INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`,
    values,
  );
}

async function updateRow(db: SQLite.SQLiteDatabase, table: string, row: any) {
  const keys = Object.keys(row).filter((k) => k !== 'uuid');
  const setters = keys.map((k) => `${k} = ?`).join(',');
  const values = keys.map((k) => row[k]);

  await db.runAsync(`UPDATE ${table} SET ${setters} WHERE uuid = ?`, [
    ...values,
    row.uuid,
  ]);
}

/* ------------------------------------------------------------------ */
/* API / FETCH */
/* ------------------------------------------------------------------ */
async function callApi(action: string, body?: any, method?: 'GET' | 'POST') {
  const response = await fetch(`${API_URL}?action=${action}`, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error: ${text}`);
  }

  return response.json();
}

/* ------------------------------------------------------------------ */
/* UTILIDADES */
/* ------------------------------------------------------------------ */
function formatForMySQL(datetime: string) {
  return datetime.replace('T', ' ').replace('Z', '').split('.')[0];
}

function normalizeStatus(status: string): 'EM_ANDAMENTO' | 'FINALIZADA' {
  switch (status.toUpperCase()) {
    case 'EM_ANDAMENTO':
    case 'EM ANDAMENTO':
      return 'EM_ANDAMENTO';
    case 'FINALIZADA':
    case 'CONCLUIDA':
      return 'FINALIZADA';
    default:
      throw new Error(`Status inválido: ${status}`);
  }
}
