export const PROJECT_REPO_URL = 'https://github.com/campobranco/campobranco';
export const PROJECT_LICENSE_URL = 'https://github.com/campobranco/campobranco/blob/main/LICENSE';
export const PROJECT_COPYRIGHT = 'Copyright (c) 2025-2026 Paulo Jacomelli';

export type LicenseId = 'MIT' | 'Apache-2.0' | 'ISC' | 'BSD-2-Clause' | 'BlueOak-1.0.0';

export interface LicenseDefinition {
    label: string;
    officialUrl: string;
    english: string;
    portuguese: string;
}

export interface ThirdPartyDependency {
    name: string;
    version: string;
    author: string;
    licenseId: LicenseId;
}

export interface MapDataCredit {
    name: string;
    role: string;
    license: string;
    url: string;
}

export const LICENSE_TEXTS: Record<LicenseId, LicenseDefinition> = {
    MIT: {
        label: 'MIT',
        officialUrl: 'https://opensource.org/license/mit',
        english: `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
        portuguese: `A permissão é concedida, gratuitamente, a qualquer pessoa que obtenha uma cópia deste software e dos arquivos de documentação associados (o "Software"), para lidar com o Software sem restrições, incluindo, sem limitação, os direitos de usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar e/ou vender cópias do Software, e permitir que as pessoas a quem o Software é fornecido o façam, sujeito às seguintes condições:

O aviso de direitos autorais acima e este aviso de permissão devem ser incluídos em todas as cópias ou partes substanciais do Software.

O SOFTWARE É FORNECIDO "COMO ESTÁ", SEM GARANTIA DE QUALQUER TIPO, EXPRESSA OU IMPLÍCITA, INCLUINDO, MAS NÃO SE LIMITANDO ÀS GARANTIAS DE COMERCIALIZAÇÃO, ADEQUAÇÃO A UM DETERMINADO FIM E NÃO INFRAÇÃO. EM NENHUM CASO OS AUTORES OU DETENTORES DE DIREITOS AUTORAIS SERÃO RESPONSÁVEIS POR QUALQUER REIVINDICAÇÃO, DANOS OU OUTRA RESPONSABILIDADE, SEJA EM UMA AÇÃO DE CONTRATO, ATO ILÍCITO OU DE OUTRA FORMA, DECORRENTE DE, FORA DE OU EM CONEXÃO COM O SOFTWARE OU O USO OU OUTRAS NEGOCIAÇÕES NO SOFTWARE.`,
    },
    'Apache-2.0': {
        label: 'Apache 2.0',
        officialUrl: 'https://www.apache.org/licenses/LICENSE-2.0',
        english: `Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,
        portuguese: `Licenciado sob a Licença Apache, Versão 2.0 (a "Licença");
você não pode usar este arquivo exceto em conformidade com a Licença.
Você pode obter uma cópia da Licença em

    http://www.apache.org/licenses/LICENSE-2.0

A menos que exigido pela lei aplicável ou acordado por escrito, o software distribuído sob a Licença é distribuído "COMO ESTÁ", SEM GARANTIAS OU CONDIÇÕES DE QUALQUER TIPO, expressas ou implícitas.
Consulte a Licença para as permissões e limitações específicas que regem o idioma sob a Licença.`,
    },
    ISC: {
        label: 'ISC',
        officialUrl: 'https://opensource.org/license/isc-license-txt',
        english: `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,
        portuguese: `A permissão para usar, copiar, modificar e/ou distribuir este software para qualquer finalidade com ou sem taxa é concedida, desde que o aviso de direitos autorais acima e este aviso de permissão apareçam em todas as cópias.

O SOFTWARE É FORNECIDO "COMO ESTÁ" E O AUTOR ISENTA-SE DE TODAS AS GARANTIAS COM RELAÇÃO A ESTE SOFTWARE, INCLUINDO TODAS AS GARANTIAS IMPLÍCITAS DE COMERCIALIZAÇÃO E ADEQUAÇÃO. EM NENHUM CASO O AUTOR SERÁ RESPONSÁVEL POR QUAISQUER DANOS ESPECIAIS, DIRETOS, INDIRETOS OU CONSEQUENCIAIS OU QUAISQUER DANOS RESULTANTES DA PERDA DE USO, DADOS OU LUCROS, SEJA EM UMA AÇÃO DE CONTRATO, NEGLIGÊNCIA OU OUTRA AÇÃO ILÍCITA, DECORRENTE DE OU EM CONEXÃO COM O USO OU DESEMPENHO DESTE SOFTWARE.`,
    },
    'BSD-2-Clause': {
        label: 'BSD 2-Clause',
        officialUrl: 'https://opensource.org/license/bsd-2-clause',
        english: `Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
        portuguese: `A redistribuição e o uso nas formas de código-fonte e binário, com ou sem modificação, são permitidos desde que as seguintes condições sejam atendidas:

1. As redistribuições do código-fonte devem manter o aviso de direitos autorais acima, esta lista de condições e a seguinte isenção de responsabilidade.

2. As redistribuições em formato binário devem reproduzir o aviso de direitos autorais acima, esta lista de condições e a seguinte isenção de responsabilidade na documentação e/ou em outros materiais fornecidos com a distribuição.

ESTE SOFTWARE É FORNECIDO "COMO ESTÁ", SEM GARANTIAS EXPRESSAS OU IMPLÍCITAS.`,
    },
    'BlueOak-1.0.0': {
        label: 'Blue Oak 1.0.0',
        officialUrl: 'https://blueoakcouncil.org/license/1.0.0',
        english: `This license gives everyone as much permission to work with this software as possible, while protecting contributors from liability.

Each contributor licenses you to do everything with this software that would otherwise infringe that contributor's copyright in it.

You must ensure that everyone who gets a copy of any part of this software from you, with or without changes, also gets the text of this license or a link to <https://blueoakcouncil.org/license/1.0.0>.

THE SOFTWARE IS PROVIDED AS IS, WITHOUT WARRANTY OF ANY KIND, AND NO CONTRIBUTOR WILL BE LIABLE FOR ANY DAMAGES RELATED TO THIS SOFTWARE.`,
        portuguese: `Esta licença concede a todos a maior permissão possível para trabalhar com este software, protegendo os colaboradores contra responsabilidade civil.

Você deve garantir que qualquer pessoa que receba uma cópia de qualquer parte deste software também receba o texto desta licença ou um link para <https://blueoakcouncil.org/license/1.0.0>.

O SOFTWARE É FORNECIDO "COMO ESTÁ", SEM GARANTIA DE QUALQUER TIPO.`,
    },
};

