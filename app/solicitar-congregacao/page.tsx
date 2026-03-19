
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RequestCongregationPage() {
    return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
            <div className="bg-white max-w-md w-full rounded-[2.5rem] p-8 shadow-xl shadow-primary-light/500/5 space-y-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500" />

                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-500 shadow-sm border border-blue-100">
                    <Mail className="w-10 h-10" />
                </div>

                <div className="space-y-4">
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Solicitar Nova Congregação</h1>
                    <p className="text-gray-500 font-medium text-sm leading-relaxed">
                        Para garantir a segurança e organização, a criação de novas congregações é feita sob solicitação.
                    </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 space-y-4">
                    <p className="text-sm text-gray-600">
                        Por favor, entre em contato conosco informando os detalhes da sua congregação.
                    </p>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">E-mail para contato</p>
                        <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}`} className="text-blue-600 font-bold text-lg hover:underline break-all">
                            {process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}
                        </a>
                    </div>
                </div>

                <Link
                    href="/dashboard"
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Voltar
                </Link>
            </div>
        </div>
    );
}
