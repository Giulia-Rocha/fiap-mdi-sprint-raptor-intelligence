import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '../config/env';

// Instância única do axios usada por todos os serviços (specsApi, etc).
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Injeta (ou remove) o token JWT no header Authorization após o login/logout.
 */
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Registra o callback executado quando qualquer requisição autenticada
 * recebe 401 (token expirado/inválido). Usado pelo AuthContext para
 * efetuar logout automático. Apenas um handler por vez.
 */
export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      setAuthToken(null);
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);
