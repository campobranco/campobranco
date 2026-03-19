const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// URL detectada do backend App Hosting (ou configuração de ambiente)
const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000'; 

app.use('/', createProxyMiddleware({
    target: TARGET_URL,
    changeOrigin: true,
    xfwd: true, // Repassa os cabeçalhos originais (IP, etc)
    onProxyReq: (proxyReq, req, res) => {
        // Garante que o App Hosting conheça o domínio de entrada (web.app)
        if (req.headers.host) {
            proxyReq.setHeader('x-forwarded-host', req.headers.host);
        }
    },
    // Captura erros e logging para depuração
    onError: (err, req, res) => {
        console.error('[Proxy Error]:', err);
        res.status(500).send('Erro de comunicação com o servidor de aplicação.');
    }
}));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`[Campo Branco Proxy] rodando na porta ${PORT}`);
    console.log(`[Target]: ${TARGET_URL}`);
});
