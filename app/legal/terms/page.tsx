import { FileText } from 'lucide-react';

export default function TermsPage() {
    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white m-0 leading-tight">Termos de Uso</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">Última atualização: 05/01/2026</p>
                </div>
            </div>

            <section className="space-y-6 text-gray-600 dark:text-gray-300">
                <p>
                    Bem-vindo ao <strong>{process.env.NEXT_PUBLIC_APP_NAME || "Campo Branco"}</strong>.
                    Ao acessar, cadastrar-se ou utilizar este aplicativo, você declara que <strong>leu, compreendeu e concorda integralmente</strong> com estes Termos de Uso. Caso não concorde com qualquer condição aqui descrita, <strong>não utilize o aplicativo</strong>.
                </p>

                <h3>1. DEFINIÇÃO DO SERVIÇO</h3>
                <p>
                    O <strong>{process.env.NEXT_PUBLIC_APP_NAME || "Campo Branco"}</strong> é uma ferramenta digital destinada <strong>exclusivamente</strong> ao apoio da <strong>organização e gestão de territórios, endereços e visitas religiosas/pastorais</strong> realizadas por congregações locais e seus membros, no contexto das atividades das Testemunhas de Jeová.
                </p>
                <p>
                    O aplicativo não é operado, administrado, endossado nem representa oficialmente a organização religiosa das Testemunhas de Jeová, sendo utilizado de forma independente por congregações e usuários locais.
                </p>
                <p>É <strong>expressamente proibido</strong> o uso do aplicativo para:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                    <li>fins comerciais ou publicitários</li>
                    <li>marketing, vendas ou prospecção</li>
                    <li>cobrança, assédio ou pressão indevida</li>
                    <li>coleta de dados para finalidades externas à atividade religiosa</li>
                </ul>
                <p>O descumprimento poderá resultar em <strong>suspensão ou banimento imediato da conta</strong>, sem aviso prévio.</p>

                <h3>2. ELEGIBILIDADE E ACESSO</h3>
                <p>2.1. O uso do Campo Branco é restrito a:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                    <li>usuários <strong>autorizados pela congregação local</strong> ou por administradores responsáveis</li>
                    <li>maiores de 18 anos ou devidamente autorizados</li>
                </ul>
                <p>2.2. O acesso é <strong>individual e intransferível</strong>. O usuário é responsável por manter a confidencialidade de suas credenciais e por todas as ações realizadas em sua conta.</p>

                <h3>3. RESPONSABILIDADES DO USUÁRIO</h3>
                <p>Ao utilizar o Campo Branco, o usuário declara que:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                    <li>As informações inseridas (endereços, nomes, observações, marcações) são de sua <strong>inteira responsabilidade</strong></li>
                    <li>Utilizará os dados <strong>apenas para fins religiosos/pastorais legítimos</strong></li>
                    <li>Não compartilhará dados com terceiros não autorizados</li>
                    <li>Agirá com <strong>respeito, ética e discrição</strong>, especialmente em visitas pessoais</li>
                </ul>

                <h4>3.1. Dados sensíveis</h4>
                <p>O usuário compromete-se a registrar <strong>dados sensíveis apenas quando estritamente necessário</strong> e tratar com cuidado especial marcações como menores de idade, condições de acessibilidade e preferências de abordagem.</p>

                <h3>4. USO DE DADOS E CONFORMIDADE LEGAL</h3>
                <p>4.1. O Campo Branco atua como <strong>OPERADOR de dados</strong>, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).</p>
                <p>4.2. O <strong>CONTROLADOR dos dados</strong> é a congregação local e/ou os usuários administradores responsáveis pelo cadastro, definição de finalidade, manutenção e exclusão das informações inseridas no sistema.</p>
                <p>4.3. O tratamento de dados ocorre com base em interesse legítimo, exercício regular de atividade religiosa, finalidade pastoral e organizacional, e observância dos princípios da LGPD.</p>
                <p>4.4. O aplicativo não utiliza rastreadores externos, não exibe anúncios, não comercializa dados e não compartilha dados com terceiros.</p>

                <h3>5. DADOS DE CRIANÇAS E ADOLESCENTES</h3>
                <p>
                    Quando houver registro de dados relacionados a menores de idade, isso ocorrerá <strong>exclusivamente</strong> para alertar sobre a necessidade de abordagem responsável e incentivar boas práticas, como buscar autorização dos responsáveis.
                    O tratamento será sempre feito <strong>no melhor interesse do menor</strong>, conforme o <strong>Art. 14 da LGPD</strong>.
                </p>

                <h3>6. RETENÇÃO E EXCLUSÃO DE DADOS</h3>
                <p>6.1. Os dados permanecem armazenados <strong>somente enquanto necessários</strong> para a finalidade religiosa.</p>
                <p>6.2. A exclusão de dados pode ser realizada manualmente por usuários autorizados, quando o dado deixar de ser necessário ou por solicitação interna da congregação ou do usuário controlador responsável.</p>
                <p>6.3. O Campo Branco não mantém backups históricos acessíveis ao usuário após exclusão definitiva.</p>

                <h3>7. SEGURANÇA DA INFORMAÇÃO</h3>
                <p>
                    O Campo Branco adota medidas técnicas e organizacionais adequadas, incluindo isolamento de dados por congregação, controle rigoroso de acesso e regras de segurança no banco de dados.
                    Apesar disso, nenhum sistema é absolutamente imune. O usuário reconhece os riscos inerentes ao uso de tecnologias digitais.
                </p>

                <h3>8. LICENÇA OPEN SOURCE, INFRAESTRUTURA E DADOS</h3>
                <p>8.1. O Campo Branco é um software de código aberto (open source), distribuído sob os termos da Licença MIT, aplicável exclusivamente ao código-fonte do software.</p>
                <p>8.2. A Licença MIT concede a qualquer pessoa que obtenha uma cópia do software os direitos de usar, copiar, modificar, mesclar, publicar e distribuir o software, inclusive para fins comerciais, desde que respeitados os termos da licença.</p>

                <p><strong>8.3. A licença open source NÃO se aplica:</strong></p>
                <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
                    <li>ao banco de dados oficial do {process.env.NEXT_PUBLIC_APP_NAME || "Campo Branco"}</li>
                    <li>à infraestrutura de produção</li>
                    <li>aos dados armazenados por usuários ou organizações</li>
                    <li>aos ambientes operacionais mantidos pelos desenvolvedores</li>
                </ul>
                <p>Esses elementos são privados, fechados e protegidos.</p>

                <p>8.4. Qualquer instalação própria, bifurcação (fork), cópia ou auto-hospedagem do software deverá operar com banco de dados próprio e independente, não terá acesso, integração ou sincronização com o banco de dados oficial do {process.env.NEXT_PUBLIC_APP_NAME || "Campo Branco"} e será de inteira responsabilidade de quem a operar.</p>
                <p>8.5. Este Termo de Uso não substitui nem invalida a Licença MIT, mas regula especificamente o uso da aplicação oficial em produção, o acesso à infraestrutura e as responsabilidades dos usuários finais.</p>
                <p>8.6. O nome {process.env.NEXT_PUBLIC_APP_NAME || "Campo Branco"}, sua identidade visual e documentação não estão cobertos pela Licença MIT, salvo indicação expressa.</p>

                <h3>9. LIMITAÇÃO DE RESPONSABILIDADE</h3>
                <p>
                    O {process.env.NEXT_PUBLIC_APP_NAME || "Campo Branco"} não garante resultados específicos, não se responsabiliza por uso indevido do aplicativo e não responde por informações inseridas pelos usuários.
                    A responsabilidade pelo conteúdo cadastrado é <strong>exclusivamente do usuário e da organização controladora</strong>.
                </p>

                <h3>10. SUSPENSÃO E ENCERRAMENTO</h3>
                <p>
                    O acesso poderá ser suspenso ou encerrado em caso de violação destes Termos, uso indevido ou ilegal, ou solicitação da organização religiosa.
                    O encerramento ou suspensão de acesso não implica vínculo institucional, representação ou responsabilidade da organização religiosa das Testemunhas de Jeová sobre o uso do aplicativo.
                </p>

                <h3>11. ALTERAÇÕES DOS TERMOS</h3>
                <p>
                    Estes Termos podem ser atualizados a qualquer momento. A versão mais recente estará sempre disponível no aplicativo. O uso continuado após alterações implica <strong>aceitação automática</strong> dos novos termos.
                </p>

                <h3>12. CONTATO</h3>
                <p>
                    Para dúvidas, solicitações ou comunicações relacionadas a estes Termos, utilize o canal de suporte dentro do aplicativo ou o e-mail administrativo informado na plataforma: <strong>{process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}</strong>.
                </p>

                <h3>13. DISPOSIÇÕES FINAIS</h3>
                <p>
                    Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer controvérsia será resolvida conforme a legislação aplicável.
                </p>
            </section>
        </article>
    );
}
