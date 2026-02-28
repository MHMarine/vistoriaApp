import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { initDatabase } from '../src/database/database';

export default function Index() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase(); // Agora esperamos a promessa ser resolvida
        setDbReady(true);
      } catch (error) {
        console.error('Falha ao iniciar banco:', error);
      }
    }
    setup();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return <Redirect href="/auth/login" />;
}
