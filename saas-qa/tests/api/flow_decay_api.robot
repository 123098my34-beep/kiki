*** Settings ***
Documentation    Flow Decay Detection: Verifies Z-score calculations flag decaying automations (Z < -1.8).
Resource         ../../resources/common.resource

*** Test Cases ***
Detect Automation Decay When RPR Drops Below Normal Bounds
    [Documentation]    Verifies that an automation dropping from $0.85 to $0.50 RPR triggers a high-priority alert.
    [Tags]             api    analytics    anomaly-detection
    ${eval}=           Verify Flow Decay Z Score    current_rpr=0.50    historical_rpr=0.85    std_dev=0.15
    Should Be Equal As Numbers    ${eval['z_score']}    -2.33
    Should Be True                ${eval['decay_detected']}
