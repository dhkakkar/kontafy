package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.InvoiceDto
import com.kontafy.desktop.api.InvoiceItemModel
import com.kontafy.desktop.api.InvoiceModel
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.InvoiceItemRepository
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.services.AccountingService
import com.kontafy.desktop.theme.KontafyColors
import com.kontafy.desktop.util.InvoicePdfGenerator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Composable
fun QuotationDetailScreen(
    quotationId: String,
    invoiceRepository: InvoiceRepository,
    invoiceItemRepository: InvoiceItemRepository,
    contactRepository: ContactRepository,
    onBack: () -> Unit,
    onDeleteSuccess: (String) -> Unit = {},
    onEditQuotation: (String) -> Unit = {},
    onConvertedToInvoice: (String) -> Unit = {},
) {
    var quotation by remember { mutableStateOf<InvoiceDto?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showConvertDialog by remember { mutableStateOf(false) }
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            snackbarMessage = null
        }
    }

    LaunchedEffect(quotationId) {
        scope.launch {
            try {
                val model = invoiceRepository.getById(quotationId)
                if (model != null) {
                    val dto = model.toDto()
                    val contactName = model.contactId?.let { cId ->
                        try { contactRepository.getById(cId)?.name } catch (e: Exception) { e.printStackTrace(); null }
                    } ?: ""
                    val items = try {
                        invoiceItemRepository.getByInvoice(quotationId).map { it.toDto() }
                    } catch (e: Exception) { e.printStackTrace(); emptyList() }
                    quotation = dto.copy(customerName = contactName, items = items)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            isLoading = false
        }
    }

    if (showDeleteDialog) {
        KontafyConfirmDialog(
            title = "Delete Quotation",
            message = "Are you sure you want to delete this quotation? This action cannot be undone.",
            confirmText = "Delete",
            onConfirm = {
                showDeleteDialog = false
                scope.launch {
                    try {
                        invoiceRepository.delete(quotationId)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                    onDeleteSuccess("Quotation deleted successfully")
                }
            },
            onDismiss = { showDeleteDialog = false },
        )
    }

    // Convert to Invoice dialog
    if (showConvertDialog) {
        var invoiceNumber by remember { mutableStateOf(
            try { invoiceRepository.getNextNumber(quotation?.orgId ?: "", "INV") } catch (e: Exception) { "INV-0001" }
        ) }
        var issueDate by remember { mutableStateOf(LocalDate.now().toString()) }
        var dueDate by remember { mutableStateOf(LocalDate.now().plusDays(30).toString()) }
        var isConverting by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { if (!isConverting) showConvertDialog = false },
            title = { Text("Convert to Invoice", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "This will create a new invoice from quotation ${quotation?.invoiceNumber} and mark the quotation as accepted.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.Muted,
                    )
                    OutlinedTextField(
                        value = invoiceNumber,
                        onValueChange = { invoiceNumber = it },
                        label = { Text("Invoice Number") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = issueDate,
                        onValueChange = { issueDate = it },
                        label = { Text("Issue Date (YYYY-MM-DD)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    OutlinedTextField(
                        value = dueDate,
                        onValueChange = { dueDate = it },
                        label = { Text("Due Date (YYYY-MM-DD)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }
            },
            confirmButton = {
                KontafyButton(
                    text = if (isConverting) "Converting..." else "Convert",
                    onClick = {
                        if (isConverting) return@KontafyButton
                        isConverting = true
                        scope.launch {
                            try {
                                val q = quotation ?: throw Exception("Quotation not loaded")
                                val qtModel = invoiceRepository.getById(quotationId) ?: throw Exception("Quotation not found")
                                val qtItems = invoiceItemRepository.getByInvoice(quotationId)

                                // Create new invoice from quotation data
                                val newInvoiceId = UUID.randomUUID().toString()
                                val invoiceModel = InvoiceModel(
                                    id = newInvoiceId,
                                    orgId = qtModel.orgId,
                                    invoiceNumber = invoiceNumber,
                                    contactId = qtModel.contactId,
                                    type = "invoice",
                                    status = "DRAFT",
                                    issueDate = issueDate,
                                    dueDate = dueDate,
                                    subtotal = qtModel.subtotal,
                                    discountAmount = qtModel.discountAmount,
                                    taxAmount = qtModel.taxAmount,
                                    totalAmount = qtModel.totalAmount,
                                    amountPaid = BigDecimal.ZERO,
                                    amountDue = qtModel.totalAmount,
                                    currency = qtModel.currency,
                                    notes = qtModel.notes,
                                    terms = qtModel.terms,
                                    placeOfSupply = qtModel.placeOfSupply,
                                    reverseCharge = qtModel.reverseCharge,
                                    updatedAt = LocalDateTime.now(),
                                )

                                // Clone line items with new IDs
                                val newItems = qtItems.map { item ->
                                    item.copy(
                                        id = UUID.randomUUID().toString(),
                                        invoiceId = newInvoiceId,
                                    )
                                }

                                // Create invoice with items via AccountingService (handles journal entries + contact balance)
                                AccountingService(
                                    invoiceRepository = invoiceRepository,
                                    invoiceItemRepository = invoiceItemRepository,
                                ).createInvoiceWithItems(invoiceModel, newItems)

                                // Mark quotation as converted (prevents duplicate invoice generation)
                                invoiceRepository.update(qtModel.copy(status = "CONVERTED"))

                                showConvertDialog = false
                                onConvertedToInvoice(newInvoiceId)
                            } catch (e: Exception) {
                                e.printStackTrace()
                                isConverting = false
                                snackbarMessage = "Failed to convert: ${e.message}"
                            }
                        }
                    },
                    variant = ButtonVariant.Secondary,
                )
            },
            dismissButton = {
                KontafyButton(
                    text = "Cancel",
                    onClick = { showConvertDialog = false },
                    variant = ButtonVariant.Ghost,
                )
            },
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
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
                    quotation?.invoiceNumber ?: "Quotation",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.Ink,
                )

                quotation?.let { q ->
                    Spacer(Modifier.width(12.dp))
                    StatusBadge(status = q.status)
                }

                Spacer(Modifier.weight(1f))

                KontafyButton(
                    text = "Delete",
                    onClick = { showDeleteDialog = true },
                    variant = ButtonVariant.Ghost,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Print",
                    onClick = {
                        quotation?.let { q ->
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    InvoicePdfGenerator.printInvoice(q)
                                }
                            }
                        }
                    },
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Download PDF",
                    onClick = {
                        quotation?.let { q ->
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    InvoicePdfGenerator.generateAndSave(q)
                                }
                            }
                        }
                    },
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Edit",
                    onClick = { onEditQuotation(quotationId) },
                    variant = ButtonVariant.Outline,
                )
                if (quotation?.status?.uppercase() !in listOf("ACCEPTED", "CONVERTED", "INVOICED")) {
                    Spacer(Modifier.width(8.dp))
                    KontafyButton(
                        text = "Convert to Invoice",
                        onClick = { showConvertDialog = true },
                        variant = ButtonVariant.Secondary,
                    )
                }
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (quotation == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Quotation not found", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
            }
        } else {
            val q = quotation!!
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(20.dp),
                    ) {
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(1.dp),
                        ) {
                            Column(modifier = Modifier.padding(24.dp)) {
                                Text("Quotation Details", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                Spacer(Modifier.height(16.dp))
                                QDetailRow("Quotation Number", q.invoiceNumber)
                                QDetailRow("Date", q.issueDate)
                                QDetailRow("Valid Until", q.dueDate)
                                QDetailRow("Currency", q.currency)
                            }
                        }

                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(1.dp),
                        ) {
                            Column(modifier = Modifier.padding(24.dp)) {
                                Text("Customer", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                Spacer(Modifier.height(16.dp))
                                QDetailRow("Name", q.customerName)
                                if (q.notes != null) {
                                    Spacer(Modifier.height(12.dp))
                                    Text("Notes", style = MaterialTheme.typography.labelLarge, color = KontafyColors.Muted)
                                    Spacer(Modifier.height(4.dp))
                                    Text(q.notes, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.InkSecondary)
                                }
                            }
                        }
                    }
                }

                // Line items table
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(1.dp),
                    ) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text("Line Items", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                            Spacer(Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            ) {
                                Text("Description", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                Text("Qty", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                                Text("Unit Price", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                                Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                            }
                            HorizontalDivider(color = KontafyColors.Border)

                            q.items.forEach { item ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(item.description, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                    Text("${item.quantity}", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.width(80.dp))
                                    Text(formatCurrency(item.unitPrice, q.currency), style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.width(120.dp))
                                    Text(formatCurrency(item.amount, q.currency), style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium, modifier = Modifier.width(120.dp))
                                }
                                HorizontalDivider(color = KontafyColors.BorderLight)
                            }

                            Spacer(Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            ) {
                                Spacer(Modifier.weight(1f))
                                Text("Total", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink, modifier = Modifier.width(120.dp))
                                Text(
                                    formatCurrency(q.amount, q.currency),
                                    style = MaterialTheme.typography.titleLarge,
                                    color = KontafyColors.Navy,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.width(120.dp),
                                )
                            }
                        }
                    }
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
private fun QDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = KontafyColors.Muted,
            modifier = Modifier.width(130.dp),
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyLarge,
            color = KontafyColors.Ink,
            fontWeight = FontWeight.Medium,
        )
    }
}
