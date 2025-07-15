import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vercelAuth, type AuthUser } from '@/lib/vercel-auth';

export function useVercelAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { data: user, refetch } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => vercelAuth.getUser(),
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (vercelAuth.isAuthenticated()) {
        setIsAuthenticated(true);
        await refetch();
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [refetch]);

  const login = async (username: string, password: string) => {
    try {
      const result = await vercelAuth.login(username, password);
      setIsAuthenticated(true);
      await refetch();
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    vercelAuth.logout();
    setIsAuthenticated(false);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}