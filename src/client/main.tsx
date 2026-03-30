import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConversationProvider } from '@elevenlabs/react';
import { App } from './App';
import './index.css';

const DEFAULT_AGENT_ID = 'agent_5201kmthvevqex5s4qps314ds4s3';
const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConversationProvider agentId={agentId}>
      <App />
    </ConversationProvider>
  </StrictMode>
);
