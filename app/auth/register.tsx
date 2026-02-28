import { useRouter } from "expo-router";
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

export default function Register() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const router = useRouter();

  async function salvar() {
    if (!nome || !email || !senha) {
      Alert.alert("Erro", "Preencha todos os campos");
      return;
    }

    try {
      const db = await getDatabase();

      // Agora inserimos explicitamente como 'SINDICO'
      await db.runAsync(
        "INSERT INTO sindicos (uuid, nome, email, senha, nivel) VALUES (?, ?, ?, ?, ?)",
        [uuidv4(), nome, email, senha, "SINDICO"],
      );

      Alert.alert("Sucesso", "Novo síndico cadastrado pelo ADM!");
      router.back();
    } catch {
      Alert.alert("Erro", "E-mail já cadastrado.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nova Conta</Text>

      <TextInput
        placeholder="Nome Completo"
        style={styles.input}
        onChangeText={setNome}
      />
      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Senha"
        style={styles.input}
        secureTextEntry
        onChangeText={setSenha}
      />

      <TouchableOpacity style={styles.button} onPress={salvar}>
        <Text style={styles.buttonText}>Cadastrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingBottom: 280,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#2e7d32",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
