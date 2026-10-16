import { StudentSubmission } from '../types/student';

// URL Google Apps Script Web App terbaru dari pengguna
export const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyoH90gq_xx2Ksfg47dCjWEohtMRQBXXQ6E4uQwDAQjnN1EDMJkh-I2QGqlle6CrXwB8g/exec';

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
    nilaiAkhir: payload.nilaiAkhir,
    jumlahBenar: payload.jumlahBenar,
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

/**
 * Fetch all student submissions from Google Apps Script Web App
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

    if (Array.isArray(json)) {
      rawList = json;
    } else if (json && Array.isArray(json.data)) {
      rawList = json.data;
    } else if (json && Array.isArray(json.result)) {
      rawList = json.result;
    } else if (json && Array.isArray(json.records)) {
      rawList = json.records;
    } else if (json && Array.isArray(json.values)) {
      // Jika Google Apps Script mengembalikan 2D array baris spreadsheet
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

    // Normalisasi data ke StudentSubmission
    const normalized: StudentSubmission[] = rawList.map((item, idx) => {
      const nama = item.nama || item.Nama || item.namaSiswa || item['Nama Siswa'] || 'Tanpa Nama';
      const kelas = item.kelas || item.Kelas || item.kelasSiswa || '-';
      const noAbsen = String(item.noAbsen || item.NoAbsen || item.absen || item['No. Absen'] || idx + 1);
      const nisn = item.nisn || item.NISN || item.nis || undefined;

      const nilaiAkhir = Number(item.nilaiAkhir ?? item.nilai ?? item.Nilai ?? item.skor ?? item['Nilai Akhir'] ?? 0);
      const jumlahBenar = Number(item.jumlahBenar ?? item.benar ?? item.Benar ?? Math.round(nilaiAkhir / 4));
      const jumlahSalah = Number(item.jumlahSalah ?? item.salah ?? item.Salah ?? Math.max(0, 25 - jumlahBenar));
      const totalSoal = 25;
      const terjawab = Math.min(25, jumlahBenar + jumlahSalah);

      const rawTime = item.waktu || item.timestamp || item.Tanggal || item.Waktu || item.Timestamp;
      let formattedDate = '-';
      if (rawTime) {
        try {
          const d = new Date(rawTime);
          if (!isNaN(d.getTime())) {
            formattedDate =
              d.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) + ' WIB';
          } else {
            formattedDate = String(rawTime);
          }
        } catch {
          formattedDate = String(rawTime);
        }
      } else {
        formattedDate = new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }

      return {
        id: item.id || `gas_${idx}_${Date.now()}`,
        timestamp: rawTime ? new Date(rawTime).toISOString() : new Date().toISOString(),
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
      // Jeda 800ms sebelum retry
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
