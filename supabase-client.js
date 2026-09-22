(function () {
  const config = window.TTM_SUPABASE_CONFIG;
  const library = window.supabase;

  if (!config || !config.url || !config.anonKey || !library) {
    window.TTMBackend = { enabled: false, client: null };
    return;
  }

  window.TTMBackend = {
    enabled: true,
    client: library.createClient(config.url, config.anonKey),
    async getPublishedSigners() {
      const { data, error } = await this.client.from('published_signers').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    async saveMission(mission) {
      const { data: userData } = await this.client.auth.getUser();
      if (!userData.user) return { requiresAuth: true };
      const { data, error } = await this.client.from('missions').upsert({
        ...mission,
        owner_id: userData.user.id
      }).select().single();
      if (error) throw error;
      return { data };
    },
    async submitReport(report) {
      const { data: userData } = await this.client.auth.getUser();
      if (!userData.user) return { requiresAuth: true };
      const { data, error } = await this.client.from('signer_reports').insert({
        ...report,
        submitted_by: userData.user.id
      }).select().single();
      if (error) throw error;
      return { data };
    },
    async getStaffQueue() {
      const { data: userData } = await this.client.auth.getUser();
      if (!userData.user) return { authorized: false };
      const { data: profile, error: profileError } = await this.client
        .from('profiles').select('role, display_name').eq('id', userData.user.id).single();
      if (profileError) throw profileError;
      if (!['admin', 'moderator'].includes(profile.role)) return { authorized: false };
      const [signers, reports] = await Promise.all([
        this.client.from('signers').select('*').in('record_status', ['draft', 'pending', 'needs_review']).order('created_at'),
        this.client.from('signer_reports').select('*, signers(name)').eq('moderation_status', 'pending').order('created_at')
      ]);
      if (signers.error) throw signers.error;
      if (reports.error) throw reports.error;
      return { authorized: true, profile, signers: signers.data || [], reports: reports.data || [] };
    },
    async getSignerSheet() {
      const { data, error } = await this.client.from('signers').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
    async saveSignerSheet(rows) {
      const safeRows = rows
        .filter((row) => row.name && row.name.trim())
        .map((row) => ({
          id: row.id || undefined,
          slug: row.slug || row.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name: row.name.trim(),
          category: row.category || 'Sports',
          subcategory: row.subcategory || 'Baseball',
          note: row.note || '',
          public_contact_type: row.public_contact_type || 'official',
          public_contact_label: row.public_contact_label || '',
          public_contact_url: row.public_contact_url || '',
          public_contact_verified_at: row.public_contact_verified_at || null,
          source_notes: row.source_notes || '',
          record_status: row.record_status || 'draft',
          confidence: row.confidence || 'medium',
          response_status: row.response_status || 'unverified',
          typical_wait_min: Number(row.typical_wait_min || 0),
          typical_wait_max: Number(row.typical_wait_max || 0),
          signal_score: Number(row.signal_score || 0),
          created_by: row.created_by || null,
          updated_by: row.updated_by || null
        }));
      if (!safeRows.length) return { count: 0 };
      const { data, error } = await this.client.from('signers').upsert(safeRows, { onConflict: 'id' }).select();
      if (error) throw error;
      return { count: data.length };
    },
    async moderate(table, id, status, reason) {
      const { data: userData } = await this.client.auth.getUser();
      if (!userData.user) return { authorized: false };
      const { error } = await this.client.from(table).update(
        table === 'signers'
          ? { record_status: status, updated_by: userData.user.id }
          : { moderation_status: status, reviewed_by: userData.user.id, reviewed_at: new Date().toISOString() }
      ).eq('id', id);
      if (error) throw error;
      const { error: actionError } = await this.client.from('moderation_actions').insert({
        target_table: table,
        target_id: id,
        actor_id: userData.user.id,
        decision: status === 'published' ? 'approve' : 'reject',
        reason
      });
      if (actionError) throw actionError;
      return { authorized: true };
    }
  };
}());
