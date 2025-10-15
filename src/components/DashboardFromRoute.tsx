import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import { getBatches } from '../services/attendanceService';

interface BatchSummary {
    id: string;
    class_name: string;
    total_students: number;
    total_defaulters: number;
    average_attendance: number;
    uploaded_at?: string;
}

export default function DashboardFromRoute() {
    const { batchId } = useParams<{ batchId: string }>();
    const navigate = useNavigate();
    const [history, setHistory] = useState<BatchSummary[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        (async () => {
            setLoadingHistory(true);
            try {
                const batches = await getBatches();
                setHistory(batches as BatchSummary[]);
            } catch (err) {
                console.error('Failed to load batches', err);
            } finally {
                setLoadingHistory(false);
            }
        })();
    }, []);

    if (!batchId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">No batch selected</p>
            </div>
        );
    }

    return (
        <div>
            <div className="max-w-7xl mx-auto px-4">
            <div className="p-4">
                <button
                    onClick={() => {
                        // prevent auto-redirect to latest batch for this session
                        try { sessionStorage.setItem('skipAutoRedirect', JSON.stringify({ expires: Date.now() + 30000 })); } catch (e) { }
                        navigate('/', { replace: true });
                    }}
                    className="mb-4 inline-flex items-center gap-2 bg-blue-500 text-white hover:bg-blue-600 px-4 py-2 rounded-lg shadow-sm"
                >
                    Back to Upload
                </button>
            </div>
               
                <Dashboard batchId={batchId} />
            </div>
        </div>
    );
}
