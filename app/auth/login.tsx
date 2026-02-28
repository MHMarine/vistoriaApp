import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getDatabase } from '../../src/database/database';
import { seedDatabase } from '../../src/database/seed';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const router = useRouter();

  async function login() {
    // 1. Verificação de campos vazios
    if (!email || !senha) {
      Alert.alert('Atenção', 'Por favor, preencha o e-mail e a senha.');
      return;
    }

    try {
      const db = await getDatabase();

      // Executa o seed (ele só inserirá se o banco estiver vazio)
      await seedDatabase(db);

      // Busca o síndico usando UUID agora
      const result = await db.getAllAsync<any>(
        'SELECT uuid, nome, nivel FROM sindicos WHERE email = ? AND senha = ?',
        [email.trim().toLowerCase(), senha],
      );

      if (result.length > 0) {
        const sindico = result[0];

        // 4. Navegação passando os parâmetros de nível
        router.replace({
          pathname: '/dashboard',
          params: {
            nivel: sindico.nivel,
            uuid: sindico.uuid,
            nome: sindico.nome,
          },
        });
      } else {
        Alert.alert('Erro de Acesso', 'E-mail ou senha incorretos.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Erro Interno',
        'Não foi possível conectar ao banco de dados.',
      );
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>vistoriaApp</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Senha"
        secureTextEntry
        style={styles.input}
        value={senha}
        onChangeText={setSenha}
      />

      <TouchableOpacity style={styles.button} onPress={login}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
    color: '#2e7d32',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
