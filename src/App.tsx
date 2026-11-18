import { lazy, Suspense } from 'react';
import { useLocale } from './localization/useLocale';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './modules/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { ToastContainer } from './components/ui/ToastContainer';
import { WorkspacePage } from './modules/workspace/WorkspacePage';
import { workspaceSections } from './config/workspace';
import { ToastProvider } from './contexts/ToastProvider';
import { AuthProvider } from './modules/auth/AuthProvider';
import { BrandingProvider } from './modules/settings/BrandingProvider';
import { SettingsPage } from './modules/settings/SettingsPage';
import { LocaleProvider } from './localization/LocaleProvider';

const LoginPage = lazy(() =>
  import('./modules/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const LandingPage = lazy(() =>
  import('./modules/landing/LandingPage').then((module) => ({ default: module.LandingPage })),
);

function RouteLoading() {
  const { t } = useLocale();
  return (
    <p role="status" className="p-6 text-gray-600 dark:text-gray-300">
      {t('common.loading')}
    </p>
  );
}

function App() {
  return (
    <LocaleProvider>
      <BrandingProvider>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Suspense fallback={<RouteLoading />}>
                <Routes>
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<WorkspacePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    {workspaceSections
                      .filter((section) => section.id !== 'settings')
                      .map((section) => (
                        <Route
                          key={section.id}
                          path={section.href}
                          element={<WorkspacePage section={section} />}
                        />
                      ))}
                    <Route path="*" element={<WorkspacePage notFound />} />
                  </Route>
                </Routes>
              </Suspense>
              <ToastContainer />
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </BrandingProvider>
    </LocaleProvider>
  );
}

export default App;
