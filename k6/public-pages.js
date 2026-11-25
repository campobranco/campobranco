import http from 'k6/http';
import { check, group, sleep } from 'k6';
import exec from 'k6/execution';
import { Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const pageDuration = new Trend('page_load_duration', true);
const assetDuration = new Trend('asset_load_duration', true);

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm-up
    { duration: '1m', target: 30 },  // Ramp-up até carga alvo
    { duration: '2m', target: 30 },  // Carga sustentada
    { duration: '30s', target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    page_load_duration: ['p(95)<500'],
    asset_load_duration: ['p(95)<250'],
    checks: ['rate>0.99'],
  },
};

function getHeader(res, name) {
  const target = name.toLowerCase();
  for (const key of Object.keys(res.headers)) {
    if (key.toLowerCase() === target) {
      return res.headers[key];
    }
  }
  return '';
}

function checkHtmlPage(res, routeLabel) {
  pageDuration.add(res.timings.duration, { route: routeLabel });
  const contentType = getHeader(res, 'content-type');

  return check(res, {
    [`${routeLabel}: status 200`]: (r) => r.status === 200,
    [`${routeLabel}: content-type HTML`]: () => contentType.includes('text/html'),
    [`${routeLabel}: body não vazio`]: (r) => typeof r.body === 'string' && r.body.length > 0,
    [`${routeLabel}: markup HTML válido`]: (r) =>
      typeof r.body === 'string' && (r.body.includes('<!DOCTYPE html') || r.body.includes('<html')),
  });
}

export function setup() {
  const res = http.get(`${BASE_URL}/`, { tags: { name: 'setup_healthcheck' } });
  if (res.status !== 200) {
    exec.test.abort(
      `Servidor indisponível em ${BASE_URL}/ (status: ${res.status}, erro: ${res.error || 'nenhum'}). ` +
        'Inicie a aplicação localmente antes de executar o K6.'
    );
  }
}

export default function () {
  group('01_home_e_assets', () => {
    const homeRes = http.get(`${BASE_URL}/`, { tags: { page: 'home' } });
    checkHtmlPage(homeRes, 'home');

    const assets = http.batch([
      ['GET', `${BASE_URL}/manifest.json`, null, { tags: { asset: 'manifest' } }],
      ['GET', `${BASE_URL}/favicon.ico`, null, { tags: { asset: 'favicon' } }],
      ['GET', `${BASE_URL}/icon-192x192.png`, null, { tags: { asset: 'icon_192' } }],
      ['GET', `${BASE_URL}/app-icon.svg`, null, { tags: { asset: 'app_icon_svg' } }],
    ]);

    for (const assetRes of assets) {
      assetDuration.add(assetRes.timings.duration);
    }

    const [manifestRes, faviconRes, iconRes, svgRes] = assets;

    check(manifestRes, {
      'manifest.json: status 200': (r) => r.status === 200,
      'manifest.json: contém Campo Branco': (r) => {
        try {
          const parsed = JSON.parse(r.body);
          return parsed.name === 'Campo Branco' && parsed.start_url === '/';
        } catch {
          return false;
        }
      },
    });

    check(faviconRes, {
      'favicon.ico: status 200': (r) => r.status === 200,
      'favicon.ico: não vazio': (r) => Boolean(r.body && (r.body.byteLength > 0 || r.body.length > 0)),
    });

    check(iconRes, {
      'icon-192x192.png: status 200': (r) => r.status === 200,
    });

    check(svgRes, {
      'app-icon.svg: status 200': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 2 + 1);

  group('02_login', () => {
    const loginRes = http.get(`${BASE_URL}/login`, { tags: { page: 'login' } });
    checkHtmlPage(loginRes, 'login');
  });

  sleep(Math.random() * 2 + 1);

  group('03_paginas_legais', () => {
    const privacyRes = http.get(`${BASE_URL}/legal/privacy`, { tags: { page: 'legal_privacy' } });
    checkHtmlPage(privacyRes, 'legal/privacy');

    const termsRes = http.get(`${BASE_URL}/legal/terms`, { tags: { page: 'legal_terms' } });
    checkHtmlPage(termsRes, 'legal/terms');
  });

  sleep(Math.random() * 2 + 1);
}
