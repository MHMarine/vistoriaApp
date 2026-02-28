import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDatabase } from "../../src/database/database";

export default function MenuConfiguracoes() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const router = useRouter();

  const carregarGrupos = useCallback(async () => {
    const db = await getDatabase();
    const res = await db.getAllAsync("SELECT * FROM grupos ORDER BY nome");
    setGrupos(res);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarGrupos();
    }, [carregarGrupos]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações de Vistoria</Text>
      <Text style={styles.subtitle}>
        Selecione um grupo para gerenciar os itens:
      </Text>

      <FlatList
        data={grupos}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: "/configuracoes/itens",
                params: { grupoUuid: item.uuid, grupoNome: item.nome },
              })
            }
          >
            <Text style={styles.cardTitle}>{item.nome}</Text>
            <Text style={styles.cardSubtitle}>Toque para editar itens</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnNovoGrupo}
          onPress={() => router.push("/configuracoes/grupos")}
        >
          <Text style={styles.btnText}>+ Criar Novo Grupo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => router.back()}
        >
          <Text style={styles.btnText}>Voltar ao Início</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff", paddingTop: 45 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: { textAlign: "center", color: "#666", marginBottom: 20 },
  card: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: "#0d6efd",
  },
  cardTitle: { fontSize: 18, fontWeight: "bold" },
  cardSubtitle: { fontSize: 12, color: "#888" },
  footer: { gap: 10, marginBottom: 38, marginTop: 10 },

  // Estilo para o botão de Admin
  btnAdmin: {
    backgroundColor: "#6f42c1", // Roxo para destacar que é administrativo
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },

  btnNovoGrupo: {
    backgroundColor: "#198754",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnVoltar: {
    backgroundColor: "#ff8c00",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
