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
