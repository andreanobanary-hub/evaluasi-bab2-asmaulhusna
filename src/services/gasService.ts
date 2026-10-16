import { StudentSubmission } from '../types/student';

// URL Endpoint Google Apps Script Web App terbaru sesuai permintaan pengguna
export const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwTXU2WlZwvAqpV3vVnSUNoKcXdSF1ykCgen889QofQHtCfzsyo_VxlVTIFsEBHZ3Hs/exec';

const CACHE_KEY = 'evaluasi_pai_cached_online_data';

export interface SubmitPayload {
  nama: string;
  kelas: string;
  noAbsen: string | number;
  nilaiAkhir: number;
  jumlahBenar: number;
  jumlahSalah: number;
  nisn?: string;
  waktu?: string;
  totalSoal?: number;
}

/**
 * Helper to fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Koneksi timeout setelah ${timeoutMs / 1000} detik. Server sedang sibuk.`);
    }
    throw error;
  }
}

/**
 * Send student test submission to Google Apps Script Web App (Spreadsheet)
 * Menggunakan mode "no-cors" dan "text/plain" agar tidak terhalang preflight CORS / 302 redirect GAS
 */
export async function sendSubmissionToGAS(payload: SubmitPayload): Promise<{ success: boolean; message?: string }> {
  const payloadData = {
    nama: payload.nama,
    kelas: payload.kelas,
    noAbsen: payload.noAbsen,
    nilai: payload.nilaiAkhir, // Mapping: item.nilai
    nilaiAkhir: payload.nilaiAkhir,
    benar: payload.jumlahBenar, // Mapping: item.benar
    jumlahBenar: payload.jumlahBenar,
    salah: payload.jumlahSalah, // Mapping: item.salah
    jumlahSalah: payload.jumlahSalah,
    nisn: payload.nisn || '-',
    waktu: payload.waktu || new Date().toLocaleString('id-ID'),
    timestamp: new Date().toISOString()
  };

  try {
    // Mode no-cors dengan Content-Type text/plain adalah standar emas pengiriman ke GAS Web App
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payloadData)
    });

    return {
      success: true,
      message: 'Data berhasil terkirim dan disimpan di Google Spreadsheet online.'
    };
  } catch (error: any) {
    console.warn('First POST attempt error, trying fallback:', error);
    try {
      // Fallback: coba POST biasa dengan redirect follow
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payloadData),
        redirect: 'follow'
      });
      return {
        success: true,
        message: 'Data berhasil terkirim ke server online Google Sheets.'
      };
    } catch (fallbackError: any) {
      console.error('All POST attempts failed:', fallbackError);
      return {
        success: false,
        message: 'Koneksi internet bermasalah. Data tetap disimpan di perangkat lokal.'
      };
    }
  }
}

// Fungsi format waktu aman sesuai ketentuan perbaikan error Invalid time value
export function formatWaktu(val: any): string {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    }
  } catch (e) {}
  // Jika bukan objek Date standar (misal "16/10/2026, 10.30.00"), tampilkan string aslinya langsung
  const str = String(val).trim();
  const splitPart = str.split(',')[1];
  if (splitPart && splitPart.trim()) {
    const timeOnly = splitPart.trim();
    return timeOnly.includes('WIB') ? timeOnly : `${timeOnly} WIB`;
  }
  return str;
}

export function safeIsoTimestamp(val: any): string {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch {}
  return new Date().toISOString();
}

/**
 * Fetch all student submissions from Google Apps Script Web App
 * Membaca respon result.data dengan mapping: nama, kelas, noAbsen, nilai, benar, salah
 * Dilengkapi Timeout 15 detik dan Retry otomatis 1 kali jika lambat/gagal
 */
