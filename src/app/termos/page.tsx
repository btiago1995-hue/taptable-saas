import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-white py-16 px-6 sm:px-12 lg:px-24 font-sans selection:bg-violet-200">
            <div className="max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-slate-900 mb-16 transition-colors group">
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Voltar à página inicial
                </Link>
                
                <div className="mb-16">
                    <div className="w-16 h-16 bg-slate-950 flex items-center justify-center rounded-2xl text-white mb-8 shadow-lg">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tight leading-[1.1] mb-6">
                        Termos e Condições
                    </h1>
                    <p className="text-lg font-bold text-slate-500">Última atualização: Março de 2026</p>
                </div>
                
                <div className="prose prose-lg prose-slate max-w-none text-slate-600 leading-relaxed font-medium space-y-12">
                    
                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">1. Aceitação dos Termos</h2>
                        <p>Ao aceder e utilizar a plataforma <strong className="text-slate-900">Dineo</strong> (operada pela Servyx - Provedor de Valor Agregado), o utilizador (Restaurante Parceiro ou Cliente Final) concorda em cumprir estes Termos e Condições de Uso. Caso não concorde com qualquer parte destes termos, não deverá utilizar os nossos serviços.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">2. Descrição do Serviço</h2>
                        <p>A Dineo é uma plataforma de Software as a Service (SaaS) B2B direcionada a estabelecimentos de restauração em Cabo Verde. Oferece infraestrutura tecnológica para menus digitais, gestão de pedidos por QR Code, KDS (Cozinha Fiscal) e pontos de venda virtuais integrados.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">3. Processamento de Pagamentos e Conformidade SISP</h2>
                        <p>No que concerne aos pagamentos e transações digitais, a Dineo cumpre rigorosamente as normas estipuladas pelo Banco de Cabo Verde e pela <strong className="text-slate-900">SISP (Sociedade Interbancária e Sistemas de Pagamentos)</strong>. O nosso sistema atua apenas como gateway comunicador.</p>
                        <ul className="list-disc pl-5 mt-4 space-y-2">
                            <li>A Dineo <strong className="text-slate-900">não detém, não processa e não armazena</strong> detalhes sensíveis de cartões bancários Rede Vinti4 ou VISA/Mastercard em nenhum dos seus servidores.</li>
                            <li>A autenticação de pagamentos é delegada em ambiente seguro às entidades certificadas pela SISP.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">4. Faturação e Homologação DNRE</h2>
                        <p>A Dineo fornece aos estabelecimentos ferramentas de automação na emissão de Guias e Recibos Eletrónicos em conformidade com as diretivas da <strong className="text-slate-900">Direção Nacional de Receitas do Estado (DNRE)</strong> de Cabo Verde.</p>
                        <ul className="list-disc pl-5 mt-4 space-y-2">
                            <li>Os documentos gerados pelo módulo POS/Caixa da Dineo possuem o formalismo exigido para operações de restauração e entrega.</li>
                            <li>Permanece da inteira responsabilidade legal do Estabelecimento Comercial Parceiro o registo atempado das faturas e a correta declaração de impostos (IVA) junto da DNRE. A Servyx atua exclusivamente como providenciadora da tecnologia agregada.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">5. Obrigações e Conduta</h2>
                        <p>O Restaurante Parceiro compromete-se a não utilizar a infraestrutura Dineo para transações ilegais, ilícitas ou que violem a lei de comércio de Cabo Verde. O descumprimento pode resultar na suspensão imediata e irrevogável da licença de software.</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">6. Limitação de Responsabilidade</h2>
                        <p>A Servyx garante um SLA de funcionamento de 99.9%, mas não se responsabiliza por lucros cessantes ou danos indiretos resultantes de falhas fortuitas nos sistemas de terceiros (como falhas nas redes de telecomunicações de Cabo Verde ou interrupções no gateway da SISP).</p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-black text-slate-950 mb-4 tracking-tight">7. Lei Aplicável e Foro</h2>
                        <p>Estes Termos são regidos e interpretados de acordo com as <strong className="text-slate-900">Leis da República de Cabo Verde</strong>. Qualquer litígio que não possa ser resolvido amigavelmente será submetido à jurisdição exclusiva dos tribunais da Comarca da Praia.</p>
                    </section>
                </div>
                
                <div className="mt-24 pt-10 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500 font-bold">
                    <p>© 2026 Servyx. Todos os direitos reservados.</p>
                    <div className="flex gap-8 mt-6 sm:mt-0">
                        <Link href="/privacidade" className="hover:text-slate-900 transition-colors">Política de Privacidade</Link>
                        <Link href="/admin/login" className="hover:text-slate-900 transition-colors">Acesso de Lojista</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
