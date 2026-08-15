CREATE DATABASE IF NOT EXISTS pulse_analytics;

USE pulse_analytics;

CREATE TABLE IF NOT EXISTS events (
    tenant_id UUID,
    client_id UUID,
    event_id String,
    event_time DateTime64(3, 'UTC'),
    event_type LowCardinality(String),
    customer_id String,
    customer_email String,
    channel LowCardinality(String),
    campaign_id LowCardinality(String),
    flow_id LowCardinality(String),
    gross_revenue Decimal(12, 2) DEFAULT 0,
    net_revenue Decimal(12, 2) DEFAULT 0,
    refund_amount Decimal(12, 2) DEFAULT 0,
    is_subscription UInt8 DEFAULT 0,
    properties String,
    created_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMM(event_time)
ORDER BY (tenant_id, client_id, event_type, event_time, customer_id, event_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_channel_performance_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (tenant_id, client_id, channel, campaign_id, flow_id, date)
AS SELECT
    tenant_id,
    client_id,
    channel,
    campaign_id,
    flow_id,
    toDate(event_time) AS date,
    countIf(event_type IN ('received_email', 'sms_sent')) AS sends,
    countIf(event_type = 'opened_email') AS opens,
    countIf(event_type IN ('clicked_email', 'sms_clicked')) AS clicks,
    countIf(event_type = 'placed_order') AS conversions,
    sum(gross_revenue) AS total_gross_revenue,
    sum(net_revenue) AS total_net_revenue,
    sum(refund_amount) AS total_refunds,
    sumIf(net_revenue, is_subscription = 1) AS subscription_revenue,
    sumIf(net_revenue, is_subscription = 0) AS one_time_revenue
FROM events
GROUP BY tenant_id, client_id, channel, campaign_id, flow_id, date;
