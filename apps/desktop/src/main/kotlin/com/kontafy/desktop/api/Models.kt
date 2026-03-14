package com.kontafy.desktop.api

import kotlinx.serialization.Serializable
import java.math.BigDecimal
import java.time.LocalDateTime

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

@Serializable
data class LoginResponse(
    val accessToken: String,
    val user: UserDto,
)

@Serializable
data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val organizationId: String? = null,
)

@Serializable
data class ApiError(
    val statusCode: Int,
    val message: String,
    val error: String? = null,
)

@Serializable
data class InvoiceDto(
    val id: String,
    val invoiceNumber: String,
    val customerName: String,
    val customerId: String? = null,
    val amount: Double,
    val currency: String = "INR",
    val status: String, // DRAFT, SENT, PAID, OVERDUE
    val issueDate: String,
    val dueDate: String,
    val items: List<InvoiceItemDto> = emptyList(),
    val notes: String? = null,
    val orgId: String? = null,
    val type: String = "invoice",
    val subtotal: Double = 0.0,
    val discountAmount: Double = 0.0,
    val taxAmount: Double = 0.0,
    val amountPaid: Double = 0.0,
    val amountDue: Double = 0.0,
    val terms: String? = null,
    val placeOfSupply: String? = null,
    val reverseCharge: Boolean = false,
)

@Serializable
data class InvoiceItemDto(
    val id: String? = null,
    val description: String,
    val quantity: Double,
    val unitPrice: Double,
    val amount: Double,
    val productId: String? = null,
    val hsnCode: String? = null,
    val discountPercent: Double = 0.0,
    val taxRate: Double = 0.0,
    val cgstAmount: Double = 0.0,
    val sgstAmount: Double = 0.0,
    val igstAmount: Double = 0.0,
    val cessAmount: Double = 0.0,
    val sortOrder: Int = 0,
)

@Serializable
data class CustomerDto(
    val id: String,
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val gstin: String? = null,
    val totalInvoices: Int = 0,
    val outstandingAmount: Double = 0.0,
    val orgId: String? = null,
    val type: String = "customer",
    val pan: String? = null,
    val city: String? = null,
    val state: String? = null,
    val stateCode: String? = null,
    val pincode: String? = null,
)

@Serializable
data class DashboardStats(
    val totalRevenue: Double = 0.0,
    val totalExpenses: Double = 0.0,
    val receivables: Double = 0.0,
    val payables: Double = 0.0,
    val recentInvoices: List<InvoiceDto> = emptyList(),
)

@Serializable
data class PaginatedResponse<T>(
    val data: List<T>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
)

// --- Accounting Models ---

@Serializable
data class AccountDto(
    val id: String,
    val code: String,
    val name: String,
    val type: String, // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
    val parentId: String? = null,
    val isGroup: Boolean = false,
    val openingBalance: Double = 0.0,
    val currentBalance: Double = 0.0,
    val description: String? = null,
    val children: List<AccountDto> = emptyList(),
)

@Serializable
data class JournalEntryDto(
    val id: String,
    val entryNumber: String,
    val date: String,
    val narration: String,
    val type: String = "GENERAL", // GENERAL, SALES, PURCHASE, PAYMENT, RECEIPT
    val isPosted: Boolean = false,
    val lines: List<JournalLineDto> = emptyList(),
)

@Serializable
data class JournalLineDto(
    val id: String = "",
    val accountId: String,
    val accountName: String = "",
    val debitAmount: Double = 0.0,
    val creditAmount: Double = 0.0,
    val description: String = "",
)

@Serializable
data class LedgerEntryDto(
    val date: String,
    val entryNumber: String,
    val narration: String,
    val debitAmount: Double = 0.0,
    val creditAmount: Double = 0.0,
    val runningBalance: Double = 0.0,
)

@Serializable
data class LedgerResponse(
    val account: AccountDto,
    val entries: List<LedgerEntryDto>,
    val openingBalance: Double = 0.0,
    val closingBalance: Double = 0.0,
    val totalDebits: Double = 0.0,
    val totalCredits: Double = 0.0,
)

