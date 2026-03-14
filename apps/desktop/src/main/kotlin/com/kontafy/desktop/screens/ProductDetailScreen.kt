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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ProductDto
import com.kontafy.desktop.api.StockMovementDto
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun ProductDetailScreen(
    productId: String,
    productRepository: ProductRepository,
    onBack: () -> Unit,
    onDeleteSuccess: (String) -> Unit = {},
    onEdit: (String) -> Unit,
) {
    var product by remember { mutableStateOf<ProductDto?>(null) }
    var movements by remember { mutableStateOf<List<StockMovementDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(productId) {
        scope.launch {
            try {
                product = productRepository.getById(productId)?.toDto()
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

                // Stock Movement History
                if (p.type == "GOODS" && movements.isNotEmpty()) {
                    item {
                        Text(
                            "Stock Movement History",
                            style = MaterialTheme.typography.titleLarge,
                            color = KontafyColors.Ink,
                        )
                    }

                    item {
                        val movementColumns = listOf(
                            TableColumn<StockMovementDto>(
                                header = "Date",
                                width = 110.dp,
                                content = { mv ->
                                    Text(mv.date, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink)
                                },
                            ),
                            TableColumn<StockMovementDto>(
                                header = "Type",
                                width = 110.dp,
                                content = { mv ->
                                    val badgeType = when (mv.type) {
                                        "PURCHASE" -> BadgeType.Success
                                        "SALE" -> BadgeType.Info
                                        "RETURN" -> BadgeType.Warning
                                        "ADJUSTMENT" -> BadgeType.Neutral
                                        "TRANSFER" -> BadgeType.Info
                                        else -> BadgeType.Neutral
                                    }
                                    KontafyBadge(text = mv.type.replaceFirstChar { it.titlecase() }, type = badgeType)
                                },
                            ),
                            TableColumn<StockMovementDto>(
                                header = "Qty Change",
                                width = 100.dp,
                                content = { mv ->
                                    val prefix = if (mv.quantity > 0) "+" else ""
                                    val color = if (mv.quantity > 0) KontafyColors.Green else KontafyColors.StatusOverdue
                                    Text(
                                        "$prefix${mv.quantity.toInt()}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = color,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                },
                            ),
                            TableColumn<StockMovementDto>(
                                header = "Balance After",
                                width = 100.dp,
                                content = { mv ->
                                    Text(
                                        mv.balanceAfter.toInt().toString(),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = KontafyColors.Ink,
                                    )
                                },
                            ),
                            TableColumn<StockMovementDto>(
                                header = "Reference",
                                weight = 1f,
                                content = { mv ->
                                    Text(
                                        mv.reference ?: "-",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = KontafyColors.Muted,
                                    )
                                },
                            ),
                        )

                        KontafyDataTable(
                            columns = movementColumns,
                            data = movements,
                            emptyStateTitle = "No movements",
                            emptyStateSubtitle = "No stock movements recorded yet",
                        )
                    }
                }
            }
        }
    }
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
