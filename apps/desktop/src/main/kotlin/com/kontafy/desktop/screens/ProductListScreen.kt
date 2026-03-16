package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ProductDto
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.theme.KontafyColors
import com.kontafy.desktop.util.CsvExporter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ProductListScreen(
    currentOrgId: String,
    productRepository: ProductRepository,
    onProductClick: (String) -> Unit,
    onCreateProduct: () -> Unit,
) {
    var products by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("All") }
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            snackbarMessage = null
        }
    }

    val filters = listOf("All", "Goods", "Services", "Low Stock")

    LaunchedEffect(searchQuery) {
        scope.launch {
            isLoading = true
            try {
                val models = if (searchQuery.isBlank()) {
                    productRepository.getByOrgId(currentOrgId)
                } else {
                    productRepository.searchByOrgId(currentOrgId, searchQuery)
                }
                products = models.map { it.toDto() }
            } catch (e: Exception) {
                e.printStackTrace()
                snackbarMessage = "Failed to load products: ${e.message}"
            }
            isLoading = false
        }
    }

    val filteredProducts = products.filter { p ->
        when (selectedFilter) {
            "Goods" -> p.type == "GOODS"
            "Services" -> p.type == "SERVICES"
            "Low Stock" -> p.type == "GOODS" && p.stockQuantity <= p.reorderLevel
            else -> true
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Products",
            showSearch = true,
            searchQuery = searchQuery,
            onSearchChange = { searchQuery = it },
            actions = {
                KontafyButton(
                    text = "Export",
                    onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                CsvExporter.export(
                                    fileName = "Products",
                                    headers = listOf("Name", "Type", "HSN/SAC", "Selling Price", "Stock Quantity"),
                                    rows = filteredProducts.map { p ->
                                        listOf(
                                            p.name,
                                            p.type,
                                            p.hsnCode ?: p.sacCode ?: "",
                                            p.sellingPrice.toString(),
                                            p.stockQuantity.toInt().toString(),
                                        )
                                    },
                                )
                            }
                        }
                    },
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Add Product",
                    onClick = onCreateProduct,
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
                        Text(
                            filter,
                            style = MaterialTheme.typography.labelLarge,
                        )
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
                TableColumn<ProductDto>(
                    header = "Name",
                    weight = 1.5f,
                    content = { product ->
                        Column {
                            Text(
                                product.name,
                                style = MaterialTheme.typography.bodyLarge,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.Medium,
                            )
                            product.sku?.let {
                                Text(
                                    "SKU: $it",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = KontafyColors.Muted,
                                )
                            }
                        }
                    },
                ),
                TableColumn<ProductDto>(
                    header = "HSN/SAC",
                    width = 100.dp,
                    content = { product ->
                        Text(
                            product.hsnCode ?: product.sacCode ?: "-",
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Ink,
                        )
                    },
                ),
                TableColumn<ProductDto>(
                    header = "Type",
                    width = 90.dp,
                    content = { product ->
                        KontafyBadge(
                            text = product.type.replaceFirstChar { it.titlecase() },
                            type = if (product.type == "GOODS") BadgeType.Info else BadgeType.Success,
                        )
                    },
                ),
                TableColumn<ProductDto>(
                    header = "Unit",
                    width = 70.dp,
                    content = { product ->
                        Text(
                            product.unit,
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Ink,
                        )
                    },
                ),
                TableColumn<ProductDto>(
                    header = "Selling Price",
                    width = 120.dp,
                    content = { product ->
                        Text(
                            formatCurrency(product.sellingPrice),
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.Medium,
                        )
                    },
                ),
                TableColumn<ProductDto>(
                    header = "Stock Qty",
                    width = 90.dp,
                    content = { product ->
                        if (product.type == "GOODS") {
                            val isLow = product.stockQuantity <= product.reorderLevel
                            Text(
                                product.stockQuantity.toInt().toString(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (isLow) KontafyColors.StatusOverdue else KontafyColors.Ink,
                                fontWeight = if (isLow) FontWeight.Bold else FontWeight.Normal,
                            )
                        } else {
                            Text("-", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                        }
                    },
                ),
                TableColumn<ProductDto>(
                    header = "Status",
                    width = 80.dp,
                    content = { product ->
                        KontafyBadge(
                            text = if (product.isActive) "Active" else "Inactive",
                            type = if (product.isActive) BadgeType.Success else BadgeType.Neutral,
                        )
                    },
                ),
            )

            Box(modifier = Modifier.fillMaxSize().padding(24.dp)) {
                KontafyDataTable(
                    columns = columns,
                    data = filteredProducts,
                    onRowClick = { onProductClick(it.id) },
                    emptyStateTitle = "No products found",
                    emptyStateSubtitle = "Add your first product to get started",
                )
            }
        }
    }
    SnackbarHost(
        hostState = snackbarHostState,
        modifier = Modifier.align(Alignment.BottomCenter),
    )
    }
}
