// Versão da aplicação lida automaticamente do package.json via next.config.js.
// O valor é injetado como variável de ambiente NEXT_PUBLIC_APP_VERSION em tempo de build.
// NUNCA altere este valor manualmente — altere apenas o "version" no package.json.
export const APP_VERSION: string =
    process.env.NEXT_PUBLIC_APP_VERSION ?? '0.7.0-beta';
