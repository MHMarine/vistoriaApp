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

type Grupo = {
  uuid: string;
  nome: string;
  prazo_meses: number;
  ativo: number;
};

export default function GruposConfig() {
  const router = useRouter();
  // Captura os parâmetros enviados pelo card da Dashboard
  const params = useLocalSearchParams<{
    condominioUuid: string;
    condominioNome: string;
    sindicoUuid: string;
  }>();

  const [nome, setNome] = useState("");
  const [prazo, setPrazo] = useState("");
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [editandoUuid, setEditandoUuid] = useState<string | null>(null);

  /* =======================
     READ (Filtrado por Condomínio)
  ======================= */
  const carregarGrupos = useCallback(async () => {
    if (!params.condominioUuid) return;

    const db = await getDatabase();
    // Filtro obrigatório para isolar os dados
    const res = await db.getAllAsync<Grupo>(
      "SELECT * FROM grupos WHERE condominio_uuid = ? AND ativo = 1 ORDER BY nome",
      [params.condominioUuid],
    );
    setGrupos(res);
  }, [params.condominioUuid]);

  useEffect(() => {
    carregarGrupos();
  }, [carregarGrupos]);

  /* =======================
     CREATE / UPDATE
  ======================= */
  async function salvarGrupo() {
    if (
      !nome.trim() ||
      !prazo ||
      !params.condominioUuid ||
      !params.sindicoUuid
    ) {
      Alert.alert("Erro", "Preencha todos os campos corretamente.");
      return;
    }

    const db = await getDatabase();

    try {
      if (editandoUuid) {
        // Atualização usando UUID
        await db.runAsync(
          "UPDATE grupos SET nome = ?, prazo_meses = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?",
          [nome, Number(prazo), editandoUuid],
        );
        setEditandoUuid(null);
        Alert.alert("Sucesso", "Grupo atualizado!");
      } else {
        // Correção do erro NOT NULL: enviando sindico_uuid e condominio_uuid
        await db.runAsync(
          "INSERT INTO grupos (uuid, sindico_uuid, condominio_uuid, nome, prazo_meses, ativo) VALUES (?, ?, ?, ?, ?, 1)",
          [
            uuidv4(),
            params.sindicoUuid,
            params.condominioUuid,
            nome,
            Number(prazo),
          ],
        );
        Alert.alert("Sucesso", "Grupo adicionado!");
      }

      setNome("");
      setPrazo("");
      carregarGrupos();
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível guardar no banco de dados.");
    }
  }

  /* =======================
     DELETE (Soft Delete com Alerta)
  ======================= */
  async function excluirGrupo(uuid: string) {
    Alert.alert("Confirmar Exclusão", "Deseja realmente remover este grupo?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const db = await getDatabase();
          await db.runAsync("UPDATE grupos SET ativo = 0 WHERE uuid = ?", [
            uuid,
          ]);
          carregarGrupos();
        },
      },
    ]);
  }

  function prepararEdicao(grupo: Grupo) {
    setNome(grupo.nome);
    setPrazo(String(grupo.prazo_meses));
    setEditandoUuid(grupo.uuid);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Grupos e itens de {params.condominioNome}
      </Text>
      <Text style={styles.subtitle}>Toque no grupo para editar seus itens</Text>

      <TextInput
        placeholder="Nome do grupo (ex: Fachada)"
        value={nome}
        onChangeText={setNome}
        style={styles.input}
      />

      <TextInput
        placeholder="Prazo em meses (ex: 12)"
        value={prazo}
        onChangeText={setPrazo}
        keyboardType="numeric"
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
          onPress={salvarGrupo}
          style={[styles.botao, styles.botaoSalvar]}
        >
          <Text style={styles.botaoTexto}>
            {editandoUuid ? "Salvar" : "Adicionar"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={grupos}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() =>
                router.push({
                  pathname: "/configuracoes/itens",
                  params: {
                    grupoUuid: item.uuid,
                    grupoNome: item.nome,
                    condominioUuid: params.condominioUuid,
                  },
                })
              }
            >
              <Text style={styles.cardTitle}>{item.nome}</Text>
              <Text style={styles.cardSubtitle}>
                Prazo: {item.prazo_meses} meses
              </Text>
            </TouchableOpacity>

            <View style={styles.acoes}>
              <TouchableOpacity onPress={() => prepararEdicao(item)}>
                <Ionicons name="create-outline" size={24} color="#0d6efd" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => excluirGrupo(item.uuid)}>
                <Ionicons name="trash-outline" size={24} color="#dc3545" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", paddingTop: 40 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 5,
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  buttonContainer: { flexDirection: "row", gap: 10, marginBottom: 25 },
  botao: { flex: 1, padding: 16, borderRadius: 8, alignItems: "center" },
  botaoVoltar: { backgroundColor: "#ff8c00" },
  botaoSalvar: { backgroundColor: "#198754" },
  botaoTexto: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  card: {
    backgroundColor: "#f8f9fa",
    padding: 18,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontWeight: "bold", fontSize: 17, color: "#333" },
  cardSubtitle: { fontSize: 14, color: "#666", marginTop: 4 },
  acoes: { flexDirection: "row", gap: 15 },
});
