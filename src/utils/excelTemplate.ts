import * as XLSX from 'xlsx';

export interface AttendanceRecord {
  rollNumber: string;
  name: string;
  gender: string;
  attendanceDays: number;
  totalDays: number;
  attendancePercentage: number;
  studentEmail: string;
  parentEmail: string;
}

export const generateExcelTemplate = () => {
  const sampleData = [
    {
      'Roll Number': '101',
      'Name': 'John Doe',
      'Gender': 'Male',
      'Attendance Days': 28,
      'Total Days': 30,
      'Attendance Percentage': 93.33,
      'Student Email': 'john.doe@student.edu',
      'Parent Email': 'parent.john@email.com'
    },
    {
      'Roll Number': '102',
      'Name': 'Jane Smith',
      'Gender': 'Female',
      'Attendance Days': 20,
      'Total Days': 30,
      'Attendance Percentage': 66.67,
      'Student Email': 'jane.smith@student.edu',
      'Parent Email': 'parent.jane@email.com'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  ws['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 10 },
    { wch: 16 },
    { wch: 12 },
    { wch: 22 },
    { wch: 30 },
    { wch: 30 }
  ];

  XLSX.writeFile(wb, 'attendance_template.xlsx');
};

export const parseExcelFile = (file: File): Promise<AttendanceRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const records: AttendanceRecord[] = jsonData.map((row: any) => ({
          rollNumber: String(row['Roll Number'] || ''),
          name: String(row['Name'] || ''),
          gender: String(row['Gender'] || ''),
          attendanceDays: Number(row['Attendance Days'] || 0),
          totalDays: Number(row['Total Days'] || 30),
          attendancePercentage: Number(row['Attendance Percentage'] || 0),
          studentEmail: String(row['Student Email'] || ''),
          parentEmail: String(row['Parent Email'] || '')
        }));

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
};
