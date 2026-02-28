import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDatabase } from "../../src/database/database";

export default function ListaSindicos() {
  const [sindicos, setSindicos] = useState<any[]>([]);
  const { uuidLogado } = useLocalSearchParams<{ uuidLogado: string }>();
  const router = useRouter();

  // Carrega os síndicos sempre que a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      carregarSindicos();
    }, []),
  );

  async function carregarSindicos() {
    const db = await getDatabase();
    // Pegamos todos, ordenando por nome
    const result = await db.getAllAsync("SELECT * FROM sindicos ORDER BY nome");
    setSindicos(result);
  }

  async function confirmarExclusao(uuid: string, nome: string) {
    // Segurança: Não deixa excluir o admin principal (ID 1)
    if (uuid === "aa79b0f5-65e5-43d6-8a10-7e8b3c9ed905") {
      Alert.alert(
        "Acesso Negado",
        "O administrador principal não pode ser removido.",
      );
      return;
    }

    Alert.alert("Excluir Síndico", `Tem certeza que deseja remover ${nome}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => excluirSindico(uuid),
      },
    ]);
  }

  async function excluirSindico(uuid: string) {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM sindicos WHERE uuid = ?", [uuid]);
    carregarSindicos(); // Atualiza a lista
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Gerenciar Síndicos" }} />

      <FlatList
        data={sindicos}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => {
          const ehSindicoLogado = String(item.uuid) === String(uuidLogado);

          return (
            <View style={styles.card}>
              <View style={styles.info}>
                <Text style={styles.nome}>
                  {item.nome} {ehSindicoLogado ? "(Você)" : ""}
                </Text>
                <Text style={styles.email}>{item.email}</Text>

                {/* O ÍCONE/BADGE ROXO */}
                <View
                  style={[
                    styles.badge,
                    item.nivel === "ADM"
                      ? styles.badgeAdm
                      : styles.badgeSindico,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {item.nivel === "ADM" ? "⚡ " : "👤 "}
                    {item.nivel}
                  </Text>
                </View>
              </View>

              {/* Lixeira protegida */}
              {!ehSindicoLogado && (
                <TouchableOpacity
                  onPress={() => confirmarExclusao(item.uuid, item.nome)}
                  style={styles.btnDelete}
                >
                  <Text style={styles.btnDeleteText}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum síndico cadastrado.</Text>
        }
      />

      <TouchableOpacity
        style={styles.btnFloating}
        onPress={() => router.push("/auth/register")}
      >
        <Text style={styles.btnFloatingText}>+ Novo Síndico</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4", padding: 15 },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    elevation: 2, // Sombra no Android
    shadowColor: "#000", // Sombra no iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  info: { flex: 1 },
  nome: { fontSize: 18, fontWeight: "bold", color: "#333" },
  email: { fontSize: 14, color: "#666", marginBottom: 5 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeAdm: { backgroundColor: "#6f42c1" },
  badgeSindico: { backgroundColor: "#6c757d" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  btnDelete: { padding: 10 },
  btnDeleteText: { fontSize: 20 },
  empty: { textAlign: "center", marginTop: 50, color: "#999" },
  btnFloating: {
    backgroundColor: "#6f42c1",
    padding: 15,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  btnFloatingText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
