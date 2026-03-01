import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SongRepositoryProvider } from './context/SongRepositoryContext';
import { LocalSongRepository } from './data/LocalSongRepository';
import App from './App';
import './styles/global.css';

const repository = new LocalSongRepository();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SongRepositoryProvider repository={repository}>
        <App />
      </SongRepositoryProvider>
    </BrowserRouter>
  </StrictMode>,
);
