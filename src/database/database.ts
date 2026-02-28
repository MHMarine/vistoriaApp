import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase;

export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync("vistoria.db");
  }
  return db;
}

export async function initDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    -- Tabela de Síndicos
    CREATE TABLE IF NOT EXISTS sindicos (
      uuid TEXT PRIMARY KEY NOT NULL, -- Definido como PK
      nome TEXT,
      email TEXT UNIQUE,
      senha TEXT,
      nivel TEXT DEFAULT 'SINDICO',
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      updated_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      deleted_at DATETIME DEFAULT NULL
    );

    -- Tabela de Condomínios
    CREATE TABLE IF NOT EXISTS condominios (
      uuid TEXT PRIMARY KEY NOT NULL,
      nome TEXT,
      endereco TEXT,
      cidade TEXT,
      cnpj TEXT,
      sindico_uuid TEXT NOT NULL,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      updated_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (sindico_uuid) REFERENCES sindicos(uuid)
    );

    -- Tabela de Grupos
    CREATE TABLE IF NOT EXISTS grupos (
      uuid TEXT PRIMARY KEY NOT NULL,
      sindico_uuid TEXT NOT NULL,
      condominio_uuid TEXT NOT NULL,
      nome TEXT NOT NULL,
      prazo_meses INTEGER NOT NULL,
      ordem INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      updated_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (sindico_uuid) REFERENCES sindicos(uuid),
      FOREIGN KEY (condominio_uuid) REFERENCES condominios(uuid)
    );

    -- Tabela de Itens
    CREATE TABLE IF NOT EXISTS itens (
      uuid TEXT PRIMARY KEY NOT NULL,      
      grupo_uuid TEXT NOT NULL,
      nome TEXT NOT NULL,
      ordem INTEGER DEFAULT 0,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      updated_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (grupo_uuid) REFERENCES grupos(uuid)
    );

    -- Tabela de Vistorias
    CREATE TABLE IF NOT EXISTS vistorias (
      uuid TEXT PRIMARY KEY NOT NULL,
      device_uuid TEXT,
      sindico_uuid TEXT NOT NULL, 
      condominio_uuid TEXT NOT NULL,
      data_vistoria DATETIME NOT NULL,
      status TEXT DEFAULT 'EM_ANDAMENTO',
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      updated_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (condominio_uuid) REFERENCES condominios(uuid),
      FOREIGN KEY (sindico_uuid) REFERENCES sindicos(uuid)
    );

    -- Tabela de Itens da Vistoria
    CREATE TABLE IF NOT EXISTS vistoria_itens (
      uuid TEXT PRIMARY KEY NOT NULL,
      device_uuid TEXT,
      vistoria_uuid TEXT NOT NULL, 
      item_uuid TEXT NOT NULL,
      status TEXT CHECK(status IN ('OK', 'NOK', 'ND')) NOT NULL,
      observacao TEXT,
      foto_path TEXT,
      ativo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      updated_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      deleted_at DATETIME DEFAULT NULL,
      FOREIGN KEY (vistoria_uuid) REFERENCES vistorias(uuid) ON DELETE CASCADE,
      FOREIGN KEY (item_uuid) REFERENCES itens(uuid)
    );

    CREATE TABLE IF NOT EXISTS sync_control (
      sindico_uuid TEXT NOT NULL,
      device_uuid TEXT NOT NULL,
      last_sync_at DATETIME,
      created_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      updated_at DATETIME DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')),
      UNIQUE (sindico_uuid, device_uuid)
    );

    CREATE INDEX IF NOT EXISTS idx_grupos_updated_at ON grupos(updated_at);
    CREATE INDEX IF NOT EXISTS idx_itens_updated_at ON itens(updated_at);
    CREATE INDEX IF NOT EXISTS idx_vistorias_updated_at ON vistorias(updated_at);
    CREATE INDEX IF NOT EXISTS idx_vistoria_itens_updated_at ON vistoria_itens(updated_at);

    -- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA EM UTC
    CREATE TRIGGER IF NOT EXISTS tr_sync_control_updated_at
    BEFORE UPDATE ON sync_control
    FOR EACH ROW
    BEGIN
      SELECT
        CASE
          WHEN NEW.updated_at = OLD.updated_at THEN
            NEW.updated_at = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')
        END;
    END;

    CREATE TRIGGER IF NOT EXISTS tr_sindicos_updated_at
    BEFORE UPDATE ON sindicos
    FOR EACH ROW
    BEGIN
      SELECT
        CASE
          WHEN NEW.updated_at = OLD.updated_at THEN
            NEW.updated_at = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')
        END;
    END;

    CREATE TRIGGER IF NOT EXISTS tr_condominios_updated_at
    BEFORE UPDATE ON condominios
    FOR EACH ROW
    BEGIN
      SELECT
        CASE
          WHEN NEW.updated_at = OLD.updated_at THEN
            NEW.updated_at = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')
        END;
    END;
    
    CREATE TRIGGER IF NOT EXISTS tr_grupos_updated_at
    BEFORE UPDATE ON grupos
    FOR EACH ROW
    BEGIN
      SELECT
        CASE
          WHEN NEW.updated_at = OLD.updated_at THEN
            NEW.updated_at = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')
        END;
    END;  
    
    CREATE TRIGGER IF NOT EXISTS tr_itens_updated_at
    BEFORE UPDATE ON itens
    FOR EACH ROW
    BEGIN
      SELECT
        CASE
          WHEN NEW.updated_at = OLD.updated_at THEN
            NEW.updated_at = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')
        END;
    END;
    
    CREATE TRIGGER IF NOT EXISTS tr_vistorias_updated_at
    BEFORE UPDATE ON vistorias
    FOR EACH ROW
    BEGIN
      SELECT
        CASE
          WHEN NEW.updated_at = OLD.updated_at THEN
            NEW.updated_at = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')
        END;
    END;    

    CREATE TRIGGER IF NOT EXISTS tr_vistoria_itens_updated_at
    BEFORE UPDATE ON vistoria_itens
    FOR EACH ROW
    BEGIN
      SELECT
        CASE
          WHEN NEW.updated_at = OLD.updated_at THEN
            NEW.updated_at = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW')
        END;
    END;    
  `);
}
