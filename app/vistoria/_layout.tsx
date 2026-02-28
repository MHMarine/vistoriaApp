import { Stack } from "expo-router";

export default function LayoutVistoria() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Vistoria" }} />
      <Stack.Screen
        name="vistoria-execucao"
        options={{ title: "Executar vistoria" }}
      />
    </Stack>
  );
}
