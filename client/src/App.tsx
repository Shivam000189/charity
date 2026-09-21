import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { AppRouter } from './app/AppRouter';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OnboardingProvider>
          <AppRouter />
        </OnboardingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}