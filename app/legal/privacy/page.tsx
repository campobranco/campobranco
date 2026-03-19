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
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">Última atualização: 05/01/2026</p>
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

                <h3>2. CATEGORIAS DE DADOS COLETADOS</h3>
                <p>Para o funcionamento da ferramenta de gestão pastoral e organizacional, podem ser coletados e armazenados os seguintes dados:</p>

                <h4>2.1. Dados Pessoais Comuns</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Nome do morador (quando informado)</li>
                    <li>Endereço (logradouro, número e referência territorial)</li>
                    <li>Gênero (utilizado exclusivamente para orientar a abordagem)</li>
                </ul>

                <h4>2.2. Dados Pessoais Sensíveis (Opcionais)</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Tags de acessibilidade (ex.: “Surdo”, “Neurodivergente”)</li>
                    <li>Identificação de “Menor”</li>
                </ul>
                <p>Essas informações são opcionais e registradas apenas quando estritamente necessárias, com a finalidade exclusiva de orientar uma abordagem responsável, respeitosa e adequada.</p>

                <h4>2.3. Dados do Usuário do Sistema</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Nome</li>
                    <li>E-mail</li>
                    <li>Informações básicas de autenticação e controle de acesso</li>
                </ul>

                <h3>3. FINALIDADE E BASE LEGAL DO TRATAMENTO</h3>
                <p>O tratamento de dados pessoais ocorre com base nas seguintes hipóteses legais previstas na LGPD:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Interesse legítimo</li>
                    <li>Exercício regular de atividade religiosa</li>
                    <li>Finalidade pastoral, organizacional e assistencial</li>
                </ul>
                <p>Os dados são utilizados exclusivamente para:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Organização da visitação pública e pastoral</li>
                    <li>Evitar visitas repetitivas, inoportunas ou inadequadas</li>
                    <li>Planejar acessibilidade (língua de sinais, idioma estrangeiro, cuidados especiais)</li>
                    <li>Apoiar a organização interna da congregação</li>
                </ul>
                <p>Os dados não são utilizados para fins comerciais, marketing, publicidade, perfilamento, venda ou qualquer forma de exploração econômica.</p>

                <h3>4. DADOS DE CRIANÇAS E ADOLESCENTES</h3>
                <p>
                    Quando houver identificação de crianças ou adolescentes, o tratamento ocorre exclusivamente no melhor interesse do menor, conforme o Art. 14 da LGPD, com a finalidade de:
                </p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>alertar sobre a necessidade de abordagem responsável</li>
                    <li>incentivar boas práticas, como buscar autorização dos responsáveis</li>
                    <li>evitar contatos inadequados</li>
                </ul>
                <p>O {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'} não realiza perfilamento de menores nem coleta dados excessivos ou desnecessários.</p>

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
                    <strong>Contato Suporte:</strong> <a href={`mailto:${process.env.NEXT_PUBLIC_MASTER_EMAIL || 'suporte@campobranco.com'}`} className="text-emerald-600 dark:text-emerald-400 no-underline hover:underline">{process.env.NEXT_PUBLIC_MASTER_EMAIL || 'suporte@campobranco.com'}</a>
                </p>

                <h4>11.2. CANAIS DE SOLICITAÇÃO LGPD</h4>
                <p>
                    Os titulares podem exercer seus direitos através de:
                </p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li><strong>Solicitações:</strong> <a href={`mailto:${process.env.NEXT_PUBLIC_MASTER_EMAIL || 'suporte@campobranco.com'}`} className="text-emerald-600 dark:text-emerald-400 no-underline hover:underline">{process.env.NEXT_PUBLIC_MASTER_EMAIL || 'suporte@campobranco.com'}</a></li>
                </ul>
            </section>
        </article>
    );
}