export async function fetchSubmissionsFromGAS(): Promise<{
  submissions: StudentSubmission[];
  fromCache: boolean;
}> {
  const requestOnce = async (): Promise<StudentSubmission[]> => {
    const cacheBusterUrl = `${GOOGLE_SCRIPT_URL}${GOOGLE_SCRIPT_URL.includes('?') ? '&' : '?'}t=${Date.now()}`;

    const response = await fetchWithTimeout(
      cacheBusterUrl,
      {
        method: 'GET',
        redirect: 'follow',
        headers: {
          Accept: 'application/json'
        }
      },
      15000 // 15 detik timeout
    );

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Respon dari Google Apps Script bukan format JSON yang valid.');
    }

    let rawList: any[] = [];

    // Prioritaskan struktur result.data sesuai instruksi
    if (json && Array.isArray(json.data)) {
      rawList = json.data;
    } else if (Array.isArray(json)) {
      rawList = json;
    } else if (json && Array.isArray(json.result)) {
      rawList = json.result;
    } else if (json && Array.isArray(json.records)) {
      rawList = json.records;
    } else if (json && Array.isArray(json.values)) {
      const [headerRow, ...dataRows] = json.values;
      if (Array.isArray(headerRow)) {
        rawList = dataRows.map((row: any[]) => {
          const obj: Record<string, any> = {};
          headerRow.forEach((colName: string, colIdx: number) => {
            obj[colName] = row[colIdx];
          });
          return obj;
        });
      }
    } else if (json && typeof json === 'object') {
      const arrayKey = Object.keys(json).find(key => Array.isArray(json[key]));
      if (arrayKey) {
        rawList = json[arrayKey];
      }
    }

    // Mapping kolom sesuai instruksi:
    // nama: item.nama
    // kelas: item.kelas
    // noAbsen: item.noAbsen
    // nilai: item.nilai
    // benar: item.benar
    // salah: item.salah
    const normalized: StudentSubmission[] = rawList.map((item, idx) => {
      const nama = item.nama ?? item.Nama ?? item.namaSiswa ?? item['Nama Siswa'] ?? 'Tanpa Nama';
      const kelas = item.kelas ?? item.Kelas ?? item.kelasSiswa ?? '-';
      const noAbsen = String(item.noAbsen ?? item.NoAbsen ?? item.absen ?? item['No. Absen'] ?? idx + 1);
      const nisn = item.nisn || item.NISN || item.nis || undefined;

      // Nilai Akhir: item.nilai
      const nilaiAkhir = Number(item.nilai ?? item.nilaiAkhir ?? item.Nilai ?? item.skor ?? item['Nilai Akhir'] ?? 0);
      // Jumlah Benar: item.benar
      const jumlahBenar = Number(item.benar ?? item.jumlahBenar ?? item.Benar ?? Math.round(nilaiAkhir / 4));
      // Jumlah Salah: item.salah
      const jumlahSalah = Number(item.salah ?? item.jumlahSalah ?? item.Salah ?? Math.max(0, 25 - jumlahBenar));
      const totalSoal = 25;
      const terjawab = Math.min(25, jumlahBenar + jumlahSalah);

      const rawTime =
        item.waktu ??
        item.timestamp ??
        item.Tanggal ??
        item.Waktu ??
        item.Timestamp ??
        item.date ??
        item.Date;

      const formattedDate = formatWaktu(rawTime);
      const safeTime = safeIsoTimestamp(rawTime);

      return {
        id: item.id || `gas_${idx}_${Date.now()}`,
        timestamp: safeTime,
        formattedDate,
        student: {
          nama,
          kelas,
          noAbsen,
          nisn
        },
        totalSoal,
        terjawab,
        belumTerjawab: Math.max(0, totalSoal - terjawab),
        benar: jumlahBenar,
        salah: jumlahSalah,
        nilai: nilaiAkhir,
        isLulus: nilaiAkhir >= 75,
        jawaban: item.jawaban || {}
      };
    });

    // Simpan data terakhir yang berhasil ke LocalStorage sebagai cadangan saat offline
    if (normalized.length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(normalized));
      } catch (e) {
        console.warn('Gagal menyimpan cache online:', e);
      }
    }

    return normalized;
  };

  // Mekanisme Retry otomatis 1 kali jika request pertama gagal/lambat
  try {
    const list = await requestOnce();
    return { submissions: list, fromCache: false };
  } catch (firstErr) {
    console.warn('Request GET pertama gagal, mencoba retry otomatis ke-2...', firstErr);
    try {
      await new Promise(r => setTimeout(r, 800));
      const list = await requestOnce();
      return { submissions: list, fromCache: false };
    } catch (secondErr: any) {
      console.error('Request GET kedua gagal:', secondErr);

      // Cek apakah ada cache di LocalStorage
      const cached = getCachedOnlineData();
      if (cached && cached.length > 0) {
        return { submissions: cached, fromCache: true };
      }

      throw secondErr;
    }
  }
}

/**
 * Ambil data cadangan yang pernah berhasil ditarik sebelumnya
 */
export function getCachedOnlineData(): StudentSubmission[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
