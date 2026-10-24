import { Header } from '../../components/header';
import { Screen } from '../../components/ui';
import { ServerCard } from '../../features/backend/server-card';

/** Where the app's data comes from and how to connect server/. For the team and the demo. */
export default function Servidor() {
  return (
    <Screen padBottom={false}>
      <Header title="Servidor" />
      <ServerCard />
    </Screen>
  );
}
