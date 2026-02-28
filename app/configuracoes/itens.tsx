import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getDatabase } from "../../src/database/database";
import { uuidv4 } from "../../src/utils/uuid";

type Item = {
  uuid: string;
  nome: string;
  grupo_uuid: string;
  ativo: number;
};

export default function Itens() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    grupoUuid: string;
    grupoNome: string;
    condominioUuid: string;
  }>();

  // Desestruturando para facilitar o uso e evitar avisos de 'unused'
  const { grupoUuid, grupoNome } = params;

  const [nome, setNome] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [editandoUuid, setEditandoUuid] = useState<string | null>(null);

  /* =======================
      READ (Busca Itens do Grupo)
  ======================= */
  const carregarItens = useCallback(async () => {
    if (!grupoUuid) return;

    const db = await getDatabase();
    try {
      const res = await db.getAllAsync<Item>(
        `SELECT * FROM itens 
         WHERE grupo_uuid = ? AND ativo = 1 
         ORDER BY nome ASC`,
        [grupoUuid],
      );
      setItens(res);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    }
  }, [grupoUuid]);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  /* =======================
      CREATE / UPDATE (O Coração do Erro)
  ======================= */
  async function salvarItem() {
    if (!nome.trim() || !grupoUuid) {
      Alert.alert("Erro", "Preencha o nome do item.");
      return;
    }

    const db = await getDatabase();
    try {
      if (editandoUuid) {
        // Lógica de UPDATE (estava faltando!)
        await db.runAsync("UPDATE itens SET nome = ? WHERE uuid = ?", [
          nome,
          editandoUuid,
        ]);
        setEditandoUuid(null);
      } else {
        // Lógica de INSERT
        const novoUuid = uuidv4();
        await db.runAsync(
          "INSERT INTO itens (uuid, grupo_uuid, nome, ativo) VALUES (?, ?, ?, 1)",
          [novoUuid, grupoUuid, nome],
        );
      }

      setNome("");
      carregarItens();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      Alert.alert("Erro", "Falha ao gravar no banco.");
    }
  }

  /* =======================
      DELETE (Soft Delete)
  ======================= */
  async function excluirItem(uuid: string) {
    Alert.alert("Excluir Item", "Deseja remover este item?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            const db = await getDatabase();
            await db.runAsync("UPDATE itens SET ativo = 0 WHERE uuid = ?", [
              uuid,
            ]);
            carregarItens();
          } catch (error) {
            console.error("Erro ao excluir:", error);
          }
        },
      },
    ]);
  }

  function prepararEdicao(item: Item) {
    setNome(item.nome);
    setEditandoUuid(item.uuid);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Itens de: {grupoNome}</Text>

      <TextInput
        placeholder="Nome do item (ex: Motor do portão)"
        value={nome}
        onChangeText={setNome}
        style={styles.input}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.botao, styles.botaoVoltar]}
        >
          <Text style={styles.botaoTexto}>Voltar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={salvarItem}
          style={[styles.botao, styles.botaoSalvar]}
        >
          <Text style={styles.botaoTexto}>
            {editandoUuid ? "Atualizar" : "Adicionar"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={itens}
        keyExtractor={(item) => item.uuid}
        contentContainerStyle={{ paddingBottom: 38 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.itemTexto}>{item.nome}</Text>

            <View style={styles.acoes}>
              <TouchableOpacity onPress={() => prepararEdicao(item)}>
                <Ionicons name="create-outline" size={22} color="#0d6efd" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => excluirItem(item.uuid)}>
                <Ionicons name="trash-outline" size={22} color="#dc3545" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20, color: "#999" }}>
            Nenhum item cadastrado neste grupo.
          </Text>
        }
      />
    </View>
  );
}

// ... Estilos (os seus já estavam ótimos)
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", paddingTop: 45 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#2c3e50",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  buttonContainer: { flexDirection: "row", gap: 10, marginBottom: 20 },
  botao: { flex: 1, padding: 16, borderRadius: 8, alignItems: "center" },
  botaoVoltar: { backgroundColor: "#ff8c00" },
  botaoSalvar: { backgroundColor: "#198754" },
  botaoTexto: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  card: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  itemTexto: { fontSize: 16, color: "#333", flex: 1 },
  acoes: { flexDirection: "row", gap: 15 },
});
