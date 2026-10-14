export interface StudentIdentity {
  nama: string;
  kelas: string;
  noAbsen: string;
  nisn?: string;
}

export interface StudentSubmission {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string; // e.g. "14 Okt 2026, 11:45 WIB"
  student: StudentIdentity;
  totalSoal: number;
  terjawab: number;
  belumTerjawab: number;
  benar: number;
  salah: number;
  nilai: number; // 0 - 100
  isLulus: boolean; // Nilai >= KKM (75)
  jawaban: Record<number, number>; // questionId -> chosenOptionIndex
}
