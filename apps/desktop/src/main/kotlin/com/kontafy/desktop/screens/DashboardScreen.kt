package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.DashboardStats
import com.kontafy.desktop.api.InvoiceDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.PaymentRepository
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.math.BigDecimal
import java.time.LocalDate

@Composable
fun DashboardScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository,
    contactRepository: ContactRepository,
    paymentRepository: PaymentRepository,
    productRepository: ProductRepository,
    onInvoiceClick: (String) -> Unit,
    onNavigateToInvoices: () -> Unit,
    onNavigateToCustomers: () -> Unit,
    onRecordExpense: () -> Unit,
    onViewReports: () -> Unit,
) {
    var stats by remember { mutableStateOf(DashboardStats()) }
    var recentInvoiceDtos by remember { mutableStateOf<List<InvoiceDto>>(emptyList()) }
    var overdueCount by remember { mutableStateOf(0) }
    var pendingPaymentsCount by remember { mutableStateOf(0) }
    var lowStockCount by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            snackbarMessage = null
        }
    }

    LaunchedEffect(Unit) {
        scope.launch {
            try {
            withContext(Dispatchers.IO) {
                // Load real invoices from local DB
                val allInvoices = invoiceRepository.getByOrgId(currentOrgId)
                val invoices = allInvoices.filter { it.type.equals("invoice", ignoreCase = true) }
                val contacts = contactRepository.getByOrgId(currentOrgId)
                val contactMap = contacts.associateBy { it.id }
                val today = LocalDate.now().toString()

                // Calculate stats from real data
                val paidInvoices = invoices.filter { it.status.equals("paid", ignoreCase = true) }
                val totalRevenue = paidInvoices.sumOf { it.totalAmount.toDouble() }

                val outstandingInvoices = invoices.filter {
                    !it.status.equals("paid", ignoreCase = true) &&
                        !it.status.equals("cancelled", ignoreCase = true) &&
                        !it.status.equals("draft", ignoreCase = true)
                }
                val receivables = outstandingInvoices.sumOf { it.amountDue.toDouble() }

                val overdueInvoices = outstandingInvoices.filter {
                    it.dueDate < today
                }
                val payables = overdueInvoices.sumOf { it.amountDue.toDouble() }
                overdueCount = overdueInvoices.size

                // Pending payments: payments that are not yet fully reconciled
                val allPayments = paymentRepository.getByOrgId(currentOrgId)
                pendingPaymentsCount = allPayments.filter {
                    it.type.equals("received", ignoreCase = true) || it.type.equals("pending", ignoreCase = true)
                }.size

                // Low stock products: stockQuantity < 10
                val allProducts = productRepository.getByOrgId(currentOrgId)
                lowStockCount = allProducts.filter {
                    it.isActive && it.type.equals("goods", ignoreCase = true) &&
                        it.stockQuantity < BigDecimal.TEN
                }.size

                // Convert recent invoices to InvoiceDto for display
                val recentDtos = invoices.take(5).map { inv ->
                    val customerName = inv.contactId?.let { contactMap[it]?.name } ?: "Unknown"
                    InvoiceDto(
                        id = inv.id,
                        invoiceNumber = inv.invoiceNumber,
                        customerName = customerName,
                        customerId = inv.contactId,
                        amount = inv.totalAmount.toDouble(),
                        currency = inv.currency,
                        status = inv.status.uppercase(),
                        issueDate = inv.issueDate,
                        dueDate = inv.dueDate,
                    )
                }

                stats = DashboardStats(
                    totalRevenue = totalRevenue,
                    totalExpenses = 0.0,
                    receivables = receivables,
                    payables = payables,
                    recentInvoices = recentDtos,
                )
                recentInvoiceDtos = recentDtos
            }
            } catch (e: Exception) {
                e.printStackTrace()
                snackbarMessage = "Failed to load dashboard data: ${e.message}"
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Dashboard",
            actions = {
                KontafyButton(
                    text = "New Invoice",
                    onClick = onNavigateToInvoices,
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                // Stat cards row
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        StatCard(
                            title = "Total Revenue",
                            value = formatCurrency(stats.totalRevenue),
                            icon = Icons.Outlined.TrendingUp,
                            iconBackground = Color(0xFFD1FAE5),
                            iconTint = KontafyColors.Green,
                            modifier = Modifier.weight(1f),
                            subtitle = "This month",
                        )
                        StatCard(
                            title = "Total Expenses",
                            value = formatCurrency(stats.totalExpenses),
                            icon = Icons.Outlined.TrendingDown,
                            iconBackground = Color(0xFFFEE2E2),
                            iconTint = KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                            subtitle = "This month",
                        )
                        StatCard(
                            title = "Receivables",
                            value = formatCurrency(stats.receivables),
                            icon = Icons.Outlined.AccountBalance,
                            iconBackground = Color(0xFFDBEAFE),
                            iconTint = KontafyColors.StatusSent,
                            modifier = Modifier.weight(1f),
                            subtitle = "Outstanding",
                        )
                        StatCard(
                            title = "Payables",
                            value = formatCurrency(stats.payables),
                            icon = Icons.Outlined.Payments,
                            iconBackground = Color(0xFFFEF3C7),
                            iconTint = KontafyColors.Warning,
                            modifier = Modifier.weight(1f),
                            subtitle = "Due soon",
                        )
                    }
                }

                // Additional summary row
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        StatCard(
                            title = "Overdue Invoices",
                            value = overdueCount.toString(),
                            icon = Icons.Outlined.Warning,
                            iconBackground = Color(0xFFFEE2E2),
                            iconTint = KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                            subtitle = "Need attention",
                        )
                        StatCard(
                            title = "Pending Payments",
                            value = pendingPaymentsCount.toString(),
                            icon = Icons.Outlined.Schedule,
                            iconBackground = Color(0xFFFEF3C7),
                            iconTint = KontafyColors.Warning,
                            modifier = Modifier.weight(1f),
                            subtitle = "To reconcile",
                        )
                        StatCard(
                            title = "Low Stock Items",
                            value = lowStockCount.toString(),
                            icon = Icons.Outlined.Inventory,
                            iconBackground = Color(0xFFFFE4E6),
                            iconTint = KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                            subtitle = "Below 10 units",
                        )
                    }
                }

                // Quick actions
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        QuickActionCard(
                            title = "Create Invoice",
                            icon = Icons.Outlined.Receipt,
                            color = KontafyColors.Green,
                            onClick = onNavigateToInvoices,
                            modifier = Modifier.weight(1f),
                        )
                        QuickActionCard(
                            title = "Add Customer",
                            icon = Icons.Outlined.PersonAdd,
                            color = KontafyColors.Navy,
                            onClick = onNavigateToCustomers,
                            modifier = Modifier.weight(1f),
                        )
                        QuickActionCard(
                            title = "Record Expense",
                            icon = Icons.Outlined.AddCard,
                            color = KontafyColors.StatusOverdue,
                            onClick = onRecordExpense,
                            modifier = Modifier.weight(1f),
                        )
                        QuickActionCard(
                            title = "View Reports",
                            icon = Icons.Outlined.BarChart,
                            color = KontafyColors.StatusSent,
                            onClick = onViewReports,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                // Recent invoices header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "Recent Invoices",
                            style = MaterialTheme.typography.titleLarge,
                            color = KontafyColors.Ink,
                        )
                        TextButton(onClick = onNavigateToInvoices) {
                            Text(
                                "View All",
                                color = KontafyColors.Navy,
                                style = MaterialTheme.typography.labelLarge,
                            )
                        }
                    }
                }

                // Invoice table header
                item {
                    InvoiceTableHeader()
                }

                // Recent invoices
                val invoices = stats.recentInvoices
                items(invoices) { invoice ->
                    InvoiceRow(
                        invoice = invoice,
                        onClick = { onInvoiceClick(invoice.id) },
                    )
                    HorizontalDivider(color = KontafyColors.BorderLight)
                }
            }
        }
    }
    SnackbarHost(
        hostState = snackbarHostState,
        modifier = Modifier.align(Alignment.BottomCenter),
    )
    }
}