@Serializable
data class TrialBalanceRow(
    val accountCode: String,
    val accountName: String,
    val accountType: String,
    val debitBalance: Double = 0.0,
    val creditBalance: Double = 0.0,
)

@Serializable
data class TrialBalanceResponse(
    val asOfDate: String,
    val rows: List<TrialBalanceRow>,
    val totalDebits: Double = 0.0,
    val totalCredits: Double = 0.0,
)

@Serializable
data class AccountAmount(
    val accountId: String,
    val accountName: String,
    val amount: Double,
)

@Serializable
data class ProfitLossData(
    val fromDate: String = "",
    val toDate: String = "",
    val income: List<AccountAmount> = emptyList(),
    val expenses: List<AccountAmount> = emptyList(),
    val totalIncome: Double = 0.0,
    val totalExpenses: Double = 0.0,
    val netProfit: Double = 0.0,
)

@Serializable
data class BalanceSheetSection(
    val label: String,
    val accounts: List<AccountAmount> = emptyList(),
    val total: Double = 0.0,
)

@Serializable
data class BalanceSheetData(
    val asOfDate: String = "",
    val assets: List<BalanceSheetSection> = emptyList(),
    val liabilities: List<BalanceSheetSection> = emptyList(),
    val equity: List<BalanceSheetSection> = emptyList(),
    val totalAssets: Double = 0.0,
    val totalLiabilities: Double = 0.0,
    val totalEquity: Double = 0.0,
)

@Serializable
data class CashFlowSection(
    val label: String,
    val items: List<AccountAmount> = emptyList(),
    val total: Double = 0.0,
)

@Serializable
data class CashFlowData(
    val fromDate: String = "",
    val toDate: String = "",
    val operating: CashFlowSection = CashFlowSection("Operating Activities"),
    val investing: CashFlowSection = CashFlowSection("Investing Activities"),
    val financing: CashFlowSection = CashFlowSection("Financing Activities"),
    val openingCash: Double = 0.0,
    val netChange: Double = 0.0,
    val closingCash: Double = 0.0,
)

@Serializable
data class CreateJournalEntryRequest(
    val date: String,
    val narration: String,
    val type: String = "GENERAL",
    val isPosted: Boolean = false,
    val lines: List<JournalLineDto>,
)

@Serializable
data class CreateAccountRequest(
    val code: String,
    val name: String,
    val type: String,
    val parentId: String? = null,
    val isGroup: Boolean = false,
    val openingBalance: Double = 0.0,
    val description: String? = null,
)

// === GST / Tax Models ===

@Serializable
data class GSTSummaryDto(
    val outputTax: Double = 0.0,
    val inputTax: Double = 0.0,
    val netPayable: Double = 0.0,
    val tdsDeducted: Double = 0.0,
    val gstin: String = "",
    val registrationType: String = "Regular",
    val filingFrequency: String = "Monthly",
    val recentFilings: List<GSTFilingDto> = emptyList(),
)

@Serializable
data class GSTFilingDto(
    val period: String,
    val returnType: String,
    val status: String,
    val filingDate: String? = null,
)

@Serializable
data class GSTComputeDto(
    val period: String = "",
    val outputByRate: List<RateWiseTax> = emptyList(),
    val inputByRate: List<RateWiseTax> = emptyList(),
    val hsnSummary: List<HSNRow> = emptyList(),
    val totalOutputTax: Double = 0.0,
    val totalInputTax: Double = 0.0,
    val netPayable: Double = 0.0,
)

@Serializable
data class RateWiseTax(
    val rate: Double,
    val taxableValue: Double,
    val cgst: Double,
    val sgst: Double,
    val igst: Double,
    val cess: Double = 0.0,
)

@Serializable
data class HSNRow(
    val hsn: String,
    val description: String,
    val qty: Double,
    val taxableValue: Double,
    val taxAmount: Double,
)

