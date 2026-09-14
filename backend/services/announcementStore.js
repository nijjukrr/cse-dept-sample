const { supabase } = require('../db/supabase');
const cache = require('../services/cache');

// In-memory fallback store when Supabase table 'announcements' genuinely hasn't been created yet
let inMemoryStore = [];

function isMissingTableError(error) {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return (
    code === '42P01' ||
    code === 'PGRST204' ||
    msg.includes('Could not find the table') ||
    msg.includes('relation "announcements" does not exist') ||
    msg.includes('relation "public.announcements" does not exist')
  );
}

async function getAdminAnnouncements() {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('⚠️ Supabase table "announcements" not found. Using fallback in-memory store.');
        return inMemoryStore;
      }
      console.error('Error fetching admin announcements from Supabase:', error.message);
      throw error;
    }
    return data || [];
  } catch (err) {
    if (isMissingTableError(err)) {
      return inMemoryStore;
    }
    throw err;
  }
}

async function getActiveAnnouncements() {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, content, image_url, category, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingTableError(error)) {
        return inMemoryStore.filter(a => a.is_active);
      }
      console.error('Error fetching active announcements:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    if (isMissingTableError(err)) {
      return inMemoryStore.filter(a => a.is_active);
    }
    console.error('Exception fetching active announcements:', err.message);
    return [];
  }
}

async function createAnnouncement(post) {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert([post])
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        console.warn('⚠️ Supabase table "announcements" not found. Saving announcement to in-memory store.');
        const fallbackPost = { id: 'mem_' + Date.now(), ...post };
        inMemoryStore.unshift(fallbackPost);
        await cache.del('announcements:active');
        return fallbackPost;
      }
      console.error('Supabase create announcement error:', error.message);
      throw new Error(error.message || 'Failed to save announcement');
    }

    await cache.del('announcements:active');
    return data;
  } catch (err) {
    if (isMissingTableError(err)) {
      const fallbackPost = { id: 'mem_' + Date.now(), ...post };
      inMemoryStore.unshift(fallbackPost);
      await cache.del('announcements:active');
      return fallbackPost;
    }
    throw err;
  }
}

async function updateAnnouncement(id, updates) {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        const idx = inMemoryStore.findIndex(a => a.id === id);
        if (idx !== -1) {
          inMemoryStore[idx] = { ...inMemoryStore[idx], ...updates };
          await cache.del('announcements:active');
          return inMemoryStore[idx];
        }
      }
      console.error('Supabase update announcement error:', error.message);
      throw new Error(error.message || 'Failed to update announcement');
    }

    await cache.del('announcements:active');
    return data;
  } catch (err) {
    if (isMissingTableError(err)) {
      const idx = inMemoryStore.findIndex(a => a.id === id);
      if (idx !== -1) {
        inMemoryStore[idx] = { ...inMemoryStore[idx], ...updates };
        await cache.del('announcements:active');
        return inMemoryStore[idx];
      }
    }
    throw err;
  }
}

async function deleteAnnouncement(id) {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      if (isMissingTableError(error)) {
        inMemoryStore = inMemoryStore.filter(a => a.id !== id);
        await cache.del('announcements:active');
        return true;
      }
      console.error('Supabase delete announcement error:', error.message);
      throw new Error(error.message || 'Failed to delete announcement');
    }

    await cache.del('announcements:active');
    return true;
  } catch (err) {
    if (isMissingTableError(err)) {
      inMemoryStore = inMemoryStore.filter(a => a.id !== id);
      await cache.del('announcements:active');
      return true;
    }
    throw err;
  }
}

async function getAnnouncementStorageStatus() {
  try {
    const { error } = await supabase
      .from('announcements')
      .select('id')
      .limit(1);

    if (error) {
      if (isMissingTableError(error)) {
        return {
          storage_mode: 'temporary',
          persistent: false,
          warning: 'Persistent announcement storage is not configured. Ask database owner to apply create_announcements.sql migration.'
        };
      }
      return {
        storage_mode: 'unavailable',
        persistent: false,
        warning: `Database error: ${error.message}`
      };
    }

    return {
      storage_mode: 'persistent',
      persistent: true,
      warning: null
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      return {
        storage_mode: 'temporary',
        persistent: false,
        warning: 'Persistent announcement storage is not configured. Ask database owner to apply create_announcements.sql migration.'
      };
    }
    return {
      storage_mode: 'unavailable',
      persistent: false,
      warning: err.message
    };
  }
}

module.exports = {
  getAdminAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStorageStatus
};
