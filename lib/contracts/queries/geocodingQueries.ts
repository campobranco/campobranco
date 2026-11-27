// Contrato de leitura (somente consulta, sem escrita) para geocodificação.
// A UI não pode importar lib/services diretamente (regra no-restricted-imports).
export { geocodeAddress, resolveCityCenterCoordinates } from '@/lib/services/geocoding';