@Composable
private fun QuickActionCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        onClick = onClick,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(36.dp),
                shape = RoundedCornerShape(8.dp),
                color = color.copy(alpha = 0.1f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = title, tint = color, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(
                title,
                style = MaterialTheme.typography.titleSmall,
                color = KontafyColors.Ink,
            )
        }
    }
}

@Composable
private fun InvoiceTableHeader() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = KontafyColors.Surface,
        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Invoice",
                style = MaterialTheme.typography.labelMedium,
                color = KontafyColors.Muted,
                modifier = Modifier.width(140.dp),
            )
            Text(
                "Customer",
                style = MaterialTheme.typography.labelMedium,
                color = KontafyColors.Muted,
                modifier = Modifier.weight(1f),
            )
            Text(
                "Status",
                style = MaterialTheme.typography.labelMedium,
                color = KontafyColors.Muted,
                modifier = Modifier.width(90.dp),
            )
            Spacer(Modifier.width(24.dp))
            Text(
                "Amount",
                style = MaterialTheme.typography.labelMedium,
                color = KontafyColors.Muted,
                modifier = Modifier.width(120.dp),
            )
            Text(
                "Due Date",
                style = MaterialTheme.typography.labelMedium,
                color = KontafyColors.Muted,
                modifier = Modifier.width(100.dp),
            )
        }
    }
}
