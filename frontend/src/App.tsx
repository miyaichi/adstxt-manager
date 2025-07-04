import { ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
// Import components
import Layout from './components/common/Layout';
import { AppProvider } from './context/AppContext';

// Import pages
import HomePage from './pages/HomePage';
import NewRequestPage from './pages/NewRequestPage';
import NotFoundPage from './pages/NotFoundPage';
import RequestDetailPage from './pages/RequestDetailPage';
import RequestListPage from './pages/RequestListPage';
import StatusPage from './pages/StatusPage';
import HelpPage from './pages/HelpPage';
import EditRequestPage from './pages/EditRequestPage';
import OptimizerPage from './pages/OptimizerPage';
import SiteAnalysisPage from './pages/SiteAnalysisPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import ContactPage from './pages/ContactPage';

// Import theme
import { theme } from './styles/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/new-request" element={<NewRequestPage />} />
              <Route path="/request/:id" element={<RequestDetailPage />} />
              <Route path="/request/:id/edit" element={<EditRequestPage />} />
              <Route path="/requests" element={<RequestListPage />} />
              <Route path="/optimizer" element={<OptimizerPage />} />
              <Route path="/site-analysis" element={<SiteAnalysisPage />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </AppProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
