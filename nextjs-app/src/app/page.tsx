'use client';

import { useState, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, BarChart3 } from 'lucide-react';
import { generateExcelTemplate, parseExcelFile } from '@/lib/excelTemplate';
import { uploadAttendanceData, getHistory } from '@/services/attendanceService';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [className, setClassName] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoadingHistory(true);
      try {
        const h = await getHistory();
        setHistory(h);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  const handleDownloadTemplate = () => {
    generateExcelTemplate();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const records = await parseExcelFile(file);

      if (records.length === 0) {
        alert('No valid records found in the Excel file');
        setUploading(false);
        return;
      }

      const missingFields = records.some(
        r => !r.rollNumber || !r.name || !r.gender || !r.studentEmail || !r.parentEmail
      );

      if (missingFields) {
        alert('Some records have missing required fields. Please check your Excel file.');
        setUploading(false);
        return;
      }

      const batchId = await uploadAttendanceData(records, className || 'Default Class');
      alert(`Successfully uploaded ${records.length} attendance records!`);
      router.push(`/dashboard/${batchId}`);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload attendance data. Please check the file format and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-2xl">
              <BarChart3 size={48} className="text-blue-600" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Attendance Defaulter Dashboard
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Track student attendance, identify defaulters, and send automated alerts with comprehensive analytics
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 hover:shadow-lg transition-all">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-blue-500 p-4 rounded-xl">
                  <Download size={32} className="text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3 text-center">Step 1</h2>
              <p className="text-gray-600 mb-6 text-center">
                Download the Excel template with sample data format
              </p>
              <button
                onClick={handleDownloadTemplate}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <FileSpreadsheet size={20} />
                Download Template
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 hover:shadow-lg transition-all">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-green-500 p-4 rounded-xl">
                  <Upload size={32} className="text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3 text-center">Step 2</h2>
              <p className="text-gray-600 mb-6 text-center">
                Fill the template with attendance data and upload it
              </p>
              <label className="w-full bg-green-600 text-white px-6 py-4 rounded-xl font-semibold text-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                <Upload size={20} />
                {uploading ? 'Uploading...' : 'Upload Excel File'}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-slate-100 rounded-2xl p-6 mb-8">
            <label className="block text-gray-700 font-semibold mb-3 text-lg">
              Class Name (Optional)
            </label>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g., FYBSc Computer Science, SYBCom, etc."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
            />
            <p className="text-gray-500 text-sm mt-2">
              Enter a class name to organize your attendance records
            </p>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="text-blue-600" />
              Expected Excel Format
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-100">
                    <th className="px-3 py-2 text-left font-semibold">Roll Number</th>
                    <th className="px-3 py-2 text-left font-semibold">Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Gender</th>
                    <th className="px-3 py-2 text-left font-semibold">Attendance Days</th>
                    <th className="px-3 py-2 text-left font-semibold">Total Days</th>
                    <th className="px-3 py-2 text-left font-semibold">Attendance Percentage</th>
                    <th className="px-3 py-2 text-left font-semibold">Student Email</th>
                    <th className="px-3 py-2 text-left font-semibold">Parent Email</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-2">101</td>
                    <td className="px-3 py-2">John Doe</td>
                    <td className="px-3 py-2">Male</td>
                    <td className="px-3 py-2">28</td>
                    <td className="px-3 py-2">30</td>
                    <td className="px-3 py-2">93.33</td>
                    <td className="px-3 py-2 text-xs">john@student.edu</td>
                    <td className="px-3 py-2 text-xs">parent@email.com</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-200">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Features:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Automated defaulter identification (attendance below 75%)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Visual analytics with charts and graphs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Gender-wise defaulter breakdown</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
