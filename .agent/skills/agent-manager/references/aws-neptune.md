# Amazon Neptune: Graph Database Technical Reference

This document serves as the authoritative "Documents-Only" source for architecting and operating graph database layers using Amazon Neptune.

## 1. Graph Models & Languages
Amazon Neptune is a purpose-built, high-performance graph database engine.
- **Property Graph (LPG)**: Best for modeling data with nodes (entities) and edges (relationships) that have properties.
  - **openCypher**: Declarative query language (SQL-like) for graphs.
  - **Gremlin**: Imperative traversal language (Apache TinkerPop).
- **RDF (Resource Description Framework)**: Best for modeling metadata and complex knowledge graphs using "triples" (Subject, Predicate, Object).
  - **SPARQL**: Standard query language for RDF graphs.

## 2. Architecture & Deployment
- **Neptune Database (Provisioned/Serverless)**: Storage-first architecture. 
  - **Serverless**: Automatically scales NCUs (Neptune Capacity Units) from 0.5 to 128. Ideal for unpredictable workloads.
  - **Durability**: Data is durably stored across 3 Availability Zones.
- **Neptune Analytics**: An analytics-first, in-memory graph engine for large-scale analysis (e.g., shortest path, centrality, community detection) on billions of relationships in seconds.

## 3. Visualization & Development Tools
- **Graph Notebooks**: Managed Jupyter notebooks in Neptune Workbench for interactive querying and data loading.
- **Graph Explorer**: An open-source, low-code tool for visual graph browsing and interactive relationship discovery.

## 4. Implementation Workflow (Gremlin - Node.js)
```javascript
const gremlin = require('gremlin');
const DriverRemoteConnection = gremlin.driver.DriverRemoteConnection;
const Graph = gremlin.structure.Graph;

const dc = new DriverRemoteConnection('wss://your-neptune-endpoint:8182/gremlin', {});
const graph = new Graph();
const g = graph.traversal().withRemote(dc);

async function findConnections() {
  const result = await g.V().hasLabel('Person').has('name', 'John').out('knows').values('name').toList();
  console.log('John knows:', result);
  await dc.close();
}
```

## 5. Safe Practice Protocol
- **Serverless-First**: Favor **Neptune Serverless** for new or unpredictable workloads to optimize cost and eliminate provisioning overhead.
- **Endpoint Awareness**: Use the **Cluster Endpoint** for writes and the **Reader Endpoint** for read operations to maximize scalability.
- **Security**: Always use **IAM Database Authentication** and VPC-only access. In-transit encryption (TLS) is mandatory.
- **Performance**: Use **Neptune Analytics** specifically for complex algorithm execution (e.g., PageRank, Community Detection) rather than standard OLTP lookups.
- **Region Specificity**: All architectural recommendations are centered on `us-east-1`.
