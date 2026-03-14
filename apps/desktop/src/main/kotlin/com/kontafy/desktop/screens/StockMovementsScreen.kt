package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.StockMovementDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun StockMovementsScreen(
    apiClient: ApiClient,
    productRepository: ProductRepository = ProductRepository(),
    onNewAdjustment: () -> Unit,
) {
    var movements by remember { mutableStateOf<List<StockMovementDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedFilter by remember { mutableStateOf("All") }
    val scope = rememberCoroutineScope()

    val filters = listOf("All", "Purchase", "Sale", "Return", "Adjustment", "Transfer")

    LaunchedEffect(Unit) {
        scope.launch {
            // Try local DB first - show products as placeholder stock data
            val localProducts = productRepository.getAll()
            if (localProducts.isNotEmpty() && movements.isEmpty()) {
                movements = localProducts.filter { it.type.equals("goods", ignoreCase = true) }.map { product ->
                    StockMovementDto(
                        id = product.id,
                        productId = product.id,
                        productName = product.name,
                        type = "ADJUSTMENT",
                        quantity = product.stockQuantity.toDouble(),
                        warehouseName = "Default",
                        reference = "Local DB",
                        date = java.time.LocalDate.now().toString(),
                        balanceAfter = product.stockQuantity.toDouble(),
                    )
                }
                isLoading = false
            }
            // Then try API
            val result = apiClient.getStockMovements()
            result.fold(
                onSuccess = { movements = it },
                onFailure = {},
            )
            isLoading = false
        }
    }

    val filteredMovements = movements.filter { mv ->
        when (selectedFilter) {
            "All" -> true
            else -> mv.type.equals(selectedFilter, ignoreCase = true)
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Stock Movements",
            actions = {
                KontafyButton(
                    text = "New Adjustment",
                    onClick = onNewAdjustment,
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        // Filter chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(KontafyColors.SurfaceElevated)
                .padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            filters.forEach { filter ->
                FilterChip(
                    selected = selectedFilter == filter,
                    onClick = { selectedFilter = filter },
                    label = {
                        Text(filter, style = MaterialTheme.typography.labelLarge)
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = KontafyColors.Navy.copy(alpha = 0.1f),
                        selectedLabelColor = KontafyColors.Navy,
                        containerColor = KontafyColors.Surface,
                        labelColor = KontafyColors.Muted,
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        borderColor = KontafyColors.Border,
                        selectedBorderColor = KontafyColors.Navy,
                        enabled = true,
                        selected = selectedFilter == filter,
                    ),
                    shape = RoundedCornerShape(8.dp),
                )
            }
        }

        HorizontalDivider(color = KontafyColors.BorderLight)

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            val columns = listOf(
                TableColumn<StockMovementDto>(
                    header = "Date",
                    width = 110.dp,
                    content = { mv ->
                        Text(mv.date, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink)
                    },
                ),
                TableColumn<StockMovementDto>(
                    header = "Product",
                    weight = 1.5f,
                    content = { mv ->
                        Text(
                            mv.productName,
                            style = MaterialTheme.typography.bodyLarge,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.Medium,
                        )
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
                            "TRANSFER" -> BadgeType.Custom
                            else -> BadgeType.Neutral
                        }
                        KontafyBadge(
                            text = mv.type.replaceFirstChar { it.titlecase() },
                            type = badgeType,
                            customBgColor = if (mv.type == "TRANSFER") KontafyColors.Navy.copy(alpha = 0.1f) else null,
                            customTextColor = if (mv.type == "TRANSFER") KontafyColors.Navy else null,
                        )
                    },
                ),
                TableColumn<StockMovementDto>(
                    header = "Qty",
                    width = 80.dp,
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
                    header = "Warehouse",
                    weight = 1f,
                    content = { mv ->
                        Text(mv.warehouseName, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink)
                    },
                ),
                TableColumn<StockMovementDto>(
                    header = "Reference",
                    width = 120.dp,
                    content = { mv ->
                        Text(
                            mv.reference ?: "-",
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Muted,
                        )
                    },
                ),
            )

            Box(modifier = Modifier.fillMaxSize().padding(24.dp)) {
                KontafyDataTable(
                    columns = columns,
                    data = filteredMovements,
                    emptyStateTitle = "No stock movements",
                    emptyStateSubtitle = "Stock movements will appear here as transactions are recorded",
                )
            }
        }
    }
}
