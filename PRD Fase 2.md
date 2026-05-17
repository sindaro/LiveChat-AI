# **Product Requirement Document (PRD) & AI Implementation Plan**

**Project Name:** AI Support & Lead Qualifier (SaaS Platform Edition)

**Date:** May 14, 2026

**Document Status:** Version 4.1 (SaaS, Engage, & Smart Handoff)

## **1\. Executive Summary**

### **1.1 Objective**

Bertransformasi dari aplikasi *single-business* menjadi platform **SaaS (Software as a Service)** *white-label*. Platform ini memungkinkan banyak pemilik bisnis (klien) untuk mendaftar, mengelola *Knowledge Base* mereka sendiri, dan menyematkan AI *Chatbot* proaktif di *website* mereka.

### **1.2 Core Problem & Solution**

**Masalah:** Mengelola banyak klien di satu *database* rentan terhadap kebocoran data. Klien juga sering kehabisan limit API saat *traffic* tinggi, AI pasif gagal menangkap pengunjung (*window shopper*), dan *owner* kehilangan konteks saat pelanggan dioper ke WhatsApp.

**Solusi:**

1. **RLS (Row Level Security)** untuk isolasi data (*Multi-Tenancy*).  
2. **Gemini API Rotator** otomatis untuk mencegah *downtime*.  
3. **Proactive Engage** untuk menyapa pengunjung berdasarkan *traffic*.  
4. **Smart WhatsApp Handoff** yang otomatis merangkum data pesanan prospek untuk dikirim ke *owner*.

## **2\. Product Architecture & Tech Stack**

* **Frontend:** Next.js (App Router), React, Tailwind CSS.  
* **Backend / API Layer:** Next.js Route Handlers.  
* **Database & Storage:** Supabase (PostgreSQL \+ Auth \+ RLS \+ pgvector \+ Storage).  
* **AI Engine:** Google Gemini API (Multiple Keys via Rotator).

## **3\. Core SaaS Features & Logic**

### **3.1 Multi-Tenancy & Row Level Security (RLS)**

* **Authentication:** Menggunakan Supabase Auth (Email/Password).  
* **RLS Policies:** Setiap tabel (BusinessProfiles, KnowledgeBase, ChatHistory, CampaignRules) memiliki kolom owner\_id. *Policy* di Supabase akan memaksa aturan: *Sistem hanya bisa membaca/menulis baris data di mana owner\_id cocok dengan ID user yang sedang login.*

### **3.2 Gemini API Key Rotator**

* API Key disimpan di tabel BusinessProfiles dalam format *array* JSON (misal: api\_keys: \["key1", "key2", "key3"\]).  
* **Rotator Logic:** Endpoint /api/chat akan mencoba *Key 1*. Jika mendapat *Error 429*, sistem beralih ke *Key 2*, tanpa pelanggan menyadari.

### **3.3 Chat History & Lead Tracking**

* Dashboard Admin memiliki halaman **"Riwayat Chat"**.  
* Menarik data dari tabel ChatHistory. Obrolan yang berhasil lolos kualifikasi Bouncer akan diberi **Tag "🔥 Hot Lead"** agar admin mudah memantaunya.

### **3.4 Proactive Engage & Traffic**

* **Traffic Tracking:** *Widget* melacak URL (window.location.href) dan waktu tunggu (*dwell time*).  
* **Engage Campaigns:** Klien bisa membuat aturan di tabel CampaignRules. Misal: *Jika URL \= '/pricing' DAN Dwell Time \> 15 detik MAKA pop-up widget*.

### **3.5 Smart WhatsApp Handoff (Context-Aware)**

* **Logic AI:** Saat AI memutuskan isQualified: true, AI diwajibkan untuk mengekstrak data dari obrolan (misal: Jumlah Pesanan, Lokasi, Masalah) ke dalam variabel lead\_summary.  
* **URL Injection:** Tombol WhatsApp akan ter- *generate* secara dinamis. Formatnya: Pesan Pre-filled Owner \+ \\n\\n\[Data Prospek AI\] \+ lead\_summary. Owner langsung tahu siapa dan apa yang pelanggan mau saat pesan WA masuk.

## **4\. Implementation Phases (AI Prompting Guide)**

*(Note: Phase 1-6 dianggap fondasi dasar yang sudah selesai).*

### **Phase 7: SaaS Foundation (Auth & Data Isolation)**

* **Step 7.1:** Implementasi Supabase Auth.  
* **Step 7.2:** Update tabel dengan owner\_id (UUID). Buat relasi ke auth.users.  
* **Step 7.3:** Aktifkan Row Level Security (RLS) di semua tabel dengan *policy* owner\_id.

### **Phase 8: API Rotator & Smart Handoff**

* **Step 8.1:** Tambahkan input UI di Admin untuk menyimpan banyak Gemini API Keys (kolom api\_keys). Update *endpoint* /api/chat untuk sistem Rotator (try-catch).  
* **Step 8.2:** **(Smart Handoff)** Update skema JSON Gemini di /api/chat. Tambahkan atribut leadSummary (string). Jika isQualified: true, AI wajib mengisi ringkasan profil prospek di atribut tersebut.  
* **Step 8.3:** Update komponen Client Chat UI. Jika isQualified aktif, ambil leadSummary dari respons AI, lalu gabungkan dengan waNumber dan preFilledMsg untuk membentuk link wa.me/ yang memuat ringkasan data.  
* **Step 8.4:** Buat UI /admin/history untuk menampilkan riwayat obrolan pelanggan, beri label khusus untuk *Qualified Leads*.

### **Phase 9: Proactive Engage & Traffic System**

* **Step 9.1:** Buat tabel CampaignRules (id, business\_id, url\_target, time\_delay\_sec, trigger\_message, is\_active).  
* **Step 9.2:** Buat halaman /admin/engage untuk CRUD *CampaignRules*.  
* **Step 9.3:** Update *Client Widget* untuk mendeteksi window.location dan pasang setTimeout.  
* **Step 9.4:** Jika *trigger* aktif, buka widget dan injeksi trigger\_message ke *chat*.