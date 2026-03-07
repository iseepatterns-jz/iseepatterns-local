# Amazon Route 53: DNS & Traffic Management Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and operating DNS and global traffic management layers using Amazon Route 53.

## 1. Core DNS Concepts
Amazon Route 53 is a highly available and scalable Domain Name System (DNS) web service.
- **Hosted Zone**: A container for records that define how to route traffic for a domain (e.g., `example.com`).
  - **Public**: Accessible from the internet.
  - **Private**: Accessible only within specified VPCs.
- **Alias Records**: AWS-specific extension to DNS that allows routing traffic to AWS resources (ELB, S3, CloudFront) without incurring additional DNS query costs.

## 2. Routing Policies
| Policy | Use Case |
| :--- | :--- |
| **Simple** | Standard routing to a single resource. |
| **Weighted** | Distribute traffic based on ratios (e.g., 70/30). Ideal for A/B testing. |
| **Latency** | Route to the AWS region with the lowest network latency for the user. |
| **Failover** | Active-Passive configuration. Switch to secondary if primary is unhealthy. |
| **Geolocation** | Route based on the user's geographic location (Continent, Country). |
| **Geoproximity** | Route based on the distance between user and resource (supports "biasing"). |
| **IP-Based** | Route based on the user's source IP (CIDR). |
| **Multivalue** | Return up to 8 healthy records. Basic load balancing with health checks. |

## 3. Health Checks & Failover
- **Endpoint Monitoring**: Checks the health of an IP, domain, or another health check.
- **Calculated Health Checks**: Combines multiple health checks into one (e.g., unhealthy if >2 nodes fail).
- **DNS Failover**: Automatically updates DNS records to point to a standby resource when the primary fails.

## 4. Route 53 Resolver (Hybrid DNS)
- **Inbound Endpoints**: Allows on-premises DNS to resolved names in AWS Private Hosted Zones.
- **Outbound Endpoints**: Allows AWS resources to resolve names hosted on-premises.
- **Rules**: Forwarding rules (e.g., forward `corp.internal` to specific IPs).

## 5. Implementation Workflow (AWS SDK for JavaScript)
```typescript
import { Route53Client, ListResourceRecordSetsCommand } from "@aws-sdk/client-route-53";

const client = new Route53Client({ region: "us-east-1" });

const command = new ListResourceRecordSetsCommand({
  HostedZoneId: "Z1234567890ABC"
});

const response = await client.send(command);
console.log("Records:", response.ResourceRecordSets?.map(r => r.Name));
```

## 6. Safe Practice Protocol
- **Alias vs. CNAME**: Always favor **Alias Records** for AWS resources to save on DNS costs and ensure the records automatically update if the target's IP changes.
- **Health Check Association**: Never use Failover or Latency routing without associating a **Health Check**, or DNS will continue routing traffic to a dead endpoint.
- **TTL Sizing**: Use a lower TTL (e.g., 60s) for records that change frequently or are part of a failover strategy.
- **Hybrid Resolver**: Use **Outbound Endpoints** to eliminate the need for custom internal DNS forwarding EC2 instances.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
