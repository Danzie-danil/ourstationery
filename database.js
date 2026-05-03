import { supabase } from './supabase.js';

// ═══════════════════════════════════════════════════════════════
//  DATABASE SERVICE - Handles all Supabase operations
// ═══════════════════════════════════════════════════════════════

export const db = {
  // ─── USER MANAGEMENT ───
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // ─── INVENTORY OPERATIONS ───
  async getInventory(userId) {
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async addInventoryItem(userId, item) {
    const { data, error } = await supabase
      .from('inventory')
      .insert([{ ...item, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateInventoryItem(id, updates) {
    const { data, error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteInventoryItem(id) {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // ─── CAPITAL OPERATIONS ───
  async getCapital(userId) {
    const { data, error } = await supabase
      .from('capital')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;
  },

  async upsertCapital(userId, capitalData) {
    const { data, error } = await supabase
      .from('capital')
      .upsert([{ ...capitalData, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // ─── INCOME OPERATIONS ───
  async getIncome(userId) {
    const { data, error } = await supabase
      .from('income')
      .select('*')
      .eq('user_id', userId)
      .order('month_index', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async upsertIncome(userId, monthIndex, incomeData) {
    const { data, error } = await supabase
      .from('income')
      .upsert([{ 
        ...incomeData, 
        user_id: userId, 
        month_index: monthIndex 
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // ─── CATEGORIES OPERATIONS ───
  async getCategories(userId) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async addCategory(userId, categoryName) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: categoryName, user_id: userId }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteCategory(id) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // ─── REALTIME SUBSCRIPTIONS ───
  subscribeToInventory(userId, callback) {
    const subscription = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  },

  subscribeToCapital(userId, callback) {
    const subscription = supabase
      .channel('capital-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'capital',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  },

  subscribeToIncome(userId, callback) {
    const subscription = supabase
      .channel('income-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'income',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  },

  unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  },

  // ─── SALES OPERATIONS ───
  async getSales(userId) {
    const { data, error } = await supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('user_id', userId)
      .order('sale_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async addSale(userId, saleData, items) {
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([{ ...saleData, user_id: userId }])
      .select()
      .single();
    
    if (saleError) throw saleError;

    if (items && items.length > 0) {
      const saleItems = items.map(item => ({
        ...item,
        sale_id: sale.id,
        user_id: userId
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);
      
      if (itemsError) throw itemsError;
    }

    return sale;
  },

  async deleteSale(id) {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // ─── REALTIME SUBSCRIPTIONS FOR SALES ───
  subscribeToSales(userId, callback) {
    const subscription = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }
};
