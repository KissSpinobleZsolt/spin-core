// Sample data-source rows used by the Cloud Insight AI layout demo
export const DUMMY_SOURCES = [
  { id: 1, name: 'sales_q1_2025.csv',       type: 'CSV',  rows: 12480, size: '1.2 MB', status: 'ready'      as const, updated: '2 hours ago' }, // healthy CSV source
  { id: 2, name: 'customer_export.xlsx',    type: 'XLSX', rows: 4305,  size: '840 KB', status: 'ready'      as const, updated: 'Yesterday'   }, // healthy XLSX export
  { id: 3, name: 'product_catalog.json',    type: 'JSON', rows: 892,   size: '310 KB', status: 'processing' as const, updated: 'Just now'    }, // currently being ingested
  { id: 4, name: 'warehouse_inventory.csv', type: 'CSV',  rows: 0,     size: '2.1 MB', status: 'error'      as const, updated: '3 days ago'  }, // failed ingestion — row count zero
]
