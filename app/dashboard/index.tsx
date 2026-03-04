import { Ionicons } from '@expo/vector-icons';
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { syncNow } from '../../src/api/sync.service';
import { getDatabase } from '../../src/database/database';

export default function Dashboard() {
  const [condominios, setCondominios] = useState<any[]>([]);
  const router = useRouter();
  const params = useLocalSearchParams<{
    nivel: string;
    uuid: string;
    nome: string;
  }>();

  const handleSync = async () => {
    try {
      Alert.alert('Sincronização', 'Iniciando...');
      await syncNow(params.uuid);
      Alert.alert('Sucesso', 'Dados atualizados!');
    } catch (err) {
      console.error('Erro na sincronização:', err);
      Alert.alert('Erro', 'Falha na sincronização');
    }
  };

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        const db = await getDatabase();
        const result = await db.getAllAsync(
          `
        SELECT *
        FROM condominios
        WHERE ativo = 1
          AND sindico_uuid = ?
        ORDER BY nome
        `,
          [params.uuid],
        );
        setCondominios(result);
      }

      carregar();
    }, [params.uuid]),
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText} numberOfLines={1}>
            Olá, {params.nome || 'Síndico'}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: params.nivel === 'ADM' ? '#6f42c1' : '#28a745',
              },
            ]}
          >
            <Text style={styles.badgeText}>{params.nivel}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {params.nivel === 'ADM' && (
            <TouchableOpacity
              style={styles.iconOnlyButton}
              onPress={() =>
                router.push({
                  pathname: '/configuracoes/sindicos',
                  params: { uuidLogado: params.uuid },
                })
              }
            >
              <Ionicons name="people" size={26} color="#a29bfe" />
            </TouchableOpacity>
          )}

          {/* NOVO CONDOMÍNIO (Sem params de item aqui) */}
          <TouchableOpacity
            style={styles.iconOnlyButton}
            onPress={() =>
              router.push({
                pathname: '/configuracoes/condominios',
                params: { sindicoUuid: params.uuid },
              })
            }
          >
            <Ionicons name="business" size={28} color="#74b9ff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconOnlyButton} onPress={handleSync}>
            <Ionicons name="refresh-circle" size={28} color="#fdcb6e" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Meus Condomínios</Text>

      <FlatList
        data={condominios}
        keyExtractor={(item) => item.uuid}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.infoContainer}>
                <Text style={styles.cardTitle}>{item.nome}</Text>
                <Text style={styles.cardSubtitle}>{item.endereco}</Text>
                <Text style={styles.cardSubtitle}>
                  {item.cidade ? `${item.cidade}` : ''}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  router.push({
                    pathname: '/vistoria/vistoria-execucao',
                    params: {
                      condominioUuid: item.uuid,
                      condominioNome: item.nome,
                      sindicoUuid: params.uuid,
                      nivel: params.nivel,
                      nome: params.nome,
                    },
                  });
                }}
              >
                <Ionicons name="add-circle" size={42} color="#198754" />
              </TouchableOpacity>
            </View>

            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={styles.footerTab}
                onPress={() =>
                  router.push({
                    pathname: '/configuracoes/grupos',
                    params: {
                      condominioUuid: item.uuid,
                      condominioNome: item.nome,
                      sindicoUuid: params.uuid,
                    },
                  })
                }
              >
                <Ionicons name="list" size={26} color="#0d6efd" />
                <Text style={styles.footerText}>Grupos/Itens</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footerTab}
                onPress={() =>
                  router.push({
                    pathname: '/vistoria',
                    params: {
                      condominioUuid: item.uuid,
                      condominioNome: item.nome,
                    },
                  })
                }
              >
                <Ionicons name="time" size={26} color="#f1c40f" />
                <Text style={styles.footerText}>Histórico</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footerTab}
                onPress={() =>
                  router.push({
                    pathname: '/configuracoes/condominios',
                    params: {
                      uuid: item.uuid,
                      nome: item.nome,
                      endereco: item.endereco,
                      cidade: item.cidade,
                      cnpj: item.cnpj,
                      sindicoUuid: item.sindico_uuid,
                    },
                  })
                }
              >
                <Ionicons name="settings-sharp" size={26} color="#636e72" />
                <Text style={styles.footerText}>Editar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity
        style={styles.btnSair}
        onPress={() => router.replace('/auth/login')}
      >
        <Ionicons
          name="log-out-outline"
          size={20}
          color="#dc3545"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.btnSairText}>Sair da Conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6' },
  header: {
    paddingTop: 50,
    paddingHorizontal: 25,
    paddingBottom: 25,
    backgroundColor: '#2c3e50',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    paddingRight: 5,
    marginBottom: -45,
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 10,
    borderRadius: 12,
  },
  iconOnlyButton: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncBtnSmall: {
    backgroundColor: '#3498db', // Destaque para o sync
  },
  welcomeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  syncBtn: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 30,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    margin: 20,
    color: '#34495e',
  },
  cardInfo: {
    marginBottom: 15,
  },
  cardAddr: { fontSize: 14, color: '#7f8c8d', marginBottom: 15 },
  cardCity: { fontSize: 14, color: '#807f8d', marginBottom: 0, marginTop: -15 },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionLabel: {
    fontSize: 11,
    color: '#0d6efd',
    marginTop: 4,
    fontWeight: '600',
  },
  actionNew: {
    borderLeftWidth: 1,
    borderLeftColor: '#eee',
  },
  btnSair: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 40,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  btnSairText: {
    color: '#dc3545',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  infoContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  btnNovaVistoria: {
    marginLeft: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  footerText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
});
