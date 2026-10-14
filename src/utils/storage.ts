import { StudentSubmission } from '../types/student';

const STORAGE_KEY = 'evaluasi_pai_submissions_v1';
const CURRENT_STUDENT_KEY = 'evaluasi_pai_current_student';

export function getStoredSubmissions(): StudentSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load submissions from localStorage:', err);
    return [];
  }
}

export function saveSubmission(submission: StudentSubmission): StudentSubmission[] {
  try {
    const currentList = getStoredSubmissions();
    const updated = [submission, ...currentList];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to save submission:', err);
    return getStoredSubmissions();
  }
}

export function deleteSubmission(id: string): StudentSubmission[] {
  try {
    const currentList = getStoredSubmissions();
    const updated = currentList.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to delete submission:', err);
    return getStoredSubmissions();
  }
}

export function clearAllSubmissions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear submissions:', err);
  }
}

export function exportSubmissionsToCSV(submissions: StudentSubmission[]): void {
  if (submissions.length === 0) return;

  const headers = [
    'No',
    'Waktu Selesai',
    'No Absen',
    'Nama Siswa',
    'Kelas',
    'NIS/NISN',
    'Soal Terjawab',
    'Belum Terjawab',
    'Benar',
    'Salah',
    'Nilai Akhir',
    'Status KKM (75)'
  ];

  const rows = submissions.map((sub, idx) => [
    idx + 1,
    `"${sub.formattedDate}"`,
    `"${sub.student.noAbsen}"`,
    `"${sub.student.nama.replace(/"/g, '""')}"`,
    `"${sub.student.kelas}"`,
    `"${sub.student.nisn || '-'}"`,
    sub.terjawab,
    sub.belumTerjawab,
    sub.benar,
    sub.salah,
    sub.nilai,
    sub.isLulus ? 'Lulus' : 'Remedial'
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `rekap_nilai_pai_bab2_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getSavedStudentIdentity() {
  try {
    const raw = localStorage.getItem(CURRENT_STUDENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStudentIdentity(student: { nama: string; kelas: string; noAbsen: string; nisn?: string }) {
  try {
    localStorage.setItem(CURRENT_STUDENT_KEY, JSON.stringify(student));
  } catch (err) {
    console.error('Failed to store student identity:', err);
  }
}

export function clearStudentIdentity() {
  try {
    localStorage.removeItem(CURRENT_STUDENT_KEY);
  } catch (err) {
    console.error('Failed to clear student identity:', err);
  }
}