export function getLicenseDefinition(licenseId: LicenseId): LicenseDefinition {
    const def = LICENSE_TEXTS[licenseId];
    if (!def) {
        throw new Error(`Licença não mapeada: ${String(licenseId)}`);
    }
    return def;
}

export const DEPENDENCIES: ThirdPartyDependency[] = [
    { name: 'react', version: '19.0.0', author: 'Meta Platforms, Inc.', licenseId: 'MIT' },
    { name: 'react-dom', version: '19.0.0', author: 'Meta Platforms, Inc.', licenseId: 'MIT' },
    { name: 'next', version: '16.3.0', author: 'Vercel, Inc.', licenseId: 'MIT' },
    { name: 'firebase', version: '12.15.0', author: 'Google LLC', licenseId: 'Apache-2.0' },
    { name: 'firebase-admin', version: '13.10.0', author: 'Google LLC', licenseId: 'Apache-2.0' },
    { name: 'tailwindcss', version: '3.4.19', author: 'Tailwind Labs, Inc.', licenseId: 'MIT' },
    { name: 'leaflet', version: '1.9.4', author: 'Volodymyr Agafonkin', licenseId: 'BSD-2-Clause' },
    { name: '@capacitor/core', version: '8.5.0', author: 'Ionic Team', licenseId: 'MIT' },
    { name: '@capacitor/android', version: '8.5.0', author: 'Ionic Team', licenseId: 'MIT' },
    { name: '@capacitor/cli', version: '8.5.0', author: 'Ionic Team', licenseId: 'MIT' },
    { name: '@capacitor-firebase/authentication', version: '8.3.0', author: 'Robin Genz', licenseId: 'Apache-2.0' },
    { name: '@sentry/nextjs', version: '10.70.0', author: 'Sentry', licenseId: 'MIT' },
    { name: 'lucide-react', version: '0.562.0', author: 'Eric Fennis / Lucide Contributors', licenseId: 'ISC' },
    { name: 'date-fns', version: '4.4.0', author: 'Sasha Koss', licenseId: 'MIT' },
    { name: 'jspdf', version: '4.2.1', author: 'Parallax / jsPDF Contributors', licenseId: 'MIT' },
    { name: 'html2canvas', version: '1.4.1', author: 'Niklas von Hertzen', licenseId: 'MIT' },
    { name: 'sonner', version: '2.0.7', author: 'Emil Kowalski', licenseId: 'MIT' },
    { name: 'jose', version: '6.2.3', author: 'Filip Skokan', licenseId: 'MIT' },
    { name: 'lru-cache', version: '11.5.1', author: 'Isaac Z. Schlueter', licenseId: 'BlueOak-1.0.0' },
    { name: 'cookie', version: '1.1.1', author: 'Roman Shtylman', licenseId: 'MIT' },
    { name: 'sharp', version: '0.35.3', author: 'Lovell Fuller', licenseId: 'Apache-2.0' },
    { name: '@google-cloud/recaptcha-enterprise', version: '6.4.2', author: 'Google LLC', licenseId: 'Apache-2.0' },
    { name: '@ducanh2912/next-pwa', version: '10.2.9', author: 'Duc Anh', licenseId: 'MIT' },
];

export const MAP_DATA_CREDITS: MapDataCredit[] = [
    {
        name: 'OpenStreetMap',
        role: 'Dados geográficos e malha viária',
        license: 'ODbL (Open Database License)',
        url: 'https://www.openstreetmap.org/copyright',
    },
    {
        name: 'CARTO Basemaps',
        role: 'Camada visual de mapas (Voyager)',
        license: 'CARTO / OpenStreetMap',
        url: 'https://carto.com/attributions',
    },
    {
        name: 'Nominatim & Photon',
        role: 'Geocodificação de endereços',
        license: 'ODbL / Apache 2.0',
        url: 'https://nominatim.org/',
    },
];
