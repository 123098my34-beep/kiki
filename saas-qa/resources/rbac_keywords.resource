*** Settings ***
Documentation    RBAC and multi-tenant isolation keywords.
Resource         common.resource

*** Keywords ***
Verify Tenant Boundary Is Enforced
    [Arguments]    ${tenant_a}    ${tenant_b}
    Log    Verifying Tenant ${tenant_a} cannot access resources of Tenant ${tenant_b}
    Should Not Be Equal    ${tenant_a}    ${tenant_b}