@Serializable
data class GSTR1Data(
    val period: String = "",
    val b2b: List<GSTR1B2BEntry> = emptyList(),
    val b2cs: List<GSTR1B2CSEntry> = emptyList(),
    val b2cl: List<GSTR1B2CLEntry> = emptyList(),
    val cdnr: List<GSTR1CDNREntry> = emptyList(),
    val hsnSummary: List<HSNRow> = emptyList(),
    val docSummary: List<GSTR1DocSummary> = emptyList(),
    val validationErrors: List<GSTValidationItem> = emptyList(),
    val validationWarnings: List<GSTValidationItem> = emptyList(),
)

@Serializable
data class GSTR1B2BEntry(
    val gstin: String,
    val invoiceNumber: String,
    val invoiceDate: String,
    val taxableValue: Double,
    val cgst: Double,
    val sgst: Double,
    val igst: Double,
    val total: Double,
)

@Serializable
data class GSTR1B2CSEntry(
    val state: String,
    val rate: Double,
    val taxableValue: Double,
    val cgst: Double,
    val sgst: Double,
    val igst: Double,
)

@Serializable
data class GSTR1B2CLEntry(
    val state: String,
    val invoiceNumber: String,
    val invoiceDate: String,
    val taxableValue: Double,
    val igst: Double,
)

@Serializable
data class GSTR1CDNREntry(
    val gstin: String,
    val noteNumber: String,
    val noteDate: String,
    val noteType: String,
    val taxableValue: Double,
    val cgst: Double,
    val sgst: Double,
    val igst: Double,
)

@Serializable
data class GSTR1DocSummary(
    val docType: String,
    val fromSerial: String,
    val toSerial: String,
    val totalCount: Int,
    val cancelled: Int,
    val netIssued: Int,
)

@Serializable
data class GSTValidationItem(
    val message: String,
    val invoiceRef: String? = null,
    val severity: String = "error",
)

@Serializable
data class GSTR3BData(
    val period: String = "",
    val table31: GSTR3BTable31 = GSTR3BTable31(),
    val table4: GSTR3BTable4 = GSTR3BTable4(),
    val table5: GSTR3BTable5 = GSTR3BTable5(),
    val table6: GSTR3BTable6 = GSTR3BTable6(),
    val totalTaxPayable: Double = 0.0,
    val status: String = "Draft",
)

@Serializable
data class GSTR3BTable31(
    val taxableOutward: Double = 0.0,
    val interState: Double = 0.0,
    val intraState: Double = 0.0,
    val zeroRated: Double = 0.0,
    val nilRated: Double = 0.0,
    val exempt: Double = 0.0,
)

@Serializable
data class GSTR3BTable4(
    val imports: Double = 0.0,
    val reverseCharge: Double = 0.0,
    val isd: Double = 0.0,
    val allOther: Double = 0.0,
    val totalItc: Double = 0.0,
)

@Serializable
data class GSTR3BTable5(
    val interStateExempt: Double = 0.0,
    val intraStateExempt: Double = 0.0,
    val interStateNil: Double = 0.0,
    val intraStateNil: Double = 0.0,
)

@Serializable
data class GSTR3BTable6(
    val igstTax: Double = 0.0,
    val igstItc: Double = 0.0,
    val igstCash: Double = 0.0,
    val cgstTax: Double = 0.0,
    val cgstItc: Double = 0.0,
    val cgstCash: Double = 0.0,
    val sgstTax: Double = 0.0,
    val sgstItc: Double = 0.0,
    val sgstCash: Double = 0.0,
    val cessTax: Double = 0.0,
    val cessItc: Double = 0.0,
    val cessCash: Double = 0.0,
)

// === E-Way Bill Models ===

@Serializable
data class EWayBillDto(
    val id: String,
    val ewbNumber: String? = null,
    val invoiceId: String,
    val invoiceNumber: String,
    val customerName: String,
    val invoiceAmount: Double,
    val supplyType: String = "outward",
    val subType: String = "supply",
    val documentType: String = "tax_invoice",
    val transporterName: String? = null,
    val transporterId: String? = null,
    val transportMode: String = "road",
    val vehicleNumber: String? = null,
    val vehicleType: String? = null,
    val distance: Int = 0,
    val validFrom: String? = null,
    val validUntil: String? = null,
    val fromAddress: String = "",
    val fromState: String = "",
    val fromPincode: String = "",
    val toAddress: String = "",
    val toState: String = "",
    val toPincode: String = "",
    val status: String = "active",
    val cancelReason: String? = null,
    val createdAt: String = "",
)

