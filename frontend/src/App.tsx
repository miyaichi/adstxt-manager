import { ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

// Import components
import Layout from './components/common/Layout';

// Import pages
import HomePage from './pages/HomePage';
import NewRequestPage from './pages/NewRequestPage';
import NotFoundPage from './pages/NotFoundPage';
import RequestDetailPage from './pages/RequestDetailPage';
import RequestListPage from './pages/RequestListPage';
import StatusPage from './pages/StatusPage';

// Import theme
import { theme } from './styles/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/new-request" element={<NewRequestPage />} />
            <Route path="/request/:id" element={<RequestDetailPage />} />
            <Route path="/requests" element={<RequestListPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
