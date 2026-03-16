package com.kontafy.desktop.navigation

sealed class Screen(val route: String, val title: String) {
    data object Login : Screen("login", "Login")
    data object Register : Screen("register", "Register")
    data object Dashboard : Screen("dashboard", "Dashboard")
    data object InvoiceList : Screen("invoices", "Invoices")
    data class InvoiceDetail(val invoiceId: String) : Screen("invoice/$invoiceId", "Invoice")
    data object CreateInvoice : Screen("invoices/create", "New Invoice")
    data class EditInvoice(val invoiceId: String) : Screen("invoices/edit/$invoiceId", "Edit Invoice")
    data object CustomerList : Screen("customers", "Customers")
    data object VendorList : Screen("vendors", "Vendors")
    data class CustomerDetail(val customerId: String) : Screen("customer/$customerId", "Customer")
    data object CreateCustomer : Screen("customers/create", "New Customer")
    data object CreateVendor : Screen("vendors/create", "New Vendor")
    data class EditCustomer(val customerId: String) : Screen("customers/edit/$customerId", "Edit Customer")
    data object Settings : Screen("settings", "Settings")

    // Accounting
    data object ChartOfAccounts : Screen("chart-of-accounts", "Chart of Accounts")
    data object JournalEntries : Screen("journal-entries", "Journal Entries")
    data object CreateJournalEntry : Screen("create-journal-entry", "New Journal Entry")
    data class EditJournalEntry(val entryId: String) : Screen("journal-entries/edit/$entryId", "Edit Journal Entry")
    data class JournalEntryDetail(val entryId: String) : Screen("journal-entry/$entryId", "Journal Entry Detail")
    data class Ledger(val accountId: String? = null) : Screen("ledger/${accountId ?: ""}", "Account Ledger")
    data object TrialBalance : Screen("trial-balance", "Trial Balance")
    data object ProfitLoss : Screen("profit-loss", "Profit & Loss")
    data object BalanceSheet : Screen("balance-sheet", "Balance Sheet")
    data object CashFlow : Screen("cash-flow", "Cash Flow")
    data object ReportsHub : Screen("reports", "Reports")

    // GST / Tax
    data object GSTDashboard : Screen("gst-dashboard", "GST Dashboard")
    data object GSTCompute : Screen("gst-compute", "GST Computation")
    data object GSTR1 : Screen("gstr1", "GSTR-1")
    data object GSTR3B : Screen("gstr3b", "GSTR-3B")
    data object EWayBillList : Screen("eway-bills", "E-Way Bills")
    data object GenerateEWayBill : Screen("generate-eway-bill", "Generate E-Way Bill")
    data class EWayBillDetail(val ewayBillId: String) : Screen("eway-bill/$ewayBillId", "E-Way Bill Detail")
    data object TDS : Screen("tds", "TDS Management")

    // Banking
    data object BankAccounts : Screen("bank-accounts", "Bank Accounts")
    data class BankRegister(val bankId: String) : Screen("bank-register/$bankId", "Bank Register")
    data class BankReconciliation(val bankId: String) : Screen("bank-reconciliation/$bankId", "Bank Reconciliation")
    data object CreateBankAccount : Screen("create-bank-account", "Add Bank Account")

    // Payments
    data object Payments : Screen("payments", "Payments")
    data object RecordPayment : Screen("record-payment", "Record Payment")
    data class EditPayment(val paymentId: String) : Screen("payments/edit/$paymentId", "Edit Payment")

    // Inventory / Stock
    data object ProductList : Screen("products", "Products")
    data class CreateProduct(val editProductId: String? = null) : Screen(
        if (editProductId != null) "products/edit/$editProductId" else "create-product",
        if (editProductId != null) "Edit Product" else "New Product",
    )
    data class ProductDetail(val productId: String) : Screen("product/$productId", "Product")
    data object StockMovements : Screen("stock-movements", "Stock Movements")
    data object StockAdjustment : Screen("stock-adjustment", "Stock Adjustment")
    data object Warehouses : Screen("warehouses", "Warehouses")

    // Quotations & Purchase Orders
    data object QuotationList : Screen("quotations", "Quotations")
    data class QuotationDetail(val quotationId: String) : Screen("quotation/$quotationId", "Quotation")
    data object CreateQuotation : Screen("quotations/create", "New Quotation")
    data class EditQuotation(val quotationId: String) : Screen("quotations/edit/$quotationId", "Edit Quotation")
    data object PurchaseOrderList : Screen("purchase-orders", "Purchase Orders")
    data class PurchaseOrderDetail(val poId: String) : Screen("purchase-order/$poId", "Purchase Order")
    data object CreatePurchaseOrder : Screen("purchase-orders/create", "New Purchase Order")
    data class EditPurchaseOrder(val poId: String) : Screen("purchase-orders/edit/$poId", "Edit Purchase Order")
    data object RecurringInvoices : Screen("recurring-invoices", "Recurring Invoices")
    data object CreateRecurringInvoice : Screen("recurring-invoices/create", "New Recurring Invoice")

    // Audit Trail
    data object AuditTrail : Screen("audit-trail", "Audit Trail")

    // Sync
    data object SyncStatus : Screen("sync-status", "Sync Status")

    // Shortcuts
    data object Shortcuts : Screen("shortcuts", "Keyboard Shortcuts")

    // Multi-company
    data object AddCompany : Screen("add-company", "Add Company")
}
