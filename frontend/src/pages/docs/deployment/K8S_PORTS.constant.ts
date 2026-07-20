// NodePort assignments for the Kubernetes deployment
export const K8S_PORTS = [
  { service: 'frontend',    nodePort: '30080', description: 'React SPA' },
  { service: 'backend',     nodePort: '30800', description: 'FastAPI core' },
  { service: 'spin-docs',   nodePort: '30001', description: 'Architecture diagrams + dev docs (system role)' },
]
