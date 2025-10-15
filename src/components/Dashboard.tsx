import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Mail, Download, Users, AlertTriangle } from 'lucide-react';
import { AnalysisData, getAnalysisData } from '../services/attendanceService';
import { generatePDFReport } from '../utils/pdfGenerator';

interface DashboardProps {
  batchId: string;
}

const COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'];

export default function Dashboard({ batchId }: DashboardProps) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, [batchId]);

  const loadData = async () => {
    try {
      const analysisData = await getAnalysisData(batchId);
      setData(analysisData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmails = async () => {
    if (!data) return;

    setSending(true);
    try {
      const defaulters = data.records.filter(r => r.is_defaulter);

      const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
      const response = await fetch(
        `${apiBase}/send-defaulter-emails`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ defaulters })
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert(`Emails sent successfully to ${result.sent} defaulters!`);
      } else {
        throw new Error(result.error || 'Failed to send emails');
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('Failed to send emails. Please check your email configuration.');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!data) return;
    generatePDFReport(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  const genderChartData = [
    { name: 'Male', value: data.genderStats.male },
    { name: 'Female', value: data.genderStats.female }
  ];

  const defaulterChartData = [
    { name: 'Defaulters', value: data.defaulterStats.total },
    { name: 'Non-Defaulters', value: data.batch.total_students - data.defaulterStats.total }
  ];

  const defaulterBarData = [
    { category: 'Male', Defaulters: data.defaulterStats.male, 'Non-Defaulters': data.genderStats.male - data.defaulterStats.male },
    { category: 'Female', Defaulters: data.defaulterStats.female, 'Non-Defaulters': data.genderStats.female - data.defaulterStats.female }
  ];

  const defaulters = data.records.filter(r => r.is_defaulter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Attendance Dashboard</h1>
          <p className="text-gray-600">{data.batch.class_name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="text-blue-500" />
              Student Overview
            </h2>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-3xl font-bold text-gray-800">{data.batch.total_students}</p>
                <p className="text-gray-600">Total Students</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-blue-600">Boys: {data.genderStats.male}</p>
                <p className="text-lg font-semibold text-pink-600">Girls: {data.genderStats.female}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={genderChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-orange-500" />
              Defaulter Overview
            </h2>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-3xl font-bold text-red-600">{data.defaulterStats.total}</p>
                <p className="text-gray-600">Total Defaulters</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-blue-600">Boys: {data.defaulterStats.male}</p>
                <p className="text-lg font-semibold text-pink-600">Girls: {data.defaulterStats.female}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={defaulterChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Defaulters by Gender</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={defaulterBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Defaulters" fill="#ef4444" />
              <Bar dataKey="Non-Defaulters" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Key Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-xl p-6">
              <p className="text-gray-600 mb-2">Average Attendance</p>
              <p className="text-3xl font-bold text-blue-600">{data.insights.averageAttendance.toFixed(2)}%</p>
            </div>
            <div className="bg-green-50 rounded-xl p-6">
              <p className="text-gray-600 mb-2">Highest Attendance</p>
              <p className="text-xl font-bold text-green-600">{data.insights.highestAttendance.name}</p>
              <p className="text-2xl font-semibold text-green-700">{data.insights.highestAttendance.percentage.toFixed(2)}%</p>
            </div>
            <div className="bg-red-50 rounded-xl p-6">
              <p className="text-gray-600 mb-2">Lowest Attendance</p>
              <p className="text-xl font-bold text-red-600">{data.insights.lowestAttendance.name}</p>
              <p className="text-2xl font-semibold text-red-700">{data.insights.lowestAttendance.percentage.toFixed(2)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Top 5 Students</h2>
          <div className="space-y-3">
            {data.insights.topStudents.map((student, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                <span className="font-semibold text-gray-800">{idx + 1}. {student.name}</span>
                <span className="font-bold text-green-600">{student.percentage.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Defaulter List</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Roll No</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Gender</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Attendance %</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Parent Email</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map((record, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-red-50">
                    <td className="px-4 py-3">{record.roll_number}</td>
                    <td className="px-4 py-3 font-medium">{record.name}</td>
                    <td className="px-4 py-3">{record.gender}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-red-600">{record.attendance_percentage.toFixed(2)}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.student_email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.parent_email}</td>
                  </tr>
                ))}
                {defaulters.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No defaulters found!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={handleSendEmails}
            disabled={sending || defaulters.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail size={24} />
            {sending ? 'Sending Emails...' : `Send Emails to ${defaulters.length} Defaulters`}
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Download size={24} />
            Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}