@Serializable
data class GenerateEWayBillRequest(
    val invoiceId: String,
    val supplyType: String,
    val subType: String,
    val documentType: String,
    val transporterName: String? = null,
    val transporterId: String? = null,
    val transportMode: String,
    val vehicleNumber: String? = null,
    val vehicleType: String? = null,
    val distance: Int,
    val fromAddress: String,
    val fromState: String,
    val fromPincode: String,
    val toAddress: String,
    val toState: String,
    val toPincode: String,
)

@Serializable
data class ExtendEWayBillRequest(val reason: String, val additionalDays: Int)

@Serializable
data class UpdateVehicleRequest(val vehicleNumber: String, val reason: String? = null)

@Serializable
data class CancelEWayBillRequest(val reason: String)

@Serializable
data class TDSEntryDto(
    val id: String,
    val section: String,
    val deducteeName: String,
    val pan: String,
    val amount: Double,
    val tdsRate: Double,
    val tdsAmount: Double,
    val status: String,
    val date: String,
)

// === Bank Models ===

@Serializable
data class BankAccountDto(
    val id: String,
    val bankName: String,
    val accountNumber: String,
    val ifscCode: String,
    val accountType: String,
    val balance: Double,
    val isActive: Boolean = true,
)

@Serializable
data class BankTransactionDto(
    val id: String,
    val date: String,
    val description: String,
    val reference: String = "",
    val debit: Double = 0.0,
    val credit: Double = 0.0,
    val balance: Double = 0.0,
    val isReconciled: Boolean = false,
)

@Serializable
data class CreateBankAccountRequest(
    val bankName: String,
    val accountNumber: String,
    val ifscCode: String,
    val accountType: String,
    val openingBalance: Double,
)

// === Payment Models ===

@Serializable
data class PaymentDto(
    val id: String,
    val contactName: String,
    val invoiceNumber: String = "",
    val amount: Double,
    val date: String,
    val method: String,
    val reference: String = "",
    val type: String,
    val notes: String = "",
)

@Serializable
data class CreatePaymentRequest(
    val type: String,
    val contactName: String,
    val invoiceIds: List<String> = emptyList(),
    val amount: Double,
    val date: String,
    val method: String,
    val reference: String = "",
    val bankAccountId: String? = null,
    val notes: String = "",
)

// --- Inventory / Stock Models ---

@Serializable
data class ProductDto(
    val id: String,
    val name: String,
    val type: String = "GOODS", // GOODS, SERVICES
    val hsnCode: String? = null,
    val sacCode: String? = null,
    val unit: String = "Nos",
    val sellingPrice: Double = 0.0,
    val purchasePrice: Double = 0.0,
    val taxRate: Double = 0.0,
    val sku: String? = null,
    val description: String? = null,
    val stockQuantity: Double = 0.0,
    val reorderLevel: Double = 0.0,
    val isActive: Boolean = true,
)

@Serializable
data class CreateProductRequest(
    val name: String,
    val type: String = "GOODS",
    val hsnCode: String? = null,
    val sacCode: String? = null,
    val unit: String = "Nos",
    val sellingPrice: Double = 0.0,
    val purchasePrice: Double = 0.0,
    val taxRate: Double = 0.0,
    val sku: String? = null,
    val description: String? = null,
    val stockQuantity: Double = 0.0,
    val reorderLevel: Double = 0.0,
)

@Serializable
data class StockMovementDto(
    val id: String,
    val productId: String = "",
    val productName: String,
    val type: String, // PURCHASE, SALE, RETURN, ADJUSTMENT, TRANSFER
    val quantity: Double,
    val warehouseName: String = "Default",
    val reference: String? = null,
    val date: String,
    val balanceAfter: Double = 0.0,
)

@Serializable
data class StockAdjustmentRequest(
    val productId: String,
    val type: String, // ADD, REMOVE
    val quantity: Double,
    val reason: String,
    val notes: String? = null,
    val warehouseId: String? = null,
    val date: String,
)

