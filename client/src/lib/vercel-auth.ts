// Authentication utilities for Vercel deployment
const API_BASE = process.env.NODE_ENV === 'production' 
  ? '' 
  : 'http://localhost:5000';

export interface AuthUser {
  id: number;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

class VercelAuth {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    this.token = data.token;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', data.token);
    }
    
    return data;
  }

  async getUser(): Promise<AuthUser | null> {
    if (!this.token) return null;

    try {
      const response = await fetch(`${API_BASE}/api/auth/user`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      return await response.json();
    } catch {
      this.logout();
      return null;
    }
  }

  logout(): void {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getAuthHeaders(): Record<string, string> {
    return this.token 
      ? { 'Authorization': `Bearer ${this.token}` }
      : {};
  }
}

export const vercelAuth = new VercelAuth();