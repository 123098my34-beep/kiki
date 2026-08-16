*** Settings ***
Documentation    Security & RBAC: Verifies strict tenant boundaries and prevents cross-tenant data bleed.
Resource         ../../resources/rbac_keywords.resource

*** Test Cases ***
Prevent Cross-Tenant Data Access
    [Documentation]    Verifies Tenant A cannot access Tenant B store records.
    [Tags]             security    rbac    p0
    ${tenant_a}=       Create Tenant Payload
    ${tenant_b}=       Create Tenant Payload
    Verify Tenant Boundary Is Enforced    ${tenant_a['slug']}    ${tenant_b['slug']}