@Serializable
data class WarehouseDto(
    val id: String,
    val name: String,
    val address: String? = null,
    val productCount: Int = 0,
    val totalValue: Double = 0.0,
)

@Serializable
data class CreateWarehouseRequest(
    val name: String,
    val address: String? = null,
)

// --- Quotation & Purchase Order Models ---

@Serializable
data class QuotationDto(
    val id: String,
    val number: String,
    val customerName: String,
    val date: String,
    val amount: Double,
    val validityDate: String? = null,
    val status: String = "DRAFT", // DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
)

@Serializable
data class PurchaseOrderDto(
    val id: String,
    val number: String,
    val vendorName: String,
    val date: String,
    val amount: Double,
    val deliveryDate: String? = null,
    val status: String = "DRAFT", // DRAFT, SENT, APPROVED, RECEIVED, CANCELLED
)

@Serializable
data class RecurringInvoiceDto(
    val id: String,
    val customerName: String,
    val amount: Double,
    val frequency: String = "MONTHLY", // WEEKLY, MONTHLY, QUARTERLY, YEARLY
    val nextDate: String,
    val status: String = "ACTIVE", // ACTIVE, PAUSED
)

// --- Sync Models ---

@Serializable
data class SyncStatusDto(
    val state: String = "OFFLINE", // ONLINE, OFFLINE, SYNCING
    val lastSyncTime: String? = null,
    val pendingChanges: Int = 0,
    val pendingByEntity: Map<String, Int> = emptyMap(),
    val recentHistory: List<SyncHistoryEntry> = emptyList(),
)

@Serializable
data class SyncHistoryEntry(
    val timestamp: String,
    val action: String,
    val entityCount: Int = 0,
    val status: String = "SUCCESS", // SUCCESS, FAILED
    val errorMessage: String? = null,
)

// ===== Local DB Models (non-serializable, use Java types for DB layer) =====

data class OrganizationModel(
    val id: String,
    val name: String,
    val gstin: String? = null,
    val pan: String? = null,
    val address: String? = null,
    val city: String? = null,
    val state: String? = null,
    val stateCode: String? = null,
    val pincode: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val logo: String? = null,
    val invoicePrefix: String? = null,
    val financialYearStart: String? = null,
    val settings: String? = null,
    val syncedAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
)

data class AccountModel(
    val id: String,
    val orgId: String,
    val code: String? = null,
    val name: String,
    val type: String, // asset, liability, equity, income, expense
    val parentId: String? = null,
    val isGroup: Boolean = false,
    val openingBalance: BigDecimal = BigDecimal.ZERO,
    val currentBalance: BigDecimal = BigDecimal.ZERO,
    val description: String? = null,
    val isActive: Boolean = true,
    val syncedAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
)

data class ContactModel(
    val id: String,
    val orgId: String,
    val name: String,
    val type: String, // customer, vendor, both
    val email: String? = null,
    val phone: String? = null,
    val gstin: String? = null,
    val pan: String? = null,
    val billingAddress: String? = null,
    val shippingAddress: String? = null,
    val city: String? = null,
    val state: String? = null,
    val stateCode: String? = null,
    val pincode: String? = null,
    val creditLimit: BigDecimal = BigDecimal.ZERO,
    val outstandingBalance: BigDecimal = BigDecimal.ZERO,
    val isActive: Boolean = true,
    val syncedAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
)

data class InvoiceModel(
    val id: String,
    val orgId: String,
    val invoiceNumber: String,
    val contactId: String? = null,
    val type: String = "invoice",
    val status: String = "draft",
    val issueDate: String,
    val dueDate: String,
    val subtotal: BigDecimal = BigDecimal.ZERO,
    val discountAmount: BigDecimal = BigDecimal.ZERO,
    val taxAmount: BigDecimal = BigDecimal.ZERO,
    val totalAmount: BigDecimal = BigDecimal.ZERO,
    val amountPaid: BigDecimal = BigDecimal.ZERO,
    val amountDue: BigDecimal = BigDecimal.ZERO,
    val currency: String = "INR",
    val notes: String? = null,
    val terms: String? = null,
    val placeOfSupply: String? = null,
    val reverseCharge: Boolean = false,
    val syncedAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
    val isDeleted: Boolean = false,
)

