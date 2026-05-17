# **Product Requirement Document (PRD) & AI Implementation Plan**

**Project Name:** AI Support & Lead Qualifier (White-label Architecture)

**Date:** May 13, 2026

**Document Status:** Final Draft for Implementation

## **1\. Executive Summary**

### **1.1 Objective**

Membangun sistem *Customer Support* dan *Lead Qualifier* berbasis AI dengan arsitektur *white-label*. Sistem akan bertindak sebagai penyaring ketat ("Bouncer") yang mengelola pertanyaan awal dan menyaring *intent* pengguna. Hanya prospek dengan niat beli nyata (*high-intent*) yang akan diteruskan ke WhatsApp *Owner*.

### **1.2 Core Problem & Solution**

**Masalah:** Pemilik bisnis (*owner*) membuang banyak waktu melayani pertanyaan *window shopping* atau "tanya-tanya", yang menyebabkan *burnout*. Membuat *chatbot* baru dari awal untuk bisnis berbeda membutuhkan biaya *hardcode* yang tinggi.

**Solusi:** Sebuah *chatbot* RAG (*Retrieval-Augmented Generation*) yang dinamis. Dilengkapi dengan Admin Dashboard sederhana untuk mengubah identitas bisnis (Nama, Nomor WA) dan data pengetahuan (Dokumen PDF/TXT) tanpa perlu mengubah kode. AI akan menerapkan strategi "Jual Mahal" (Progressive Screening) sebelum memberikan akses ke *Owner*.

## **2\. Product Architecture & Tech Stack**

Sistem dirancang *serverless* dan modern untuk efisiensi biaya.

* **Frontend (UI Klien & Admin):** Next.js (App Router), React, Tailwind CSS. (Memungkinkan *widget*, *standalone page*, dan *admin dashboard* berada dalam satu *repo*).  
* **Backend / API Layer:** Next.js Route Handlers (Edge Functions jika memungkinkan) atau Node.js / Express untuk koneksi ke layanan eksternal.  
* **Database (Konfigurasi & Log):** Supabase (PostgreSQL) atau Firebase Firestore.  
* **Vector Database (Knowledge Base):** Pinecone (atau Supabase pgvector jika ingin konsolidasi layanan).  
* **LLM & AI Engine:** Google Gemini API.  
* **File Storage:** AWS S3, Supabase Storage, atau Firebase Storage (untuk menyimpan dokumen asli sebelum di-*parse* ke *vector*).

## **3\. Core Features & Business Logic**

### **3.1 Mode Antarmuka (Frontend)**

1. **Floating Widget:** *Pop-up chat* ringan di sudut kanan bawah untuk disematkan di *website* apa pun via tag \<script\>.  
2. **Standalone Chat Page:** Halaman *full-screen* (misal: /chat/\[business-id\]) yang cocok untuk disematkan di tautan bio media sosial.  
3. **Admin Dashboard:** Halaman terlindungi (autentikasi) untuk mengelola data bisnis.

### **3.2 Logika Penyaringan Ketat ("The Bouncer")**

AI akan diberikan *System Prompt* spesifik dengan logika *state machine* terselubung:

* **State 0 (Information):** User bertanya hal umum. AI menjawab berdasarkan dokumen (RAG). **Tombol WA tidak ada**.  
* **State 1 (Interest):** User bilang "Mau beli". AI tidak langsung memberikan WA. AI bertanya: "Untuk pesanan ini, rencananya jumlah berapa dan kirim ke area mana kak?" (Atau pertanyaan spesifik lain yang diatur Admin).  
* **State 2 (Qualified):** User menjawab detail (misal: "100 pcs ke Jakarta"). AI mendeteksi kelengkapan informasi. AI merespons konfirmasi dan **menampilkan tombol CTA ke WhatsApp Owner** dengan pesan *pre-filled* yang memuat detail tadi.

## **4\. AI-Assisted Implementation Phases (Token-Optimized)**

Bagian ini adalah panduan bagi Anda saat melakukan *prompting* ke *AI coding assistant*. Kerjakan secara berurutan, satu tahap demi satu tahap, jangan digabung.

