import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConversationProvider } from '@elevenlabs/react';
import { App } from './App';
import './index.css';

const AGENT_ID = 'agent_5201kmthvevqex5s4qps314ds4s3';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConversationProvider agentId={AGENT_ID}>
      <App />
    </ConversationProvider>
  </StrictMode>
);
