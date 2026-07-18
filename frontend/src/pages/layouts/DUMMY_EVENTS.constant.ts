// Sample YOLO detection events used by the Anoma Scan layout demo
export const DUMMY_EVENTS = [
  { ts: '0:04', labels: ['person', 'bag'],    conf: [{ l: 'person', p: 94 }, { l: 'bag', p: 81 }] }, // person carrying a bag detected at 4 s
  { ts: '0:11', labels: ['car', 'truck'],     conf: [{ l: 'car', p: 97 }, { l: 'truck', p: 72 }] }, // vehicle pair detected at 11 s
  { ts: '0:23', labels: ['bicycle'],          conf: [{ l: 'bicycle', p: 88 }] },                     // lone bicycle detected at 23 s
]
