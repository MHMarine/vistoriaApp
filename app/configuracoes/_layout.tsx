import { Stack } from "expo-router";

export default function LayoutConfiguracoes() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Configurações" }} />
      <Stack.Screen name="grupos" options={{ title: "Grupos" }} />
      <Stack.Screen name="itens" options={{ title: "Itens" }} />
    </Stack>
  );
}