data class InvoiceItemModel(
    val id: String,
    val invoiceId: String,
    val productId: String? = null,
    val description: String? = null,
    val hsnCode: String? = null,
    val quantity: BigDecimal = BigDecimal.ONE,
    val unitPrice: BigDecimal = BigDecimal.ZERO,
    val discountPercent: BigDecimal = BigDecimal.ZERO,
    val taxRate: BigDecimal = BigDecimal.ZERO,
    val cgstAmount: BigDecimal = BigDecimal.ZERO,
    val sgstAmount: BigDecimal = BigDecimal.ZERO,
    val igstAmount: BigDecimal = BigDecimal.ZERO,
    val cessAmount: BigDecimal = BigDecimal.ZERO,
    val totalAmount: BigDecimal = BigDecimal.ZERO,
    val sortOrder: Int = 0,
)

data class JournalEntryModel(
    val id: String,
    val orgId: String,
    val entryNumber: String,
    val date: String,
    val narration: String? = null,
    val type: String = "manual",
    val referenceType: String? = null,
    val referenceId: String? = null,
    val isPosted: Boolean = false,
    val syncedAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
)

data class JournalLineModel(
    val id: String,
    val entryId: String,
    val accountId: String,
    val debitAmount: BigDecimal = BigDecimal.ZERO,
    val creditAmount: BigDecimal = BigDecimal.ZERO,
    val description: String? = null,
)

data class ProductModel(
    val id: String,
    val orgId: String,
    val name: String,
    val type: String = "goods",
    val hsnCode: String? = null,
    val sacCode: String? = null,
    val unit: String? = null,
    val sellingPrice: BigDecimal = BigDecimal.ZERO,
    val purchasePrice: BigDecimal = BigDecimal.ZERO,
    val taxRate: BigDecimal = BigDecimal.ZERO,
    val description: String? = null,
    val sku: String? = null,
    val stockQuantity: BigDecimal = BigDecimal.ZERO,
    val reorderLevel: BigDecimal = BigDecimal.ZERO,
    val isActive: Boolean = true,
    val syncedAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
)

data class PaymentModel(
    val id: String,
    val orgId: String,
    val invoiceId: String? = null,
    val contactId: String? = null,
    val amount: BigDecimal = BigDecimal.ZERO,
    val paymentDate: String,
    val method: String = "cash",
    val reference: String? = null,
    val notes: String? = null,
    val type: String = "received",
    val syncedAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
)

data class BankAccountModel(
    val id: String,
    val orgId: String,
    val bankName: String,
    val accountNumber: String,
    val ifscCode: String? = null,
    val accountType: String = "savings",
    val balance: BigDecimal = BigDecimal.ZERO,
    val isActive: Boolean = true,
    val syncedAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
)

data class SyncQueueItem(
    val id: Int,
    val entityType: String,
    val entityId: String,
    val action: String,
    val payload: String,
    val status: String = "pending",
    val retryCount: Int = 0,
    val errorMessage: String? = null,
    val createdAt: LocalDateTime? = null,
    val syncedAt: LocalDateTime? = null,
)

// ===== DTO <-> Model Conversion Extensions =====

fun InvoiceDto.toInvoiceModel(): InvoiceModel = InvoiceModel(
    id = id,
    orgId = orgId ?: "",
    invoiceNumber = invoiceNumber,
    contactId = customerId,
    type = type,
    status = status.lowercase(),
    issueDate = issueDate,
    dueDate = dueDate,
    subtotal = BigDecimal.valueOf(subtotal),
    discountAmount = BigDecimal.valueOf(discountAmount),
    taxAmount = BigDecimal.valueOf(taxAmount),
    totalAmount = BigDecimal.valueOf(amount),
    amountPaid = BigDecimal.valueOf(amountPaid),
    amountDue = BigDecimal.valueOf(amountDue),
    currency = currency,
    notes = notes,
    terms = terms,
    placeOfSupply = placeOfSupply,
    reverseCharge = reverseCharge,
    syncedAt = LocalDateTime.now(),
    updatedAt = LocalDateTime.now(),
)

