import { registerAudioIpc } from './audio';
import { registerFoldersIpc } from './folders';
import { registerGeminiIpc } from './gemini';
import { registerMeetingsIpc } from './meetings';
import { registerMigrationIpc } from './migration';
import { registerSearchIpc } from './search';
import { registerSegmentsIpc } from './segments';
import { registerSettingsIpc } from './settings';
import { registerTemplatesIpc } from './templates';

/** Registers every handler the renderer can reach. Handlers stay logic-free. */
export function registerIpc(): void {
  registerMeetingsIpc();
  registerSegmentsIpc();
  registerFoldersIpc();
  registerSettingsIpc();
  registerTemplatesIpc();
  registerSearchIpc();
  registerAudioIpc();
  registerMigrationIpc();
  registerGeminiIpc();
}
