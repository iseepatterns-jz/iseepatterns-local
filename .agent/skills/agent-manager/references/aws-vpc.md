# Amazon VPC: Virtual Networking Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and managing virtual networks using Amazon VPC.

## 1. Core Concepts
Amazon Virtual Private Cloud (Amazon VPC) allows you to provision a logically isolated section of the AWS Cloud where you can launch AWS resources in a virtual network that you define.
- **VPC**: A virtual network defined by an IPv4 CIDR block.
- **Subnets**: Segments of a VPC's IP address range residing in a single Availability Zone.
    - **Public Subnet**: Includes a route to an Internet Gateway (IGW).
    - **Private Subnet**: No direct route to the internet; typically uses a NAT Gateway for outbound traffic.
- **Route Tables**: Rules that determine where network traffic from your subnet or gateway is directed.

## 2. Gateways & Connectivity
- **Internet Gateway (IGW)**: Enables communication between public subnets and the internet.
- **NAT Gateway**: Allows instances in private subnets to initiate outbound internet connections while blocking unsolicited inbound traffic.
- **VPC Endpoints (PrivateLink)**: Allow private connections between your VPC and other AWS services without using the internet.
- **Transit Gateway**: A central hub to route traffic between VPCs, VPNs, and Direct Connect.
- **VPC Peering**: Connects two VPCs to route traffic between them using private IP addresses.

## 3. Security Tiers
### Security Groups (Instance Level)
- **Stateful**: If you send a request, the response is allowed regardless of inbound rules.
- **Rules**: Support **Allow** rules only.
- **Scope**: Applied at the Network Interface (instance) level.

### Network ACLs (Subnet Level)
- **Stateless**: Inbound and outbound traffic must be explicitly allowed.
- **Rules**: Support both **Allow** and **Deny** rules.
- **Scope**: Applied at the subnet level as a second layer of defense.

## 4. IP Addressing
- **IPv4**: VPCs use private CIDR blocks (e.g., 10.0.0.0/16).
- **Public IP**: Assigned to instances in public subnets for internet access.
- **Elastic IP (EIP)**: Persistent, static public IP address for your account.
- **IPv6**: Optional support for IPv6 addressing.

## 5. Implementation Workflow (AWS SDK)
```typescript
import { EC2Client, CreateVpcCommand, CreateSubnetCommand } from "@aws-sdk/client-ec2";

const client = new EC2Client({ region: "us-east-1" });

// Create VPC
const vpcCommand = new CreateVpcCommand({
  CidrBlock: "10.0.0.0/16"
});
const { Vpc } = await client.send(vpcCommand);

// Create Subnet
const subnetCommand = new CreateSubnetCommand({
  VpcId: Vpc?.VpcId,
  CidrBlock: "10.0.1.0/24",
  AvailabilityZone: "us-east-1a"
});
await client.send(subnetCommand);
```

## 6. Safe Practice Protocol
- **Principle of Least Privilege**: Use Security Groups as the primary security layer; NACLs as a secondary "coarse-grained" filter.
- **High Availability**: Deploy subnets in multiple Availability Zones.
- **Avoid Overlapping CIDRs**: Ensure VPC CIDR blocks do not overlap with on-premises or peered networks.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
