import { useState, useEffect } from 'react';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import { getLatestBatchId } from './services/attendanceService';

function App() {
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLatestBatch();
  }, []);

  const loadLatestBatch = async () => {
    try {
      const batchId = await getLatestBatchId();
      setCurrentBatchId(batchId);
    } catch (error) {
      console.error('Error loading latest batch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (batchId: string) => {
    setCurrentBatchId(batchId);
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

  if (currentBatchId) {
    return <Dashboard batchId={currentBatchId} />;
  }

  return <Home onUploadSuccess={handleUploadSuccess} />;
}

export default App;
