import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './components/landing/LandingPage';
import { Layout } from './components/layout/Layout';
import { ToastContainer } from './components/ui/ToastContainer';
import { WorkspacePage } from './components/workspace/WorkspacePage';
import { workspaceSections } from './config/workspace';
import { ToastProvider } from './contexts/ToastContext';
import { LocaleProvider } from './localization/LocaleProvider';

function App() {
  return (
    <LocaleProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<WorkspacePage />} />
              {workspaceSections.map(section => (
                <Route key={section.id} path={section.href} element={<WorkspacePage section={section} />} />
              ))}
              <Route path="*" element={<WorkspacePage notFound />} />
            </Route>
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </ToastProvider>
    </LocaleProvider>
  );
}

export default App;
