import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import DashboardFromRoute from './components/DashboardFromRoute';
import Home from './components/Home';
// Dashboard is loaded via the route wrapper
import { getLatestBatchId } from './services/attendanceService';

function App() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      // Only attempt auto-redirect when user is on the home path
      if (location.pathname !== '/') {
        setLoading(false);
        return;
      }

      try {
        const skipRaw = sessionStorage.getItem('skipAutoRedirect');
        if (skipRaw) {
          try {
            const parsed = JSON.parse(skipRaw);
            const expires = parsed?.expires || 0;
            if (Date.now() < expires) {
              setLoading(false);
              return;
            } else {
              sessionStorage.removeItem('skipAutoRedirect');
            }
          } catch (e) {
            sessionStorage.removeItem('skipAutoRedirect');
          }
        }

        // Only run auto-redirect once per session to avoid bouncing back when user navigates home
        const executed = sessionStorage.getItem('autoRedirectExecuted');
        if (executed) {
          setLoading(false);
          return;
        }

        const batchId = await getLatestBatchId();
        if (batchId) {
          sessionStorage.setItem('autoRedirectExecuted', '1');
          navigate(`/dashboard/${batchId}`, { replace: true });
        }
      } catch (error) {
        console.error('Error loading latest batch:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [location.pathname, navigate]);

  const handleUploadSuccess = (batchId: string) => {
    navigate(`/dashboard/${batchId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home onUploadSuccess={handleUploadSuccess} />} />
      <Route path="/dashboard/:batchId" element={<DashboardWrapper />} />
    </Routes>
  );
}

function DashboardWrapper() {
  // Dashboard will read batchId from route params itself
  return <DashboardFromRoute />;
}

export default App;
