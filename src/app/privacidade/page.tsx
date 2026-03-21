import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-white py-16 px-6 sm:px-12 lg:px-24 font-sans selection:bg-violet-200">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 mb-16 transition-colors group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Voltar à página inicial
                </Link>
                
                <div className="mb-16">
                    <div className="w-16 h-16 bg-slate-950 flex items-center justify-center rounded-2xl text-white mb-8 shadow-lg">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.1] mb-6">
                        Política de Privacidade
                    </h1>
                    <p className="text-lg font-bold text-slate-500">Última atualização: Março de 2026</p>
                </div>
                
                <div className="prose prose-lg prose-slate max-w-none text-slate-600 leading-relaxed font-medium space-y-12">
                    
                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">1. Nosso Compromisso e a Lei (Cabo Verde)</h2>
                        <p>A <strong className="text-slate-900">Dineo</strong> (operada pela Servyx) tem um compromisso inexorável com a proteção de dados pessoais. O tratamento da informação recolhida é realizado de forma estritamente confidencial, cumprindo os ditames da Lei de Proteção de Dados Pessoais de Cabo Verde (<strong className="text-slate-900">Lei nº 133/V/2001</strong> e respetivas atualizações), bem como as boas práticas internacionais da RGPD/LGPD aplicáveis a plataformas tecnológicas.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">2. Recolha de Dados Pessoais Transacionais</h2>
                        <p>Durante a interação do Cliente Final com os menus digitais do Restaurante, poderemos recolher as seguintes informações exclusivamente para o propósito do serviço e a pedido e consentimento expresso do utilizador no formulário de Checkout:</p>
                        <ul className="list-disc pl-5 mt-4 space-y-2">
                            <li><strong className="text-slate-900">Nome e Contacto Telefónico (WhatsApp)</strong>: Para identificar o pedido de mesa/entrega e enviar as notificações de estado (ex: "Pedido a caminho").</li>
                            <li><strong className="text-slate-900">NIF (Opcional)</strong>: Recolhido a pedido do cliente pura e exclusivamente para ser aposto no recibo final, em conformidade com as leis fiscais.</li>
                            <li><strong className="text-slate-900">Morada (apenas para serviço de Delivery)</strong>: Recolhido mediante consentimento via formulário ou GPS-aproximado para realizar entregas ao domicílio.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">3. Uso Exclusivo e Proibição de Venda</h2>
                        <p><strong className="text-slate-900">Não vendemos, não alugamos e não cedemos</strong> dados de perfis de utilizadores finais a terceiros. A informação flui de forma cifrada única e exclusivamente entre o dispositivo móvel do cliente final e o sistema interno do Restaurante ao qual o cliente está a dirigir o pedido.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">4. Retenção e Anonimização</h2>
                        <p>Os dados constantes na arquitetura Dineo são necessários para rastreabilidade fiscal estipulada por lei e arquivo para gestão operacional dos restaurantes. Uma vez passados os trâmites legais da transação, os dados de comunicação imediatos poderão ser higienizados garantindo a otimização de privacidade.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">5. Direitos do Titular dos Dados</h2>
                        <p>No estrito rigor da Lei de Proteção de Dados de Cabo Verde, o cliente possui o direito intransmissível de solicitar ao restaurante, em cujo banco de dados as suas informações residem (sendo a Dineo apenas o subcontratante processador técnico), os seguintes pedidos:</p>
                        <ul className="list-disc pl-5 mt-4 space-y-2">
                            <li>Direito ao Esquecimento / Apagamento Parcial;</li>
                            <li>Direito à Informação e Retificação;</li>
                        </ul>
                        <p className="mt-4">Todos os pedidos devem ser encaminhados ao suporte administrativo via <strong className="text-slate-900">suporte@dineo.cv</strong> para célere e efetiva auditoria do gestor de dados.</p>
                    </section>
                </div>
                
                <div className="mt-24 pt-10 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500 font-bold">
                    <p>© 2026 Servyx. Todos os direitos reservados.</p>
                    <div className="flex gap-8 mt-6 sm:mt-0">
                        <Link href="/termos" className="hover:text-slate-900 transition-colors">Termos e Condições</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
