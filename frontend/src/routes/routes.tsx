import { type RouteObject } from 'react-router-dom';
import { Layout } from '../components/Layout/Layout';
import { RequireAuth } from '../components/RequireAuth/RequireAuth';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { LibraryPage } from '../pages/LibraryPage/LibraryPage';
import { SongDetailPage } from '../pages/SongDetailPage/SongDetailPage';
import { PlayerPage } from '../pages/PlayerPage/PlayerPage';
import { ImportPage } from '../pages/ImportPage/ImportPage';
import { SettingsPage } from '../pages/SettingsPage/SettingsPage';

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/', element: <LibraryPage /> },
          { path: '/song/:songId', element: <SongDetailPage /> },
          { path: '/play/:songId', element: <PlayerPage /> },
          { path: '/import', element: <ImportPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
];
