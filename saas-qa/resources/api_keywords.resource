*** Settings ***
Documentation    Reusable keywords for API ingestion, reconciliation, and flow health.
Resource         common.resource

*** Keywords ***
Simulate Order Webhook With HMAC
    [Arguments]    ${gross}    ${is_subscription}    ${refund}
    ${payload}=    Create Shopify Order Payload    gross=${gross}    is_subscription=${is_subscription}    refund=${refund}
    ${hmac}=       Generate Shopify Hmac           ${payload}
    [Return]       ${payload}    ${hmac}

Verify True Margin Math
    [Arguments]    ${gross}    ${refunds}    ${sub_rebills}    ${shopify_net}
    ${res}=        Get Reconciliation Math    ${gross}    ${refunds}    ${sub_rebills}    ${shopify_net}
    [Return]       ${res}
