import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
                <Link href="/" className="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700 mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Voltar à página inicial
                </Link>
                
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-slate-100 flex items-center justify-center rounded-xl text-slate-700">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Termos e Condições</h1>
                </div>
                
                <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed space-y-6">
                    <p className="font-bold text-slate-900">Última atualização: Março de 2026</p>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">1. Aceitação dos Termos</h2>
                        <p>Ao aceder e utilizar a plataforma <strong>Dineo</strong> (operada pela Servyx - Provedor de Valor Agregado), o utilizador (Restaurante Parceiro ou Cliente Final) concorda em cumprir estes Termos e Condições de Uso. Caso não concorde com qualquer parte destes termos, não deverá utilizar os nossos serviços.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">2. Descrição do Serviço</h2>
                        <p>A Dineo é uma plataforma de Software as a Service (SaaS) B2B direcionada a estabelecimentos de restauração em Cabo Verde. Oferece infraestrutura tecnológica para menus digitais, gestão de pedidos por QR Code, KDS (Cozinha Fiscal) e pontos de venda virtuais integrados.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">3. Processamento de Pagamentos e Conformidade SISP</h2>
                        <p>No que concerne aos pagamentos e transações digitais, a Dineo cumpre rigorosamente as normas estipuladas pelo Banco de Cabo Verde e pela <strong>SISP (Sociedade Interbancária e Sistemas de Pagamentos)</strong>. O nosso sistema atua apenas como gateway comunicador.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>A Dineo <strong>não detém, não processa e não armazena</strong> detalhes sensíveis de cartões bancários Rede Vinti4 ou VISA/Mastercard em nenhum dos seus servidores.</li>
                            <li>A autenticação de pagamentos é delegada em ambiente seguro às entidades certificadas pela SISP.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">4. Faturação e Homologação DNRE</h2>
                        <p>A Dineo fornece aos estabelecimentos ferramentas de automação na emissão de Guias e Recibos Eletrónicos em conformidade com as diretivas da <strong>Direção Nacional de Receitas do Estado (DNRE)</strong> de Cabo Verde.</p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Os documentos gerados pelo módulo POS/Caixa da Dineo possuem o formalismo exigido para operações de restauração e entrega.</li>
                            <li>Permanece da inteira responsabilidade legal do Estabelecimento Comercial Parceiro o registo atempado das faturas e a correta declaração de impostos (IVA) junto da DNRE. A Servyx atua exclusivamente como providenciadora da tecnologia agregada.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">5. Obrigações e Conduta</h2>
                        <p>O Restaurante Parceiro compromete-se a não utilizar a infraestrutura Dineo para transações ilegais, ilícitas ou que violem a lei de comércio de Cabo Verde. O descumprimento pode resultar na suspensão imediata e irrevogável da licença de software.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">6. Limitação de Responsabilidade</h2>
                        <p>A Servyx garante um SLA de funcionamento de 99.9%, mas não se responsabiliza por lucros cessantes ou danos indiretos resultantes de falhas fortuitas nos sistemas de terceiros (como falhas nas redes de telecomunicações de Cabo Verde ou interrupções no gateway da SISP).</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-slate-900 mb-2">7. Lei Aplicável e Foro</h2>
                        <p>Estes Termos são regidos e interpretados de acordo com as <strong>Leis da República de Cabo Verde</strong>. Qualquer litígio que não possa ser resolvido amigavelmente será submetido à jurisdição exclusiva dos tribunais da Comarca da Praia.</p>
                    </section>
                </div>
                
                <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400">
                    <p>© 2026 Servyx. Todos os direitos reservados.</p>
                    <div className="flex gap-4 mt-4 sm:mt-0">
                        <Link href="/privacidade" className="hover:text-primary-600 transition-colors">Política de Privacidade</Link>
                        <Link href="/admin/login" className="hover:text-primary-600 transition-colors">Acesso de Lojista</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
