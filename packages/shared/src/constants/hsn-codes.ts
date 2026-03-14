/**
 * Common HSN (Harmonized System of Nomenclature) codes for goods
 * and SAC (Services Accounting Codes) for services used by Indian businesses.
 */

export interface HsnCode {
  code: string;
  description: string;
  gst_rate: number;
  type: 'goods' | 'services';
}

/**
 * Frequently used HSN codes for goods.
 */
export const COMMON_HSN_CODES: HsnCode[] = [
  // Food & Beverages
  { code: '0401', description: 'Milk and cream', gst_rate: 0, type: 'goods' },
  { code: '0713', description: 'Dried leguminous vegetables (dal)', gst_rate: 0, type: 'goods' },
  { code: '1001', description: 'Wheat and meslin', gst_rate: 0, type: 'goods' },
  { code: '1006', description: 'Rice', gst_rate: 5, type: 'goods' },
  { code: '1101', description: 'Wheat or meslin flour (atta)', gst_rate: 0, type: 'goods' },
  { code: '1905', description: 'Bread, biscuits, cakes', gst_rate: 18, type: 'goods' },
  { code: '2106', description: 'Food preparations (namkeen, etc.)', gst_rate: 12, type: 'goods' },
  { code: '2202', description: 'Aerated water, beverages', gst_rate: 28, type: 'goods' },

  // Textiles & Garments
  { code: '5208', description: 'Woven cotton fabrics', gst_rate: 5, type: 'goods' },
  { code: '6109', description: 'T-shirts, vests (knitted)', gst_rate: 5, type: 'goods' },
  { code: '6203', description: "Men's suits, trousers", gst_rate: 12, type: 'goods' },
  { code: '6204', description: "Women's suits, dresses", gst_rate: 12, type: 'goods' },

  // Electronics & Electrical
  { code: '8471', description: 'Computers, laptops', gst_rate: 18, type: 'goods' },
  { code: '8517', description: 'Mobile phones', gst_rate: 12, type: 'goods' },
  { code: '8528', description: 'Monitors, televisions', gst_rate: 18, type: 'goods' },
  { code: '8443', description: 'Printers, scanners', gst_rate: 18, type: 'goods' },

  // Hardware & Building
  { code: '7308', description: 'Iron/steel structures', gst_rate: 18, type: 'goods' },
  { code: '7318', description: 'Screws, bolts, nuts', gst_rate: 18, type: 'goods' },
  { code: '6907', description: 'Ceramic tiles', gst_rate: 18, type: 'goods' },
  { code: '2523', description: 'Portland cement', gst_rate: 28, type: 'goods' },

  // Paper & Stationery
  { code: '4802', description: 'Paper, writing paper', gst_rate: 12, type: 'goods' },
  { code: '4820', description: 'Registers, notebooks', gst_rate: 12, type: 'goods' },
  { code: '9608', description: 'Pens, pencils', gst_rate: 18, type: 'goods' },

  // Furniture
  { code: '9401', description: 'Seats, chairs', gst_rate: 18, type: 'goods' },
  { code: '9403', description: 'Furniture (office, bedroom)', gst_rate: 18, type: 'goods' },

  // Automobiles & Parts
  { code: '8703', description: 'Motor cars, vehicles', gst_rate: 28, type: 'goods' },
  { code: '4011', description: 'Rubber tyres', gst_rate: 28, type: 'goods' },
  { code: '8708', description: 'Vehicle parts & accessories', gst_rate: 28, type: 'goods' },

  // Pharma & Health
  { code: '3004', description: 'Medicaments (medicines)', gst_rate: 12, type: 'goods' },
  { code: '3005', description: 'Bandages, first aid', gst_rate: 12, type: 'goods' },
  { code: '3306', description: 'Oral hygiene products', gst_rate: 18, type: 'goods' },

  // Packaging
  { code: '3923', description: 'Plastic containers, packaging', gst_rate: 18, type: 'goods' },
  { code: '4819', description: 'Cartons, boxes (paper)', gst_rate: 18, type: 'goods' },
];

/**
 * Commonly used SAC (Services Accounting Codes).
 */
export const COMMON_SAC_CODES: HsnCode[] = [
  // IT & Software
  { code: '998314', description: 'IT design and development services', gst_rate: 18, type: 'services' },
  { code: '998315', description: 'Hosting and IT infrastructure', gst_rate: 18, type: 'services' },
  { code: '998316', description: 'IT infrastructure management', gst_rate: 18, type: 'services' },

  // Professional Services
  { code: '998211', description: 'Legal advisory and representation', gst_rate: 18, type: 'services' },
  { code: '998221', description: 'Auditing services', gst_rate: 18, type: 'services' },
  { code: '998222', description: 'Accounting and bookkeeping', gst_rate: 18, type: 'services' },
  { code: '998231', description: 'Management consulting', gst_rate: 18, type: 'services' },

  // Construction & Real Estate
  { code: '995411', description: 'Construction of buildings', gst_rate: 12, type: 'services' },
  { code: '995421', description: 'General construction of roads', gst_rate: 12, type: 'services' },
  { code: '997212', description: 'Rental of residential property', gst_rate: 0, type: 'services' },
  { code: '997213', description: 'Rental of commercial property', gst_rate: 18, type: 'services' },

  // Transport & Logistics
  { code: '996511', description: 'Road transport of goods', gst_rate: 5, type: 'services' },
  { code: '996521', description: 'Railway transport of goods', gst_rate: 5, type: 'services' },
  { code: '996601', description: 'Cargo handling services', gst_rate: 18, type: 'services' },

  // Education & Training
  { code: '999210', description: 'Primary education', gst_rate: 0, type: 'services' },
  { code: '999293', description: 'Commercial training & coaching', gst_rate: 18, type: 'services' },

  // Healthcare
  { code: '999311', description: 'Hospital services', gst_rate: 0, type: 'services' },
  { code: '999312', description: 'Medical & dental services', gst_rate: 0, type: 'services' },

  // Financial Services
  { code: '997111', description: 'Financial intermediation (banking)', gst_rate: 18, type: 'services' },
  { code: '997113', description: 'Insurance services', gst_rate: 18, type: 'services' },

  // Advertising & Marketing
  { code: '998361', description: 'Advertising services', gst_rate: 18, type: 'services' },
  { code: '998365', description: 'Trade show and exhibition', gst_rate: 18, type: 'services' },

  // Maintenance & Repair
  { code: '998714', description: 'Maintenance of machinery', gst_rate: 18, type: 'services' },
  { code: '998716', description: 'Repair of computers', gst_rate: 18, type: 'services' },
];

/**
 * All HSN + SAC codes combined.
 */
export const ALL_HSN_SAC_CODES = [...COMMON_HSN_CODES, ...COMMON_SAC_CODES];

/**
 * Search HSN/SAC codes by code or description.
 */
export function searchHsnCodes(query: string): HsnCode[] {
  const lowerQuery = query.toLowerCase();
  return ALL_HSN_SAC_CODES.filter(
    (item) =>
      item.code.includes(query) ||
      item.description.toLowerCase().includes(lowerQuery),
  );
}
