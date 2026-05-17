# AI Support & Lead Qualifier (The "Bouncer")

Sistem *Customer Support* dan *Lead Qualifier* berbasis AI dengan arsitektur *white-label*. Aplikasi ini dirancang untuk melayani pertanyaan pelanggan secara otomatis berdasarkan dokumen yang Anda berikan (menggunakan teknologi RAG), dan melakukan kualifikasi ketat sebelum memberikan akses ke WhatsApp *Owner*.

## Prasyarat Instalasi
Sebelum memulai, pastikan Anda telah memiliki hal-hal berikut:
1. **Node.js** (versi 18.x atau terbaru)
2. Akun **Supabase** (untuk Database PostgreSQL, pgvector, dan Storage)
3. Akun **Google AI Studio** (untuk mendapatkan Gemini API Key)

---

## Panduan Instalasi (Langkah demi Langkah)

### 1. Instalasi Dependensi
Buka terminal di direktori proyek ini, kemudian jalankan perintah:
```bash
npm install
```

### 2. Pengaturan Supabase (Database & Storage)
Aplikasi ini sangat bergantung pada Supabase untuk menyimpan profil bisnis, riwayat obrolan, dan dokumen vektor AI.
1. Buat proyek baru di [Supabase](https://supabase.com/).
2. Buka menu **SQL Editor** di *dashboard* Supabase Anda.
3. Buka file `supabase/schema.sql` yang ada di dalam proyek ini, salin seluruh isinya, lalu *Paste* dan jalankan (*Run*) di SQL Editor Supabase. Script ini otomatis akan:
   - Mengaktifkan ekstensi `vector` (pgvector).
   - Membuat tabel `BusinessProfiles`, `Conversations`, dan `KnowledgeDocuments`.
   - Membuat fungsi pencarian AI (`match_knowledge_documents`).
4. Buka menu **Storage** di Supabase, lalu buat sebuah *Bucket* baru dengan nama: **`knowledge_base`**.
   - Pastikan *bucket* ini bersifat **Public** atau atur *Policies*-nya agar sistem dapat mengunggah file. (Sesuai skrip di `schema.sql`, *policies* dasar biasanya sudah dibuat).

### 3. Pengaturan Environment Variables (Variabel Lingkungan)
1. Salin file `.env.example` menjadi `.env.local` di root folder proyek Anda.
2. Buka `.env.local` dan isi nilainya:

```env
# Dapatkan URL dan Anon Key dari Supabase (Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...

# Dapatkan Service Role Key dari Supabase (Project Settings -> API) 
# PERINGATAN: Jangan sebarkan Service Role Key ke klien!
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# Dapatkan dari Google AI Studio (https://aistudio.google.com/)
GEMINI_API_KEY=AIzaSy...
```

### 4. Jalankan Aplikasi
Setelah semuanya terkonfigurasi, jalankan *development server*:

```bash
npm run dev
```
Aplikasi kini berjalan di [http://localhost:3000](http://localhost:3000).

---

## Panduan Penggunaan Awal (Sangat Penting!)

Setelah aplikasi berjalan, ikuti urutan berikut agar AI dapat bekerja:

1. **Konfigurasi Profil Bisnis:**
   - Buka: [http://localhost:3000/admin/profile](http://localhost:3000/admin/profile)
   - Isi Nama Bisnis dan Nomor WhatsApp.
   - **Tentukan "Aturan Kualifikasi Bouncer":** (Misal: *"Jangan berikan nomor WhatsApp sebelum user menyebutkan jumlah pesanan dan lokasi pengiriman."*)
   - Klik **Simpan**.

2. **Berikan Pengetahuan ke AI:**
   - Buka: [http://localhost:3000/admin/knowledge-base](http://localhost:3000/admin/knowledge-base)
   - Unggah file PDF atau TXT yang berisi katalog produk, harga, FAQ, atau informasi bisnis Anda.
   - Tunggu hingga proses AI selesai (status tersinkronisasi).

3. **Uji Coba Chatbot:**
   - Anda dapat mencoba *chat* dengan AI di halaman *standalone*:
     `http://localhost:3000/chat/[business-id-anda]`
   - *(Catatan: Anda bisa mendapatkan `business-id` dari tabel `BusinessProfiles` di Supabase Anda, atau Anda bisa menghubungkannya dengan tombol di Dashboard nantinya).*
   - **Mode Widget:** Jika Anda ingin melihat bentuk *floating widget* (untuk dipasang di website), akses `http://localhost:3000/widget/[business-id-anda]`.

---
## Arsitektur Teknis Singkat
- **Frontend/UI:** Next.js App Router, Tailwind CSS, Lucide Icons.
- **RAG Engine:** Menggunakan `@google/generative-ai` (`gemini-1.5-flash` untuk chat dan `text-embedding-004` untuk vector embedding).
- **Rate Limiting:** Diimplementasikan secara in-memory pada `/api/chat` (maksimal 10 request / menit per IP).
