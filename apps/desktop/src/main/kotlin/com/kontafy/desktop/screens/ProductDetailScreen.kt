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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ProductDto
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AuditLogEntry
import com.kontafy.desktop.db.repositories.AuditLogRepository
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter

@Composable
fun ProductDetailScreen(
    productId: String,
    productRepository: ProductRepository,
    auditLogRepository: AuditLogRepository = AuditLogRepository(),
    invoiceRepository: InvoiceRepository = InvoiceRepository(),
    onBack: () -> Unit,
    onDeleteSuccess: (String) -> Unit = {},
    onEdit: (String) -> Unit,
    onNavigateToInvoice: (String) -> Unit = {},
    onNavigateToPurchaseOrder: (String) -> Unit = {},
) {
    var product by remember { mutableStateOf<ProductDto?>(null) }
    var stockMovements by remember { mutableStateOf<List<AuditLogEntry>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    // Cache invoice lookups: invoiceNumber -> invoiceId
    val invoiceLookup = remember { mutableStateMapOf<String, String>() }

    LaunchedEffect(productId) {
        scope.launch {
            try {
                product = productRepository.getById(productId)?.toDto()
            } catch (e: Exception) {
                e.printStackTrace()
            }
            try {
                stockMovements = auditLogRepository.getByEntity("product", productId)
                    .filter { it.action in listOf("STOCK_RECEIVED", "STOCK_SOLD", "STOCK_ADJUSTED") }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            isLoading = false
        }
    }

    if (showDeleteDialog) {
        KontafyConfirmDialog(
            title = "Delete Product",
            message = "Are you sure you want to delete \"${product?.name}\"? This action cannot be undone.",
            confirmText = "Delete",
            confirmVariant = ButtonVariant.Primary,
            onConfirm = {
                showDeleteDialog = false
                scope.launch {
                    try {
                        productRepository.delete(productId)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                    onDeleteSuccess("Product deleted successfully")
                }
            },
            onDismiss = { showDeleteDialog = false },
        )
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = product?.name ?: "Product Detail",
            actions = {
                KontafyButton(
                    text = "Back",
                    onClick = onBack,
                    variant = ButtonVariant.Ghost,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Edit",
                    onClick = { onEdit(productId) },
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Delete",
                    onClick = { showDeleteDialog = true },
                    variant = ButtonVariant.Primary,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            val p = product ?: return@Column

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                // Product Info Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(1.dp),
                    ) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text("Product Information", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                            Spacer(Modifier.height(16.dp))
                            ProductDetailRow("Name", p.name)
                            ProductDetailRow("SKU", p.sku ?: "-")
                            ProductDetailRow("Type", p.type.replaceFirstChar { it.titlecase() })
                            ProductDetailRow(
                                if (p.type == "GOODS") "HSN Code" else "SAC Code",
                                if (p.type == "GOODS") p.hsnCode ?: "-" else p.sacCode ?: "-",
                            )
                            ProductDetailRow("Tax Rate", "${p.taxRate.toInt()}%")
                            p.description?.let { ProductDetailRow("Description", it) }
                        }
                    }
                }

                // Pricing Card
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(1.dp),
                    ) {
                        Column(modifier = Modifier.padding(24.dp)) {
                            Text("Pricing", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                            Spacer(Modifier.height(16.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                                StatCard(
                                    title = "Selling Price",
                                    value = formatCurrency(p.sellingPrice),
                                    icon = Icons.Outlined.TrendingUp,
                                    iconBackground = Color(0xFFD1FAE5),
                                    iconTint = KontafyColors.Green,
                                    modifier = Modifier.weight(1f),
                                )
                                StatCard(
                                    title = "Purchase Price",
                                    value = formatCurrency(p.purchasePrice),
                                    icon = Icons.Outlined.TrendingDown,
                                    iconBackground = Color(0xFFFEE2E2),
                                    iconTint = KontafyColors.StatusOverdue,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            ProductDetailRow("Unit", p.unit)
                        }
                    }
                }

                // Stock Card (goods only)
                if (p.type == "GOODS") {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(1.dp),
                        ) {
                            Column(modifier = Modifier.padding(24.dp)) {
                                Text("Stock", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                Spacer(Modifier.height(16.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(32.dp)) {
                                    StatCard(
                                        title = "Current Stock",
                                        value = p.stockQuantity.toInt().toString(),
                                        icon = Icons.Outlined.Inventory,
                                        iconBackground = Color(0xFFDBEAFE),
                                        iconTint = KontafyColors.StatusSent,
                                        modifier = Modifier.weight(1f),
                                        subtitle = "units",
                                    )
                                    StatCard(
                                        title = "Reorder Level",
                                        value = p.reorderLevel.toInt().toString(),
                                        icon = Icons.Outlined.Warning,
                                        iconBackground = Color(0xFFFEF3C7),
                                        iconTint = KontafyColors.Warning,
                                        modifier = Modifier.weight(1f),
                                        subtitle = "units",
                                    )
                                    StatCard(
                                        title = "Stock Value",
                                        value = formatCurrency(p.stockQuantity * p.purchasePrice),
                                        icon = Icons.Outlined.AccountBalance,
                                        iconBackground = Color(0xFFD1FAE5),
                                        iconTint = KontafyColors.Green,
                                        modifier = Modifier.weight(1f),
                                        subtitle = "qty x purchase price",
                                    )
                                }
                            }
                        }
                    }
                }

                // Stock Movement History from audit logs
                if (p.type == "GOODS" && stockMovements.isNotEmpty()) {
                    item {
                        Text(
                            "Stock Movement History",
                            style = MaterialTheme.typography.titleLarge,
                            color = KontafyColors.Ink,
                        )
                    }

                    // Table header
                    item {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = KontafyColors.Surface,
                            shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                            ) {
                                Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp))
                                Text("Type", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                                Text("Change", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                Text("Balance After", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                Text("Reference", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                            }
                        }
                        HorizontalDivider(color = KontafyColors.Border)
                    }

                    items(stockMovements, key = { it.id }) { mv ->
                        ProductStockMovementRow(
                            mv = mv,
                            invoiceLookup = invoiceLookup,
                            invoiceRepository = invoiceRepository,
                            onNavigateToInvoice = onNavigateToInvoice,
                            onNavigateToPurchaseOrder = onNavigateToPurchaseOrder,
                        )
                        HorizontalDivider(color = KontafyColors.BorderLight)
                    }
                }

                if (p.type == "GOODS" && stockMovements.isEmpty()) {
                    item {
                        Text(
                            "Stock Movement History",
                            style = MaterialTheme.typography.titleLarge,
                            color = KontafyColors.Ink,
                        )
                        Spacer(Modifier.height(12.dp))
                        Text(
                            "No stock movements recorded yet",
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Muted,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductStockMovementRow(
    mv: AuditLogEntry,
    invoiceLookup: MutableMap<String, String>,
    invoiceRepository: InvoiceRepository,
    onNavigateToInvoice: (String) -> Unit,
    onNavigateToPurchaseOrder: (String) -> Unit,
) {
    val change = try {
        val o = mv.oldValue?.toDoubleOrNull() ?: 0.0
        val n = mv.newValue?.toDoubleOrNull() ?: 0.0
        val diff = n - o
        if (diff >= 0) "+${diff.toInt()}" else "${diff.toInt()}"
    } catch (e: Exception) { "—" }

    val changeColor = if (change.startsWith("+")) KontafyColors.Green else KontafyColors.StatusOverdue

    val typeLabel = when (mv.action) {
        "STOCK_RECEIVED" -> "Received"
        "STOCK_SOLD" -> "Sold"
        "STOCK_ADJUSTED" -> "Adjustment"
        else -> mv.action
    }

    val badgeType = when (mv.action) {
        "STOCK_RECEIVED" -> BadgeType.Success
        "STOCK_SOLD" -> BadgeType.Info
        "STOCK_ADJUSTED" -> BadgeType.Warning
        else -> BadgeType.Neutral
    }

    // Extract invoice/PO number from description
    val refNumber = extractReferenceNumber(mv.description)
    val scope = rememberCoroutineScope()
    var refId by remember { mutableStateOf<String?>(invoiceLookup[refNumber]) }

    // Lazy-load the invoice ID
    LaunchedEffect(refNumber) {
        if (refNumber != null && refId == null && !invoiceLookup.containsKey(refNumber)) {
            scope.launch {
                try {
                    val results = invoiceRepository.search(refNumber)
                    val match = results.find { it.invoiceNumber == refNumber }
                    if (match != null) {
                        invoiceLookup[refNumber] = match.id
                        refId = match.id
                    }
                } catch (e: Exception) { e.printStackTrace() }
            }
        }
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = KontafyColors.SurfaceElevated,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                mv.createdAt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")),
                style = MaterialTheme.typography.bodySmall,
                color = KontafyColors.Muted,
                modifier = Modifier.width(140.dp),
            )
            Box(modifier = Modifier.width(120.dp)) {
                KontafyBadge(text = typeLabel, type = badgeType)
            }
            Text(
                change,
                style = MaterialTheme.typography.bodyMedium,
                color = changeColor,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.width(100.dp),
            )
            Text(
                mv.newValue ?: "—",
                style = MaterialTheme.typography.bodyMedium,
                color = KontafyColors.Ink,
                modifier = Modifier.width(100.dp),
            )
            Column(modifier = Modifier.weight(1f)) {
                if (refNumber != null) {
                    val isInvoice = refNumber.startsWith("INV")
                    val isPO = refNumber.startsWith("PO")
                    Text(
                        refNumber,
                        style = MaterialTheme.typography.bodyMedium.copy(
                            textDecoration = if (refId != null) TextDecoration.Underline else TextDecoration.None,
                        ),
                        color = if (refId != null) KontafyColors.Navy else KontafyColors.Ink,
                        fontWeight = FontWeight.Medium,
                        modifier = if (refId != null) {
                            Modifier.clickable {
                                if (isPO) onNavigateToPurchaseOrder(refId!!)
                                else onNavigateToInvoice(refId!!)
                            }
                        } else Modifier,
                    )
                }
                Text(
                    mv.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = KontafyColors.Muted,
                    maxLines = 1,
                )
            }
        }
    }
}

/**
 * Extract invoice/PO number from audit log description.
 * Patterns: "Invoice INV-0001", "PO PO-0001"
 */
private fun extractReferenceNumber(description: String): String? {
    val invoiceMatch = Regex("Invoice\\s+(INV-\\S+)").find(description)
    if (invoiceMatch != null) return invoiceMatch.groupValues[1].trimEnd(':')

    val poMatch = Regex("PO\\s+(PO-\\S+)").find(description)
    if (poMatch != null) return poMatch.groupValues[1].trimEnd(':')

    return null
}

@Composable
private fun ProductDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = KontafyColors.Muted,
            modifier = Modifier.width(150.dp),
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyLarge,
            color = KontafyColors.Ink,
            fontWeight = FontWeight.Medium,
        )
    }
}
