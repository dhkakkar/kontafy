export interface Product {
  id: string;
  org_id: string;
  sku: string | null;
  name: string;
  description: string | null;
  type: ProductType;
  hsn_code: string | null;
  unit: string;
  purchase_price: number | null;
  selling_price: number | null;
  tax_rate: number | null;
  track_inventory: boolean;
  reorder_level: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
}

export type ProductType = 'goods' | 'services';

export interface StockMovement {
  id: string;
  org_id: string;
  product_id: string;
  warehouse_id: string;
  type: StockMovementType;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  batch_number: string | null;
  serial_number: string | null;
  cost_price: number | null;
  notes: string | null;
  created_at: Date;
}

export type StockMovementType = 'purchase' | 'sale' | 'return' | 'adjustment' | 'transfer';

export interface StockLevel {
  id: string;
  org_id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reserved: number;
  available: number;
  updated_at: Date;
}

export interface Warehouse {
  id: string;
  org_id: string;
  name: string;
  address: Record<string, any> | null;
  is_default: boolean;
}