### **Phase 1: Project Setup & Database Architecture (Backend Foundation)**

*Fokus: Mengatur fondasi tempat data akan hidup.*

* **Step 1.1:** *Prompt AI* untuk inisialisasi *project* Next.js dengan Tailwind dan TypeScript (opsional tapi disarankan).  
* **Step 1.2:** *Prompt AI* untuk merancang skema database (Supabase/Firebase) dengan dua tabel utama: BusinessProfiles (id, name, wa\_number, pre\_filled\_msg, prompt\_rules) dan Conversations (id, business\_id, user\_id, status, logs).  
* **Step 1.3:** Setup Vector Database (Pinecone) dan buat fungsi koneksi.

### **Phase 2: Admin Dashboard (Configuration)**

*Fokus: Membangun UI untuk mengelola parameter bisnis.*

* **Step 2.1:** *Prompt AI* untuk membuat halaman *layout* Admin Dashboard (Sidebar, Header).  
* **Step 2.2:** Buat halaman/form Business Settings untuk CRUD data BusinessProfiles.  
* **Step 2.3:** Buat halaman Knowledge Base Upload. *Prompt AI* khusus untuk menangani pengunggahan file (PDF/TXT) ke *storage*.

### **Phase 3: File Processing & RAG Pipeline (The Brains)**

*Fokus: Mengubah dokumen menjadi kecerdasan.*

* **Step 3.1:** *Prompt AI* untuk membuat API *endpoint* (misal di Node.js/Next.js backend) yang bertugas mengekstrak teks dari file PDF yang baru diunggah.  
* **Step 3.2:** *Prompt AI* untuk membuat fungsi *chunking* (memecah teks menjadi paragraf kecil).  
* **Step 3.3:** *Prompt AI* untuk menghubungkan teks tersebut dengan API *Embeddings* (misal Google AI/OpenAI) dan menyimpannya ke Pinecone beserta business\_id sebagai *metadata*.

### **Phase 4: Chat Engine & System Prompting (The Core Logic)**

*Fokus: Logika percakapan dan AI "Bouncer".*

* **Step 4.1:** *Prompt AI* untuk membuat *endpoint* /api/chat. API ini menerima teks pengguna, mencari konteks di Pinecone berdasarkan business\_id, dan mengirimkannya ke Google Gemini API.  
* **Step 4.2:** **Crucial Step:** Minta AI untuk membuat kerangka *System Prompt* yang kuat. Prompt ini harus diinjeksi dengan variabel business\_name, knowledge\_context, dan aturan ketat "Progressive Screening" (tidak boleh memberikan nomor WA sebelum mendapat detail X dan Y).

### **Phase 5: Client UI Construction (Widget & Standalone)**

*Fokus: Membangun antarmuka untuk pelanggan.*

* **Step 5.1:** *Prompt AI* untuk membangun komponen UI Chat (Messages Container, Input Box, Chat Bubble). Gunakan komponen UI dasar (*dummy data* dulu).  
* **Step 5.2:** Hubungkan UI Chat dengan /api/chat.  
* **Step 5.3:** Pisahkan implementasi menjadi komponen Widget (dengan tombol *minimize/maximize*) dan halaman rute Standalone.  
* **Step 5.4:** Buat komponen WhatsAppButton dinamis yang hanya dirender (*conditionally rendered*) jika API Gemini mengembalikan status isQualified: true.

### **Phase 6: Final Integration & Security**

*Fokus: Menjahit semua komponen dan memastikan keamanan.*

* **Step 6.1:** Hubungkan form di Admin Panel dengan RAG Pipeline (Phase 3\) agar unggah file langsung memperbarui Vector Database.  
* **Step 6.2:** Tambahkan *rate-limiting* pada *chat endpoint* untuk menghindari *spam*.  
* **Step 6.3:** Uji coba skenario "tanya-tanya" vs "niat beli serius" untuk menyesuaikan (*tweak*) System Prompt di Phase 4\.

## **5\. Security & Isolation**

* Setiap *query* ke Vector Database *harus* memfilter berdasarkan business\_id untuk mencegah kebocoran data antar profil bisnis (Multi-tenancy security).  
* File asli (PDF/TXT) yang disimpan di *cloud storage* harus bersifat *private* dan tidak dapat diakses publik, hanya sistem API yang boleh membacanya.

