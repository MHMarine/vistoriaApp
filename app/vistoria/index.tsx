import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDatabase } from "../../src/database/database";
import { uuidv4 } from "../../src/utils/uuid";

export default function HistoricoVistorias() {
  const { condominioUuid, condominioNome, nivel, uuid, nome } =
    useLocalSearchParams();
  const router = useRouter();

  const [vistorias, setVistorias] = useState<any[]>([]);
  const [detalheVisible, setDetalheVisible] = useState(false);
  const [vistoriaSelecionada, setVistoriaSelecionada] = useState<any>(null);
  const [itensDaVistoria, setItensDaVistoria] = useState<any[]>([]);

  // Estados de Filtro e Paginação
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState<{
    field: "inicio" | "fim";
    visible: boolean;
  }>({ field: "inicio", visible: false });
  const [pagina, setPagina] = useState(0);
  const ITENS_POR_PAGINA = 5;

  const cUuid = String(
    Array.isArray(condominioUuid) ? condominioUuid[0] : condominioUuid,
  );

  const carregarHistorico = useCallback(
    async (novaPagina = 0, resetar = false) => {
      if (!cUuid) return;
      const db = await getDatabase();
      const offset = novaPagina * ITENS_POR_PAGINA;

      let query =
        "SELECT * FROM vistorias WHERE condominio_uuid = ? AND status = 'FINALIZADA'";
      const params: any[] = [cUuid];

      if (dataInicio && dataFim) {
        query += " AND data_vistoria BETWEEN ? AND ?";
        // Ajuste para cobrir o dia inteiro na busca
        params.push(dataInicio.toISOString(), dataFim.toISOString());
      }

      query += " ORDER BY data_vistoria DESC LIMIT ? OFFSET ?";
      params.push(ITENS_POR_PAGINA, offset);

      const result: any[] = await db.getAllAsync(query, params);

      setVistorias((prev) => (resetar ? result : [...prev, ...result]));
      setPagina(novaPagina);
    },
    [cUuid, dataInicio, dataFim],
  );

  useEffect(() => {
    carregarHistorico(0, true);
  }, [carregarHistorico]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowPicker({ ...showPicker, visible: false });
    if (selectedDate) {
      if (showPicker.field === "inicio") setDataInicio(selectedDate);
      else setDataFim(selectedDate);
    }
  };

  // FUNÇÃO CORRIGIDA: Implementada a lógica de navegação e uso das variáveis
  async function handleIniciarVistoria() {
    try {
      const db = await getDatabase();

      // Verifica se existe alguma vistoria em aberto para este condomínio
      const existing: any = await db.getFirstAsync(
        "SELECT uuid FROM vistorias WHERE condominio_uuid = ? AND status = 'EM_ANDAMENTO' LIMIT 1",
        [cUuid],
      );

      let uuidFinal;
      if (existing) {
        uuidFinal = existing.uuid;
      } else {
        uuidFinal = uuidv4();
        const result = await db.runAsync(
          "INSERT INTO vistorias (uuid, condominio_uuid, data_vistoria, status) VALUES (?, ?, ?, ?)",
          [
            uuidFinal,
            cUuid,
            String(uuid),
            new Date().toISOString(),
            "EM_ANDAMENTO",
            1,
          ],
        );
        uuidFinal = result.lastInsertRowId;
      }

      // Navega para a execução passando os parâmetros necessários
      router.push({
        pathname: "/vistoria/vistoria-execucao",
        params: {
          vistoriaUuid: uuidFinal,
          condominioUuid: cUuid,
          condominioNome: condominioNome,
          sindicoUuid: uuid,
          nivel: nivel,
          nome: nome,
        },
      });
    } catch {
      Alert.alert("Erro", "Não foi possível iniciar a vistoria.");
    }
  }

  async function abrirDetalhes(vistoria: any) {
    const db = await getDatabase();
    const detalhes: any[] = await db.getAllAsync(
      `SELECT i.nome, vi.status, vi.observacao FROM vistoria_itens vi 
       JOIN itens i ON vi.item_uuid = i.uuid WHERE vi.vistoria_uuid = ?`,
      [vistoria.uuid],
    );
    setVistoriaSelecionada(vistoria);
    setItensDaVistoria(detalhes);
    setDetalheVisible(true);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Histórico de Vistorias" }} />

      <View style={styles.filtroContainer}>
        <Text style={styles.labelFiltro}>Filtrar por Período:</Text>
        <View style={styles.rowFiltro}>
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowPicker({ field: "inicio", visible: true })}
          >
            <Text style={styles.dateText}>
              {dataInicio ? dataInicio.toLocaleDateString("pt-BR") : "Início"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.divider}>até</Text>

          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowPicker({ field: "fim", visible: true })}
          >
            <Text style={styles.dateText}>
              {dataFim ? dataFim.toLocaleDateString("pt-BR") : "Fim"}
            </Text>
          </TouchableOpacity>

          {(dataInicio || dataFim) && (
            <TouchableOpacity
              style={styles.btnLimpar}
              onPress={() => {
                setDataInicio(null);
                setDataFim(null);
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>X</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showPicker.visible && (
        <DateTimePicker
          value={
            showPicker.field === "inicio"
              ? dataInicio || new Date()
              : dataFim || new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={onChangeDate}
        />
      )}

      <FlatList
        data={vistorias}
        keyExtractor={(item) => item.uuid}
        onEndReached={() => carregarHistorico(pagina + 1)}
        onEndReachedThreshold={0.2}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma vistoria encontrada.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.cardVistoria}
            onPress={() => abrirDetalhes(item)}
          >
            <View style={styles.linhaDataHora}>
              <Text style={styles.dataVistoria}>
                📅 {new Date(item.data_vistoria).toLocaleDateString("pt-BR")}
              </Text>

              <Text style={styles.horaVistoria}>
                ⏰{" "}
                {new Date(item.data_vistoria).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>

            <Text style={styles.verMais}>Toque para ver detalhes</Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={detalheVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTitleContainer}>
              <View style={styles.linhaDataHora}>
                <Text style={styles.modalTitle}>
                  Vistoria:{" "}
                  {vistoriaSelecionada
                    ? new Date(
                        vistoriaSelecionada.data_vistoria,
                      ).toLocaleDateString("pt-BR")
                    : ""}
                </Text>

                {vistoriaSelecionada && (
                  <Text style={styles.modalHora}>
                    {new Date(
                      vistoriaSelecionada.data_vistoria,
                    ).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                )}
              </View>
            </View>

            <FlatList
              data={itensDaVistoria}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={{ paddingRight: 20 }}
              renderItem={({ item }) => {
                const label =
                  item.status === "OK"
                    ? "OK"
                    : item.status === "NOK"
                      ? "NÃO OK"
                      : "ND";
                const colorStyle =
                  item.status === "OK"
                    ? styles.txtOk
                    : item.status === "NOK"
                      ? styles.txtNok
                      : styles.txtNd;
                return (
                  <View style={styles.itemDetalheContainer}>
                    <View style={styles.itemDetalheLinha}>
                      <Text style={styles.itemNome}>{item.nome}</Text>
                      <Text style={[styles.itemStatus, colorStyle]}>
                        {label}
                      </Text>
                    </View>
                    {item.observacao ? (
                      <Text style={styles.txtObservacao}>
                        Nota: {item.observacao}
                      </Text>
                    ) : null}
                  </View>
                );
              }}
            />
            <TouchableOpacity
              style={styles.btnFechar}
              onPress={() => setDetalheVisible(false)}
            >
              <Text style={styles.txtBranco}>FECHAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btnIniciar}
          onPress={handleIniciarVistoria}
        >
          <Text style={styles.txtBtnIniciar}>+ NOVA VISTORIA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f4", padding: 10 },
  filtroContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 3,
  },
  labelFiltro: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#444",
  },
  rowFiltro: { flexDirection: "row", alignItems: "center", gap: 10 },
  dateSelector: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  dateText: { fontSize: 14, color: "#333" },
  divider: { color: "#888", fontWeight: "bold" },
  btnLimpar: {
    backgroundColor: "#dc3545",
    padding: 12,
    borderRadius: 8,
    width: 40,
    alignItems: "center",
  },
  cardVistoria: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: "#6f42c1",
  },
  linhaDataHora: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  linhaApenasHora: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  dataVistoria: {
    fontWeight: "bold",
    fontSize: 16,
  },
  horaVistoria: {
    fontSize: 14,
    color: "#555",
  },
  verMais: {
    color: "#6f42c1",
    fontSize: 12,
    marginTop: 5,
  },
  emptyText: { textAlign: "center", marginTop: 50, color: "#999" },
  itemDetalheContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemDetalheLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemNome: { flex: 1, fontSize: 14, color: "#333" },
  itemStatus: { fontWeight: "bold", marginLeft: 10 },
  txtObservacao: {
    fontSize: 11,
    color: "#0471ff",
    fontWeight: "600",
    marginTop: 4,
    fontStyle: "italic",
  },
  txtOk: { color: "#28A745" },
  txtNok: { color: "#DC3545" },
  txtNd: { color: "#6C757D" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalTitleContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  modalHora: {
    fontSize: 18,
    color: "#666",
    marginLeft: 6,
  },
  btnFechar: {
    backgroundColor: "#666",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  txtBranco: { color: "#fff", fontWeight: "bold" },
  footer: { paddingBottom: 30 },
  btnIniciar: {
    backgroundColor: "#6f42c1",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  txtBtnIniciar: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
