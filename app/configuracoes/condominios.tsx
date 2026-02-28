import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getDatabase } from "../../src/database/database";
import { uuidv4 } from "../../src/utils/uuid";

export default function CadastroCondominio() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sindicoUuid: string;
    uuid?: string;
    nome?: string;
    endereco?: string;
    cidade?: string;
    cnpj?: string;
  }>();

  const [nome, setNome] = useState(params.nome || "");
  const [endereco, setEndereco] = useState(params.endereco || "");
  const [cidade, setCidade] = useState(params.cidade || "");
  const [cnpj, setCnpj] = useState(params.cnpj || "");

  async function handleExcluir() {
    if (!params.uuid) return;

    Alert.alert(
      "Confirmar Exclusão",
      "Deseja remover este condomínio e seus grupos?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const db = await getDatabase();
              // ✅ Agora sim: Soft Delete real
              await db.runAsync(
                "UPDATE condominios SET ativo = 0 WHERE uuid = ?",
                [params.uuid ?? ""],
              );
              await db.runAsync(
                "UPDATE grupos SET ativo = 0 WHERE condominio_uuid = ?",
                [params.uuid ?? ""],
              );
              router.back();
            } catch {
              Alert.alert("Erro", "Falha ao excluir.");
            }
          },
        },
      ],
    );
  }

  async function salvar() {
    if (!params.sindicoUuid) {
      Alert.alert("Erro", "Sessão inválida.");
      return;
    }
    if (!nome.trim() || !endereco.trim()) {
      Alert.alert("Atenção", "Preencha nome e endereço");
      return;
    }

    const db = await getDatabase();
    try {
      if (params.uuid) {
        await db.runAsync(
          `UPDATE condominios SET nome = ?, endereco = ?, cidade = ?, cnpj = ? WHERE uuid = ?`,
          [nome, endereco, cidade, cnpj, params.uuid],
        );
      } else {
        await db.runAsync(
          `INSERT INTO condominios (uuid, nome, endereco, cidade, cnpj, sindico_uuid, ativo) VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [uuidv4(), nome, endereco, cidade, cnpj, params.sindicoUuid],
        );
      }
      router.back();
    } catch {
      Alert.alert("Erro", "Erro ao salvar.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {params.uuid ? "Editar Condomínio" : "Novo Condomínio"}
        </Text>
        {params.uuid && (
          <TouchableOpacity onPress={handleExcluir} style={styles.trashBtn}>
            <Ionicons name="trash-outline" size={28} color="#dc3545" />
          </TouchableOpacity>
        )}
      </View>
      {/* ... Restante do formulário igual */}
      <TextInput
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
        style={styles.input}
      />
      <TextInput
        placeholder="Endereço"
        value={endereco}
        onChangeText={setEndereco}
        style={styles.input}
      />
      <TextInput
        placeholder="Cidade"
        value={cidade}
        onChangeText={setCidade}
        style={styles.input}
      />
      <TextInput
        placeholder="CNPJ"
        value={cnpj}
        onChangeText={setCnpj}
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
          onPress={salvar}
          style={[styles.botao, styles.botaoSalvar]}
        >
          <Text style={styles.botaoTexto}>
            {params.uuid ? "Salvar" : "Cadastrar"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    paddingTop: 45,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
    position: "relative",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  trashBtn: {
    position: "absolute",
    right: 0,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  botao: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  botaoVoltar: {
    backgroundColor: "#6c757d",
  },
  botaoSalvar: {
    backgroundColor: "#198754",
  },
  botaoTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
