package com.kontafy.desktop

import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.WindowPosition
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.AuthService
import com.kontafy.desktop.components.Sidebar
import com.kontafy.desktop.db.KontafyDatabase
import com.kontafy.desktop.db.repositories.*
import com.kontafy.desktop.navigation.Screen
import com.kontafy.desktop.navigation.rememberNavigationState
import com.kontafy.desktop.screens.*
import com.kontafy.desktop.shortcuts.KeyboardShortcuts
import com.kontafy.desktop.shortcuts.ShortcutHelpDialog
import com.kontafy.desktop.sync.NetworkMonitor
import com.kontafy.desktop.sync.SyncEngine
import com.kontafy.desktop.theme.KontafyTheme

fun main() = application {
    // Initialize SQLite database on startup
    KontafyDatabase.init()

    val windowState = rememberWindowState(
        size = DpSize(1200.dp, 800.dp),
        position = WindowPosition.Aligned(androidx.compose.ui.Alignment.Center),
    )

    Window(
        onCloseRequest = ::exitApplication,
        state = windowState,
        title = "Kontafy",
    ) {
        KontafyApp(onQuit = ::exitApplication)
    }
}

@Composable
fun KontafyApp(onQuit: () -> Unit = {}) {
    val authService = remember { AuthService() }
    val apiClient = remember { ApiClient(authService) }
    val navigationState = rememberNavigationState()
    var showShortcutHelp by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    val showSnackbar: (String) -> Unit = { message ->
        scope.launch { snackbarHostState.showSnackbar(message) }
    }

    // Request focus for keyboard shortcut handling
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    // Initialize repositories
    val userRepository = remember { UserRepository() }
    val organizationRepository = remember { OrganizationRepository() }
    val accountRepository = remember { AccountRepository() }
    val contactRepository = remember { ContactRepository() }
    val invoiceRepository = remember { InvoiceRepository() }
    val invoiceItemRepository = remember { InvoiceItemRepository() }
    val journalEntryRepository = remember { JournalEntryRepository() }
    val journalLineRepository = remember { JournalLineRepository() }
    val productRepository = remember { ProductRepository() }
    val paymentRepository = remember { PaymentRepository() }
    val bankAccountRepository = remember { BankAccountRepository() }
    val syncQueueRepository = remember { SyncQueueRepository() }
    val appSettingsRepository = remember { AppSettingsRepository() }

    // Multi-company: load organizations and track current org
    var organizations by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var currentOrgName by remember { mutableStateOf(authService.currentOrgName ?: "") }

    // Refresh org list whenever authenticated state changes or after adding a company
    var orgRefreshTrigger by remember { mutableStateOf(0) }
    LaunchedEffect(authService.isAuthenticated, orgRefreshTrigger) {
        if (authService.isAuthenticated) {
            val allOrgs = organizationRepository.getAll()
            organizations = allOrgs.map { it.id to it.name }
            // If we have a current org ID, resolve its name
            val currentId = authService.currentOrgId
            if (currentId != null) {
                val matchingOrg = allOrgs.find { it.id == currentId }
                if (matchingOrg != null) {
                    currentOrgName = matchingOrg.name
                    authService.switchOrganization(matchingOrg.id, matchingOrg.name)
                }
            } else if (allOrgs.isNotEmpty()) {
                // Default to first org if none selected
                val firstOrg = allOrgs.first()
                currentOrgName = firstOrg.name
                authService.switchOrganization(firstOrg.id, firstOrg.name)
            }
        }
    }

    // Auto-navigate to Register if no users exist
    LaunchedEffect(Unit) {
        if (!authService.isAuthenticated && !userRepository.hasAnyUsers()) {
            navigationState.navigateTo(Screen.Register)
        }
    }

    // Initialize sync engine
    val networkMonitor = remember { NetworkMonitor() }
    val syncEngine = remember {
        SyncEngine(
            apiClient = apiClient,
            networkMonitor = networkMonitor,
            organizationRepository = organizationRepository,
            accountRepository = accountRepository,
            contactRepository = contactRepository,
            invoiceRepository = invoiceRepository,
            invoiceItemRepository = invoiceItemRepository,
            journalEntryRepository = journalEntryRepository,
            journalLineRepository = journalLineRepository,
            productRepository = productRepository,
            paymentRepository = paymentRepository,
            bankAccountRepository = bankAccountRepository,
            syncQueueRepository = syncQueueRepository,
            appSettingsRepository = appSettingsRepository,
        )
    }

    // Start sync engine when authenticated
    LaunchedEffect(authService.isAuthenticated) {
        if (authService.isAuthenticated) {
            syncEngine.start()
            if (navigationState.currentScreen is Screen.Login || navigationState.currentScreen is Screen.Register) {
                navigationState.navigateTo(Screen.Dashboard)
            }
        } else {
            syncEngine.stop()
        }
    }

    // Stop sync engine when app is disposed
    DisposableEffect(Unit) {
        onDispose {
            syncEngine.stop()
        }
    }

    // Derive current org ID for org-filtered data loading
    val currentOrgId = authService.currentOrgId ?: "org-default"

    // Shortcut help dialog
    if (showShortcutHelp) {
        ShortcutHelpDialog(onDismiss = { showShortcutHelp = false })
    }

    KontafyTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .focusRequester(focusRequester)
                .focusable()
                .onPreviewKeyEvent { keyEvent ->
                    if (!authService.isAuthenticated) return@onPreviewKeyEvent false

                    val action = KeyboardShortcuts.handleKeyEvent(keyEvent) ?: return@onPreviewKeyEvent false

                    when {
                        action.screen != null -> {
                            navigationState.navigateTo(action.screen)
                            true
                        }
                        action.action == "back" -> {
                            navigationState.goBack()
                            true
                        }
                        action.action == "quit" -> {
                            onQuit()
                            true
                        }
                        action.action == "goto" -> {
                            showShortcutHelp = true
                            true
                        }
                        // Other actions (save, print, export, search, new, change_date)
                        // are handled by individual screens via their own key listeners
                        else -> false
                    }
                }
        ) {
        when (val screen = navigationState.currentScreen) {
            is Screen.Login -> {
                LoginScreen(
                    authService = authService,
                    userRepository = userRepository,
                    onLoginSuccess = {
                        navigationState.navigateTo(Screen.Dashboard)
                    },
                    onNavigateToRegister = {
                        navigationState.navigateTo(Screen.Register)
                    },
                )
            }

            is Screen.Register -> {
                RegisterScreen(
                    authService = authService,
                    userRepository = userRepository,
                    organizationRepository = organizationRepository,
                    onRegistrationSuccess = {
                        navigationState.navigateTo(Screen.Dashboard)
                    },
                    onNavigateToLogin = {
                        navigationState.navigateTo(Screen.Login)
                    },
                )
            }

            else -> {
                // Main layout with sidebar
                Row(modifier = Modifier.fillMaxSize()) {
                    Sidebar(
                        currentScreen = screen,
                        onNavigate = { navigationState.navigateTo(it) },
                        userName = authService.currentUser?.name ?: "User",
                        onLogout = {
                            authService.logout()
                            navigationState.navigateTo(Screen.Login)
                        },
                        currentOrgName = currentOrgName,
                        organizations = organizations,
                        onSwitchOrganization = { orgId, orgName ->
                            authService.switchOrganization(orgId, orgName)
                            currentOrgName = orgName
                            navigationState.navigateTo(Screen.Dashboard)
                        },
                        onAddCompany = {
                            navigationState.navigateTo(Screen.AddCompany)
                        },
                    )

                    // Content area — key on currentOrgId to force reload on org switch
                    key(currentOrgId) {
                    when (screen) {
                        is Screen.Dashboard -> DashboardScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            contactRepository = contactRepository,
                            paymentRepository = paymentRepository,
                            productRepository = productRepository,
                            onInvoiceClick = { id ->
                                navigationState.navigateTo(Screen.InvoiceDetail(id))
                            },
                            onNavigateToInvoices = {
                                navigationState.navigateTo(Screen.InvoiceList)
                            },
                            onNavigateToCustomers = {
                                navigationState.navigateTo(Screen.CreateCustomer)
                            },
                            onRecordExpense = {
                                navigationState.navigateTo(Screen.CreateJournalEntry)
                            },
                            onViewReports = {
                                navigationState.navigateTo(Screen.ReportsHub)
                            },
                        )

                        is Screen.InvoiceList -> InvoiceListScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            contactRepository = contactRepository,
                            onInvoiceClick = { id ->
                                navigationState.navigateTo(Screen.InvoiceDetail(id))
                            },
                            onCreateInvoice = {
                                navigationState.navigateTo(Screen.CreateInvoice)
                            },
                        )

                        is Screen.InvoiceDetail -> InvoiceDetailScreen(
                            invoiceId = screen.invoiceId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            onBack = { navigationState.goBack() },
                            onDeleteSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onEditInvoice = { id ->
                                navigationState.navigateTo(Screen.EditInvoice(id))
                            },
                        )

                        is Screen.CreateInvoice -> CreateInvoiceScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onNavigateToCreateCustomer = {
                                navigationState.navigateTo(Screen.CreateCustomer)
                            },
                        )

                        is Screen.EditInvoice -> EditInvoiceScreen(
                            invoiceId = screen.invoiceId,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onNavigateToCreateCustomer = {
                                navigationState.navigateTo(Screen.CreateCustomer)
                            },
                        )

                        is Screen.CustomerList -> CustomerListScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            contactRepository = contactRepository,
                            invoiceRepository = invoiceRepository,
                            onCustomerClick = { id ->
                                navigationState.navigateTo(Screen.CustomerDetail(id))
                            },
                            onCreateCustomer = {
                                navigationState.navigateTo(Screen.CreateCustomer)
                            },
                        )

                        is Screen.CustomerDetail -> CustomerDetailScreen(
                            customerId = screen.customerId,
                            contactRepository = contactRepository,
                            invoiceRepository = invoiceRepository,
                            paymentRepository = paymentRepository,
                            onBack = { navigationState.goBack() },
                            onDeleteSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onEditCustomer = { id ->
                                navigationState.navigateTo(Screen.EditCustomer(id))
                            },
                            onInvoiceClick = { id ->
                                navigationState.navigateTo(Screen.InvoiceDetail(id))
                            },
                            onNavigateToLedger = {
                                navigationState.navigateTo(Screen.Ledger())
                            },
                        )

                        is Screen.CreateCustomer -> CreateCustomerScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            contactRepository = contactRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                        )

                        is Screen.EditCustomer -> EditCustomerScreen(
                            customerId = screen.customerId,
                            currentOrgId = currentOrgId,
                            contactRepository = contactRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                        )

                        is Screen.Settings -> SettingsScreen(
                            authService = authService,
                            apiClient = apiClient,
                            appSettingsRepository = appSettingsRepository,
                            organizationRepository = organizationRepository,
                        )

                        // Accounting screens
                        is Screen.ChartOfAccounts -> ChartOfAccountsScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            accountRepository = accountRepository,
                            onAccountClick = { id ->
                                navigationState.navigateTo(Screen.Ledger(id))
                            },
                        )

                        is Screen.JournalEntries -> JournalEntryScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            onCreateNew = {
                                navigationState.navigateTo(Screen.CreateJournalEntry)
                            },
                            onEntryClick = { id ->
                                navigationState.navigateTo(Screen.JournalEntryDetail(id))
                            },
                        )

                        is Screen.JournalEntryDetail -> JournalEntryDetailScreen(
                            entryId = screen.entryId,
                            apiClient = apiClient,
                            onBack = { navigationState.goBack() },
                        )

                        is Screen.CreateJournalEntry -> CreateJournalEntryScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            accountRepository = accountRepository,
                            onBack = { navigationState.goBack() },
                            onSaved = {
                                navigationState.navigateTo(Screen.JournalEntries)
                            },
                        )

                        is Screen.Ledger -> LedgerScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            accountRepository = accountRepository,
                            initialAccountId = screen.accountId,
                        )

                        is Screen.TrialBalance -> TrialBalanceScreen(
                            apiClient = apiClient,
                            accountRepository = accountRepository,
                        )

                        is Screen.ProfitLoss -> ProfitLossScreen(
                            apiClient = apiClient,
                            accountRepository = accountRepository,
                        )

                        is Screen.BalanceSheet -> BalanceSheetScreen(
                            apiClient = apiClient,
                            accountRepository = accountRepository,
                        )

                        is Screen.CashFlow -> CashFlowScreen(
                            apiClient = apiClient,
                            accountRepository = accountRepository,
                        )

                        is Screen.ReportsHub -> ReportsHubScreen(
                            onNavigate = { navigationState.navigateTo(it) },
                        )

                        // GST / Tax screens
                        is Screen.GSTDashboard -> GSTDashboardScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            onNavigateToCompute = {
                                navigationState.navigateTo(Screen.GSTCompute)
                            },
                            onNavigateToGSTR1 = {
                                navigationState.navigateTo(Screen.GSTR1)
                            },
                            onNavigateToGSTR3B = {
                                navigationState.navigateTo(Screen.GSTR3B)
                            },
                        )

                        is Screen.GSTCompute -> GSTComputeScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            onBack = { navigationState.goBack() },
                        )

                        is Screen.GSTR1 -> GSTR1Screen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            onBack = { navigationState.goBack() },
                        )

                        is Screen.GSTR3B -> GSTR3BScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            onBack = { navigationState.goBack() },
                        )

                        is Screen.EWayBillList -> EWayBillListScreen(
                            apiClient = apiClient,
                            onEWayBillClick = { id ->
                                navigationState.navigateTo(Screen.EWayBillDetail(id))
                            },
                            onGenerateEWayBill = {
                                navigationState.navigateTo(Screen.GenerateEWayBill)
                            },
                            showSnackbar = showSnackbar,
                        )

                        is Screen.GenerateEWayBill -> GenerateEWayBillScreen(
                            apiClient = apiClient,
                            invoiceRepository = invoiceRepository,
                            contactRepository = contactRepository,
                            onBack = { navigationState.goBack() },
                            onGenerated = { id ->
                                navigationState.navigateTo(Screen.EWayBillDetail(id))
                            },
                        )

                        is Screen.EWayBillDetail -> EWayBillDetailScreen(
                            ewayBillId = screen.ewayBillId,
                            apiClient = apiClient,
                            onBack = { navigationState.goBack() },
                            showSnackbar = showSnackbar,
                        )

                        is Screen.TDS -> TDSScreen(
                            apiClient = apiClient,
                            showSnackbar = showSnackbar,
                        )

                        // Bank screens
                        is Screen.BankAccounts -> BankAccountsScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            bankAccountRepository = bankAccountRepository,
                            onAccountClick = { id ->
                                navigationState.navigateTo(Screen.BankRegister(id))
                            },
                            onAddAccount = {
                                navigationState.navigateTo(Screen.CreateBankAccount)
                            },
                            showSnackbar = showSnackbar,
                        )

                        is Screen.BankRegister -> BankRegisterScreen(
                            bankId = screen.bankId,
                            apiClient = apiClient,
                            onBack = { navigationState.goBack() },
                            onReconcile = { id ->
                                navigationState.navigateTo(Screen.BankReconciliation(id))
                            },
                            showSnackbar = showSnackbar,
                        )

                        is Screen.BankReconciliation -> BankReconciliationScreen(
                            bankId = screen.bankId,
                            apiClient = apiClient,
                            onBack = { navigationState.goBack() },
                        )

                        is Screen.CreateBankAccount -> CreateBankAccountScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            bankAccountRepository = bankAccountRepository,
                            onBack = { navigationState.goBack() },
                            onSaved = {
                                navigationState.navigateTo(Screen.BankAccounts)
                            },
                            showSnackbar = showSnackbar,
                        )

                        // Payment screens
                        is Screen.Payments -> PaymentsScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            paymentRepository = paymentRepository,
                            onRecordPayment = {
                                navigationState.navigateTo(Screen.RecordPayment)
                            },
                        )

                        is Screen.RecordPayment -> RecordPaymentScreen(
                            currentOrgId = currentOrgId,
                            contactRepository = contactRepository,
                            paymentRepository = paymentRepository,
                            onBack = { navigationState.goBack() },
                            onSaved = {
                                showSnackbar("Payment recorded successfully")
                                navigationState.navigateTo(Screen.Payments)
                            },
                        )

                        // Inventory / Stock screens
                        is Screen.ProductList -> ProductListScreen(
                            currentOrgId = currentOrgId,
                            productRepository = productRepository,
                            onProductClick = { id ->
                                navigationState.navigateTo(Screen.ProductDetail(id))
                            },
                            onCreateProduct = {
                                navigationState.navigateTo(Screen.CreateProduct())
                            },
                        )

                        is Screen.CreateProduct -> CreateProductScreen(
                            currentOrgId = currentOrgId,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            editProductId = screen.editProductId,
                        )

                        is Screen.ProductDetail -> ProductDetailScreen(
                            productId = screen.productId,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            onDeleteSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onEdit = { id ->
                                navigationState.navigateTo(Screen.CreateProduct(editProductId = id))
                            },
                        )

                        is Screen.StockMovements -> StockMovementsScreen(
                            apiClient = apiClient,
                            productRepository = productRepository,
                            onNewAdjustment = {
                                navigationState.navigateTo(Screen.StockAdjustment)
                            },
                        )

                        is Screen.StockAdjustment -> StockAdjustmentScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            showSnackbar = showSnackbar,
                        )

                        is Screen.Warehouses -> WarehouseScreen(
                            apiClient = apiClient,
                            showSnackbar = showSnackbar,
                        )

                        // Quotation, Purchase Order, Recurring screens
                        is Screen.QuotationList -> QuotationListScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            contactRepository = contactRepository,
                            onConvertToInvoice = { id ->
                                navigationState.navigateTo(Screen.CreateInvoice)
                            },
                            onCreateQuotation = {
                                navigationState.navigateTo(Screen.CreateQuotation)
                            },
                            onQuotationClick = { id ->
                                navigationState.navigateTo(Screen.QuotationDetail(id))
                            },
                        )

                        is Screen.QuotationDetail -> QuotationDetailScreen(
                            quotationId = screen.quotationId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            onBack = { navigationState.goBack() },
                            onDeleteSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onEditQuotation = { id ->
                                navigationState.navigateTo(Screen.EditQuotation(id))
                            },
                        )

                        is Screen.EditQuotation -> EditInvoiceScreen(
                            invoiceId = screen.quotationId,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onNavigateToCreateCustomer = {
                                navigationState.navigateTo(Screen.CreateCustomer)
                            },
                        )

                        is Screen.CreateQuotation -> CreateQuotationScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onNavigateToCreateCustomer = {
                                navigationState.navigateTo(Screen.CreateCustomer)
                            },
                        )

                        is Screen.PurchaseOrderList -> PurchaseOrderListScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            contactRepository = contactRepository,
                            onConvertToBill = { id ->
                                navigationState.navigateTo(Screen.CreateInvoice)
                            },
                            onCreatePurchaseOrder = {
                                navigationState.navigateTo(Screen.CreatePurchaseOrder)
                            },
                            onPurchaseOrderClick = { id ->
                                navigationState.navigateTo(Screen.PurchaseOrderDetail(id))
                            },
                        )

                        is Screen.PurchaseOrderDetail -> PurchaseOrderDetailScreen(
                            poId = screen.poId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            onBack = { navigationState.goBack() },
                            onDeleteSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onEditPurchaseOrder = { id ->
                                navigationState.navigateTo(Screen.EditPurchaseOrder(id))
                            },
                        )

                        is Screen.EditPurchaseOrder -> EditInvoiceScreen(
                            invoiceId = screen.poId,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onNavigateToCreateCustomer = {
                                navigationState.navigateTo(Screen.CreateCustomer)
                            },
                        )

                        is Screen.CreatePurchaseOrder -> CreatePurchaseOrderScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onNavigateToCreateVendor = {
                                navigationState.navigateTo(Screen.CreateCustomer)
                            },
                        )

                        is Screen.RecurringInvoices -> RecurringInvoicesScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            contactRepository = contactRepository,
                            onCreateRecurring = {
                                navigationState.navigateTo(Screen.CreateRecurringInvoice)
                            },
                        )

                        is Screen.CreateRecurringInvoice -> CreateRecurringInvoiceScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            invoiceRepository = invoiceRepository,
                            invoiceItemRepository = invoiceItemRepository,
                            contactRepository = contactRepository,
                            productRepository = productRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                            onNavigateToCreateCustomer = {
                                navigationState.navigateTo(Screen.CreateCustomer)
                            },
                        )

                        // Vendor screens
                        is Screen.VendorList -> VendorListScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            contactRepository = contactRepository,
                            onVendorClick = { id ->
                                navigationState.navigateTo(Screen.CustomerDetail(id))
                            },
                            onCreateVendor = {
                                navigationState.navigateTo(Screen.CreateVendor)
                            },
                        )

                        is Screen.CreateVendor -> CreateCustomerScreen(
                            apiClient = apiClient,
                            currentOrgId = currentOrgId,
                            contactRepository = contactRepository,
                            onBack = { navigationState.goBack() },
                            onSaveSuccess = { msg -> showSnackbar(msg); navigationState.goBack() },
                        )

                        // Sync screen
                        is Screen.SyncStatus -> SyncStatusScreen(
                            apiClient = apiClient,
                        )

                        // Shortcuts screen
                        is Screen.Shortcuts -> ShortcutsScreen()

                        // Add Company screen
                        is Screen.AddCompany -> AddCompanyScreen(
                            organizationRepository = organizationRepository,
                            onBack = { navigationState.goBack() },
                            onCompanyCreated = { orgId, orgName ->
                                authService.switchOrganization(orgId, orgName)
                                currentOrgName = orgName
                                orgRefreshTrigger++
                                navigationState.navigateTo(Screen.Dashboard)
                            },
                        )

                        is Screen.Login -> {} // handled above
                        is Screen.Register -> {} // handled above

                        else -> {} // Other screens not yet implemented
                    }
                    } // key(currentOrgId)
                }
            }
        }

        // Snackbar overlay
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 24.dp),
            snackbar = { data ->
                Snackbar(
                    snackbarData = data,
                    shape = RoundedCornerShape(8.dp),
                    containerColor = com.kontafy.desktop.theme.KontafyColors.Navy,
                    contentColor = com.kontafy.desktop.theme.KontafyColors.White,
                )
            },
        )
        } // Box
    }
}
