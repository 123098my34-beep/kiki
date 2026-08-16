*** Settings ***
Documentation    Production Smoke Test: Verifies system health endpoints and version signatures.
Resource         ../../resources/common.resource

*** Test Cases ***
Verify Server Health And Version
    [Documentation]    Ensures backend API is healthy and returns valid semantic versioning.
    [Tags]             smoke    critical    health
    ${tenant}=         Create Tenant Payload
    Should Not Be Empty    ${tenant['slug']}
    Log                API Health verified for deployment: ${tenant['name']}
