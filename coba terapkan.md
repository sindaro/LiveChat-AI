PRD Addendum: Advanced SaaS & Agency UI Architecture

Reference: UI/UX Integration based on Enterprise SaaS standards.
Status: Supplementary guide for Frontend Development (Next.js & Tailwind CSS).

1. Global Navigation & Agency Workspace (The "Hub")

1.1 Workspace Switcher (Top Left Navigation)

Concept: A dropdown selector located at the top-left of the dashboard header.

Functionality: Allows the Agency Owner to seamlessly switch between different client businesses (e.g., from "LiveChatAI Agency" to "IAMNOTBASIC.COM Shop").

Technical Implementation: Changing the dropdown updates the global businessId state and dynamically changes the routing context without requiring a full page reload.

1.2 Tabbed Sub-Navigation

Concept: Once a specific business is selected, the primary navigation switches to a horizontal tabbed layout just below the header.

Tabs Required:

Preview: To test the chatbot in real-time.

Settings: Core configurations (Identity, AI Models, Behavior, UI).

Embed & Integrate: Snippets for deployment (iframes, scripts).

Chat Inbox: For reviewing history and live handoffs.

AI Actions: Specific event triggers.

Data Sources: Managing the Knowledge Base.

Contacts: Lead management.

Analytics: Dashboard for chat metrics and lead conversion.

2. Data Sources (Knowledge Base Management)

2.1 Tabular Data Overview

Layout: A clean list/table view showing all uploaded documents or scraped websites.

Columns:

Name (Document title or URL).

Source (Badge indicating "Website", "File", or "Manual Text").

Status (Badge indicating "Trained" or "Processing").

Last Updated (Timestamp).

Quick Actions (Row Hover/Click):

Edit: Open text editor for manual adjustments.

Retrain: Force the system to re-chunk and re-embed the source.

Test Chat: Open a mini chat window strictly limited to testing this specific document's context.

Delete.

2.2 Modal "Train Your Chatbot" (Penambahan Sumber Data)

Referensi Visual: image_ca76df.png

Konsep: Saat pengguna menekan tombol "Add new" di halaman Data Sources, modal pop-up akan muncul. Modal ini berfungsi sebagai menu pilihan jenis sumber data yang akan digunakan untuk melatih AI.

Layout: Grid kartu (card-based grid) yang bersih, setiap kartu mewakili satu tipe integrasi dengan ikon, judul, dan deskripsi.

Opsi Sumber Data: Website (Scraping), Files (PDF/DOCX), Text (Manual), Q&A (CSV/FAQ), Youtube (Transkrip video), dan Notion (Integrasi Workspace).

2.3 Antarmuka "Edit Source" (Koreksi Data Manual)

Referensi Visual: image_ca729c.png

Konsep: Memberikan kendali kepada admin untuk mengedit secara manual teks mentah (raw text) dari hasil ekstraksi (misalnya teks dari website yang di-scrape) sebelum disimpan ke Vector Database.

Layout: Dilengkapi dengan Rich Text Editor (H1, H2, Bold, Link) untuk merapikan paragraf yang berantakan, serta tombol "✨ Generate with AI" untuk meminta AI merapikan teks tersebut secara otomatis. Menekan "Save Changes" akan me-re-chunk teks ke database.

3. Advanced Settings & White-labeling

3.1 Identity & Behavior Configurations

Layout: Vertical form with expandable accordion sections.

Identity Section: Inputs for "Chatbot Display Name" and "Company Name".

Behavior & Instructions Section: Textarea for injecting the "Bouncer" logic and custom system prompts.

LLM Models Section: Dropdown to select the Gemini model version and input specific API keys.

3.2 Developer Customizations (Custom JS/CSS)

Referensi Visual: image_ca8d06.jpg

Konsep: Memungkinkan agensi untuk menyuntikkan kode pelacak (Pixel) atau variabel dinamis, serta menimpa (override) CSS bawaan widget agar sesuai 100% dengan branding website klien.

3.3 Widget Customization & Live Preview (Visual Settings)

Referensi Visual: image_ca14eb.jpg

Konsep: Antarmuka khusus untuk mengubah tata letak visual, warna, dan bahasa widget pelanggan dengan umpan balik visual secara instan (real-time).

Arsitektur Layout (Three-Pane View):

Kiri (Secondary Navigation): Menu navigasi vertikal spesifik untuk pengaturan (seperti AI Configuration, Widget Customization, Conversation Flow).

Tengah (Control Panel): Area form berupa accordion (bisa dibuka-tutup) untuk mengatur Style & Appearance, Preview Message, Full Page, Widget Interface Language (mengatur bahasa tombol/menu UI, bukan bahasa balasan AI), dan Widget Availability Schedule.

Kanan (Interactive Live Preview): Representasi visual widget chatbot yang langsung berubah secara real-time ketika ada perubahan di Control Panel. Memiliki tab status seperti Home, Conversation, Teaser, Full Page untuk melihat perilaku widget di berbagai kondisi.

4. Omnichannel Chat Inbox & CRM

4.1 Three-Pane Inbox Architecture

Referensi Visual: image_ca8a1f.jpg

Left Pane (Queue): List of active or archived chat sessions.

Center Pane (Live Chat): The conversation thread between AI and user. Supports "Human Takeover".

Right Pane (Lead Details): CRM panel displaying dynamically extracted data (Name, Intent, Budget, Location) resulting from our "Smart Lead Summary" logic.

5. Rich Media AI Responses

5.1 Product Cards in Chat

Referensi Visual: image_ca8603.png

Konsep: AI dilatih untuk membalas dengan struktur Markdown/JSON yang dapat diurai (parsed) oleh antarmuka chat untuk menampilkan katalog visual (Gambar Produk, Judul Tebal, Harga, Bullet point) langsung di dalam gelembung obrolan.