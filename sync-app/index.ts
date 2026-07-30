import { registerRootComponent } from 'expo';

// Import por efeito colateral, antes de qualquer outra coisa: TaskManager.defineTask
// precisa rodar mesmo quando o Android acorda o app em modo headless pra rodar a
// tarefa em background (o SO carrega o bundle JS mas não monta a árvore React —
// se defineTask só fosse alcançado via App/HomeScreen, a tarefa registrada no SO
// ficaria sem callback nesse boot e falharia em silêncio). Ver notas/Pendencias.md,
// veredito do sync parado (Fase 7, Etapa 0.2).
import './src/background/backgroundSync';
import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
