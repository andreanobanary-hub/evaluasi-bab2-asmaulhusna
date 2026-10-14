import { StudentSubmission } from '../types/student';

export const GOOGLE_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbwTXU2WlZwvAqpV3vVnSUNoKcXdSF1ykCgen889QofQHtCfzsyo_VxlVTIFsEBHZ3Hs/exec';

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
 * Send student test submission to Google Apps Script Web App (Spreadsheet)
 */
export async function sendSubmissionToGAS(payload: SubmitPayload): Promise<{ success: boolean; message?: string }> {
  try {
    const postData = {
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

    // Google Apps Script requires text/plain or no preflight CORS to avoid OPTIONS errors
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(postData),
      redirect: 'follow'
    });

    if (!response.ok) {
      console.warn('GAS responded with non-200 status:', response.status);
    }

    let responseData: any = null;
    try {
      const text = await response.text();
      responseData = JSON.parse(text);
    } catch {
      // Some GAS scripts return plain text like "Success" or redirect html
      responseData = { status: 'success' };
    }

    return {
      success: true,
      message: responseData?.message || 'Data berhasil dikirim ke server online Google Sheets.'
    };
  } catch (error: any) {
    console.error('Error sending submission to Google Apps Script:', error);
    // Even if fetch throws a CORS opaque warning after redirect, the POST often succeeded on GAS.
    return {
      success: false,
      message: error?.message || 'Gagal terhubung ke Google Apps Script. Silakan periksa koneksi internet.'
    };
  }
}

/**
 * Fetch all student submissions from Google Apps Script Web App
 */
export async function fetchSubmissionsFromGAS(): Promise<StudentSubmission[]> {
  try {
    // Add cache buster query parameter
    const cacheBusterUrl = `${GOOGLE_SCRIPT_URL}?t=${Date.now()}`;
    const response = await fetch(cacheBusterUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    let rawList: any[] = [];

    if (Array.isArray(json)) {
      rawList = json;
    } else if (json && Array.isArray(json.data)) {
      rawList = json.data;
    } else if (json && Array.isArray(json.result)) {
      rawList = json.result;
    } else if (json && Array.isArray(json.records)) {
      rawList = json.records;
    } else if (json && typeof json === 'object') {
      // Attempt to find any array property in the response
      const arrayKey = Object.keys(json).find(key => Array.isArray(json[key]));
      if (arrayKey) {
        rawList = json[arrayKey];
      }
    }

    // Normalize raw entries to StudentSubmission interface
    const normalized: StudentSubmission[] = rawList.map((item, idx) => {
      const nama = item.nama || item.Nama || item.namaSiswa || 'Tanpa Nama';
      const kelas = item.kelas || item.Kelas || item.kelasSiswa || '-';
      const noAbsen = String(item.noAbsen || item.NoAbsen || item.absen || item.absenSiswa || idx + 1);
      const nisn = item.nisn || item.NISN || item.nis || undefined;

      const nilaiAkhir = Number(item.nilaiAkhir ?? item.nilai ?? item.Nilai ?? item.skor ?? item.totalSkor ?? 0);
      const jumlahBenar = Number(item.jumlahBenar ?? item.benar ?? item.Benar ?? Math.round(nilaiAkhir / 4));
      const jumlahSalah = Number(item.jumlahSalah ?? item.salah ?? item.Salah ?? (25 - jumlahBenar));
      const totalSoal = 25;
      const terjawab = jumlahBenar + jumlahSalah;

      const rawTime = item.waktu || item.timestamp || item.Tanggal || item.Waktu;
      let formattedDate = '-';
      if (rawTime) {
        try {
          const d = new Date(rawTime);
          if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString('id-ID', {
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
        terjawab: Math.min(terjawab, 25),
        belumTerjawab: Math.max(0, 25 - terjawab),
        benar: jumlahBenar,
        salah: jumlahSalah,
        nilai: nilaiAkhir,
        isLulus: nilaiAkhir >= 75,
        jawaban: item.jawaban || {}
      };
    });

    return normalized;
  } catch (error) {
    console.error('Error fetching submissions from Google Apps Script:', error);
    throw error;
  }
}
