import { SupabaseClient } from '@supabase/supabase-js';

export abstract class BaseRepository<T> {
  constructor(protected client: SupabaseClient, protected tableName: string) {}
  
  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data as T;
  }
  
  async findAll(filters?: Record<string, any>): Promise<T[]> {
    let query = this.client.from(this.tableName).select('*') as any;
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    const { data, error } = await query;
    if (error) return [];
    return data as T[];
  }
  
  async insert(data: Partial<T>): Promise<T | null> {
    const { data: inserted, error } = await this.client
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
    
    if (error) return null;
    return inserted as T;
  }
  
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const { data: updated, error } = await this.client
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return null;
    return updated as T;
  }
  
  async delete(id: string): Promise<boolean> {
    const { error } = await this.client
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    return !error;
  }
}
