*** Settings ***
Documentation    API Tests: Verifies that refunds and Recharge subscription renewals are deducted from ESP gross claims.
Resource         ../../resources/api_keywords.resource

*** Test Cases ***
Isolate Subscription Rebill From True Retention Net
    [Documentation]    Ensures that $35k in Recharge rebills are not falsely claimed as email marketing conversions.
    [Tags]             api    reconciliation    critical
    ${math}=           Verify True Margin Math    gross=100000.0    refunds=5000.0    sub_rebills=35000.0    shopify_net=110000.0
    Should Be Equal As Numbers    ${math['true_net_retention']}    60000.0
    Should Be Equal As Numbers    ${math['discrepancy']}           40000.0
    Should Be Equal As Numbers    ${math['net_margin']}             54.5
