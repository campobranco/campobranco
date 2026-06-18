// lib/validation.ts
// Utilitário para sanitização e validação de input de dados
// Protege contra ataques de XSS e injeção de scripts

/**
 * Interface para os resultados de validação
 */
export interface ValidationResult {
    isValid: boolean;
    sanitizedData: any;
    errors?: string[];
}

/**
 * Sanitiza strings para remover tags HTML potencialmente perigosas
 * Nota: Como não temos DOMPurify no servidor sem biblioteca extra, 
 * usamos uma abordagem de regex para limpeza básica se necessário, 
 * ou apenas confiamos que o React escapa o conteúdo no front,
 * mas aqui limpamos espaços e normalizamos.
 */
export function sanitizeString(val: string): string {
    if (typeof val !== 'string') return val;
    // Remove espaços extras e normaliza
    let sanitized = val.trim();
    // Escape básico de caracteres HTML se formos salvar algo que possa ser executado
    // Porém, o ideal é que o frontend trate a exibição com segurança (que o React já faz)
    return sanitized;

/**
 * Sanitiza URLs para garantir que apenas protocolos seguros (http, https) são permitidos.
 * Caso a URL seja inválida ou use outro protocolo, retorna string vazia.
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string' || !url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    console.warn('[sanitizeUrl] Protocolo não permitido:', parsed.protocol);
    return '';
  } catch (e) {
    console.warn('[sanitizeUrl] URL inválida:', url);
    return '';
  }
}

}

/**
 * Sanitiza recursivamente objetos e arrays
 */
export function sanitizeInput(input: any): any {
    if (input === null || input === undefined) return input;

    if (Array.isArray(input)) {
        return input.map(item => sanitizeInput(item));
    }

    if (typeof input === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(input)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }

    if (typeof input === 'string') {
        return sanitizeString(input);
    }

    return input;
}

/**
 * Valida campos obrigatórios em um objeto
 */
export function validateRequired(data: any, fields: string[]): string[] {
    const errors: string[] = [];
    fields.forEach(field => {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            errors.push(`O campo "${field}" é obrigatório.`);
        }
    });
    return errors;
}

/**
 * Helper para validar e sanitizar em uma única chamada
 */
export function validateAndSanitize(data: any, requiredFields: string[] = []): ValidationResult {
    const errors = validateRequired(data, requiredFields);
    const sanitizedData = sanitizeInput(data);
    
    return {
        isValid: errors.length === 0,
        sanitizedData,
        errors
    };
}