fun InvoiceModel.toDto(): InvoiceDto = InvoiceDto(
    id = id,
    invoiceNumber = invoiceNumber,
    customerName = "",
    customerId = contactId,
    amount = totalAmount.toDouble(),
    currency = currency,
    status = status.uppercase(),
    issueDate = issueDate,
    dueDate = dueDate,
    notes = notes,
    orgId = orgId,
    type = type,
    subtotal = subtotal.toDouble(),
    discountAmount = discountAmount.toDouble(),
    taxAmount = taxAmount.toDouble(),
    amountPaid = amountPaid.toDouble(),
    amountDue = amountDue.toDouble(),
    terms = terms,
    placeOfSupply = placeOfSupply,
    reverseCharge = reverseCharge,
)

fun InvoiceItemDto.toInvoiceItemModel(invoiceId: String): InvoiceItemModel = InvoiceItemModel(
    id = id ?: java.util.UUID.randomUUID().toString(),
    invoiceId = invoiceId,
    productId = productId,
    description = description,
    hsnCode = hsnCode,
    quantity = BigDecimal.valueOf(quantity),
    unitPrice = BigDecimal.valueOf(unitPrice),
    discountPercent = BigDecimal.valueOf(discountPercent),
    taxRate = BigDecimal.valueOf(taxRate),
    cgstAmount = BigDecimal.valueOf(cgstAmount),
    sgstAmount = BigDecimal.valueOf(sgstAmount),
    igstAmount = BigDecimal.valueOf(igstAmount),
    cessAmount = BigDecimal.valueOf(cessAmount),
    totalAmount = BigDecimal.valueOf(amount),
    sortOrder = sortOrder,
)

fun InvoiceItemModel.toDto(): InvoiceItemDto = InvoiceItemDto(
    id = id,
    description = description ?: "",
    quantity = quantity.toDouble(),
    unitPrice = unitPrice.toDouble(),
    amount = totalAmount.toDouble(),
    productId = productId,
    hsnCode = hsnCode,
    discountPercent = discountPercent.toDouble(),
    taxRate = taxRate.toDouble(),
    cgstAmount = cgstAmount.toDouble(),
    sgstAmount = sgstAmount.toDouble(),
    igstAmount = igstAmount.toDouble(),
    cessAmount = cessAmount.toDouble(),
    sortOrder = sortOrder,
)

fun CustomerDto.toContactModel(): ContactModel = ContactModel(
    id = id,
    orgId = orgId ?: "",
    name = name,
    type = type,
    email = email,
    phone = phone,
    gstin = gstin,
    pan = pan,
    billingAddress = address,
    city = city,
    state = state,
    stateCode = stateCode,
    pincode = pincode,
    outstandingBalance = BigDecimal.valueOf(outstandingAmount),
    syncedAt = LocalDateTime.now(),
    updatedAt = LocalDateTime.now(),
)

fun ContactModel.toCustomerDto(): CustomerDto = CustomerDto(
    id = id,
    name = name,
    email = email,
    phone = phone,
    address = billingAddress,
    gstin = gstin,
    outstandingAmount = outstandingBalance.toDouble(),
    orgId = orgId,
    type = type,
    pan = pan,
    city = city,
    state = state,
    stateCode = stateCode,
    pincode = pincode,
)

fun AccountDto.toAccountModel(orgId: String): AccountModel = AccountModel(
    id = id,
    orgId = orgId,
    code = code,
    name = name,
    type = type.lowercase(),
    parentId = parentId,
    isGroup = isGroup,
    openingBalance = BigDecimal.valueOf(openingBalance),
    currentBalance = BigDecimal.valueOf(currentBalance),
    description = description,
    syncedAt = LocalDateTime.now(),
    updatedAt = LocalDateTime.now(),
)

fun AccountModel.toDto(): AccountDto = AccountDto(
    id = id,
    code = code ?: "",
    name = name,
    type = type.uppercase(),
    parentId = parentId,
    isGroup = isGroup,
    openingBalance = openingBalance.toDouble(),
    currentBalance = currentBalance.toDouble(),
    description = description,
)

