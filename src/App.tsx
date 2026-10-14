import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  FileQuestion,
  GraduationCap,
  HelpCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  XCircle,
  FileSpreadsheet,
  Users,
  User,
  Lock,
  Unlock,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  LogOut,
  ArrowRight,
  FileCheck2,
  X,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import rawQuestions from './data/questions.json';
import { StudentIdentity, StudentSubmission } from './types/student';
import {
  getStoredSubmissions,
  saveSubmission,
  deleteSubmission,
  clearAllSubmissions,
  exportSubmissionsToCSV,
  getSavedStudentIdentity,
  saveStudentIdentity,
  clearStudentIdentity
} from './utils/storage';

interface QuestionItem {
  id: number;
  tipe: 'pg';
  pertanyaan: string;
  opsi: [string, string, string, string];
  kunci: number;
  bobot: number;
}

const questions: QuestionItem[] = rawQuestions as QuestionItem[];

const KKM_SCORE = 75;
const KELAS_OPTIONS = ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I'];
const PIN_STORAGE_KEY = 'evaluasi_pai_guru_pin_custom';

// Metadata for pedagogy enrichment
const metadataMap: Record<number, { level: 'LOTS' | 'MOTS' | 'HOTS'; sub: string; dalil: string }> = {
  1: { level: 'LOTS', sub: 'Pengertian Asmaulhusna', dalil: 'Etimologi Bahasa Arab' },
  2: { level: 'LOTS', sub: 'Dalil Asmaulhusna', dalil: 'Q.S. al-Hasyr [59]: 24' },
  3: { level: 'LOTS', sub: "Sifat al-'Alīm", dalil: "Makna al-'Alīm" },
  4: { level: 'MOTS', sub: "Dalil al-'Alīm", dalil: 'Q.S. Taha [20]: 52' },
  5: { level: 'MOTS', sub: "Dalil al-'Alīm", dalil: "Q.S. al-An'am [6]: 59" },
  6: { level: 'LOTS', sub: 'Sifat al-Khabīr', dalil: 'Makna al-Khabīr' },
  7: { level: 'MOTS', sub: 'Dalil al-Khabīr', dalil: 'Q.S. at-Taubah [9]: 16' },
  8: { level: 'LOTS', sub: "Sifat as-Samī'", dalil: "Makna as-Samī'" },
  9: { level: 'MOTS', sub: "Dalil as-Samī' & al-Baṣīr", dalil: 'Q.S. asy-Syura [42]: 11' },
  10: { level: 'LOTS', sub: 'Sifat al-Baṣīr', dalil: 'Makna al-Baṣīr' },
  11: { level: 'MOTS', sub: 'Dalil al-Baṣīr', dalil: 'Q.S. al-Hujurat [49]: 18' },
  12: { level: 'HOTS', sub: "Komparasi al-'Alīm & al-Khabīr", dalil: 'Analisis Konsep' },
  13: { level: 'MOTS', sub: "Keteladanan al-'Alīm", dalil: 'Semangat Menuntut Ilmu' },
  14: { level: 'HOTS', sub: 'Keteladanan al-Khabīr', dalil: 'Cermat & Teliti Praktikum' },
  15: { level: 'HOTS', sub: 'Keteladanan al-Khabīr', dalil: 'Tabayun Berita Medsos' },
  16: { level: 'MOTS', sub: "Keteladanan as-Samī'", dalil: 'Menjaga Lisan & Ucapan' },
  17: { level: 'MOTS', sub: "Keteladanan as-Samī'", dalil: 'Empati Mendengar Teman' },
  18: { level: 'HOTS', sub: 'Konsep Muraqabah', dalil: 'Mawas Diri Hadirat Allah' },
  19: { level: 'HOTS', sub: "Keteladanan al-Baṣīr & al-'Alīm", dalil: 'Integritas Ujian Tanpa Pengawas' },
  20: { level: 'HOTS', sub: 'Analisis Multi-Sifat', dalil: 'Integrasi 4 Asmaulhusna' },
  21: { level: 'HOTS', sub: 'Keteladanan al-Baṣīr', dalil: 'Kejujuran Menemukan Barang' },
  22: { level: 'MOTS', sub: 'Tingkatan Ihsan', dalil: 'Hadis Jibril tentang Ihsan' },
  23: { level: 'HOTS', sub: 'Profil Pelajar Pancasila', dalil: "Tafsir Q.S. al-An'am [6]: 59" },
  24: { level: 'HOTS', sub: 'Etika Digital Murid', dalil: "Pengawasan as-Samī' & al-Baṣīr" },
  25: { level: 'HOTS', sub: 'Sintesis Karakter Luhur', dalil: 'Refleksi Akhlak Mulia' },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'cbt' | 'rekap' | 'teacher' | 'json'>('cbt');

  // Teacher Security State (Memory Only - Always reset to false on reload/refresh)
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [intendedTab, setIntendedTab] = useState<'rekap' | 'teacher' | 'json' | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Custom Teacher PIN management
  const [storedPin, setStoredPin] = useState<string>(() => {
    return localStorage.getItem(PIN_STORAGE_KEY) || '1234';
  });
  const [showChangePinModal, setShowChangePinModal] = useState<boolean>(false);
  const [currentPinAttempt, setCurrentPinAttempt] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [changePinError, setChangePinError] = useState<string | null>(null);
  const [changePinSuccess, setChangePinSuccess] = useState<boolean>(false);

  const pinInputRef = useRef<HTMLInputElement>(null);

  // Student Identity State
  const [currentStudent, setCurrentStudent] = useState<StudentIdentity | null>(() => getSavedStudentIdentity());
  const [inputNama, setInputNama] = useState('');
  const [inputKelas, setInputKelas] = useState('7A');
  const [inputNoAbsen, setInputNoAbsen] = useState('');
  const [inputNisn, setInputNisn] = useState('');

  // CBT State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Submissions State (Teacher Rekap)
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => getStoredSubmissions());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentSubmission | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Teacher mode filter
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'LOTS' | 'MOTS' | 'HOTS'>('ALL');
  const [copied, setCopied] = useState(false);

  // Focus pin input on modal open
  useEffect(() => {
    if (showPinModal) {
      setPinInput('');
      setPinError(null);
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 150);
    }
  }, [showPinModal]);

  // Tab switching with security check
  const handleTabClick = (tab: 'cbt' | 'rekap' | 'teacher' | 'json') => {
    if (tab === 'cbt') {
      setActiveTab('cbt');
      return;
    }

    // Protected teacher tabs
    if (isTeacherAuthenticated) {
      setActiveTab(tab);
    } else {
      setIntendedTab(tab);
      setShowPinModal(true);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === storedPin) {
      setIsTeacherAuthenticated(true);
      setShowPinModal(false);
      setPinError(null);
      setPinInput('');
      if (intendedTab) {
        setActiveTab(intendedTab);
        setIntendedTab(null);
      }
    } else {
      setPinError('PIN salah, akses ditolak!');
      setPinInput('');
      pinInputRef.current?.focus();
    }
  };

  const handleCancelPin = () => {
    setShowPinModal(false);
    setIntendedTab(null);
    setPinInput('');
    setPinError(null);
  };

  const handleLogoutTeacher = () => {
    setIsTeacherAuthenticated(false);
    setActiveTab('cbt');
    setSelectedStudentDetail(null);
  };

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePinError(null);

    if (currentPinAttempt !== storedPin) {
      setChangePinError('PIN saat ini tidak cocok!');
      return;
    }

    if (newPinInput.length < 4 || newPinInput.length > 8) {
      setChangePinError('PIN baru harus terdiri dari 4 sampai 8 karakter/digit!');
      return;
    }

    if (newPinInput !== newPinConfirm) {
      setChangePinError('Konfirmasi PIN baru tidak sama!');
      return;
    }

    localStorage.setItem(PIN_STORAGE_KEY, newPinInput);
    setStoredPin(newPinInput);
    setChangePinSuccess(true);
    setTimeout(() => {
      setShowChangePinModal(false);
      setChangePinSuccess(false);
      setCurrentPinAttempt('');
      setNewPinInput('');
      setNewPinConfirm('');
    }, 1500);
  };

  const currentQ = questions[currentIdx];

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNama.trim() || !inputKelas || !inputNoAbsen.trim()) {
      return;
    }
    const student: StudentIdentity = {
      nama: inputNama.trim(),
      kelas: inputKelas,
      noAbsen: inputNoAbsen.trim(),
      nisn: inputNisn.trim() || undefined
    };
    saveStudentIdentity(student);
    setCurrentStudent(student);
    setSelectedAnswers({});
    setFlagged({});
    setIsSubmitted(false);
    setCurrentIdx(0);
  };

  const handleLogoutStudent = () => {
    if (!isSubmitted && Object.keys(selectedAnswers).length > 0) {
      if (!confirm('Apakah kamu yakin ingin berganti siswa? Jawaban yang belum dikirim akan direset.')) {
        return;
      }
    }
    clearStudentIdentity();
    setCurrentStudent(null);
    setInputNama('');
    setInputNoAbsen('');
    setInputNisn('');
    setSelectedAnswers({});
    setFlagged({});
    setIsSubmitted(false);
    setCurrentIdx(0);
  };

  const handleSelectOption = (qId: number, optIdx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  const toggleFlag = (qId: number) => {
    setFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const score = useMemo(() => {
    let total = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.kunci) {
        total += q.bobot;
      }
    });
    return total;
  }, [selectedAnswers]);

  const correctCount = useMemo(() => {
    return questions.filter(q => selectedAnswers[q.id] === q.kunci).length;
  }, [selectedAnswers]);

  const answeredCount = Object.keys(selectedAnswers).length;
  const unansweredCount = questions.length - answeredCount;

  const handleFinalSubmit = () => {
    if (!currentStudent) return;
    setShowConfirmSubmit(false);
    setIsSubmitted(true);

    const now = new Date();
    const formattedDate =
      now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';

    const submissionData: StudentSubmission = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: now.toISOString(),
      formattedDate,
      student: currentStudent,
      totalSoal: questions.length,
      terjawab: answeredCount,
      belumTerjawab: unansweredCount,
      benar: correctCount,
      salah: questions.length - correctCount,
      nilai: score,
      isLulus: score >= KKM_SCORE,
      jawaban: { ...selectedAnswers }
    };

    const updated = saveSubmission(submissionData);
    setSubmissions(updated);
  };

  const handleDeleteOne = (id: string) => {
    if (confirm('Hapus data siswa ini dari rekap?')) {
      const updated = deleteSubmission(id);
      setSubmissions(updated);
      if (selectedStudentDetail?.id === id) {
        setSelectedStudentDetail(null);
      }
    }
  };

  const handleClearAll = () => {
    clearAllSubmissions();
    setSubmissions([]);
    setShowClearConfirm(false);
    setSelectedStudentDetail(null);
  };

  const handleSeedDemoData = () => {
    const demoNames = [
      { nama: 'Ahmad Fauzan Pratama', kelas: '7A', noAbsen: '03', nisn: '0098123456', benar: 23 },
      { nama: 'Nabila Azzahra Putri', kelas: '7A', noAbsen: '19', nisn: '0098123457', benar: 25 },
      { nama: 'Rizky Alamsyah', kelas: '7B', noAbsen: '27', nisn: '0098123458', benar: 18 },
      { nama: 'Zahra Khairunnisa', kelas: '7B', noAbsen: '32', nisn: '0098123459', benar: 21 },
      { nama: 'Muhammad Farhan', kelas: '7C', noAbsen: '14', nisn: '0098123460', benar: 16 }
    ];

    const demoSubmissions: StudentSubmission[] = demoNames.map((item, idx) => {
      const answers: Record<number, number> = {};
      questions.forEach((q, qIndex) => {
        if (qIndex < item.benar) {
          answers[q.id] = q.kunci;
        } else {
          answers[q.id] = (q.kunci + 1) % 4;
        }
      });

      const nilai = item.benar * 4;
      return {
        id: 'demo_' + idx + '_' + Date.now(),
        timestamp: new Date(Date.now() - idx * 3600000).toISOString(),
        formattedDate:
          new Date(Date.now() - idx * 3600000).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIB',
        student: {
          nama: item.nama,
          kelas: item.kelas,
          noAbsen: item.noAbsen,
          nisn: item.nisn
        },
        totalSoal: 25,
        terjawab: 25,
        belumTerjawab: 0,
        benar: item.benar,
        salah: 25 - item.benar,
        nilai,
        isLulus: nilai >= KKM_SCORE,
        jawaban: answers
      };
    });

    localStorage.setItem('evaluasi_pai_submissions_v1', JSON.stringify(demoSubmissions));
    setSubmissions(demoSubmissions);
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(sub => {
      const matchSearch =
        sub.student.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.student.noAbsen.includes(searchQuery) ||
        (sub.student.nisn && sub.student.nisn.includes(searchQuery));
      const matchKelas = filterKelas === 'ALL' || sub.student.kelas === filterKelas;
      return matchSearch && matchKelas;
    });
  }, [submissions, searchQuery, filterKelas]);

  const stats = useMemo(() => {
    if (submissions.length === 0) {
      return { total: 0, avg: 0, max: 0, min: 0, lulusCount: 0, lulusPercent: 0 };
    }
    const scores = submissions.map(s => s.nilai);
    const total = submissions.length;
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / total);
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const lulusCount = submissions.filter(s => s.isLulus).length;
    const lulusPercent = Math.round((lulusCount / total) * 100);
    return { total, avg, max, min, lulusCount, lulusPercent };
  }, [submissions]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(questions, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'evaluasi_pai_bab2_asmaulhusna.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredQuestions = useMemo(() => {
    if (filterLevel === 'ALL') return questions;
    return questions.filter(q => metadataMap[q.id]?.level === filterLevel);
  }, [filterLevel]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-emerald-800 text-white shadow-md border-b border-emerald-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* App Branding */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/60 border border-emerald-400/40 flex items-center justify-center text-emerald-100 shadow-inner shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-700 text-emerald-200">
                    Kurikulum Merdeka • Kelas VII
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                    PAI & Budi Pekerti
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
                  Evaluasi Bab 2: Meneladani Asmaulhusna
                </h1>
              </div>
            </div>

            {/* Top Bar Right: Teacher Mode Status or Student Badge + Tabs */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Teacher Authenticated Indicator */}
              {isTeacherAuthenticated ? (
                <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 rounded-xl text-amber-200 text-xs shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span className="font-bold text-white">Mode Guru Aktif</span>
                  <button
                    onClick={() => setShowChangePinModal(true)}
                    title="Ubah PIN Guru"
                    className="ml-1 p-1 hover:bg-amber-500/30 rounded text-amber-200 hover:text-white transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleLogoutTeacher}
                    title="Kunci Kembali / Keluar Mode Guru"
                    className="ml-1 px-2 py-0.5 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-lg text-[11px] transition flex items-center gap-1 cursor-pointer"
                  >
                    <Lock className="w-3 h-3" /> Kunci Layar
                  </button>
                </div>
              ) : (
                currentStudent && (
                  <div className="flex items-center gap-2 bg-emerald-900/80 px-3 py-1.5 rounded-xl border border-emerald-600 text-xs text-emerald-100 shadow-sm">
                    <User className="w-3.5 h-3.5 text-emerald-300" />
                    <div className="truncate max-w-[140px] sm:max-w-[180px]">
                      <span className="font-bold text-white">{currentStudent.nama}</span>
                      <span className="text-emerald-300 ml-1">
                        ({currentStudent.kelas} / #{currentStudent.noAbsen})
                      </span>
                    </div>
                    <button
                      onClick={handleLogoutStudent}
                      title="Ganti Siswa / Keluar"
                      className="ml-1 p-1 hover:bg-emerald-700 rounded text-emerald-300 hover:text-white transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              )}

              {/* Navigation Tabs with Lock Badges */}
              <div className="flex items-center bg-emerald-900/60 p-1 rounded-xl border border-emerald-700/60 text-xs">
                {/* 1. CBT Tab (Free for student) */}
                <button
                  onClick={() => handleTabClick('cbt')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'cbt'
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Simulasi Ujian
                </button>

                {/* 2. Rekap Nilai Tab (Protected) */}
                <button
                  onClick={() => handleTabClick('rekap')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'rekap'
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
                  }`}
                >
                  {isTeacherAuthenticated ? (
                    <Users className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Lock className="w-3 h-3 text-amber-300" />
                  )}
                  <span>Rekap Nilai</span>
                  {submissions.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-amber-400 text-emerald-950 text-[10px] font-black flex items-center justify-center ml-0.5">
                      {submissions.length}
                    </span>
                  )}
                </button>

                {/* 3. Bedah Soal Tab (Protected) */}
                <button
                  onClick={() => handleTabClick('teacher')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'teacher'
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
                  }`}
                >
                  {isTeacherAuthenticated ? (
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Lock className="w-3 h-3 text-amber-300" />
                  )}
                  <span>Bedah Soal</span>
                </button>

                {/* 4. JSON Tab (Protected - Contains answer keys) */}
                <button
                  onClick={() => handleTabClick('json')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeTab === 'json'
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-emerald-100 hover:text-white hover:bg-emerald-800/60'
                  }`}
                >
                  {isTeacherAuthenticated ? (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Lock className="w-3 h-3 text-amber-300" />
                  )}
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ========================================================= */}
        {/* TAB 1: CBT / SIMULASI UJIAN (Dengan Gerbang Identitas Siswa) */}
        {/* ========================================================= */}
        {activeTab === 'cbt' && (
          <>
            {/* JIKA SISWA BELUM MENGISI IDENTITAS: TAMPILKAN GERBANG FORM IDENTITAS */}
            {!currentStudent ? (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-6 sm:p-8 text-white text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 mx-auto flex items-center justify-center text-amber-300 shadow-inner mb-4">
                      <GraduationCap className="w-9 h-9" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                      Gerbang Identitas Peserta Asesmen
                    </h2>
                    <p className="text-emerald-200 text-xs sm:text-sm mt-1.5 max-w-md mx-auto">
                      Silakan isi data diri Anda secara lengkap dan benar sebelum memulai asesmen pembelajaran PAI Bab 2.
                    </p>
                  </div>

                  <form onSubmit={handleStartExam} className="p-6 sm:p-8 space-y-5">
                    {/* Info Card Ringkasan Asesmen */}
                    <div className="grid grid-cols-3 gap-2.5 bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl text-center">
                      <div>
                        <div className="text-[11px] text-emerald-700 font-semibold uppercase">Total Soal</div>
                        <div className="text-base font-bold text-emerald-950">25 Butir PG</div>
                      </div>
                      <div className="border-x border-emerald-200">
                        <div className="text-[11px] text-emerald-700 font-semibold uppercase">Bobot / Soal</div>
                        <div className="text-base font-bold text-emerald-950">4 Poin (Max 100)</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-emerald-700 font-semibold uppercase">Standar KKM</div>
                        <div className="text-base font-bold text-emerald-950">75 Poin</div>
                      </div>
                    </div>

                    {/* Nama Lengkap */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Nama Lengkap Siswa <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={inputNama}
                        onChange={e => setInputNama(e.target.value)}
                        placeholder="Contoh: Muhammad Rayhan Al-Fatih"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm transition"
                      />
                    </div>

                    {/* Kelas & Nomor Absen */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Pilih Kelas <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={inputKelas}
                          onChange={e => setInputKelas(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm transition bg-white"
                        >
                          {KELAS_OPTIONS.map(k => (
                            <option key={k} value={k}>
                              Kelas {k}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                          Nomor Absen <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="50"
                          value={inputNoAbsen}
                          onChange={e => setInputNoAbsen(e.target.value)}
                          placeholder="Contoh: 18"
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm transition"
                        />
                      </div>
                    </div>

                    {/* NISN (Opsional) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        NIS / NISN <span className="text-slate-400 font-normal">(Opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={inputNisn}
                        onChange={e => setInputNisn(e.target.value)}
                        placeholder="Contoh: 0098765432"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm transition"
                      />
                    </div>

                    {/* Petunjuk Singkat */}
                    <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <div className="font-semibold text-slate-700">Tata Tertib Asesmen:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                        <li>Bacalah bismillah dan setiap butir soal dengan cermat.</li>
                        <li>Gunakan fitur "Tandai Ragu" bila masih ragu terhadap pilihan.</li>
                        <li>Data dan nilai akhir Anda akan tersimpan otomatis ke rekap guru.</li>
                      </ul>
                    </div>

                    {/* Tombol Mulai */}
                    <button
                      type="submit"
                      disabled={!inputNama.trim() || !inputNoAbsen.trim()}
                      className="w-full py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Mulai Kerjakan Ujian <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* JIKA SISWA SUDAH TERDAFTAR: TAMPILKAN LEMBAR SOAL CBT */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left/Main Column: Question Card */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                  {/* Question Header Card */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    {/* Top Status Bar: Nomor & Kategori */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-base shadow-inner">
                          {currentQ.id}
                        </span>
                        <div>
                          <div className="text-xs font-medium text-slate-400">
                            Soal {currentQ.id} dari 25
                          </div>
                          <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <span>{metadataMap[currentQ.id]?.sub}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {metadataMap[currentQ.id]?.level}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFlag(currentQ.id)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition cursor-pointer ${
                            flagged[currentQ.id]
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {flagged[currentQ.id] ? 'Ditandai Ragu' : 'Tandai Ragu'}
                        </button>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                          {currentQ.bobot} Poin
                        </span>
                      </div>
                    </div>

                    {/* Question Stem */}
                    <div className="mb-6">
                      <p className="text-base sm:text-lg leading-relaxed text-slate-800 whitespace-pre-line font-medium">
                        {currentQ.pertanyaan}
                      </p>
                    </div>

                    {/* Option Choices */}
                    <div className="space-y-3">
                      {currentQ.opsi.map((opt, oIdx) => {
                        const isSelected = selectedAnswers[currentQ.id] === oIdx;
                        const isCorrect = currentQ.kunci === oIdx;
                        const letter = ['A', 'B', 'C', 'D'][oIdx];

                        let containerClass = 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 bg-white';
                        let letterClass = 'bg-slate-100 text-slate-700 border-slate-300';

                        if (isSelected) {
                          containerClass = 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20';
                          letterClass = 'bg-emerald-600 text-white border-emerald-600';
                        }

                        // JIKA SUDAH DISUBMIT:
                        if (isSubmitted) {
                          if (isTeacherAuthenticated) {
                            // Guru login: bisa lihat kunci
                            if (isCorrect) {
                              containerClass = 'border-emerald-500 bg-emerald-100/70 ring-2 ring-emerald-500';
                              letterClass = 'bg-emerald-600 text-white border-emerald-600';
                            } else if (isSelected && !isCorrect) {
                              containerClass = 'border-red-400 bg-red-50 ring-2 ring-red-400/20';
                              letterClass = 'bg-red-500 text-white border-red-500';
                            }
                          } else {
                            // Siswa biasa: hanya lihat apa yang dia pilih (tidak membocorkan kunci soal untuk siswa lain)
                            if (isSelected) {
                              containerClass = 'border-slate-400 bg-slate-100';
                              letterClass = 'bg-slate-700 text-white border-slate-700';
                            }
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleSelectOption(currentQ.id, oIdx)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition-all duration-150 cursor-pointer ${containerClass}`}
                          >
                            <span
                              className={`w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${letterClass}`}
                            >
                              {letter}
                            </span>
                            <span className="flex-1 text-sm md:text-base leading-snug text-slate-800 font-normal">
                              {opt}
                            </span>
                            {isSubmitted && isTeacherAuthenticated && isCorrect && (
                              <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-200/60 px-2.5 py-1 rounded-md">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Kunci
                              </span>
                            )}
                            {isSubmitted && isTeacherAuthenticated && isSelected && !isCorrect && (
                              <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-100 px-2.5 py-1 rounded-md">
                                <XCircle className="w-3.5 h-3.5" /> Salah
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation Card (shows after submit ONLY if Teacher is Authenticated) */}
                    {isSubmitted && isTeacherAuthenticated && (
                      <div className="mt-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                        <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-1.5">
                          <HelpCircle className="w-4 h-4 text-amber-700" />
                          Penjelasan & Rujukan Dalil (Mode Guru):
                        </div>
                        <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                          <strong>Jawaban Benar:</strong> {['A', 'B', 'C', 'D'][currentQ.kunci]}. {currentQ.opsi[currentQ.kunci]}
                          <br />
                          <strong>Rujukan:</strong> {metadataMap[currentQ.id]?.dalil} ({metadataMap[currentQ.id]?.sub}).
                        </p>
                      </div>
                    )}

                    {/* Next / Prev Controls */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-6">
                      <button
                        onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                        disabled={currentIdx === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" /> Sebelumnya
                      </button>

                      <div className="text-xs font-medium text-slate-500">
                        {answeredCount} dari 25 Terjawab
                      </div>

                      <button
                        onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
                        disabled={currentIdx === questions.length - 1}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Berikutnya <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Question Grid & Monitoring Panel */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  {/* Result Card or Monitoring Submission Bar */}
                  {isSubmitted ? (
                    <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-md border border-emerald-700">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                          Hasil Ujian Siswa
                        </span>
                        <Award className="w-6 h-6 text-amber-300" />
                      </div>
                      <div className="text-center py-2">
                        <div className="text-5xl font-black text-amber-300 tracking-tight">{score}</div>
                        <div className="text-xs text-emerald-200 mt-1">
                          Status:{' '}
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              score >= KKM_SCORE ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                            }`}
                          >
                            {score >= KKM_SCORE ? 'Tuntas (Lulus KKM)' : 'Perlu Remedial'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-emerald-700/60 text-center">
                        <div className="bg-emerald-900/40 p-2 rounded-xl">
                          <div className="text-xs text-emerald-200">Benar</div>
                          <div className="text-lg font-bold text-emerald-100">
                            {correctCount} / 25
                          </div>
                        </div>
                        <div className="bg-emerald-900/40 p-2 rounded-xl">
                          <div className="text-xs text-emerald-200">Salah</div>
                          <div className="text-lg font-bold text-red-200">
                            {25 - correctCount}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-emerald-700/50 flex flex-col gap-2">
                        <div className="text-[11px] text-emerald-200 text-center">
                          ✓ Lembar jawaban Anda telah tersimpan ke Rekap Guru
                        </div>
                        <button
                          onClick={handleLogoutStudent}
                          className="w-full py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-sm hover:bg-emerald-50 transition flex items-center justify-center gap-2 cursor-pointer shadow"
                        >
                          <User className="w-4 h-4" /> Selesai & Ganti Siswa
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <FileQuestion className="w-4 h-4 text-emerald-600" />
                          Monitoring Pengerjaan
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {answeredCount}/25
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(answeredCount / 25) * 100}%` }}
                        ></div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                        <div className="bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                          <div className="text-[11px] text-emerald-700">Terjawab</div>
                          <div className="font-bold text-emerald-900 text-sm">{answeredCount}</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 p-2 rounded-xl">
                          <div className="text-[11px] text-amber-700">Ragu-ragu</div>
                          <div className="font-bold text-amber-900 text-sm">
                            {Object.values(flagged).filter(Boolean).length}
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl">
                          <div className="text-[11px] text-slate-600">Belum</div>
                          <div className="font-bold text-slate-800 text-sm">{unansweredCount}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => setShowConfirmSubmit(true)}
                        className="w-full py-2.5 rounded-xl bg-emerald-700 text-white font-semibold text-sm hover:bg-emerald-800 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileCheck2 className="w-4 h-4" /> Kumpulkan & Selesai Ujian
                      </button>
                    </div>
                  )}

                  {/* 1-25 Question Palette Monitoring Navigator */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Palet Nomor Soal (1 - 25)
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {questions.map((q, idx) => {
                        const isAnswered = selectedAnswers[q.id] !== undefined;
                        const isFlag = flagged[q.id];
                        const isCurrent = currentIdx === idx;
                        const isCorrect = selectedAnswers[q.id] === q.kunci;

                        let btnClass = 'bg-white border-slate-200 text-slate-700 hover:border-emerald-400';

                        if (isAnswered) {
                          btnClass = 'bg-emerald-600 text-white border-emerald-600';
                        }

                        if (isFlag) {
                          btnClass = 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
                        }

                        if (isSubmitted) {
                          if (isTeacherAuthenticated) {
                            if (isCorrect) {
                              btnClass = 'bg-emerald-600 text-white border-emerald-700';
                            } else {
                              btnClass = 'bg-red-500 text-white border-red-600';
                            }
                          } else {
                            btnClass = isAnswered ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500';
                          }
                        }

                        if (isCurrent) {
                          btnClass += ' ring-2 ring-emerald-500 ring-offset-2';
                        }

                        return (
                          <button
                            key={q.id}
                            onClick={() => setCurrentIdx(idx)}
                            className={`h-10 rounded-xl border text-sm font-semibold flex items-center justify-center transition-all cursor-pointer ${btnClass}`}
                          >
                            {q.id}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* TAB 2: REKAP SISWA (GURU) (Daftar Siswa Mengerjakan) */}
        {/* ========================================================= */}
        {activeTab === 'rekap' && isTeacherAuthenticated && (
          <div className="space-y-6">
            {/* Header Rekap */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold uppercase">
                    Sistem Rekapitulasi Nilai PAI
                  </span>
                  <span className="text-xs text-slate-400">• Standar KKM: {KKM_SCORE}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mt-1">
                  Daftar Peserta & Nilai Evaluasi Bab 2
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data tersimpan otomatis di penyimpanan lokal browser secara terenkripsi/terpisah dari siswa.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => exportSubmissionsToCSV(submissions)}
                  disabled={submissions.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Ekspor Excel/CSV
                </button>

                <button
                  onClick={() => setShowClearConfirm(true)}
                  disabled={submissions.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 text-red-600 hover:bg-red-50 hover:text-red-700 border border-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset Data
                </button>

                <button
                  onClick={handleLogoutTeacher}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 transition cursor-pointer"
                >
                  <Lock className="w-4 h-4" /> Kunci Sesi Guru
                </button>
              </div>
            </div>

            {/* Ringkasan Statistik Kelas */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">Total Siswa</div>
                <div className="text-2xl font-black text-slate-800 mt-1">{stats.total} Orang</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Telah mengumpulkan</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">Rata-Rata Nilai</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {stats.total > 0 ? stats.avg : '-'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Skala 0 - 100</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">Nilai Tertinggi</div>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {stats.total > 0 ? stats.max : '-'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Nilai maksimum</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">Nilai Terendah</div>
                <div className="text-2xl font-black text-slate-600 mt-1">
                  {stats.total > 0 ? stats.min : '-'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Nilai minimum</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
                <div className="text-xs font-semibold text-slate-500 uppercase">Ketuntasan (KKM)</div>
                <div className="text-2xl font-black text-teal-700 mt-1">
                  {stats.total > 0 ? `${stats.lulusPercent}%` : '-'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {stats.lulusCount} dari {stats.total} siswa
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa, nomor absen, atau NISN..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs sm:text-sm outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={filterKelas}
                  onChange={e => setFilterKelas(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 bg-white outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Semua Kelas</option>
                  {KELAS_OPTIONS.map(k => (
                    <option key={k} value={k}>
                      Kelas {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabel Peserta */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {submissions.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-700">Belum Ada Siswa Mengumpulkan</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    Data akan muncul otomatis ketika siswa menyelesaikan ujian di tab "Simulasi Ujian".
                  </p>
                  <button
                    onClick={handleSeedDemoData}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Muat Data Contoh (5 Siswa)
                  </button>
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Tidak ditemukan data siswa yang cocok dengan filter pencarian.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3.5 text-center">No</th>
                        <th className="py-3 px-3">Waktu Selesai</th>
                        <th className="py-3 px-2 text-center">Absen</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-3 text-center">Kelas</th>
                        <th className="py-3 px-3 text-center">Benar / Salah</th>
                        <th className="py-3 px-3 text-center">Nilai</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSubmissions.map((sub, index) => (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-3.5 text-center font-medium text-slate-500">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs whitespace-nowrap">
                            {sub.formattedDate}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-slate-700">
                            {sub.student.noAbsen}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div>{sub.student.nama}</div>
                            {sub.student.nisn && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                NISN: {sub.student.nisn}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                              {sub.student.kelas}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-medium whitespace-nowrap">
                            <span className="text-emerald-700 font-bold">{sub.benar}</span> /{' '}
                            <span className="text-red-500">{sub.salah}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="text-base font-black text-slate-800">
                              {sub.nilai}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                sub.isLulus
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/40'
                                      : 'bg-red-100 text-red-800 border border-red-300/40'
                              }`}
                            >
                              {sub.isLulus ? 'Lulus KKM' : 'Remedial'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedStudentDetail(sub)}
                                title="Lihat Lembar Jawaban Siswa"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteOne(sub.id)}
                                title="Hapus Nilai Siswa"
                                className="p-1.5 rounded-lg bg-slate-50 text-red-500 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: BEDAH SOAL (KISI-KISI & INDIKATOR GURU) */}
        {/* ========================================================= */}
        {activeTab === 'teacher' && isTeacherAuthenticated && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-emerald-700" />
                    Kisi-Kisi & Analisis Butir Soal (Kurikulum Merdeka)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Memetakan jenjang kognitif (LOTS C1-C2, MOTS C3, HOTS C4-C5), dalil naqli, dan indikator soal.
                  </p>
                </div>

                {/* Filter by cognitive level */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto">
                  {(['ALL', 'LOTS', 'MOTS', 'HOTS'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setFilterLevel(lvl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        filterLevel === lvl
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl === 'ALL' ? 'Semua (25)' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submateri Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <div className="text-[11px] font-semibold text-emerald-800 uppercase">al-'Alīm</div>
                  <div className="text-xs text-slate-600 mt-0.5">Maha Mengetahui</div>
                  <div className="text-[11px] text-emerald-700 font-mono mt-1">Q.S. Taha: 52 & al-An'am: 59</div>
                </div>
                <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/80">
                  <div className="text-[11px] font-semibold text-teal-800 uppercase">al-Khabīr</div>
                  <div className="text-xs text-slate-600 mt-0.5">Maha Teliti / Cermat</div>
                  <div className="text-[11px] text-teal-700 font-mono mt-1">Q.S. at-Taubah: 16</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200/80">
                  <div className="text-[11px] font-semibold text-cyan-800 uppercase">as-Samī'</div>
                  <div className="text-xs text-slate-600 mt-0.5">Maha Mendengar</div>
                  <div className="text-[11px] text-cyan-700 font-mono mt-1">Q.S. asy-Syura: 11</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <div className="text-[11px] font-semibold text-amber-800 uppercase">al-Baṣīr</div>
                  <div className="text-xs text-slate-600 mt-0.5">Maha Melihat</div>
                  <div className="text-[11px] text-amber-700 font-mono mt-1">Q.S. al-Hujurat: 18</div>
                </div>
              </div>
            </div>

            {/* List of Questions with Detailed Annotations */}
            <div className="space-y-4">
              {filteredQuestions.map(q => {
                const meta = metadataMap[q.id];
                const letter = ['A', 'B', 'C', 'D'][q.kunci];

                return (
                  <div
                    key={q.id}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-emerald-300 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                          #{q.id}
                        </span>
                        <span className="text-xs font-bold text-slate-700">{meta?.sub}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            meta?.level === 'HOTS'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : meta?.level === 'MOTS'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {meta?.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">Dalil:</span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {meta?.dalil}
                        </span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Kunci: {letter}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base font-medium text-slate-800 whitespace-pre-line mb-4">
                      {q.pertanyaan}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      {q.opsi.map((opt, oIdx) => {
                        const isKunci = q.kunci === oIdx;
                        const optLetter = ['A', 'B', 'C', 'D'][oIdx];
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                              isKunci
                                ? 'bg-emerald-50/90 border-emerald-400 font-medium text-emerald-900'
                                : 'bg-slate-50/60 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                isKunci ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {optLetter}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: RAW JSON SPECIFICATION (Protected) */}
        {/* ========================================================= */}
        {activeTab === 'json' && isTeacherAuthenticated && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  Output JSON Murni (25 Butir Soal PG)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Array of objects murni sesuai spesifikasi instrumen evaluasi PAI Kelas VII Bab 2.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-sm cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Tersalin!' : 'Salin JSON'}
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Unduh .json
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 font-mono text-xs sm:text-sm text-emerald-300 overflow-x-auto max-h-[70vh] leading-relaxed">
              <pre>{JSON.stringify(questions, null, 2)}</pre>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* POP-UP MODAL KEAMANAN: MASUKKAN PIN GURU */}
      {/* ========================================================= */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-800">Akses Khusus Guru</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Masukkan PIN Keamanan untuk membuka fitur Bedah Soal, Kunci Jawaban, dan Rekap Siswa.
            </p>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <input
                  ref={pinInputRef}
                  type="password"
                  maxLength={10}
                  value={pinInput}
                  onChange={e => {
                    setPinInput(e.target.value);
                    setPinError(null);
                  }}
                  placeholder="••••"
                  className="w-full text-center tracking-widest text-2xl font-bold px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none transition"
                />
                {pinError && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-red-600 font-semibold mt-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{pinError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleCancelPin}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!pinInput.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Masuk Mode Guru
                </button>
              </div>

              <div className="text-[11px] text-slate-400 pt-1">
                PIN Default: <span className="font-mono font-bold text-slate-600">1234</span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* POP-UP MODAL: UBAH PIN GURU */}
      {/* ========================================================= */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                Ubah PIN Keamanan Guru
              </div>
              <button
                onClick={() => setShowChangePinModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {changePinSuccess ? (
              <div className="text-center py-6 text-emerald-700">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-600" />
                <div className="font-bold text-sm">PIN Berhasil Diperbarui!</div>
                <div className="text-xs text-slate-500 mt-1">Gunakan PIN baru ini untuk sesi berikutnya.</div>
              </div>
            ) : (
              <form onSubmit={handleChangePinSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    PIN Saat Ini:
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPinAttempt}
                    onChange={e => setCurrentPinAttempt(e.target.value)}
                    placeholder="Masukkan PIN lama"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    PIN Baru (4 - 8 digit):
                  </label>
                  <input
                    type="password"
                    required
                    value={newPinInput}
                    onChange={e => setNewPinInput(e.target.value)}
                    placeholder="Masukkan PIN baru"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Ulangi PIN Baru:
                  </label>
                  <input
                    type="password"
                    required
                    value={newPinConfirm}
                    onChange={e => setNewPinConfirm(e.target.value)}
                    placeholder="Konfirmasi PIN baru"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-600"
                  />
                </div>

                {changePinError && (
                  <div className="text-xs text-red-600 font-semibold">{changePinError}</div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePinModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Simpan PIN
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: KONFIRMASI PENGUMPULAN UJIAN (CBT) */}
      {/* ========================================================= */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Konfirmasi Kirim Ujian</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menyelesaikan dan mengirim jawaban ujian ini?
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Nama Peserta:</span>
                <span className="font-bold text-slate-800">{currentStudent?.nama}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Kelas & No. Absen:</span>
                <span className="font-bold text-slate-800">
                  {currentStudent?.kelas} (Absen {currentStudent?.noAbsen})
                </span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span>Soal Terjawab:</span>
                <span className="font-bold text-emerald-700">{answeredCount} dari 25 Soal</span>
              </div>
              {unansweredCount > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Belum Terjawab:</span>
                  <span>{unansweredCount} Soal Kosong</span>
                </div>
              )}
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-start gap-2 border border-red-200">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Masih terdapat {unansweredCount} butir soal yang belum Anda jawab. Soal yang kosong bernilai 0.</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Cek Kembali
              </button>
              <button
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETAIL LEMBAR JAWABAN SISWA (MODE GURU) */}
      {/* ========================================================= */}
      {selectedStudentDetail && isTeacherAuthenticated && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Detail Lembar Jawaban Siswa
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                  {selectedStudentDetail.student.nama} ({selectedStudentDetail.student.kelas} / Absen {selectedStudentDetail.student.noAbsen})
                </h3>
              </div>
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Pill */}
            <div className="bg-slate-50 p-4 border-b border-slate-200 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-500">Nilai Akhir:</span>
                <div className="text-lg font-black text-slate-800">{selectedStudentDetail.nilai}</div>
              </div>
              <div>
                <span className="text-slate-500">Status KKM:</span>
                <div className={`font-bold mt-0.5 ${selectedStudentDetail.isLulus ? 'text-emerald-700' : 'text-red-600'}`}>
                  {selectedStudentDetail.isLulus ? 'Lulus' : 'Remedial'}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Benar:</span>
                <div className="font-bold text-emerald-700 mt-0.5">{selectedStudentDetail.benar} Soal</div>
              </div>
              <div>
                <span className="text-slate-500">Salah:</span>
                <div className="font-bold text-red-600 mt-0.5">{selectedStudentDetail.salah} Soal</div>
              </div>
            </div>

            {/* List Questions Analysis */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {questions.map(q => {
                const userAns = selectedStudentDetail.jawaban[q.id];
                const isCorrect = userAns === q.kunci;
                const isUnanswered = userAns === undefined;

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-xl border text-xs sm:text-sm ${
                      isCorrect
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-red-50/60 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-800">
                        Soal #{q.id} ({metadataMap[q.id]?.sub})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCorrect
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-red-200 text-red-900'
                        }`}
                      >
                        {isCorrect ? 'Benar (+4)' : isUnanswered ? 'Kosong (0)' : 'Salah (0)'}
                      </span>
                    </div>

                    <p className="text-slate-800 font-medium mb-3">{q.pertanyaan}</p>

                    <div className="space-y-1.5 text-xs">
                      {q.opsi.map((opt, oIdx) => {
                        const isStudentChoice = userAns === oIdx;
                        const isKey = q.kunci === oIdx;

                        let style = 'bg-white border-slate-200 text-slate-700';
                        if (isKey) style = 'bg-emerald-100 border-emerald-400 font-semibold text-emerald-900';
                        if (isStudentChoice && !isKey) style = 'bg-red-100 border-red-300 font-semibold text-red-900';

                        return (
                          <div key={oIdx} className={`p-2 rounded-lg border flex items-center justify-between ${style}`}>
                            <span>
                              {['A', 'B', 'C', 'D'][oIdx]}. {opt}
                            </span>
                            {isKey && <span className="text-[10px] font-bold text-emerald-800">Kunci Benar</span>}
                            {isStudentChoice && !isKey && <span className="text-[10px] font-bold text-red-700">Pilihan Siswa</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
              >
                Tutup Lembar Jawaban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: KONFIRMASI RESET / HAPUS REKAP (GURU) */}
      {/* ========================================================= */}
      {showClearConfirm && isTeacherAuthenticated && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-800">Hapus Semua Rekap Nilai?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan menghapus seluruh data siswa dan nilai yang tersimpan secara permanen di browser ini.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8 text-center text-xs text-slate-500">
        Instrumen Evaluasi Pembelajaran PAI & Budi Pekerti SMP Kelas VII Semester 1 • Bab 2 Meneladani Asmaulhusna • Kurikulum Merdeka
      </footer>
    </div>
  );
}
