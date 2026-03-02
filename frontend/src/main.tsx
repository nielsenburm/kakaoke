import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SongRepositoryProvider } from './context/SongRepositoryContext';
import { SettingsProvider } from './context/SettingsContext';
import { ApiSongRepository } from './data/ApiSongRepository';
import App from './App';
import './styles/global.css';

const repository = new ApiSongRepository();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <SongRepositoryProvider repository={repository}>
            <App />
          </SongRepositoryProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
