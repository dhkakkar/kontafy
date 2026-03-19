package com.kontafy.desktop.api

import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.json.Json

class ApiClient(
    private val authService: AuthService,
    baseUrl: String = "https://api.kontafy.com/v1",
) {
    private val apiBaseUrl = baseUrl.trimEnd('/')

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
        prettyPrint = false
    }

    private val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(this@ApiClient.json)
        }

        defaultRequest {
            url(apiBaseUrl)
            contentType(ContentType.Application.Json)
            authService.token?.let {
                header(HttpHeaders.Authorization, "Bearer $it")
            }
        }

        install(HttpTimeout) {
            requestTimeoutMillis = 30_000
            connectTimeoutMillis = 10_000
            socketTimeoutMillis = 30_000
        }
    }

    // --- Auth ---

    suspend fun login(email: String, password: String): Result<LoginResponse> = apiCall {
        client.post("$apiBaseUrl/auth/login") {
            setBody(LoginRequest(email, password))
        }
    }

    // --- Dashboard ---

    suspend fun getDashboardStats(): Result<DashboardStats> = apiCall {
        client.get("$apiBaseUrl/dashboard/stats")
    }

    // --- Invoices ---

    suspend fun getInvoices(
        page: Int = 1,
        pageSize: Int = 20,
        search: String? = null,
        status: String? = null,
    ): Result<List<InvoiceDto>> = apiCall {
        client.get("$apiBaseUrl/invoices") {
            parameter("page", page)
            parameter("pageSize", pageSize)
            search?.let { parameter("search", it) }
            status?.let { parameter("status", it) }
        }
    }

    suspend fun getInvoice(id: String): Result<InvoiceDto> = apiCall {
        client.get("$apiBaseUrl/invoices/$id")
    }

    // --- Customers ---

    suspend fun getCustomers(
        page: Int = 1,
        pageSize: Int = 20,
        search: String? = null,
    ): Result<List<CustomerDto>> = apiCall {
        client.get("$apiBaseUrl/customers") {
            parameter("page", page)
            parameter("pageSize", pageSize)
            search?.let { parameter("search", it) }
        }
    }

    suspend fun getVendors(
        page: Int = 1,
        pageSize: Int = 20,
        search: String? = null,
    ): Result<List<CustomerDto>> = apiCall {
        client.get("$apiBaseUrl/vendors") {
            parameter("page", page)
            parameter("pageSize", pageSize)
            search?.let { parameter("search", it) }
        }
    }

    // --- Accounts ---

    suspend fun getAccounts(): Result<List<AccountDto>> = apiCall {
        client.get("$apiBaseUrl/accounts")
    }

    suspend fun createAccount(request: CreateAccountRequest): Result<AccountDto> = apiCall {
        client.post("$apiBaseUrl/accounts") {
            setBody(request)
        }
    }

    suspend fun updateAccount(id: String, request: CreateAccountRequest): Result<AccountDto> = apiCall {
        client.patch("$apiBaseUrl/accounts/$id") {
            setBody(request)
        }
    }

    // --- Journal Entries ---

    suspend fun getJournalEntries(
        page: Int = 1,
        pageSize: Int = 20,
        search: String? = null,
        fromDate: String? = null,
        toDate: String? = null,
    ): Result<List<JournalEntryDto>> = apiCall {
        client.get("$apiBaseUrl/journal-entries") {
            parameter("page", page)
            parameter("pageSize", pageSize)
            search?.let { parameter("search", it) }
            fromDate?.let { parameter("fromDate", it) }
            toDate?.let { parameter("toDate", it) }
        }
    }

    suspend fun createJournalEntry(request: CreateJournalEntryRequest): Result<JournalEntryDto> = apiCall {
        client.post("$apiBaseUrl/journal-entries") {
            setBody(request)
        }
    }

    // --- Ledger ---

    suspend fun getLedger(
        accountId: String,
        fromDate: String? = null,
        toDate: String? = null,
    ): Result<LedgerResponse> = apiCall {
        client.get("$apiBaseUrl/ledger/$accountId") {
            fromDate?.let { parameter("fromDate", it) }
            toDate?.let { parameter("toDate", it) }
        }
    }

    // --- Reports ---

    suspend fun getTrialBalance(asOfDate: String? = null): Result<TrialBalanceResponse> = apiCall {
        client.get("$apiBaseUrl/reports/trial-balance") {
            asOfDate?.let { parameter("asOfDate", it) }
        }
    }

    suspend fun getProfitLoss(
        fromDate: String? = null,
        toDate: String? = null,
    ): Result<ProfitLossData> = apiCall {
        client.get("$apiBaseUrl/reports/profit-loss") {
            fromDate?.let { parameter("fromDate", it) }
            toDate?.let { parameter("toDate", it) }
        }
    }

    suspend fun getBalanceSheet(asOfDate: String? = null): Result<BalanceSheetData> = apiCall {
        client.get("$apiBaseUrl/reports/balance-sheet") {
            asOfDate?.let { parameter("asOfDate", it) }
        }
    }

    suspend fun getCashFlow(
        fromDate: String? = null,
        toDate: String? = null,
    ): Result<CashFlowData> = apiCall {
        client.get("$apiBaseUrl/reports/cash-flow") {
            fromDate?.let { parameter("fromDate", it) }
            toDate?.let { parameter("toDate", it) }
        }
    }

    // --- GST / Tax ---

    suspend fun getGSTSummary(): Result<GSTSummaryDto> = apiCall {
        client.get("$apiBaseUrl/tax/gst/summary")
    }

    suspend fun getGSTCompute(month: Int? = null, year: Int? = null): Result<GSTComputeDto> = apiCall {
        client.get("$apiBaseUrl/tax/gst/compute") {
            month?.let { parameter("month", it) }
            year?.let { parameter("year", it) }
        }
    }

    suspend fun getGSTR1(month: Int? = null, year: Int? = null): Result<GSTR1Data> = apiCall {
        client.get("$apiBaseUrl/tax/gst/returns/gstr1") {
            month?.let { parameter("month", it) }
            year?.let { parameter("year", it) }
        }
    }

    suspend fun getGSTR3B(month: Int? = null, year: Int? = null): Result<GSTR3BData> = apiCall {
        client.get("$apiBaseUrl/tax/gst/returns/gstr3b") {
            month?.let { parameter("month", it) }
            year?.let { parameter("year", it) }
        }
    }

    // --- E-Way Bills ---

    suspend fun getEWayBills(
        page: Int = 1,
        pageSize: Int = 20,
        status: String? = null,
        search: String? = null,
    ): Result<PaginatedResponse<EWayBillDto>> = apiCall {
        client.get("$apiBaseUrl/eway-bills") {
            parameter("page", page)
            parameter("pageSize", pageSize)
            status?.let { parameter("status", it) }
            search?.let { parameter("search", it) }
        }
    }

    suspend fun getEWayBill(id: String): Result<EWayBillDto> = apiCall {
        client.get("$apiBaseUrl/eway-bills/$id")
    }

    suspend fun generateEWayBill(request: GenerateEWayBillRequest): Result<EWayBillDto> = apiCall {
        client.post("$apiBaseUrl/eway-bills") {
            setBody(request)
        }
    }

    suspend fun extendEWayBill(id: String, request: ExtendEWayBillRequest): Result<EWayBillDto> = apiCall {
        client.post("$apiBaseUrl/eway-bills/$id/extend") {
            setBody(request)
        }
    }

    suspend fun updateEWayBillVehicle(id: String, request: UpdateVehicleRequest): Result<EWayBillDto> = apiCall {
        client.patch("$apiBaseUrl/eway-bills/$id/vehicle") {
            setBody(request)
        }
    }

    suspend fun cancelEWayBill(id: String, request: CancelEWayBillRequest): Result<EWayBillDto> = apiCall {
        client.post("$apiBaseUrl/eway-bills/$id/cancel") {
            setBody(request)
        }
    }

    suspend fun getTDSEntries(): Result<List<TDSEntryDto>> = apiCall {
        client.get("$apiBaseUrl/tax/tds")
    }

    suspend fun createTDSEntry(entry: TDSEntryDto): Result<TDSEntryDto> = apiCall {
        client.post("$apiBaseUrl/tax/tds") {
            setBody(entry)
        }
    }

    // --- Bank Accounts ---

    suspend fun getBankAccounts(): Result<List<BankAccountDto>> = apiCall {
        client.get("$apiBaseUrl/bank-accounts")
    }

    suspend fun createBankAccount(request: CreateBankAccountRequest): Result<BankAccountDto> = apiCall {
        client.post("$apiBaseUrl/bank-accounts") {
            setBody(request)
        }
    }

    suspend fun getBankTransactions(
        bankId: String,
        fromDate: String? = null,
        toDate: String? = null,
    ): Result<List<BankTransactionDto>> = apiCall {
        client.get("$apiBaseUrl/bank-accounts/$bankId/transactions") {
            fromDate?.let { parameter("fromDate", it) }
            toDate?.let { parameter("toDate", it) }
        }
    }

    // --- Payments ---

    suspend fun getPayments(
        type: String? = null,
        search: String? = null,
        fromDate: String? = null,
        toDate: String? = null,
    ): Result<List<PaymentDto>> = apiCall {
        client.get("$apiBaseUrl/payments") {
            type?.let { parameter("type", it) }
            search?.let { parameter("search", it) }
            fromDate?.let { parameter("fromDate", it) }
            toDate?.let { parameter("toDate", it) }
        }
    }

    suspend fun createPayment(request: CreatePaymentRequest): Result<PaymentDto> = apiCall {
        client.post("$apiBaseUrl/payments") {
            setBody(request)
        }
    }

    // --- Products ---

    suspend fun getProducts(
        search: String? = null,
        type: String? = null,
    ): Result<List<ProductDto>> = apiCall {
        client.get("$apiBaseUrl/products") {
            search?.let { parameter("search", it) }
            type?.let { parameter("type", it) }
        }
    }

    suspend fun getProduct(id: String): Result<ProductDto> = apiCall {
        client.get("$apiBaseUrl/products/$id")
    }

    suspend fun createProduct(request: CreateProductRequest): Result<ProductDto> = apiCall {
        client.post("$apiBaseUrl/products") {
            setBody(request)
        }
    }

    suspend fun updateProduct(id: String, request: CreateProductRequest): Result<ProductDto> = apiCall {
        client.patch("$apiBaseUrl/products/$id") {
            setBody(request)
        }
    }

    // --- Stock ---

    suspend fun getStockMovements(
        productId: String? = null,
        type: String? = null,
        fromDate: String? = null,
        toDate: String? = null,
    ): Result<List<StockMovementDto>> = apiCall {
        client.get("$apiBaseUrl/stock/movements") {
            productId?.let { parameter("productId", it) }
            type?.let { parameter("type", it) }
            fromDate?.let { parameter("fromDate", it) }
            toDate?.let { parameter("toDate", it) }
        }
    }

    suspend fun createStockAdjustment(request: StockAdjustmentRequest): Result<StockMovementDto> = apiCall {
        client.post("$apiBaseUrl/stock/adjustments") {
            setBody(request)
        }
    }

    // --- Warehouses ---

    suspend fun getWarehouses(): Result<List<WarehouseDto>> = apiCall {
        client.get("$apiBaseUrl/stock/warehouses")
    }

    suspend fun createWarehouse(request: CreateWarehouseRequest): Result<WarehouseDto> = apiCall {
        client.post("$apiBaseUrl/stock/warehouses") {
            setBody(request)
        }
    }

    // --- Quotations ---

    suspend fun getQuotations(search: String? = null): Result<List<QuotationDto>> = apiCall {
        client.get("$apiBaseUrl/quotations") {
            search?.let { parameter("search", it) }
        }
    }

    // --- Purchase Orders ---

    suspend fun getPurchaseOrders(search: String? = null): Result<List<PurchaseOrderDto>> = apiCall {
        client.get("$apiBaseUrl/purchase-orders") {
            search?.let { parameter("search", it) }
        }
    }

    // --- Recurring Invoices ---

    suspend fun getRecurringInvoices(): Result<List<RecurringInvoiceDto>> = apiCall {
        client.get("$apiBaseUrl/recurring-invoices")
    }

    // --- Sync ---

    suspend fun getSyncStatus(): Result<SyncStatusDto> = apiCall {
        client.get("$apiBaseUrl/sync/status")
    }

    suspend fun triggerSync(): Result<SyncStatusDto> = apiCall {
        client.post("$apiBaseUrl/sync/trigger")
    }

    // --- Helper ---

    private suspend inline fun <reified T> apiCall(
        crossinline block: suspend () -> HttpResponse,
    ): Result<T> {
        return try {
            val response = block()
            if (response.status.isSuccess()) {
                Result.success(response.body<T>())
            } else {
                val errorBody = try {
                    response.body<ApiError>()
                } catch (_: Exception) {
                    ApiError(response.status.value, response.bodyAsText())
                }
                if (response.status == HttpStatusCode.Unauthorized) {
                    authService.logout()
                }
                Result.failure(ApiException(errorBody.statusCode, errorBody.message))
            }
        } catch (e: Exception) {
            if (e is ApiException) throw e
            Result.failure(ApiException(0, e.message ?: "Network error"))
        }
    }

    fun close() {
        client.close()
    }
}

class ApiException(val statusCode: Int, override val message: String) : Exception(message)
