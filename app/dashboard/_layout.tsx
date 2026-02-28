import { Stack } from "expo-router";

export default function LayoutDashboard() {
  return (
    <Stack
      screenOptions={{
        headerShown: true, // Garante que o cabeçalho apareça
        headerTitleAlign: "center", // Centraliza o título no cabeçalho nativo
      }}
    >
      <Stack.Screen name="index" options={{ title: "Dashboard" }} />
    </Stack>
  );
}
