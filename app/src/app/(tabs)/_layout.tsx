import { Tabs } from 'expo-router';
import { c, f, RULE } from '../../ui/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accentPress,
        tabBarInactiveTintColor: c.ink,
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopWidth: RULE,
          borderTopColor: c.ink,
          height: 62,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: f.semi,
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="ventana" options={{ title: 'Ventana' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}
