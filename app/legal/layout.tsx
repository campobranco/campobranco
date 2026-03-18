import Link from 'next/link';
import { ArrowLeft, Shield, FileText, Lock, UserCheck } from 'lucide-react';

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col font-sans transition-colors">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/settings" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-[#16a34a] dark:hover:text-green-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-bold text-sm">Voltar</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/app-icon.png" alt="Logo Campo Branco" width={32} height={32} className="rounded-lg" />
                        <span className="font-black text-lg text-gray-800 dark:text-white tracking-tight">Campo Branco</span>
                    </div>
                    <div className="w-20" /> {/* Spacer for centering */}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 md:p-12 transition-colors">
                    {children}
                </div>
            </main>

            {/* Footer Navigation for Legal */}
            <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-8 mt-auto transition-colors">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap justify-center gap-6 md:gap-8">
                        <Link href="/legal/terms" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#16a34a] dark:hover:text-green-400 transition-colors flex items-center gap-1.5">
                            <FileText className="w-4 h-4" />
                            Termos de Uso
                        </Link>
                        <Link href="/legal/privacy" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#16a34a] dark:hover:text-green-400 transition-colors flex items-center gap-1.5">
                            <Lock className="w-4 h-4" />
                            Política de Privacidade
                        </Link>
                        <Link href="/legal/data-usage" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#16a34a] dark:hover:text-green-400 transition-colors flex items-center gap-1.5">
                            <Shield className="w-4 h-4" />
                            Uso de Dados
                        </Link>
                        <Link href="/legal/user-commitment" className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-[#16a34a] dark:hover:text-green-400 transition-colors flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4" />
                            Compromisso
                        </Link>
                    </div>
                    <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
                        © {new Date().getFullYear()} Campo Branco. Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
}
