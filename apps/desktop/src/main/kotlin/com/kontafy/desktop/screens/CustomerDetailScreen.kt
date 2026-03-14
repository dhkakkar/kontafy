package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.CustomerDto
import com.kontafy.desktop.api.InvoiceDto
import com.kontafy.desktop.api.toCustomerDto
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.PaymentRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun CustomerDetailScreen(
    customerId: String,
    contactRepository: ContactRepository,
    invoiceRepository: InvoiceRepository = InvoiceRepository(),
    paymentRepository: PaymentRepository = PaymentRepository(),
    onBack: () -> Unit,
    onDeleteSuccess: (String) -> Unit = {},
    onEditCustomer: (String) -> Unit,
    onInvoiceClick: (String) -> Unit,
    onNavigateToLedger: () -> Unit = {},
) {
    var customer by remember { mutableStateOf<CustomerDto?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableStateOf(0) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Customer invoices loaded from local DB
    var customerInvoices by remember { mutableStateOf<List<InvoiceDto>>(emptyList()) }

    // Payments loaded from local DB
    data class PaymentRecord(val id: String, val date: String, val amount: Double, val method: String, val invoiceRef: String)
    var payments by remember { mutableStateOf<List<PaymentRecord>>(emptyList()) }

    // Computed totals
    var totalPaid by remember { mutableStateOf(0.0) }
    var totalDue by remember { mutableStateOf(0.0) }

    LaunchedEffect(customerId) {
        scope.launch {
            try {
                val contact = contactRepository.getById(customerId)
                customer = contact?.toCustomerDto()

                // Load invoices for this customer from local DB
                val invoices = try {
                    invoiceRepository.getByContact(customerId)
                        .filter { it.type == "invoice" }
                        .map { it.toDto() }
                } catch (_: Exception) { emptyList() }
                customerInvoices = invoices

                // Calculate paid and due amounts
                totalPaid = invoices.sumOf { it.amountPaid }
                totalDue = invoices.sumOf { it.amountDue }

                // Update customer with actual invoice count
                customer = customer?.copy(
                    totalInvoices = invoices.size,
                    outstandingAmount = totalDue,
                )

                // Load payments for this customer
                val paymentModels = try {
                    paymentRepository.getByContact(customerId)
                } catch (_: Exception) { emptyList() }

                // Build invoice number map for payment references
                val invoiceNumberMap = invoices.associate { it.id to it.invoiceNumber }

                payments = paymentModels.map { p ->
                    PaymentRecord(
                        id = p.id,
                        date = p.paymentDate,
                        amount = p.amount.toDouble(),
                        method = p.method.replaceFirstChar { it.titlecase() },
                        invoiceRef = p.invoiceId?.let { invoiceNumberMap[it] } ?: "-",
                    )
                }
            } catch (_: Exception) {}
            isLoading = false
        }
    }

    if (showDeleteDialog) {
        KontafyConfirmDialog(
            title = "Delete ${customer?.type?.replaceFirstChar { it.titlecase() } ?: "Customer"}",
            message = "Are you sure you want to delete ${customer?.name}? This action cannot be undone.",
            confirmText = "Delete",
            onConfirm = {
                showDeleteDialog = false
                scope.launch {
                    try {
                        contactRepository.delete(customerId)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                    onDeleteSuccess("${customer?.type?.replaceFirstChar { it.titlecase() } ?: "Customer"} deleted successfully")
                }
            },
            onDismiss = { showDeleteDialog = false },
        )
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        // Top bar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = KontafyColors.SurfaceElevated,
            shadowElevation = 1.dp,
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Outlined.ArrowBack, "Back", tint = KontafyColors.Ink)
                }
                Spacer(Modifier.width(12.dp))
                Text(
                    customer?.name ?: "Customer",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.Ink,
                )
                Spacer(Modifier.weight(1f))
                KontafyButton(
                    text = "Ledger",
                    onClick = onNavigateToLedger,
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Delete",
                    onClick = { showDeleteDialog = true },
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Edit",
                    onClick = { onEditCustomer(customerId) },
                    variant = ButtonVariant.Secondary,
                )
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (customer == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Customer not found", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
            }
        } else {
            val cust = customer!!
            val isVendor = cust.type.uppercase() == "VENDOR"
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(24.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                ) {
                    // Customer Info Card
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(20.dp),
                        ) {
                            // Details card
                            Card(
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                                elevation = CardDefaults.cardElevation(1.dp),
                            ) {
                                Column(modifier = Modifier.padding(24.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        // Avatar
                                        Surface(
                                            modifier = Modifier.size(52.dp),
                                            shape = RoundedCornerShape(26.dp),
                                            color = KontafyColors.Navy.copy(alpha = 0.1f),
                                        ) {
                                            Box(contentAlignment = Alignment.Center) {
                                                Text(
                                                    cust.name.take(2).uppercase(),
                                                    style = MaterialTheme.typography.titleMedium,
                                                    color = KontafyColors.Navy,
                                                    fontWeight = FontWeight.Bold,
                                                )
                                            }
                                        }
                                        Spacer(Modifier.width(16.dp))
                                        Column {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text(
                                                    cust.name,
                                                    style = MaterialTheme.typography.headlineSmall,
                                                    color = KontafyColors.Ink,
                                                    fontWeight = FontWeight.SemiBold,
                                                )
                                                Spacer(Modifier.width(12.dp))
                                                CustomerTypeBadge(cust.type.uppercase())
                                            }
                                            Spacer(Modifier.height(4.dp))
                                            cust.address?.let { addr ->
                                                Text(addr, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(20.dp))
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                    Spacer(Modifier.height(16.dp))

                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                                        Column {
                                            Text("Email", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                                            Spacer(Modifier.height(4.dp))
                                            Text(cust.email ?: "-", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink)
                                        }
                                        Column {
                                            Text("Phone", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                                            Spacer(Modifier.height(4.dp))
                                            Text(cust.phone ?: "-", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink)
                                        }
                                        Column {
                                            Text("GSTIN", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                                            Spacer(Modifier.height(4.dp))
                                            Text(cust.gstin ?: "-", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
                                        }
                                    }
                                }
                            }

                            // Summary card with invoices, paid, due
                            Card(
                                modifier = Modifier.width(300.dp),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                                elevation = CardDefaults.cardElevation(1.dp),
                            ) {
                                Column(
                                    modifier = Modifier.padding(24.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                ) {
                                    // Total invoices
                                    Text("${customerInvoices.size} Invoices", style = MaterialTheme.typography.titleMedium, color = KontafyColors.Navy, fontWeight = FontWeight.Bold)
                                    Spacer(Modifier.height(16.dp))
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                    Spacer(Modifier.height(16.dp))

                                    // Paid and Due amounts
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceEvenly,
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                formatCurrency(totalPaid),
                                                style = MaterialTheme.typography.titleMedium,
                                                color = KontafyColors.StatusPaid,
                                                fontWeight = FontWeight.Bold,
                                            )
                                            Text("Paid", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                                        }
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text(
                                                formatCurrency(totalDue),
                                                style = MaterialTheme.typography.titleMedium,
                                                color = if (totalDue > 0) KontafyColors.StatusOverdue else KontafyColors.StatusPaid,
                                                fontWeight = FontWeight.Bold,
                                            )
                                            Text("Due", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                                        }
                                    }

                                    Spacer(Modifier.height(16.dp))
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                    Spacer(Modifier.height(16.dp))

                                    // Invoice status breakdown
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceEvenly,
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text("${customerInvoices.count { it.status.uppercase() == "PAID" }}", style = MaterialTheme.typography.titleLarge, color = KontafyColors.StatusPaid, fontWeight = FontWeight.Bold)
                                            Text("Paid", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                                        }
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text("${customerInvoices.count { it.status.uppercase() == "SENT" || it.status.uppercase() == "DRAFT" }}", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Navy, fontWeight = FontWeight.Bold)
                                            Text("Pending", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                                        }
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text("${customerInvoices.count { it.status.uppercase() == "OVERDUE" }}", style = MaterialTheme.typography.titleLarge, color = KontafyColors.StatusOverdue, fontWeight = FontWeight.Bold)
                                            Text("Overdue", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Tabs
                    item {
                        val tabs = listOf(
                            TabItem("Invoices", "${customerInvoices.size}"),
                            TabItem("Payments", "${payments.size}"),
                        )
                        KontafyTabBar(
                            tabs = tabs,
                            selectedIndex = selectedTab,
                            onTabSelected = { selectedTab = it },
                        )
                    }

                    // Tab content
                    when (selectedTab) {
                        0 -> {
                            // Invoices tab
                            if (customerInvoices.isEmpty()) {
                                item {
                                    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
                                        Text("No invoices found", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
                                    }
                                }
                            } else {
                                item {
                                    // Table header
                                    Surface(
                                        modifier = Modifier.fillMaxWidth(),
                                        color = KontafyColors.Surface,
                                        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Text("Invoice", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp))
                                            Text("Status", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                            Spacer(Modifier.width(24.dp))
                                            Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                            Text("Issue Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                            Text("Due Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                        }
                                    }
                                }
                                items(customerInvoices) { invoice ->
                                    Surface(
                                        modifier = Modifier.fillMaxWidth()
                                            .clickable { onInvoiceClick(invoice.id) },
                                        color = KontafyColors.SurfaceElevated,
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Text(
                                                invoice.invoiceNumber,
                                                style = MaterialTheme.typography.bodyLarge,
                                                color = KontafyColors.Navy,
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.width(140.dp),
                                            )
                                            StatusBadge(status = invoice.status, modifier = Modifier.width(90.dp))
                                            Spacer(Modifier.width(24.dp))
                                            Text(
                                                formatCurrency(invoice.amount, invoice.currency),
                                                style = MaterialTheme.typography.bodyLarge,
                                                color = KontafyColors.Ink,
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.weight(1f),
                                            )
                                            Text(invoice.issueDate, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                            Text(invoice.dueDate, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                        }
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }
                        1 -> {
                            // Payments tab
                            if (payments.isEmpty()) {
                                item {
                                    Box(modifier = Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
                                        Text("No payments recorded", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
                                    }
                                }
                            } else {
                                item {
                                    Surface(
                                        modifier = Modifier.fillMaxWidth(),
                                        color = KontafyColors.Surface,
                                        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                                            Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp))
                                            Text("Method", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                            Text("Invoice", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                                        }
                                    }
                                }
                                items(payments) { payment ->
                                    Surface(
                                        modifier = Modifier.fillMaxWidth(),
                                        color = KontafyColors.SurfaceElevated,
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Text(payment.date, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(120.dp))
                                            Text(
                                                formatCurrency(payment.amount),
                                                style = MaterialTheme.typography.bodyLarge,
                                                color = KontafyColors.StatusPaid,
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.width(140.dp),
                                            )
                                            Text(payment.method, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                            Text(payment.invoiceRef, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.Medium, modifier = Modifier.width(120.dp))
                                        }
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }
                    }
                }
        }
    }
}