## **6\. UI/UX Wireframes (Structural Representation)**

Bagian ini merepresentasikan tata letak (layout) kasar antarmuka aplikasi.

### **6.1 Client Facing: Floating Widget & Standalone Page**

**A. Floating Widget (Collapsed State)**

Muncul di halaman website milik bisnis klien.

\[ Area Kosong Website Klien \]  
...  
...  
...  
                                       \[ Ikon Chat \] \<-- Animasi berdenyut

**B. Chat Interface (Expanded Widget / Standalone Page)**

Tampilan saat widget diklik atau saat diakses melalui URL khusus.

\===================================================  
| \[Logo\]  \[Nama Bisnis\]                       \[X\] | \<-- Header  
|-------------------------------------------------|  
|                                                 |  
|  \[AI\]: Halo\! Ada yang bisa kami bantu           |  
|        mengenai layanan kami?                   |  
|                                                 |  
|  \[User\]: Saya mau order paket Premium           |  
|                                                 |  
|  \[AI\]: Baik, untuk paket Premium kami.          |  
|        Boleh tahu order untuk berapa pax dan    |  
|        dikirim ke area mana kak?                |  
|                                                 |  
|  \[User\]: 50 pax, ke area Sudirman.              |  
|                                                 |  
|  \[AI\]: Siap, pesanan bisa kami proses.          |  
|        Silakan klik tombol di bawah untuk       |  
|        langsung terhubung dengan Owner ya.      |  
|                                                 |  
|  \[ 🟢 Lanjut Chat via WhatsApp Owner \] \<------- \*Tombol CTA Muncul\*  
|                                                 |  
|-------------------------------------------------|  
| \[ Ketik pesan di sini... \]              \[Kirim\] | \<-- Input Box  
\===================================================

### **6.2 Admin Dashboard (Control Panel)**

Antarmuka ini digunakan oleh Anda atau pemilik bisnis untuk mengatur AI.

**A. Dashboard Layout (Sidebar & Konten)**

\========================================================================  
| \[Logo App Anda\]      |  Header: Pengaturan Bisnis                    |  
|----------------------|-----------------------------------------------|  
| 🏠 Beranda           |                                               |  
| 🏢 Profil Bisnis     |  Nama Bisnis          : \[ Input Text \]        |  
| 📚 Knowledge Base    |  Nomor WA Owner       : \[ Input Number \]      |  
| 💬 Riwayat Obrolan   |  Pre-filled Pesan WA  : \[ Text Area \]         |  
| ⚙️ Pengaturan        |                                               |  
|                      |  Aturan Kualifikasi Prospek ("Bouncer"):      |  
|                      |  \[ Text Area: "Wajib menanyakan lokasi        |  
|                      |    dan budget sebelum beri tombol WA" \]       |  
|                      |                                               |  
| \[🚪 Logout\]          |  \[ Simpan Perubahan \]                         |  
\========================================================================

**B. Halaman Knowledge Base (RAG Source)**

\========================================================================  
| \[Logo App Anda\]      |  Header: Kelola Pengetahuan AI                |  
|----------------------|-----------------------------------------------|  
| 🏠 Beranda           |                                               |  
| 🏢 Profil Bisnis     |  \+ Upload Dokumen Baru (PDF/TXT/DOCX)         |  
| 📚 Knowledge Base  \<-|  \-------------------------------------------  |  
| 💬 Riwayat Obrolan   | |         \[ Area Drag & Drop File \]         | |  
| ⚙️ Pengaturan        |  \-------------------------------------------  |  
|                      |                                               |  
|                      |  Daftar Dokumen Aktif:                        |  
|                      |  1\. Katalog\_Lengkap\_2026.pdf      \[🗑️ Hapus\]  |  
|                      |  2\. SOP\_TanyaJawab\_Admin.txt      \[🗑️ Hapus\]  |  
|                      |                                               |  
| \[🚪 Logout\]          |  Status Vector DB: \[🟢 Tersinkronisasi\]       |  
\========================================================================  
