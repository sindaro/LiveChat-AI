# **PRD Addendum: Advanced SaaS & Agency UI Architecture**

**Reference:** UI/UX Integration based on Enterprise SaaS standards.

**Status:** Supplementary guide for Frontend Development (Next.js & Tailwind CSS).

## **1\. Global Navigation & Agency Workspace (The "Hub")**

### **1.1 Workspace Switcher (Top Left Navigation)**

* **Concept:** A dropdown selector located at the top-left of the dashboard header.  
* **Functionality:** Allows the Agency Owner to seamlessly switch between different client businesses (e.g., from "LiveChatAI Agency" to "IAMNOTBASIC.COM Shop").  
* **Technical Implementation:** Changing the dropdown updates the global businessId state and dynamically changes the routing context without requiring a full page reload.

### **1.2 Tabbed Sub-Navigation**

* **Concept:** Once a specific business is selected, the primary navigation switches to a horizontal tabbed layout just below the header.  
* **Tabs Required:**  
  * Settings: Core configurations (Identity, AI Models, Behavior, UI, Conversation Flow).  
  * Embed & Integrate: Halaman terpadu untuk mengambil kode pemasangan (iframe, script) sekaligus menguji coba *chatbot* secara langsung (Live Preview).  
  * Chat Inbox: For reviewing history and live handoffs.  
  * AI Actions: Specific event triggers.  
  * Data Sources: Managing the Knowledge Base.  
  * Contacts: Lead management.  
  * Analytics: Dashboard for chat metrics and lead conversion.

## **2\. Data Sources (Knowledge Base Management)**

### **2.1 Tabular Data Overview**

* **Layout:** A clean list/table view showing all uploaded documents or scraped websites.  
* **Columns:**  
  * Name (Document title or URL).  
  * Source (Badge indicating "Website", "File", or "Manual Text").  
  * Status (Badge indicating "Trained" or "Processing").  
  * Last Updated (Timestamp).  
* **Quick Actions (Row Hover/Click):**  
  * Edit: Open rich text editor for manual adjustments.  
  * Retrain: Force the system to re-chunk and re-embed the source.  
  * Test Chat: Open a mini chat window strictly limited to testing this specific document's context.  
  * Delete.

### **2.2 Modal "Train Your Chatbot" (Penambahan Sumber Data)**

* **Referensi Visual:** image\_ca76df.png  
* **Konsep:** Saat pengguna menekan tombol "Add new" di halaman Data Sources, modal *pop-up* akan muncul. Modal ini berfungsi sebagai menu pilihan jenis sumber data yang akan digunakan untuk melatih AI.  
* **Layout:** Grid kartu (*card-based grid*) yang bersih, setiap kartu mewakili satu tipe integrasi dengan ikon, judul, dan deskripsi.  
* **Opsi Sumber Data:** Website (Scraping), Files (PDF/DOCX), Text (Manual), Q\&A (CSV/FAQ), Youtube (Transkrip video), dan Notion (Integrasi Workspace).

### **2.3 Antarmuka "Edit Source" (Super Editor & AI Auditor)**

* **Referensi Visual:** image\_ca729c.png (Disempurnakan)  
* **Konsep:** Memberikan kendali penuh kepada admin untuk menulis, mengedit, atau menyisipkan media ke dalam pangkalan pengetahuan (Knowledge Base) sebelum diserap oleh AI.  
* **Fitur Super Editor (WYSIWYG):**  
  * **Rich Media:** Mendukung penyisipan gambar produk, *hyperlink*, dan *formatting* teks (H1, H2, Bold, List).  
* **Fitur Cerdas (AI Assistant for Admin):**  
  * **"✨ Generate/Rewrite with AI":** Merapikan paragraf yang berantakan dari hasil *scrape*.  
  * **"🔍 AI Content Auditor (Rekomendasi Info)":** Tombol pintar yang akan memindai isi dokumen dan memberikan saran *(Actionable Insights)*. Contoh: *"Sistem mendeteksi Anda menjual produk, tetapi belum mencantumkan Kebijakan Retur (Pengembalian). AI merekomendasikan Anda untuk menambahkannya agar pelanggan tidak bingung."*  
  * **"Save Changes":** Menyimpan teks kaya (*rich text*) dan me-*re-chunk* ke Vector Database.

## **3\. Advanced Settings & White-labeling**

### **3.1 Identity, Behavior & Multi-LLM Configurations**

* **Layout:** Vertical form with expandable accordion sections.  
* **Identity Section:** \* **Avatar / Profile Photo:** Tombol unggah gambar untuk mengubah wajah/ikon asisten AI.  
  * **Chatbot Display Name:** Nama asisten (contoh: "Sarah \- Customer Success").  
  * **Company Name:** Nama bisnis yang diwakili.  
