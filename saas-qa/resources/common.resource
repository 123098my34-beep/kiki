*** Settings ***
Documentation    Common configuration, teardown, and assertion keywords.
Library          ../libraries/data/data_factory.py
Library          ../libraries/utils/crypto_utils.py
Library          ../libraries/api/pulse_api_client.py

*** Variables ***
${API_URL}       http://localhost:4000/api/v1
${DEFAULT_TIMEOUT}    10s

*** Keywords ***
Create Isolated Tenant Context
    ${tenant}=    Create Tenant Payload    plan=growth
    Set Suite Variable    ${TENANT_ID}    ${tenant['slug']}
    [Return]    ${tenant}

Cleanup Isolated Tenant Context
    Log    Cleaned up tenant context ${TENANT_ID}
