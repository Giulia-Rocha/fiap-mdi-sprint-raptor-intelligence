import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { specsApi } from '../services/specsApi';
import { setAuthToken, setUnauthorizedHandler } from '../services/apiClient';

interface AuthUser {
  name: string;
  dealership: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'raptor_auth_token';
const USER_KEY = 'raptor_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedUser = await SecureStore.getItemAsync(USER_KEY);

      if (storedToken) {
        setAuthToken(storedToken);
        setToken(storedToken);
      }
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to load auth data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const data = await specsApi.login(email, password);

    const userData: AuthUser = {
      name: data.name,
      dealership: data.dealership
    };

    setAuthToken(data.token);
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));

    setToken(data.token);
    setUser(userData);
  };

  const signOut = async () => {
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const signOutRef = useRef<() => Promise<void>>(signOut);
  signOutRef.current = signOut;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOutRef.current();
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, signIn, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