* **Behavior & Instructions Section:** Textarea for injecting the "Bouncer" logic and custom system prompts.  
* **LLM Models Section (Pilihan Multi-Model AI):** \* **Pilihan Model Utama (Primary Provider):** Dropdown interaktif untuk memilih "otak" AI dari berbagai vendor (contoh: *OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro, Meta Llama 3*).  
  * **Input API Key Khusus:** Kolom *password* untuk memasukkan API Key sesuai dengan model yang dipilih.  
  * **Sistem Fallback (Model Cadangan):** Opsi untuk mengatur model lapis kedua. Jika model utama gagal memproses (karena limit *rate*, *error* server, atau saldo habis), *chatbot* akan otomatis menggunakan model cadangan secara transparan tanpa disadari pelanggan.

### **3.2 Developer Customizations (Custom JS/CSS)**

* **Referensi Visual:** image\_ca8d06.jpg  
* **Konsep:** Memungkinkan agensi untuk menyuntikkan kode pelacak (Pixel) atau variabel dinamis, serta menimpa (*override*) CSS bawaan widget agar sesuai 100% dengan *branding* website klien.

### **3.3 Widget Customization & Live Preview (Visual Settings)**

* **Referensi Visual:** image\_ca14eb.jpg  
* **Konsep:** Antarmuka khusus untuk mengubah tata letak visual, warna, dan bahasa *widget* pelanggan dengan umpan balik visual secara instan (real-time).  
* **Arsitektur Layout (Three-Pane View):**  
  1. **Kiri (Secondary Navigation):** Menu navigasi vertikal spesifik.  
  2. **Tengah (Control Panel):** Area form berupa *accordion* untuk mengatur warna, bahasa UI (*Widget Interface Language*), *Full Page mode*, dll.  
  3. **Kanan (Interactive Live Preview):** Representasi visual *widget chatbot* yang langsung berubah secara *real-time*.

### **3.4 Conversation Flow & Lead Capture (Alur Interaksi)**

* **Konsep:** Pengaturan spesifik untuk memandu perjalanan pelanggan dari awal percakapan hingga eskalasi ke manusia.  
* **Starter Questions (Pertanyaan Cepat):**  
  * Admin dapat membuat 2-4 "tombol saran pertanyaan" (contoh: "Lihat Katalog", "Harga Produk?", "Lokasi Toko?").  
  * Tombol ini akan muncul di atas kotak input chat saat widget pertama kali dibuka, memudahkan *customer* memulai obrolan tanpa mengetik.  
* **Pre-Handoff Data Collection (Form Pra-Konsultasi):**  
  * *Toggle (On/Off):* "Kumpulkan data pelanggan sebelum eskalasi ke Manusia".  
  * Jika aktif, sebelum tombol WhatsApp/LiveChat muncul, AI akan menampilkan form mini (atau menanyakan secara natural) untuk mengumpulkan: **Nama, Nomor HP/WhatsApp, atau Email**.  
* **Handoff Routing (Destinasi Eskalasi):**  
  * Dropdown pilihan untuk mengarahkan percakapan: Apakah diarahkan ke **Admin Umum, Owner, Tim Sales, atau Technical Support**. Pilihan ini menentukan nomor WhatsApp mana atau divisi *LiveChat* mana yang akan terhubung dengan tombol eskalasi.

### **3.5 Embed & Integrate (Kombinasi dengan Live Preview)**

* **Konsep:** Menggabungkan halaman uji coba (*Preview*) dengan halaman pemasangan (*Embed*) agar agensi/klien bisa langsung menguji *chatbot* mereka sebelum atau saat menyalin kode integrasinya.  
* **Arsitektur Layout (Two-Pane View):**  
  1. **Kiri (Integration Panel):** Berisi blok kode instalasi (Script tag HTML) atau Link Mandiri (*Standalone URL*) dengan tombol "Copy to Clipboard". Terdapat juga petunjuk platform (integrasi untuk WordPress, Shopify, Custom HTML, dll).  
  2. **Kanan (Live Preview):** Representasi fungsional penuh dari *widget chatbot*. Di sini AI akan merespons pertanyaan secara *real-time*, mendeteksi Knowledge Base yang telah dilatih, dan menjalankan alur *Bouncer* untuk memastikan sistem bekerja sempurna sebelum kode dipublikasikan.

## **4\. Omnichannel Chat Inbox & CRM**

### **4.1 Three-Pane Inbox Architecture**

* **Referensi Visual:** image\_ca8a1f.jpg  
* **Left Pane (Queue):** List of active or archived chat sessions.  
* **Center Pane (Live Chat):** The conversation thread between AI and user. Supports "Human Takeover".  
* **Right Pane (Lead Details):** CRM panel displaying dynamically extracted data (Name, Intent, Budget, Location) resulting from our "Smart Lead Summary" and **Pre-Handoff Form** logic.

## **5\. Rich Media AI Responses**

### **5.1 Product Cards in Chat**

* **Referensi Visual:** image\_ca8603.png  
* **Konsep:** AI dilatih untuk membalas dengan struktur Markdown/JSON yang dapat diurai (*parsed*) oleh antarmuka chat untuk menampilkan katalog visual (Gambar Produk, Judul Tebal, Harga, Bullet point) langsung di dalam gelembung obrolan.