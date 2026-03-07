# AWS X-Ray: Distributed Tracing Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and implementing distributed tracing with AWS X-Ray.

## 1. Core Concepts
AWS X-Ray provides an end-to-end view of requests as they travel through your application, visualizing dependencies and pinpointing performance bottlenecks.

### A. The Trace Anatomy
| Component | Level | Description |
| :--- | :--- | :--- |
| **Segment** | High | A JSON representation of a request served by your application (host, request, response). |
| **Subsegment** | Granular | Details about downstream calls (AWS services, HTTP APIs, SQL) or custom internal blocks. |
| **Trace** | Global | A selection of segments that share a unique Trace ID, representing the entire request journey. |

### B. Enriching Traces
- **Annotations**: Key-value pairs (strings, numbers, booleans) that ARE indexed. Use for filtering/grouping in the console (e.g., `UserID`, `Environment`).
- **Metadata**: Complex key-value pairs (objects, lists) that are NOT indexed. Use for detailed debugging data that doesn't need to be searchable.

## 2. Sampling Rules (Cost & Volume Control)
Sampling allows you to control which requests are recorded to manage costs.
- **Reservoir**: A fixed number of requests to trace per second (ensures a baseline).
- **Fixed Rate**: The percentage of requests to sample after the reservoir is exhausted.
- **Hierarchy**: Rules are evaluated by priority; the first matching rule wins.

## 3. Implementation Patterns
- **Instrumentation**: The X-Ray SDK automatically records data for instrumented AWS clients and HTTP requests.
- **The X-Ray Daemon**: A small application that listens for UDP traffic (port 2000) and buffers/relays tracing data to the X-Ray API. Required for EC2, ECS, and EKS (Lambda handles this automatically).
- **Service Map**: A visual representation Generated from trace data showing dependencies, health, and latency.

## 4. Implementation Workflow (Python/Boto3 Example)
```python
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

# 1. Patch all supported libraries (boto3, requests, etc.)
patch_all()

# 2. Start a custom segment or subsegment
with xray_recorder.in_segment('ProcessingJob'):
    # Add an annotation for indexing
    xray_recorder.put_annotation('customer_id', '12345')
    
    # Add metadata for debugging
    xray_recorder.put_metadata('request_payload', {'data': '...'})
    
    # 3. Perform instrumented work...
    # (Boto3 calls will automatically generate subsegments)
```

## 5. Safe Practice Protocol
- **Annotations-First**: Always use Annotations for data you expect to filter by in CloudWatch/X-Ray insights.
- **Reservoir Baseline**: Set a non-zero reservoir (e.g., 1 req/sec) for critical paths to ensure you always have some visibility, even at low traffic.
- **Graceful Fail**: The X-Ray SDK is designed to fail-open; if the daemon or service is unavailable, your application should continue without error.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
