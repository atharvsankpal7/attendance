'use client';

import { useEffect, useRef, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Mail, Download, Users, AlertTriangle } from 'lucide-react';
import { AnalysisData, getAnalysisData } from '@/services/attendanceService';
import { generatePDFReport } from '@/services/pdfGenerator';

interface DashboardProps {
  batchId: string;
}

const COLORS = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'];

export default function Dashboard({ batchId }: DashboardProps) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const genderChartRef = useRef<HTMLDivElement | null>(null);
  const defaulterChartRef = useRef<HTMLDivElement | null>(null);
  const barChartRef = useRef<HTMLDivElement | null>(null);

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

      const apiBase = process.env.NEXT_PUBLIC_API_BASE || '/api';
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

  const handleDownloadPDF = async () => {
    if (!data) return;
    // capture charts as images if possible
    const captureSvgToPng = async (container: HTMLDivElement | null) => {
      if (!container) return undefined;
      const svg = container.querySelector('svg');
      if (!svg) return undefined;

      // Clone the svg node so we can modify it safely
      const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

      // Inline computed styles to preserve appearance
      const copyComputedStyles = (sourceEl: Element, targetEl: Element) => {
        const sourceChildren = Array.from(sourceEl.children);
        const targetChildren = Array.from(targetEl.children);
        const sourceStyle = (window.getComputedStyle(sourceEl) || {}) as any;
        (targetEl as HTMLElement).setAttribute('style', sourceStyle.cssText || '');
        for (let i = 0; i < sourceChildren.length; i++) {
          if (targetChildren[i]) copyComputedStyles(sourceChildren[i], targetChildren[i]);
        }
      };

      try {
        copyComputedStyles(svg, clonedSvg);

        // Ensure width/height attributes exist on the cloned svg
        const bbox = (svg as SVGGraphicsElement).getBBox ? (svg as SVGGraphicsElement).getBBox() : null;
        const width = svg.getAttribute('width') || (bbox ? String(bbox.width) : svg.clientWidth || '800');
        const height = svg.getAttribute('height') || (bbox ? String(bbox.height) : svg.clientHeight || '400');
        clonedSvg.setAttribute('width', String(width));
        clonedSvg.setAttribute('height', String(height));

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(clonedSvg);

        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const dataUrl = await new Promise<string>((resolve, reject) => {
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              // scale up for better quality
              const scale = 2;
              const w = (img.width || Number(width)) * scale;
              const h = (img.height || Number(height)) * scale;
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('No canvas context');
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, w, h);
              const png = canvas.toDataURL('image/png');
              resolve(png);
            } catch (err) {
              reject(err);
            } finally {
              URL.revokeObjectURL(url);
            }
          };
          img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(e);
          };
          img.src = url;
        });

        return dataUrl;
      } catch (err) {
        console.warn('Failed to capture SVG as PNG', err);
        return undefined;
      }
    };

    const images: any = {};
    images.genderChart = await captureSvgToPng(genderChartRef.current);
    images.defaulterChart = await captureSvgToPng(defaulterChartRef.current);
    images.barChart = await captureSvgToPng(barChartRef.current);

    generatePDFReport(data, images, true);
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Overall Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="text-blue-500" />
                  <span className="font-medium">Total Students</span>
                </div>
                <span className="font-bold text-lg">{data.batch.total_students}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-500" />
                  <span className="font-medium">Total Defaulters</span>
                </div>
                <span className="font-bold text-lg text-red-500">{data.defaulterStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📈</span>
                  <span className="font-medium">Average Attendance</span>
                </div>
                <span className="font-bold text-lg">{data.batch.average_attendance.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          <div ref={genderChartRef} className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Gender Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={genderChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {genderChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div ref={defaulterChartRef} className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Defaulter Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={defaulterChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  <Cell fill="#ef4444" />
                  <Cell fill="#22c55e" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div ref={barChartRef} className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Gender-wise Defaulters</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={defaulterBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Defaulters" fill="#ef4444" />
              <Bar dataKey="Non-Defaulters" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Defaulter List ({defaulters.length})</h2>
            <div className="flex gap-4">
              <button
                onClick={handleSendEmails}
                disabled={sending || defaulters.length === 0}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Mail size={20} />
                {sending ? 'Sending...' : 'Send Emails'}
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all shadow-md flex items-center gap-2"
              >
                <Download size={20} />
                Download PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 font-semibold">Roll No</th>
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Gender</th>
                  <th className="p-3 font-semibold">Attendance %</th>
                  <th className="p-3 font-semibold">Student Email</th>
                  <th className="p-3 font-semibold">Parent Email</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map(record => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">{record.roll_number}</td>
                    <td className="p-3">{record.name}</td>
                    <td className="p-3">{record.gender}</td>
                    <td className="p-3 font-medium text-red-500">{record.attendance_percentage.toFixed(2)}%</td>
                    <td className="p-3 text-sm">{record.student_email}</td>
                    <td className="p-3 text-sm">{record.parent_email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}