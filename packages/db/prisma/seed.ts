import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default Indian Chart of Accounts — seeded for every new organization.
 * Follows standard Indian accounting conventions.
 */
const DEFAULT_CHART_OF_ACCOUNTS = [
  // ── Assets ──
  { code: '1000', name: 'Assets', type: 'asset', sub_type: null, parent_code: null },
  { code: '1100', name: 'Current Assets', type: 'asset', sub_type: 'current_asset', parent_code: '1000' },
  { code: '1101', name: 'Cash in Hand', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1102', name: 'Bank Accounts', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1103', name: 'Accounts Receivable', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1104', name: 'Inventory', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1105', name: 'GST Input Credit (CGST)', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1106', name: 'GST Input Credit (SGST)', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1107', name: 'GST Input Credit (IGST)', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1108', name: 'TDS Receivable', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1109', name: 'Prepaid Expenses', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1110', name: 'Advance to Suppliers', type: 'asset', sub_type: 'current_asset', parent_code: '1100' },
  { code: '1200', name: 'Fixed Assets', type: 'asset', sub_type: 'fixed_asset', parent_code: '1000' },
  { code: '1201', name: 'Furniture & Fixtures', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200' },
  { code: '1202', name: 'Computer & Equipment', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200' },
  { code: '1203', name: 'Vehicle', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200' },
  { code: '1204', name: 'Land & Building', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200' },
  { code: '1205', name: 'Plant & Machinery', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200' },
  { code: '1210', name: 'Accumulated Depreciation', type: 'asset', sub_type: 'fixed_asset', parent_code: '1200' },

  // ── Liabilities ──
  { code: '2000', name: 'Liabilities', type: 'liability', sub_type: null, parent_code: null },
  { code: '2100', name: 'Current Liabilities', type: 'liability', sub_type: 'current_liability', parent_code: '2000' },
  { code: '2101', name: 'Accounts Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100' },
  { code: '2102', name: 'GST Payable (CGST)', type: 'liability', sub_type: 'current_liability', parent_code: '2100' },
  { code: '2103', name: 'GST Payable (SGST)', type: 'liability', sub_type: 'current_liability', parent_code: '2100' },
  { code: '2104', name: 'GST Payable (IGST)', type: 'liability', sub_type: 'current_liability', parent_code: '2100' },
  { code: '2105', name: 'TDS Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100' },
  { code: '2106', name: 'Salary Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100' },
  { code: '2107', name: 'Advance from Customers', type: 'liability', sub_type: 'current_liability', parent_code: '2100' },
  { code: '2108', name: 'Statutory Dues Payable', type: 'liability', sub_type: 'current_liability', parent_code: '2100' },
  { code: '2200', name: 'Long-Term Liabilities', type: 'liability', sub_type: 'long_term_liability', parent_code: '2000' },
  { code: '2201', name: 'Loan from Bank', type: 'liability', sub_type: 'long_term_liability', parent_code: '2200' },
  { code: '2202', name: 'Unsecured Loan', type: 'liability', sub_type: 'long_term_liability', parent_code: '2200' },

  // ── Equity ──
  { code: '3000', name: 'Equity', type: 'equity', sub_type: null, parent_code: null },
  { code: '3001', name: "Owner's Capital", type: 'equity', sub_type: 'capital', parent_code: '3000' },
  { code: '3002', name: "Owner's Drawings", type: 'equity', sub_type: 'drawings', parent_code: '3000' },
  { code: '3003', name: 'Retained Earnings', type: 'equity', sub_type: 'retained_earnings', parent_code: '3000' },
  { code: '3004', name: 'Share Capital', type: 'equity', sub_type: 'capital', parent_code: '3000' },

  // ── Income ──
  { code: '4000', name: 'Income', type: 'income', sub_type: null, parent_code: null },
  { code: '4001', name: 'Sales Revenue', type: 'income', sub_type: 'operating', parent_code: '4000' },
  { code: '4002', name: 'Service Revenue', type: 'income', sub_type: 'operating', parent_code: '4000' },
  { code: '4003', name: 'Interest Income', type: 'income', sub_type: 'other_income', parent_code: '4000' },
  { code: '4004', name: 'Discount Received', type: 'income', sub_type: 'other_income', parent_code: '4000' },
  { code: '4005', name: 'Commission Income', type: 'income', sub_type: 'other_income', parent_code: '4000' },
  { code: '4006', name: 'Rental Income', type: 'income', sub_type: 'other_income', parent_code: '4000' },
  { code: '4007', name: 'Other Income', type: 'income', sub_type: 'other_income', parent_code: '4000' },
  { code: '4010', name: 'Sales Returns', type: 'income', sub_type: 'contra', parent_code: '4000' },

  // ── Expenses ──
  { code: '5000', name: 'Expenses', type: 'expense', sub_type: null, parent_code: null },
  { code: '5001', name: 'Cost of Goods Sold', type: 'expense', sub_type: 'cogs', parent_code: '5000' },
  { code: '5002', name: 'Purchase Returns', type: 'expense', sub_type: 'contra', parent_code: '5000' },
  { code: '5100', name: 'Operating Expenses', type: 'expense', sub_type: 'operating', parent_code: '5000' },
  { code: '5101', name: 'Rent Expense', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5102', name: 'Salary & Wages', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5103', name: 'Electricity & Utilities', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5104', name: 'Telephone & Internet', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5105', name: 'Office Supplies', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5106', name: 'Travel & Conveyance', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5107', name: 'Professional Fees', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5108', name: 'Depreciation Expense', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5109', name: 'Bank Charges', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5110', name: 'Insurance', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5111', name: 'Discount Allowed', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5112', name: 'Advertising & Marketing', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5113', name: 'Repair & Maintenance', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5114', name: 'Printing & Stationery', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5115', name: 'Miscellaneous Expense', type: 'expense', sub_type: 'operating', parent_code: '5100' },
  { code: '5200', name: 'Interest Expense', type: 'expense', sub_type: 'finance', parent_code: '5000' },
  { code: '5201', name: 'Bank Interest', type: 'expense', sub_type: 'finance', parent_code: '5200' },
  { code: '5202', name: 'Loan Interest', type: 'expense', sub_type: 'finance', parent_code: '5200' },
];

/**
 * Common HSN codes frequently used by Indian businesses.
 */
const COMMON_HSN_CODES = [
  { code: '0401', description: 'Milk and cream', gst_rate: 0 },
  { code: '1001', description: 'Wheat and meslin', gst_rate: 0 },
  { code: '1006', description: 'Rice', gst_rate: 5 },
  { code: '1905', description: 'Bread, biscuits, cakes', gst_rate: 18 },
  { code: '2202', description: 'Aerated water, beverages', gst_rate: 28 },
  { code: '5208', description: 'Woven cotton fabrics', gst_rate: 5 },
  { code: '6109', description: 'T-shirts, vests', gst_rate: 5 },
  { code: '8471', description: 'Computers, laptops', gst_rate: 18 },
  { code: '8517', description: 'Mobile phones', gst_rate: 12 },
  { code: '8528', description: 'Monitors, televisions', gst_rate: 18 },
  { code: '9401', description: 'Seats, chairs', gst_rate: 18 },
  { code: '9403', description: 'Furniture', gst_rate: 18 },
  { code: '3004', description: 'Medicaments (medicines)', gst_rate: 12 },
  { code: '998314', description: 'IT design & development', gst_rate: 18 },
  { code: '998222', description: 'Accounting & bookkeeping', gst_rate: 18 },
  { code: '997213', description: 'Commercial property rental', gst_rate: 18 },
  { code: '996511', description: 'Road transport of goods', gst_rate: 5 },
];

async function main() {
  console.log('Seeding database...');

  // Seed is designed to work with an existing organization.
  // When creating a new org via the API, the default chart of accounts
  // is created automatically by OrganizationService.create().

  // For development: create a demo organization if none exists
  const existingOrg = await prisma.organization.findFirst();

  if (!existingOrg) {
    console.log('No organizations found. Creating demo organization...');

    const demoOrg = await prisma.organization.create({
      data: {
        name: 'Demo Business',
        legal_name: 'Demo Business Pvt Ltd',
        gstin: '06AALCA0517J1Z2',
        pan: 'AALCA0517J',
        business_type: 'pvt_ltd',
        industry: 'services',
        address: {
          line1: '123, Main Market',
          city: 'Yamunanagar',
          state: 'Haryana',
          state_code: '06',
          pincode: '135001',
          country: 'India',
        },
        phone: '+919876543210',
        email: 'demo@kontafy.in',
        fiscal_year_start: 4,
        currency: 'INR',
        plan: 'gold',
        settings: {
          invoice_prefix: 'KTF',
          decimal_places: 2,
          date_format: 'DD/MM/YYYY',
        },
      },
    });

    console.log(`Created demo org: ${demoOrg.id}`);

    // Create chart of accounts for demo org
    const codeToId: Record<string, string> = {};

    for (const account of DEFAULT_CHART_OF_ACCOUNTS) {
      const parentId = account.parent_code ? codeToId[account.parent_code] : null;

      const created = await prisma.account.create({
        data: {
          org_id: demoOrg.id,
          code: account.code,
          name: account.name,
          type: account.type,
          sub_type: account.sub_type,
          parent_id: parentId,
          is_system: true,
          is_active: true,
          opening_balance: 0,
        },
      });

      codeToId[account.code] = created.id;
    }

    console.log(`Created ${DEFAULT_CHART_OF_ACCOUNTS.length} accounts for demo org`);

    // Create sample contacts
    const customer = await prisma.contact.create({
      data: {
        org_id: demoOrg.id,
        type: 'customer',
        name: 'Rajesh Kumar',
        company_name: 'Kumar Traders',
        gstin: '06AABCT1332L1ZK',
        email: 'rajesh@kumartraders.com',
        phone: '+919812345678',
        billing_address: {
          line1: '45, Industrial Area',
          city: 'Ambala',
          state: 'Haryana',
          state_code: '06',
          pincode: '134003',
        },
        payment_terms: 30,
        is_active: true,
      },
    });

    const vendor = await prisma.contact.create({
      data: {
        org_id: demoOrg.id,
        type: 'vendor',
        name: 'Priya Enterprises',
        company_name: 'Priya Enterprises LLP',
        gstin: '07AADCP1234E1Z5',
        email: 'accounts@priyaenterprises.in',
        phone: '+919998887777',
        billing_address: {
          line1: '12, Nehru Place',
          city: 'New Delhi',
          state: 'Delhi',
          state_code: '07',
          pincode: '110019',
        },
        payment_terms: 15,
        is_active: true,
      },
    });

    console.log(`Created sample contacts: ${customer.name}, ${vendor.name}`);

    // Create a default warehouse
    await prisma.warehouse.create({
      data: {
        org_id: demoOrg.id,
        name: 'Main Warehouse',
        address: {
          line1: '123, Main Market',
          city: 'Yamunanagar',
          state: 'Haryana',
          pincode: '135001',
        },
        is_default: true,
      },
    });

    console.log('Created default warehouse');
  } else {
    console.log('Organizations already exist. Skipping seed.');
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
