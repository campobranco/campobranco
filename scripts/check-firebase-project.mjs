import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const ALLOWED_PROJECT = "campobrancodev";

try {
  // 1. Checa .firebase-environment
  const envFilePath = path.join(projectRoot, ".firebase-environment");
  if (!fs.existsSync(envFilePath)) {
    console.error(`[FIREBASE GUARD] Erro: Arquivo .firebase-environment não encontrado!`);
    process.exit(1);
  }
  const envContent = fs.readFileSync(envFilePath, "utf8").trim();
  if (envContent !== ALLOWED_PROJECT) {
    console.error(`[FIREBASE GUARD] Erro: .firebase-environment contém '${envContent}'. Esperado: '${ALLOWED_PROJECT}'`);
    process.exit(1);
  }

  // 2. Checa .firebaserc
  const rcFilePath = path.join(projectRoot, ".firebaserc");
  if (!fs.existsSync(rcFilePath)) {
    console.error(`[FIREBASE GUARD] Erro: Arquivo .firebaserc não encontrado!`);
    process.exit(1);
  }
  const rcContent = JSON.parse(fs.readFileSync(rcFilePath, "utf8"));
  if (rcContent.projects?.prod) {
    console.error(`[FIREBASE GUARD] Erro: Alias 'prod' proibido em .firebaserc!`);
    process.exit(1);
  }
  if (rcContent.projects?.default !== ALLOWED_PROJECT || rcContent.projects?.dev !== ALLOWED_PROJECT) {
    console.error(`[FIREBASE GUARD] Erro: .firebaserc inválido. Projetos permitidos apenas: '${ALLOWED_PROJECT}'`);
    process.exit(1);
  }

  // 3. Checa firebase use
  const output = execSync("npx firebase-tools use", { encoding: "utf8" }).trim();
  console.log(`[FIREBASE GUARD] Projeto ativo no CLI: ${output}`);

  if (!output.includes(ALLOWED_PROJECT)) {
    console.error(
      `\nERRO CRÍTICO: Projeto Firebase ativo no CLI é '${output}'.\n` +
      `Este repositório exige estritamente o ambiente de desenvolvimento '${ALLOWED_PROJECT}'.\n`
    );
    process.exit(1);
  }

  console.log(
    `\n✅ OK: Tríplice validação (.firebase-environment, .firebaserc, CLI) confirmada em ${ALLOWED_PROJECT}.`
  );
} catch (error) {
  console.error("\n[FIREBASE GUARD] Erro ao validar trava de projeto Firebase:", error);
  process.exit(1);
}
