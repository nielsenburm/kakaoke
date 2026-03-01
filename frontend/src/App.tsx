import { useRoutes } from 'react-router-dom';
import { routes } from './routes/routes';
import { SplashScreen } from './components/SplashScreen/SplashScreen';

export default function App() {
  const element = useRoutes(routes);
  return (
    <>
      <SplashScreen />
      {element}
    </>
  );
}
