import { supabase } from '../lib/supabase';
import { Sweet, AuthResponse } from '../types';

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export const authApi = {
  async register(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    return response.json();
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },
};

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
};

export const sweetsApi = {
  async getAll(): Promise<Sweet[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/sweets`, {
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch sweets');
    }

    return response.json();
  },

  async search(params: {
    name?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<Sweet[]> {
    const headers = await getAuthHeaders();
    const searchParams = new URLSearchParams();

    if (params.name) searchParams.append('name', params.name);
    if (params.category) searchParams.append('category', params.category);
    if (params.minPrice !== undefined) searchParams.append('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) searchParams.append('maxPrice', params.maxPrice.toString());

    const response = await fetch(`${API_BASE_URL}/sweets/search?${searchParams}`, {
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to search sweets');
    }

    return response.json();
  },

  async create(sweet: Omit<Sweet, 'id' | 'created_at' | 'updated_at'>): Promise<Sweet> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/sweets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sweet),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create sweet');
    }

    return response.json();
  },

  async update(id: string, updates: Partial<Sweet>): Promise<Sweet> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/sweets/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update sweet');
    }

    return response.json();
  },

  async delete(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/sweets/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete sweet');
    }
  },
};

export const inventoryApi = {
  async purchase(sweetId: string, quantity: number): Promise<{ message: string; sweet: Sweet }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/inventory/sweets/${sweetId}/purchase`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Purchase failed');
    }

    return response.json();
  },

  async restock(sweetId: string, quantity: number): Promise<{ message: string; sweet: Sweet }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/inventory/sweets/${sweetId}/restock`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Restock failed');
    }

    return response.json();
  },
};
