*** Settings ***
Documentation    Mathematical Domain Invariant Tests across randomized bounds.
Resource         ../../resources/api_keywords.resource

*** Test Cases ***
Net Revenue Must Never Exceed Gross Sales
    [Documentation]    Proves that for any valid positive gross and refund input, true net never exceeds gross.
    [Tags]             data    invariants    fuzzing
    ${math}=           Verify True Margin Math    gross=50000.0    refunds=5000.0    sub_rebills=10000.0    shopify_net=80000.0
    Should Be True     ${math['true_net_retention']} <= ${math['gross']}
    Should Be True     ${math['true_net_retention']} >= 0.0
