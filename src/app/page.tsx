import Link from 'next/link';
import { Bot, Zap, Shield, MessageSquare, ArrowRight } from 'lucide-react';
import ChatWidget from '@/components/ChatWidget';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-emerald-500/30 transition-colors duration-300">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Auto Chat AI</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium hover:text-emerald-600 transition-colors hidden sm:block">
              Masuk
            </Link>
            <Link 
              href="/signup" 
              className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:scale-105 transition-transform"
            >
              Coba Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-sm text-emerald-600 dark:text-emerald-400 mb-8">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
          Platform Kualifikasi Prospek Berbasis AI
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl leading-[1.1]">
          Saring Pembeli "CLBK", <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400">
            Fokus pada Transaksi.
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl">
          Auto Chat AI adalah asisten virtual cerdas yang menyapa pengunjung website Anda, 
          menjawab pertanyaan produk, dan hanya meneruskan prospek berkualitas ke WhatsApp Anda.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            href="/signup" 
            className="flex items-center px-8 py-4 bg-emerald-600 text-white rounded-full font-semibold text-lg hover:bg-emerald-700 hover:scale-105 transition-all shadow-lg shadow-emerald-600/20"
          >
            Mulai Otomatisasi
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <Link 
            href="#demo" 
            className="flex items-center px-8 py-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-full font-semibold text-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
          >
            Coba Demo AI
          </Link>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 bg-zinc-50 dark:bg-zinc-900/50 border-y border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Fitur Premium untuk Bisnis Anda</h2>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">Kami merancang sistem khusus yang mengubah pengunjung biasa menjadi pelanggan siap bayar.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Kualifikasi Otomatis</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Tentukan aturan kualifikasi ("Bouncer") Anda sendiri. AI hanya akan memberikan tombol WhatsApp kepada pengguna yang serius.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Smart WhatsApp Handoff</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Saat prospek dialihkan ke WhatsApp Anda, AI secara otomatis membuat ringkasan percakapan dan niat beli prospek.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-12 w-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Kampanye Proaktif</h3>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Munculkan widget sapaan secara otomatis di halaman tertentu dengan jeda waktu yang bisa diatur untuk memaksimalkan interaksi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section (Anchor) */}
      <section id="demo" className="py-24 max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Uji Coba Langsung!</h2>
        <p className="text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-8">
          Klik ikon *widget* di pojok kanan bawah layar Anda untuk melihat bagaimana asisten AI berinteraksi dengan pelanggan. Coba ketik "berapa harganya?" untuk melihat simulasi *Smart Handoff*.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-12 text-center text-zinc-500">
        <p>&copy; {new Date().getFullYear()} Auto Chat AI by Sindaro IT. All rights reserved.</p>
      </footer>

      {/* Live Demo Widget */}
      <ChatWidget 
        businessId="demo-business" 
        businessName="Toko Demo (Simulasi)" 
        waNumber="628123456789" 
        preFilledMsg="Halo, saya ingin memesan produk ini..."
        isDemo={true}
      />

    </div>
  );
}
