import { SQLiteDatabase } from "expo-sqlite";
import { uuidv4 } from "../utils/uuid";

export async function seedDatabase(db: SQLiteDatabase) {
  // Verificamos se já existe algum síndico
  const existentes = await db.getAllAsync("SELECT uuid FROM sindicos LIMIT 1");

  if (existentes.length === 0) {
    console.log("Iniciando Seed de dados padrão...");

    await db.withTransactionAsync(async () => {
      const condominioUuid = "47229c87-c2c9-4dc4-be94-cfd4f2e38b9b";
      const rootAdminUuid = "aa79b0f5-65e5-43d6-8a10-7e8b3c9ed905";

      // 1. Criar Síndico ADM
      await db.runAsync(
        `INSERT INTO sindicos (uuid, email, senha, nome, nivel) VALUES (?, ?, ?, ?, ?)`,
        [rootAdminUuid, "admin@local", "123", "Administrador Geral", "ADM"],
      );

      // 2. Criar um Condomínio inicial (necessário para as FKs de Grupos)
      await db.runAsync(
        `INSERT INTO condominios (uuid, nome, endereco, cidade, cnpj, sindico_uuid) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          condominioUuid,
          "Condomínio Central",
          "Rua Direita, 123, Centro",
          "São Paulo/SP",
          "123.456.789.10",
          rootAdminUuid,
        ],
      );

      // 3. Criar Grupos e Itens
      const estruturaInicial = [
        {
          nome: "Area Comum",
          prazo: 6,
          itens: ["Estacionamento", "Portaria", "Portões"],
        },
        {
          nome: "Segurança",
          prazo: 2,
          itens: ["Alarmes", "Câmeras", "Extintores"],
        },
        {
          nome: "Estrutura",
          prazo: 6,
          itens: ["Caixa d'água", "Fachada", "Telhado"],
        },
        {
          nome: "Iluminação",
          prazo: 3,
          itens: ["Estacionamento", "Halls", "Portaria"],
        },
        {
          nome: "Limpeza",
          prazo: 1,
          itens: ["Portaria", "Halls", "Estacionamento"],
        },
      ];

      for (const [gIndex, g] of estruturaInicial.entries()) {
        const grupoUuid = uuidv4();
        await db.runAsync(
          `INSERT INTO grupos (uuid, sindico_uuid, condominio_uuid, nome, prazo_meses, ordem) VALUES (?, ?, ?, ?, ?, ?)`,
          [grupoUuid, rootAdminUuid, condominioUuid, g.nome, g.prazo, gIndex],
        );

        for (const [iIndex, itemNome] of g.itens.entries()) {
          await db.runAsync(
            `INSERT INTO itens (uuid, grupo_uuid, nome, ordem) VALUES (?, ?, ?, ?)`,
            [uuidv4(), grupoUuid, itemNome, iIndex],
          );
        }
      }
    });
    console.log("Seed finalizado!");
  }
}
