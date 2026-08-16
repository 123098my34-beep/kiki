-- Enable Row-Level Security (RLS) on all multi-tenant tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_reports ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies based on PostgreSQL session variable 'app.current_tenant_id'
CREATE POLICY tenant_isolation_clients ON clients
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

CREATE POLICY tenant_isolation_integrations ON integrations
    FOR ALL
    USING (client_id IN (
        SELECT id FROM clients WHERE org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    ));

CREATE POLICY tenant_isolation_reports ON client_reports
    FOR ALL
    USING (client_id IN (
        SELECT id FROM clients WHERE org_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    ));
