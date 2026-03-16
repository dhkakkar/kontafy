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
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.*
import com.kontafy.desktop.theme.KontafyColors
import com.kontafy.desktop.util.InvoicePdfGenerator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.math.BigDecimal

@Composable
fun PurchaseOrderDetailScreen(
    poId: String,
    currentOrgId: String = "",
    invoiceRepository: InvoiceRepository,
    invoiceItemRepository: InvoiceItemRepository,
    contactRepository: ContactRepository,
    productRepository: ProductRepository = ProductRepository(),
    auditLogRepository: AuditLogRepository = AuditLogRepository(),
    onBack: () -> Unit,
    onDeleteSuccess: (String) -> Unit = {},
    onEditPurchaseOrder: (String) -> Unit = {},
    showSnackbar: (String) -> Unit = {},
) {
    var purchaseOrder by remember { mutableStateOf<InvoiceDto?>(null) }
    var vendorEmail by remember { mutableStateOf<String?>(null) }
    var vendorPhone by remember { mutableStateOf<String?>(null) }
    var vendorGstin by remember { mutableStateOf<String?>(null) }
    var vendorAddress by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showReceiveDialog by remember { mutableStateOf(false) }
    var isReceiving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(poId) {
        scope.launch {
            try {
                val model = invoiceRepository.getById(poId)
                if (model != null) {
                    val dto = model.toDto()
                    val contact = model.contactId?.let { cId ->
                        try { contactRepository.getById(cId) } catch (e: Exception) { e.printStackTrace(); null }
                    }
                    val contactName = contact?.name ?: ""
                    vendorEmail = contact?.email
                    vendorPhone = contact?.phone
                    vendorGstin = contact?.gstin
                    vendorAddress = contact?.billingAddress
                    val items = try {
                        invoiceItemRepository.getByInvoice(poId).map { it.toDto() }
                    } catch (e: Exception) { e.printStackTrace(); emptyList() }
                    purchaseOrder = dto.copy(customerName = contactName, items = items)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            isLoading = false
        }
    }

    if (showDeleteDialog) {
        KontafyConfirmDialog(
            title = "Delete Purchase Order",
            message = "Are you sure you want to delete this purchase order? This action cannot be undone.",
            confirmText = "Delete",
            onConfirm = {
                showDeleteDialog = false
                scope.launch {
                    try {
                        invoiceRepository.delete(poId)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                    onDeleteSuccess("Purchase order deleted successfully")
                }
            },
            onDismiss = { showDeleteDialog = false },
        )
    }

    if (showReceiveDialog) {
        KontafyConfirmDialog(
            title = "Mark as Received",
            message = "This will add the PO quantities to your stock inventory. Are you sure goods have been received?",
            confirmText = "Confirm Receipt",
            onConfirm = {
                showReceiveDialog = false
                isReceiving = true
                scope.launch {
                    try {
                        val po = purchaseOrder ?: return@launch
                        val products = productRepository.getByOrgId(currentOrgId)

                        po.items.forEach { item ->
                            val productId = item.productId
                            val product = if (productId != null) {
                                products.find { it.id == productId }
                            } else {
                                products.find { it.name.equals(item.description, ignoreCase = true) }
                            }
                            if (product != null) {
                                val addQty = BigDecimal.valueOf(item.quantity)
                                val newStock = product.stockQuantity + addQty
                                productRepository.update(product.copy(stockQuantity = newStock))

                                auditLogRepository.create(
                                    AuditLogEntry(
                                        orgId = currentOrgId,
                                        entityType = "product",
                                        entityId = product.id,
                                        action = "STOCK_RECEIVED",
                                        fieldChanged = "stockQuantity",
                                        oldValue = product.stockQuantity.toPlainString(),
                                        newValue = newStock.toPlainString(),
                                        description = "Stock received from PO ${po.invoiceNumber}: +${item.quantity} ${product.name}",
                                    ),
                                )
                            }
                        }

                        // Update PO status to RECEIVED
                        val model = invoiceRepository.getById(poId)
                        if (model != null) {
                            invoiceRepository.update(model.copy(status = "RECEIVED"))
                            purchaseOrder = purchaseOrder?.copy(status = "RECEIVED")
                        }

                        auditLogRepository.create(
                            AuditLogEntry(
                                orgId = currentOrgId,
                                entityType = "purchase_order",
                                entityId = poId,
                                action = "STATUS_CHANGE",
                                fieldChanged = "status",
                                oldValue = po.status,
                                newValue = "RECEIVED",
                                description = "PO ${po.invoiceNumber} marked as received. Stock updated for ${po.items.size} item(s).",
                            ),
                        )

                        showSnackbar("Stock updated successfully")
                    } catch (e: Exception) {
                        e.printStackTrace()
                        showSnackbar("Failed to update stock: ${e.message}")
                    }
                    isReceiving = false
                }
            },
            onDismiss = { showReceiveDialog = false },
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
                    purchaseOrder?.invoiceNumber ?: "Purchase Order",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.Ink,
                )

                purchaseOrder?.let { po ->
                    Spacer(Modifier.width(12.dp))
                    StatusBadge(status = po.status)
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
                        purchaseOrder?.let { po ->
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    InvoicePdfGenerator.printInvoice(po)
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
                        purchaseOrder?.let { po ->
                            scope.launch {
                                withContext(Dispatchers.IO) {
                                    InvoicePdfGenerator.generateAndSave(po)
                                }
                            }
                        }
                    },
                    variant = ButtonVariant.Outline,
                )
                if (purchaseOrder?.status?.uppercase() !in listOf("RECEIVED", "CANCELLED")) {
                    Spacer(Modifier.width(8.dp))
                    KontafyButton(
                        text = "Mark as Received",
                        onClick = { showReceiveDialog = true },
                        variant = ButtonVariant.Primary,
                        enabled = !isReceiving,
                        isLoading = isReceiving,
                    )
                }
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Edit",
                    onClick = { onEditPurchaseOrder(poId) },
                    variant = ButtonVariant.Outline,
                )
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (purchaseOrder == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Purchase order not found", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
            }
        } else {
            val po = purchaseOrder!!
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
                                Text("Purchase Order Details", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                Spacer(Modifier.height(16.dp))
                                PODetRow("PO Number", po.invoiceNumber)
                                PODetRow("Date", po.issueDate)
                                PODetRow("Delivery Date", po.dueDate)
                                PODetRow("Currency", po.currency)
                            }
                        }

                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(1.dp),
                        ) {
                            Column(modifier = Modifier.padding(24.dp)) {
                                Text("Vendor", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                Spacer(Modifier.height(16.dp))
                                PODetRow("Name", po.customerName)
                                if (!vendorEmail.isNullOrBlank()) PODetRow("Email", vendorEmail!!)
                                if (!vendorPhone.isNullOrBlank()) PODetRow("Phone", vendorPhone!!)
                                if (!vendorGstin.isNullOrBlank()) PODetRow("GSTIN", vendorGstin!!)
                                if (!vendorAddress.isNullOrBlank()) PODetRow("Address", vendorAddress!!)
                                if (po.notes != null) {
                                    Spacer(Modifier.height(12.dp))
                                    Text("Notes", style = MaterialTheme.typography.labelLarge, color = KontafyColors.Muted)
                                    Spacer(Modifier.height(4.dp))
                                    Text(po.notes, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.InkSecondary)
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

                            po.items.forEach { item ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(item.description, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                    Text("${item.quantity}", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.width(80.dp))
                                    Text(formatCurrency(item.unitPrice, po.currency), style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.width(120.dp))
                                    Text(formatCurrency(item.amount, po.currency), style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium, modifier = Modifier.width(120.dp))
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
                                    formatCurrency(po.amount, po.currency),
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
private fun PODetRow(label: String, value: String) {
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
