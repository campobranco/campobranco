import { Lock } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <article className="prose prose-slate dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Lock className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white m-0 leading-tight">PolÃ­tica de Privacidade</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 m-0">Ãšltima atualizaÃ§Ã£o: 05/01/2026</p>
                </div>
            </div>

            <section className="space-y-6 text-gray-600 dark:text-gray-300">
                <p>
                    A sua privacidade Ã© uma prioridade. Esta PolÃ­tica de Privacidade explica, de forma clara e transparente, como o <strong>{process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'}</strong> coleta, utiliza, armazena e protege dados pessoais, em conformidade com a Lei Geral de ProteÃ§Ã£o de Dados (Lei nÂº 13.709/2018 â€“ LGPD).
                </p>
                <p>
                    O {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'} Ã© uma ferramenta digital destinada ao apoio das atividades religiosas, pastorais e organizacionais realizadas por congregaÃ§Ãµes das Testemunhas de JeovÃ¡ e por seus membros.
                </p>
                <p>
                    O aplicativo nÃ£o Ã© operado, administrado, mantido nem endossado oficialmente pela organizaÃ§Ã£o religiosa das Testemunhas de JeovÃ¡. Sua utilizaÃ§Ã£o ocorre de forma independente, sob responsabilidade das congregaÃ§Ãµes locais e dos usuÃ¡rios que o operam.
                </p>

                <h3>1. PAPÃ‰IS E RESPONSABILIDADES (LGPD)</h3>
                <p><strong>Controlador dos Dados:</strong> A congregaÃ§Ã£o local que utiliza o aplicativo e/ou os usuÃ¡rios administradores por ela designados, responsÃ¡veis pelo cadastro, definiÃ§Ã£o de finalidade, manutenÃ§Ã£o, acesso e exclusÃ£o das informaÃ§Ãµes inseridas no sistema.</p>
                <p>A organizaÃ§Ã£o religiosa das Testemunhas de JeovÃ¡, em Ã¢mbito institucional, nÃ£o atua como controladora, nÃ£o define as finalidades do tratamento e nÃ£o possui acesso direto aos dados armazenados no aplicativo.</p>

                <p><strong>Operador dos Dados:</strong> O {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'}, que fornece a plataforma tecnolÃ³gica e executa o tratamento de dados pessoais exclusivamente conforme as instruÃ§Ãµes do controlador.</p>
                <p>O {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'} nÃ£o decide a finalidade do uso dos dados, limitando-se a disponibilizar os meios tÃ©cnicos para sua organizaÃ§Ã£o e uso interno.</p>

                <h3>2. CATEGORIAS DE DADOS COLETADOS</h3>
                <p>Para o funcionamento da ferramenta de gestÃ£o pastoral e organizacional, podem ser coletados e armazenados os seguintes dados:</p>

                <h4>2.1. Dados Pessoais Comuns</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Nome do morador (quando informado)</li>
                    <li>EndereÃ§o (logradouro, nÃºmero e referÃªncia territorial)</li>
                    <li>GÃªnero (utilizado exclusivamente para orientar a abordagem)</li>
                </ul>

                <h4>2.2. Dados Pessoais SensÃ­veis (Opcionais)</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Tags de acessibilidade (ex.: â€œSurdoâ€, â€œNeurodivergenteâ€)</li>
                    <li>IdentificaÃ§Ã£o de â€œMenorâ€</li>
                </ul>
                <p>Essas informaÃ§Ãµes sÃ£o opcionais e registradas apenas quando estritamente necessÃ¡rias, com a finalidade exclusiva de orientar uma abordagem responsÃ¡vel, respeitosa e adequada.</p>

                <h4>2.3. Dados do UsuÃ¡rio do Sistema</h4>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Nome</li>
                    <li>E-mail</li>
                    <li>InformaÃ§Ãµes bÃ¡sicas de autenticaÃ§Ã£o e controle de acesso</li>
                </ul>

                <h3>3. FINALIDADE E BASE LEGAL DO TRATAMENTO</h3>
                <p>O tratamento de dados pessoais ocorre com base nas seguintes hipÃ³teses legais previstas na LGPD:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Interesse legÃ­timo</li>
                    <li>ExercÃ­cio regular de atividade religiosa</li>
                    <li>Finalidade pastoral, organizacional e assistencial</li>
                </ul>
                <p>Os dados sÃ£o utilizados exclusivamente para:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>OrganizaÃ§Ã£o da visitaÃ§Ã£o pÃºblica e pastoral</li>
                    <li>Evitar visitas repetitivas, inoportunas ou inadequadas</li>
                    <li>Planejar acessibilidade (lÃ­ngua de sinais, idioma estrangeiro, cuidados especiais)</li>
                    <li>Apoiar a organizaÃ§Ã£o interna da congregaÃ§Ã£o</li>
                </ul>
                <p>Os dados nÃ£o sÃ£o utilizados para fins comerciais, marketing, publicidade, perfilamento, venda ou qualquer forma de exploraÃ§Ã£o econÃ´mica.</p>

                <h3>4. DADOS DE CRIANÃ‡AS E ADOLESCENTES</h3>
                <p>
                    Quando houver identificaÃ§Ã£o de crianÃ§as ou adolescentes, o tratamento ocorre exclusivamente no melhor interesse do menor, conforme o Art. 14 da LGPD, com a finalidade de:
                </p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>alertar sobre a necessidade de abordagem responsÃ¡vel</li>
                    <li>incentivar boas prÃ¡ticas, como buscar autorizaÃ§Ã£o dos responsÃ¡veis</li>
                    <li>evitar contatos inadequados</li>
                </ul>
                <p>O {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'} nÃ£o realiza perfilamento de menores nem coleta dados excessivos ou desnecessÃ¡rios.</p>

                <h3>5. ARMAZENAMENTO, INFRAESTRUTURA E OPEN SOURCE</h3>
                <h4>5.1. Banco de Dados</h4>
                <p>O banco de dados oficial do Campo Branco Ã© fechado, privado e protegido, sendo acessÃ­vel apenas a usuÃ¡rios autorizados dentro da mesma congregaÃ§Ã£o.</p>

                <h4>5.2. Software Open Source</h4>
                <p>Embora o software {process.env.NEXT_PUBLIC_APP_NAME || 'Campo Branco'} seja disponibilizado como cÃ³digo aberto (LicenÃ§a MIT), isso nÃ£o se aplica:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>ao banco de dados oficial</li>
                    <li>Ã  infraestrutura de produÃ§Ã£o</li>
                    <li>aos dados pessoais armazenados</li>
                </ul>

                <h4>5.3. Auto-hospedagem</h4>
                <p>Qualquer cÃ³pia, bifurcaÃ§Ã£o (fork) ou auto-hospedagem do software deverÃ¡ operar com banco de dados prÃ³prio e independente, nÃ£o tendo acesso ao banco de dados oficial do Campo Branco, sendo de inteira responsabilidade de quem a operar.</p>

                <h3>6. COMPARTILHAMENTO DE DADOS</h3>
                <p>O Campo Branco nÃ£o vende, nÃ£o aluga e nÃ£o compartilha dados pessoais com terceiros para fins comerciais.</p>
                <p>O acesso aos dados ocorre exclusivamente de forma interna, entre usuÃ¡rios autorizados da mesma congregaÃ§Ã£o, conforme permissÃµes definidas (ex.: anciÃ£os, servos designados).</p>

                <h3>7. RETENÃ‡ÃƒO E EXCLUSÃƒO DE DADOS</h3>
                <p>Os dados pessoais sÃ£o mantidos apenas enquanto necessÃ¡rios para a finalidade religiosa e organizacional.</p>
                <p>A exclusÃ£o pode ocorrer:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>por decisÃ£o dos usuÃ¡rios autorizados</li>
                    <li>quando o dado deixar de ser necessÃ¡rio</li>
                    <li>mediante solicitaÃ§Ã£o do titular, quando aplicÃ¡vel</li>
                </ul>
                <p>ApÃ³s a exclusÃ£o definitiva, os dados nÃ£o permanecem acessÃ­veis ao usuÃ¡rio.</p>

                <h3>8. SEGURANÃ‡A DA INFORMAÃ‡ÃƒO</h3>
                <p>O Campo Branco adota medidas tÃ©cnicas e organizacionais adequadas, incluindo:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>isolamento de dados por congregaÃ§Ã£o</li>
                    <li>controle rigoroso de acesso</li>
                    <li>regras de seguranÃ§a no banco de dados</li>
                    <li>criptografia em trÃ¢nsito e, quando aplicÃ¡vel, em repouso</li>
                </ul>
                <p>Apesar das boas prÃ¡ticas adotadas, nenhum sistema Ã© totalmente isento de riscos inerentes ao ambiente digital.</p>

                <h3>9. DIREITOS DOS TITULARES</h3>
                <p>Nos termos da LGPD, o titular dos dados pode solicitar:</p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>confirmaÃ§Ã£o da existÃªncia de tratamento</li>
                    <li>acesso aos dados</li>
                    <li>correÃ§Ã£o de dados incompletos, inexatos ou desatualizados</li>
                    <li>exclusÃ£o de dados, quando aplicÃ¡vel</li>
                </ul>
                <p>As solicitaÃ§Ãµes devem ser realizadas por meio dos canais da congregaÃ§Ã£o responsÃ¡vel ou do suporte indicado no aplicativo.</p>

                <h3>10. ALTERAÃ‡Ã•ES DESTA POLÃTICA</h3>
                <p>
                    Esta PolÃ­tica de Privacidade pode ser atualizada a qualquer momento. A versÃ£o mais recente estarÃ¡ sempre disponÃ­vel no aplicativo.
                </p>
                <p>
                    O uso contÃ­nuo do Campo Branco apÃ³s eventuais alteraÃ§Ãµes implica ciÃªncia e concordÃ¢ncia com a versÃ£o vigente.
                </p>

                <h3>11. CONTATO E ENCARREGADO (DPO)</h3>
                <p>
                    Para dÃºvidas, solicitaÃ§Ãµes ou esclarecimentos relacionados Ã  privacidade e proteÃ§Ã£o de dados pessoais, o Campo Branco disponibiliza canais especÃ­ficos em conformidade com a LGPD.
                </p>

                <h4>11.1. ENCARREGADO DE PROTEÃ‡ÃƒO DE DADOS (DPO)</h4>
                <p>
                    O Encarregado de ProteÃ§Ã£o de Dados (DPO) Ã© o ponto de contato entre os titulares de dados, o Campo Branco e a Autoridade Nacional de ProteÃ§Ã£o de Dados (ANPD). Suas responsabilidades incluem:
                </p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li>Receber e responder Ã s solicitaÃ§Ãµes dos titulares de dados</li>
                    <li>Orientar sobre as melhores prÃ¡ticas de proteÃ§Ã£o de dados</li>
                    <li>Atuar como canal de comunicaÃ§Ã£o com a ANPD</li>
                </ul>
                <p>
                    <strong>Contato Suporte:</strong> <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}`} className="text-emerald-600 dark:text-emerald-400 no-underline hover:underline">{process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}</a>
                </p>

                <h4>11.2. CANAIS DE SOLICITAÃ‡ÃƒO LGPD</h4>
                <p>
                    Os titulares podem exercer seus direitos atravÃ©s de:
                </p>
                <ul className="list-disc pl-5 space-y-2 marker:text-emerald-500">
                    <li><strong>SolicitaÃ§Ãµes:</strong> <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}`} className="text-emerald-600 dark:text-emerald-400 no-underline hover:underline">{process.env.NEXT_PUBLIC_SUPPORT_EMAIL || process.env.NEXT_PUBLIC_MASTER_EMAIL}</a></li>
                </ul>
            </section>
        </article>
    );
}
