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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.InvoiceDto
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.InvoiceItemRepository
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.theme.KontafyColors
import com.kontafy.desktop.util.InvoicePdfGenerator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun InvoiceDetailScreen(
    invoiceId: String,
    invoiceRepository: InvoiceRepository,
    invoiceItemRepository: InvoiceItemRepository,
    contactRepository: ContactRepository,
    onBack: () -> Unit,
    onDeleteSuccess: (String) -> Unit = {},
    onEditInvoice: (String) -> Unit = {},
) {
    var invoice by remember { mutableStateOf<InvoiceDto?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(invoiceId) {
        scope.launch {
            try {
                val model = invoiceRepository.getById(invoiceId)
                if (model != null) {
                    val dto = model.toDto()
                    val contactName = model.contactId?.let { cId ->
                        try { contactRepository.getById(cId)?.name } catch (_: Exception) { null }
                    } ?: ""
                    val items = try {
                        invoiceItemRepository.getByInvoice(invoiceId).map { it.toDto() }
                    } catch (_: Exception) { emptyList() }
                    invoice = dto.copy(customerName = contactName, items = items)
                }
            } catch (_: Exception) {}
            isLoading = false
        }
    }

    if (showDeleteDialog) {
        KontafyConfirmDialog(
            title = "Delete Invoice",
            message = "Are you sure you want to delete ${invoice?.invoiceNumber}? This action cannot be undone.",
            confirmText = "Delete",
            onConfirm = {
                showDeleteDialog = false
                scope.launch {
                    try {
                        invoiceRepository.delete(invoiceId)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                    onDeleteSuccess("Invoice deleted successfully")
                }
            },
            onDismiss = { showDeleteDialog = false },
        )
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        // Top bar with back button
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
                    invoice?.invoiceNumber ?: "Invoice",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.Ink,
                )

                invoice?.let { inv ->
                    Spacer(Modifier.width(12.dp))
                    StatusBadge(status = inv.status)
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
                        invoice?.let { inv ->
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    InvoicePdfGenerator.printInvoice(inv)
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
                        invoice?.let { inv ->
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    InvoicePdfGenerator.generateAndSave(inv)
                                }
                            }
                        }
                    },
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Edit",
                    onClick = { onEditInvoice(invoiceId) },
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Send Invoice",
                    onClick = {},
                    variant = ButtonVariant.Secondary,
                )
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (invoice == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Invoice not found", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
            }
        } else {
            val inv = invoice!!
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(24.dp),
                    verticalArrangement = Arrangement.spacedBy(20.dp),
                ) {
                    // Invoice details cards
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(20.dp),
                        ) {
                            // Invoice info
                            Card(
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                                elevation = CardDefaults.cardElevation(1.dp),
                            ) {
                                Column(modifier = Modifier.padding(24.dp)) {
                                    Text("Invoice Details", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                    Spacer(Modifier.height(16.dp))
                                    DetailRow("Invoice Number", inv.invoiceNumber)
                                    DetailRow("Issue Date", inv.issueDate)
                                    DetailRow("Due Date", inv.dueDate)
                                    DetailRow("Currency", inv.currency)
                                }
                            }

                            // Customer info
                            Card(
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                                elevation = CardDefaults.cardElevation(1.dp),
                            ) {
                                Column(modifier = Modifier.padding(24.dp)) {
                                    Text("Customer", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                    Spacer(Modifier.height(16.dp))
                                    DetailRow("Name", inv.customerName)
                                    if (inv.notes != null) {
                                        Spacer(Modifier.height(12.dp))
                                        Text("Notes", style = MaterialTheme.typography.labelLarge, color = KontafyColors.Muted)
                                        Spacer(Modifier.height(4.dp))
                                        Text(inv.notes, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.InkSecondary)
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

                                // Table header
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                ) {
                                    Text("Description", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("Qty", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                                    Text("Unit Price", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                                    Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                                }
                                HorizontalDivider(color = KontafyColors.Border)

                                inv.items.forEach { item ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(item.description, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                        Text("${item.quantity}", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.width(80.dp))
                                        Text(formatCurrency(item.unitPrice, inv.currency), style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.width(120.dp))
                                        Text(formatCurrency(item.amount, inv.currency), style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium, modifier = Modifier.width(120.dp))
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }

                                // Total
                                Spacer(Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                ) {
                                    Spacer(Modifier.weight(1f))
                                    Text("Total", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink, modifier = Modifier.width(120.dp))
                                    Text(
                                        formatCurrency(inv.amount, inv.currency),
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
}

@Composable
private fun DetailRow(label: String, value: String) {
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
