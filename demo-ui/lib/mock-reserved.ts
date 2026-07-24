export type ReservedNumber = {
  number: string;   // fictional +1555… placeholder
  tracking: string;
  carrier: string;
  eta: string;
};

// Mock reserved Proxy-pool numbers. NOT real numbers — fictional +1555…
// placeholders, per the repo's no-real-numbers rule. The tracking metadata is
// invented to give the "parcel slip" look something to render.
export const MOCK_RESERVED: ReservedNumber[] = [
  { number: '+15557001001', tracking: 'TWL-4471-AX', carrier: 'ProxyPost', eta: '2 min' },
  { number: '+15557001002', tracking: 'TWL-5582-BK', carrier: 'ProxyPost', eta: '5 min' },
  { number: '+15557001003', tracking: 'TWL-6693-CM', carrier: 'SwiftRoute', eta: '1 min' },
  { number: '+15557001004', tracking: 'TWL-7704-DN', carrier: 'SwiftRoute', eta: '8 min' },
];