fun ProductDto.toProductModel(orgId: String): ProductModel = ProductModel(
    id = id,
    orgId = orgId,
    name = name,
    type = type.lowercase(),
    hsnCode = hsnCode,
    sacCode = sacCode,
    unit = unit,
    sellingPrice = BigDecimal.valueOf(sellingPrice),
    purchasePrice = BigDecimal.valueOf(purchasePrice),
    taxRate = BigDecimal.valueOf(taxRate),
    description = description,
    sku = sku,
    stockQuantity = BigDecimal.valueOf(stockQuantity),
    reorderLevel = BigDecimal.valueOf(reorderLevel),
    isActive = isActive,
    syncedAt = LocalDateTime.now(),
    updatedAt = LocalDateTime.now(),
)

fun ProductModel.toDto(): ProductDto = ProductDto(
    id = id,
    name = name,
    type = type.uppercase(),
    hsnCode = hsnCode,
    sacCode = sacCode,
    unit = unit ?: "Nos",
    sellingPrice = sellingPrice.toDouble(),
    purchasePrice = purchasePrice.toDouble(),
    taxRate = taxRate.toDouble(),
    description = description,
    sku = sku,
    stockQuantity = stockQuantity.toDouble(),
    reorderLevel = reorderLevel.toDouble(),
    isActive = isActive,
)

fun BankAccountDto.toBankAccountModel(orgId: String): BankAccountModel = BankAccountModel(
    id = id,
    orgId = orgId,
    bankName = bankName,
    accountNumber = accountNumber,
    ifscCode = ifscCode,
    accountType = accountType.lowercase(),
    balance = BigDecimal.valueOf(balance),
    isActive = isActive,
    syncedAt = LocalDateTime.now(),
    updatedAt = LocalDateTime.now(),
)

fun BankAccountModel.toDto(): BankAccountDto = BankAccountDto(
    id = id,
    bankName = bankName,
    accountNumber = accountNumber,
    ifscCode = ifscCode ?: "",
    accountType = accountType.uppercase(),
    balance = balance.toDouble(),
    isActive = isActive,
)

fun PaymentDto.toPaymentModel(orgId: String): PaymentModel = PaymentModel(
    id = id,
    orgId = orgId,
    amount = BigDecimal.valueOf(amount),
    paymentDate = date,
    method = method.lowercase(),
    reference = reference,
    notes = notes,
    type = type.lowercase(),
    syncedAt = LocalDateTime.now(),
    updatedAt = LocalDateTime.now(),
)

fun PaymentModel.toDto(): PaymentDto = PaymentDto(
    id = id,
    contactName = "",
    amount = amount.toDouble(),
    date = paymentDate,
    method = method.uppercase(),
    reference = reference ?: "",
    type = type.uppercase(),
    notes = notes ?: "",
)

fun JournalEntryDto.toJournalEntryModel(orgId: String): JournalEntryModel = JournalEntryModel(
    id = id,
    orgId = orgId,
    entryNumber = entryNumber,
    date = date,
    narration = narration,
    type = type.lowercase(),
    isPosted = isPosted,
    syncedAt = LocalDateTime.now(),
    updatedAt = LocalDateTime.now(),
)

fun JournalEntryModel.toDto(): JournalEntryDto = JournalEntryDto(
    id = id,
    entryNumber = entryNumber,
    date = date,
    narration = narration ?: "",
    type = type.uppercase(),
    isPosted = isPosted,
)

fun JournalLineDto.toJournalLineModel(entryId: String): JournalLineModel = JournalLineModel(
    id = id.ifEmpty { java.util.UUID.randomUUID().toString() },
    entryId = entryId,
    accountId = accountId,
    debitAmount = BigDecimal.valueOf(debitAmount),
    creditAmount = BigDecimal.valueOf(creditAmount),
    description = description,
)

fun JournalLineModel.toDto(): JournalLineDto = JournalLineDto(
    id = id,
    accountId = accountId,
    debitAmount = debitAmount.toDouble(),
    creditAmount = creditAmount.toDouble(),
    description = description ?: "",
)
