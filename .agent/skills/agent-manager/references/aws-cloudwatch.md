# Amazon CloudWatch: Observability Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and operating observability layers using Amazon CloudWatch.

## 1. Core Concepts
Amazon CloudWatch provides a complete view of your resources and applications, helping you detect anomalous behavior, set alarms, and troubleshoot performance issues.
- **Metrics**: Numerical time-series data representing resource performance (e.g., `CPUUtilization`, `RequestCount`).
- **Logs**: Centralized storage for application and system logs organized by **Log Groups** and **Log Streams**.
- **Alarms**: Watch a single metric and perform one or more actions (e.g., send SNS notification, trigger Auto Scaling) based on a threshold.
- **Dashboards**: Custom, unified views of your infrastructure and application health.

## 2. Advanced Observability
- **CloudWatch Logs Insights**: A purpose-built query language for searching and analyzing log data at scale. Supports field extraction and visualization.
- **Embedded Metric Format (EMF)**: A JSON specification for pushing custom metrics directly into log streams. CloudWatch automatically extracts these as metrics, providing high-throughput, low-cost metric ingestion.
- **CloudWatch Container Insights**: Specialized monitoring for containerized workloads (EKS, ECS, Fargate).
- **CloudWatch Application Insights**: Automated monitoring for applications across EC2, Lambda, and RDS.

## 3. Query & Analysis (Logs Insights Sample)
```sql
# Find top 20 sources of 4XX errors
fields @timestamp, @message
| filter status >= 400 and status < 500
| stats count(*) as errorCount by source
| sort errorCount desc
| limit 20
```

## 4. Automation & Alerting
- **Metric Filters**: Extracts metric data from log groups based on specified patterns.
- **Composite Alarms**: Combine multiple alarms into a single alarm that triggers only when all (or some) conditions are met, reducing alarm fatigue.
- **Anomaly Detection**: Uses machine learning to continuously analyze metric data and identify abnormal patterns.

## 5. Implementation Workflow (AWS SDK for JavaScript)
```typescript
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const client = new CloudWatchClient({ region: "us-east-1" });

// Push a custom metric
const command = new PutMetricDataCommand({
  Namespace: "CustomApp/Metrics",
  MetricData: [
    {
      MetricName: "OrderCount",
      Value: 1,
      Unit: "Count",
      Dimensions: [{ Name: "Environment", Value: "Production" }]
    }
  ]
});

await client.send(command);
```

## 6. Safe Practice Protocol
- **Log Retention**: Always set explicit retention policies for log groups to control costs (e.g., 14 days for Dev, 90 days for Prod).
- **Standard Namespaces**: Use clear, consistent namespaces for custom metrics (e.g., `AppName/Environment`).
- **High-Resolution Metrics**: Use high-resolution metrics (1-second granularity) only for critical operations where sub-minute detection is required.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
