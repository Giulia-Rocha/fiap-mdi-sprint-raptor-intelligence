// Configuração de ambiente do app.
//
// Por padrão (USE_MOCKS = false) o app usa a API Java real (Raptor Intelligence API).
// Defina EXPO_PUBLIC_USE_MOCKS=true apenas para modo offline/apresentação, com os
// dados de exemplo do módulo `mocks/`. Em produção, configure EXPO_PUBLIC_API_URL
// com a URL do backend.

export const USE_MOCKS =
  (process.env.EXPO_PUBLIC_USE_MOCKS ?? 'false').toLowerCase() === 'true';

// URL base da API (usada apenas quando USE_MOCKS = false).
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

// Timeout padrão das requisições HTTP, em milissegundos.
export const API_TIMEOUT = 15000;
