import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { getDatabase } from "../../src/database/database";
import { listarItensDoCondominio } from "../../src/services/itens.service";
import { salvarProgressoVistoria } from "../../src/services/vistoria.service";
import { uuidv4 } from "../../src/utils/uuid";

type StatusVistoria = "OK" | "NOK" | "ND";

type ItemVistoria = {
  ui_uuid: string;
  vistoria_item_uuid: string | null;
  item_uuid: string;
  item_nome: string;
  grupo_nome: string;
  status: StatusVistoria | null;
  observacao: string | null;
};

type Grupo = {
  nome: string;
  itens: ItemVistoria[];
};

export default function VistoriaExecucao() {
  const { vistoriaUuid, condominioUuid, sindicoUuid, nivel, nome } =
    useLocalSearchParams();
  const router = useRouter();

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);

  const [vUuid] = useState(() => {
    if (vistoriaUuid && vistoriaUuid !== "undefined")
      return String(vistoriaUuid);
    return uuidv4(); // Gera um novo UUID para esta sessão de vistoria
  });

  useEffect(() => {
    async function carregar() {
      if (!condominioUuid) return;

      const itens = await listarItensDoCondominio(String(condominioUuid));
      const map: Record<string, ItemVistoria[]> = {};

      itens.forEach((it) => {
        if (!map[it.grupo_nome]) map[it.grupo_nome] = [];

        map[it.grupo_nome].push({
          ui_uuid: it.item_uuid,
          vistoria_item_uuid: null,
          item_uuid: it.item_uuid,
          item_nome: it.item_nome,
          grupo_nome: it.grupo_nome,
          status: null,
          observacao: null,
        });
      });

      setGrupos(
        Object.keys(map).map((nome) => ({
          nome,
          itens: map[nome],
        })),
      );
    }

    carregar();
  }, [condominioUuid]);

  async function atualizarStatus(
    itemUuidReal: string,
    novoStatus: StatusVistoria,
    novaObs?: string,
  ) {
    const item = grupos
      .flatMap((g) => g.itens)
      .find((i) => i.item_uuid === itemUuidReal);
    const obs = novaObs ?? item?.observacao ?? "";

    try {
      await salvarProgressoVistoria(
        vUuid,
        String(condominioUuid),
        String(sindicoUuid),
        itemUuidReal,
        novoStatus,
        obs,
      );

      // 3. Atualizar a UI
      setGrupos((prev) =>
        prev.map((g) => ({
          ...g,
          itens: g.itens.map((it) =>
            it.item_uuid === itemUuidReal
              ? { ...it, status: novoStatus, observacao: obs }
              : it,
          ),
        })),
      );
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o item.");
    }
  }

  async function finalizarVistoria() {
    const totalItens = grupos.reduce((acc, g) => acc + g.itens.length, 0);
    const respondidos = grupos
      .flatMap((g) => g.itens)
      .filter((i) => i.status !== null).length;

    if (respondidos < totalItens) {
      Alert.alert(
        "Itens Pendentes",
        `Responda ${totalItens - respondidos} itens restantes.`,
      );
      return;
    }

    try {
      const db = await getDatabase();
      await db.runAsync(
        "UPDATE vistorias SET status = 'FINALIZADA' WHERE uuid = ?",
        [vUuid],
      );
      Alert.alert("Sucesso", "Vistoria finalizada!");

      router.replace({
        pathname: "/dashboard",
        params: {
          uuid: sindicoUuid,
          nivel: nivel,
          nome: nome,
          reload: new Date().getTime().toString(),
        },
      });
    } catch {
      Alert.alert("Erro", "Não foi possível finalizar.");
    }
  }

  const totalItens = grupos.reduce((acc, g) => acc + g.itens.length, 0);
  const respondidos = grupos
    .flatMap((g) => g.itens)
    .filter((i) => i.status !== null).length;

  const isCompleto = totalItens > 0 && respondidos === totalItens;

  const statusButtons: { l: string; v: StatusVistoria }[] = [
    { l: "OK", v: "OK" },
    { l: "NÃO OK", v: "NOK" },
    { l: "ND", v: "ND" },
  ];

  const statusStyleMap: Record<StatusVistoria, ViewStyle> = {
    OK: styles.btnOK,
    NOK: styles.btnNOK,
    ND: styles.btnND,
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Executando Vistoria" }} />
      <FlatList
        data={grupos}
        keyExtractor={(item) => item.nome}
        contentContainerStyle={{ paddingBottom: 150 }}
        renderItem={({ item: grupo }) => {
          const isAberto = grupoAberto === grupo.nome;
          return (
            <View style={styles.cardGrupo}>
              <TouchableOpacity
                style={styles.headerGrupo}
                onPress={() => setGrupoAberto(isAberto ? null : grupo.nome)}
              >
                <Text style={styles.tituloGrupo}>{grupo.nome}</Text>
                <Text style={styles.seta}>{isAberto ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {isAberto && (
                <View style={styles.conteudoGrupo}>
                  {grupo.itens.map((item) => {
                    const status = item.status;
                    return (
                      <View
                        key={item.item_uuid}
                        style={[
                          styles.itemContainer,
                          !status && styles.itemPendente,
                        ]}
                      >
                        <Text style={styles.nomeItem}>
                          {item.item_nome} {!status && "*"}
                        </Text>

                        <View style={styles.rowBotoes}>
                          {statusButtons.map((s) => (
                            <TouchableOpacity
                              key={s.v}
                              onPress={() => atualizarStatus(item.ui_uuid, s.v)}
                              style={[
                                styles.botao,
                                status === s.v && statusStyleMap[s.v],
                              ]}
                            >
                              <Text
                                style={[
                                  styles.txtBotao,
                                  status === s.v && styles.txtBranco,
                                ]}
                              >
                                {s.l}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {status === "NOK" && (
                          <TextInput
                            style={styles.inputObs}
                            placeholder="Descreva o problema..."
                            value={item.observacao || ""}
                            onChangeText={(txt) =>
                              atualizarStatus(item.ui_uuid, "NOK", txt)
                            }
                            multiline
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btnFinalizar, !isCompleto && styles.btnDesabilitado]}
          onPress={finalizarVistoria}
        >
          <Text style={styles.txtBranco}>
            {isCompleto
              ? "FINALIZAR VISTORIA"
              : `PENDENTE (${respondidos}/${totalItens})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5", padding: 10 },
  cardGrupo: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    marginBottom: 12,
    elevation: 3,
    overflow: "hidden",
  },
  headerGrupo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  tituloGrupo: { fontSize: 16, fontWeight: "bold", color: "#6f42c1" },
  seta: { color: "#6f42c1", fontWeight: "bold" },
  conteudoGrupo: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  itemContainer: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  itemPendente: {
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
    paddingLeft: 10,
  },
  nomeItem: { fontSize: 15, marginBottom: 10, color: "#333" },
  rowBotoes: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  botao: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#FFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CCC",
  },
  btnOK: { backgroundColor: "#28A745", borderColor: "#28A745" },
  btnNOK: { backgroundColor: "#DC3545", borderColor: "#DC3545" },
  btnND: { backgroundColor: "#6C757D", borderColor: "#6C757D" },
  txtBotao: { fontWeight: "bold", color: "#666" },
  txtBranco: { color: "#FFF", fontWeight: "bold" },
  inputObs: {
    backgroundColor: "#F9F9F9",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    minHeight: 60,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  btnFinalizar: {
    backgroundColor: "#28a745",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDesabilitado: { backgroundColor: "#ccc" },
});
