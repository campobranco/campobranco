import { Lock } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Lock className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white m-0 leading-tight">Política de Privacidade</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">Última atualização: 13/10/2026</p>
                </div>
            </div>

            <section className="space-y-6 text-gray-600 dark:text-gray-300">
                <p>
                    A sua privacidade é uma prioridade. Esta Política de Privacidade explica, de forma clara e transparente, como o <strong>{process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'}</strong> coleta, utiliza, armazena e protege dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD).
                </p>
                <p>
                    O {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'} é uma ferramenta digital destinada ao apoio das atividades religiosas, pastorais e organizacionais realizadas por congregações das Testemunhas de Jeová e por seus membros.
                </p>
                <p>
                    O aplicativo não é operado, administrado, mantido nem endossado oficialmente pela organização religiosa das Testemunhas de Jeová. Sua utilização ocorre de forma independente, sob responsabilidade das congregações locais e dos usuários que o operam.
                </p>

                <h3>1. PAPÉIS E RESPONSABILIDADES (LGPD)</h3>
                <p><strong>Controlador dos Dados:</strong> A congregação local que utiliza o aplicativo e/ou os usuários administradores por ela designados, responsáveis pelo cadastro, definição de finalidade, manutenção, acesso e exclusão das informações inseridas no sistema.</p>
                <p>A organização religiosa das Testemunhas de Jeová, em âmbito institucional, não atua como controladora, não define as finalidades do tratamento e não possui acesso direto aos dados armazenados no aplicativo.</p>

                <p><strong>Operador dos Dados:</strong> O {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'}, que fornece a plataforma tecnológica e executa o tratamento de dados pessoais exclusivamente conforme as instruções do controlador.</p>
                <p>O {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'} não decide a finalidade do uso dos dados, limitando-se a disponibilizar os meios técnicos para sua organização e uso interno.</p>

                <h3>2. CATEGORIAS DE DADOS TRATADOS</h3>
                <p>Em estrita observância ao Princípio da Necessidade e Minimização de Dados (Art. 6º, III da LGPD), o sistema não realiza cadastro nominal de moradores, não realiza perfilamento de gênero e não coleta dados pessoais sensíveis de saúde ou de menores de idade.</p>

                <h4>2.1. Dados Territoriais e Logísticos (Não Pessoais de Moradores)</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Endereço público (logradouro, número e referência territorial)</li>
                    <li>Status operacional de visitação (ex.: "Visitado", "Livre", "Não Visitar")</li>
                    <li>Notas de acesso predial (ex.: campainha, portão, cão no quintal)</li>
                </ul>

                <h4>2.2. Dados dos Usuários do Sistema (Voluntários/Administradores)</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Nome do usuário</li>
                    <li>E-mail cadastrado</li>
                    <li>Credenciais e registros de acesso/permissões internas</li>
                </ul>

                <h3>3. FINALIDADE E BASE LEGAL DO TRATAMENTO</h3>
                <p>O tratamento de dados restringe-se às seguintes hipóteses legais previstas na LGPD:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Legítimo interesse (Art. 7º, IX) para planejamento territorial e logístico</li>
                    <li>Exercício regular de atividade pastoral e religiosa interna</li>
                    <li>Cumprimento de direitos do titular (Art. 18), incluindo a marcação de "Não Visitar" para moradores que expressarem oposição a visitas</li>
                </ul>
                <p>Os dados são utilizados exclusivamente para:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Organização de rotas de visitação pública e pastoral</li>
                    <li>Evitar visitas repetitivas ou inoportunas em residências que solicitaram não ser contatadas</li>
                    <li>Apoio logístico interno da congregação</li>
                </ul>
                <p>Os dados jamais são comercializados, compartilhados com terceiros para fins de marketing ou explorados economicamente.</p>

                <h3>4. PROTEÇÃO CONTRA A COLETA DE DADOS EXCESSIVOS</h3>
                <p>
                    O aplicativo opera sob diretrizes de <em>Privacy by Design</em> (privacidade desde a concepção). O sistema veda expressamente o armazenamento de nomes de pessoas físicas residentes, condição de saúde, deficiência ou dados de crianças e adolescentes. Toda anotação livre é restrita a características físicas de acesso ao lote.
                </p>

                <h3>5. ARMAZENAMENTO, INFRAESTRUTURA E OPEN SOURCE</h3>
                <h4>5.1. Banco de Dados</h4>
                <p>O banco de dados oficial do Campo Branco é fechado, privado e protegido, sendo acessível apenas a usuários autorizados dentro da mesma congregação.</p>

                <h4>5.2. Software Open Source</h4>
                <p>Embora o software {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'} seja disponibilizado como código aberto (Licença MIT), isso não se aplica:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>ao banco de dados oficial</li>
                    <li>à infraestrutura de produção</li>
                    <li>aos dados pessoais armazenados</li>
                </ul>

                <h4>5.3. Auto-hospedagem</h4>
                <p>Qualquer cópia, bifurcação (fork) ou auto-hospedagem do software deverá operar com banco de dados próprio e independente, não tendo acesso ao banco de dados oficial do Campo Branco, sendo de inteira responsabilidade de quem a operar.</p>

                <h3>6. COMPARTILHAMENTO DE DADOS</h3>
                <p>O Campo Branco não vende, não aluga e não compartilha dados pessoais com terceiros para fins comerciais.</p>
                <p>O acesso aos dados ocorre exclusivamente de forma interna, entre usuários autorizados da mesma congregação, conforme permissões definidas (ex.: anciãos, servos designados).</p>

                <h3>7. RETENÇÃO E EXCLUSÃO DE DADOS</h3>
                <p>Os dados pessoais são mantidos apenas enquanto necessários para a finalidade religiosa e organizacional.</p>
                <p>A exclusão pode ocorrer:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>por decisão dos usuários autorizados</li>
                    <li>quando o dado deixar de ser necessário</li>
                    <li>mediante solicitação do titular, quando aplicável</li>
                </ul>
                <p>Após a exclusão definitiva, os dados não permanecem acessíveis ao usuário.</p>

                <h3>8. SEGURANÇA DA INFORMAÇÃO</h3>
                <p>O Campo Branco adota medidas técnicas e organizacionais adequadas, incluindo:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>isolamento de dados por congregação</li>
                    <li>controle rigoroso de acesso</li>
                    <li>regras de segurança no banco de dados</li>
                    <li>criptografia em trânsito e, quando aplicável, em repouso</li>
                </ul>
                <p>Apesar das boas práticas adotadas, nenhum sistema é totalmente isento de riscos inerentes ao ambiente digital.</p>

                <h3>9. DIREITOS DOS TITULARES</h3>
                <p>Nos termos da LGPD, o titular dos dados pode solicitar:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>confirmação da existência de tratamento</li>
                    <li>acesso aos dados</li>
                    <li>correção de dados incompletos, inexatos ou desatualizados</li>
                    <li>exclusão de dados, quando aplicável</li>
                </ul>
                <p>As solicitações devem ser realizadas por meio dos canais da congregação responsável ou do suporte indicado no aplicativo.</p>

                <h3>10. ALTERAÇÕES DESTA POLÍTICA</h3>
                <p>
                    Esta Política de Privacidade pode ser atualizada a qualquer momento. A versão mais recente estará sempre disponível no aplicativo.
                </p>
                <p>
                    O uso contínuo do Campo Branco após eventuais alterações implica ciência e concordância com a versão vigente.
                </p>

                <h3>11. CONTATO E ENCARREGADO (DPO)</h3>
                <p>
                    Para dúvidas, solicitações ou esclarecimentos relacionados à privacidade e proteção de dados pessoais, o Campo Branco disponibiliza canais específicos em conformidade com a LGPD.
                </p>

                <h4>11.1. ENCARREGADO DE PROTEÇÃO DE DADOS (DPO)</h4>
                <p>
                    O Encarregado de Proteção de Dados (DPO) é o ponto de contato entre os titulares de dados, o Campo Branco e a Autoridade Nacional de Proteção de Dados (ANPD). Suas responsabilidades incluem:
                </p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Receber e responder às solicitações dos titulares de dados</li>
                    <li>Orientar sobre as melhores práticas de proteção de dados</li>
                    <li>Atuar como canal de comunicação com a ANPD</li>
                </ul>
                <p>
                    <strong>Contato Suporte:</strong> <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}`} className="text-emerald-600 dark:text-emerald-400 no-underline hover:underline">{process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}</a>
                </p>

                <h4>11.2. CANAIS DE SOLICITAÇÃO LGPD</h4>
                <p>
                    Os titulares podem exercer seus direitos através de:
                </p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li><strong>Solicitações:</strong> <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}`} className="text-emerald-600 dark:text-emerald-400 no-underline hover:underline">{process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}</a></li>
                </ul>
            </section>
        </article>
    );
}
