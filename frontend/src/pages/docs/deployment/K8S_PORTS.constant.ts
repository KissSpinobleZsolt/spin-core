// NodePort assignments for the Kubernetes deployment
export const K8S_PORTS = [
  { service: 'frontend',    nodePort: '30080', description: 'React SPA' },
  { service: 'backend',     nodePort: '30800', description: 'FastAPI core' },
  { service: 'hello-world', nodePort: '30001', description: 'Reference MF remote' },
]
