import { type BotPayload } from '@services' // BotPayload shape

// Empty payload used to initialise the "Add bot" form
export const BLANK: BotPayload = {
  name: '', description: '', type: 'communicator', provider: 'ollama', model: '',
  system_prompt: '', icon: '💬', active: false, restricted: 'user', modules: [],
  config_schema: {},
}
