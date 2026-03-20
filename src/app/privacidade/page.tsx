import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
                <Link href="/" className="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Voltar à página inicial
                </Link>
                
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-50 flex items-center justify-center rounded-xl text-blue-600">
                        <Lock className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Política de Privacidade</h1>
                </div>
                
                <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed space-y-6">
                    <p className="font-bold text-slate-900">Última atualização: Março de 2026</p>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">1. Nosso Compromisso e a Lei (Cabo Verde)</h2>
                        <p>A <strong>Dineo</strong> (operada pela Servyx) tem um compromisso inexorável com a proteção de dados pessoais. O tratamento da informação recolhida é realizado de forma estritamente confidencial, cumprindo os ditames da Lei de Proteção de Dados Pessoais de Cabo Verde (<strong>Lei nº 133/V/2001</strong> e respetivas atualizações), bem como as boas práticas internacionais da RGPD/LGPD aplicáveis a plataformas tecnológicas.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">2. Recolha de Dados Pessoais Transacionais</h2>
                        <p>Durante a interação do Cliente Final com os menus digitais do Restaurante, poderemos recolher as seguintes informações exclusivamente para o propósito do serviço e a pedido e consentimento expresso do utilizador no formulário de Checkout:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Nome e Contacto Telefónico (WhatsApp)</strong>: Para identificar o pedido de mesa/entrega e enviar as notificações de estado (ex: "Pedido a caminho").</li>
                            <li><strong>NIF (Opcional)</strong>: Recolhido a pedido do cliente pura e exclusivamente para ser aposto no recibo final, em conformidade com as leis fiscais.</li>
                            <li><strong>Morada (apenas para serviço de Delivery)</strong>: Recolhido mediante consentimento via formulário ou GPS-aproximado para realizar entregas ao domicílio.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">3. Uso Exclusivo e Proibição de Venda</h2>
                        <p><strong>Não vendemos, não alugamos e não cedemos</strong> dados de perfis de utilizadores finais a terceiros. A informação flui de forma cifrada única e exclusivamente entre o dispositivo móvel do cliente final e o sistema interno do Restaurante ao qual o cliente está a dirigir o pedido.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">4. Retenção e Anonimização</h2>
                        <p>Os dados constantes na arquitetura Dineo são necessários para rastreabilidade fiscal estipulada por lei e arquivo para gestão operacional dos restaurantes. Uma vez passados os trâmites legais da transação, os dados de comunicação imediatos poderão ser higienizados garantindo a otimização de privacidade.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">5. Direitos do Titular dos Dados</h2>
                        <p>No estrito rigor da Lei de Proteção de Dados de Cabo Verde, o cliente possui o direito intransmissível de solicitar ao restaurante, em cujo banco de dados as suas informações residem (sendo a Dineo apenas o subcontratante processador técnico), os seguintes pedidos:</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Direito ao Esquecimento / Apagamento Parcial;</li>
                            <li>Direito à Informação e Retificação;</li>
                        </ul>
                        <p className="mt-2">Todos os pedidos devem ser encaminhados ao suporte administrativo via <strong>suporte@dineo.vc</strong> para célere e efetiva auditoria do gestor de dados.</p>
                    </section>
                </div>
                
                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400">
                    <p>© 2026 Servyx. Todos os direitos reservados.</p>
                    <div className="flex gap-4 mt-4 sm:mt-0">
                        <Link href="/termos" className="hover:text-primary-600 transition-colors">Termos e Condições</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
