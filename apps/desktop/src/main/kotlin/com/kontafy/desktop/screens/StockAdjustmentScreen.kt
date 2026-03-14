package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.ProductDto
import com.kontafy.desktop.api.StockAdjustmentRequest
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun StockAdjustmentScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    productRepository: ProductRepository,
    onBack: () -> Unit,
    showSnackbar: (String) -> Unit = {},
) {
    var products by remember { mutableStateOf<List<ProductDto>>(emptyList()) }
    var selectedProduct by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var adjustmentType by remember { mutableStateOf("ADD") }
    var quantity by remember { mutableStateOf("") }
    var selectedReason by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var notes by remember { mutableStateOf("") }
    var selectedWarehouse by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var date by remember { mutableStateOf<LocalDate?>(LocalDate.now()) }
    var isSaving by remember { mutableStateOf(false) }
    var quantityError by remember { mutableStateOf(false) }
    var productError by remember { mutableStateOf(false) }
    var reasonError by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val dbProducts = try {
            productRepository.getByOrgId(currentOrgId).map { it.toDto() }.filter { p -> p.type.uppercase() == "GOODS" }
        } catch (_: Exception) { emptyList() }
        if (dbProducts.isNotEmpty()) {
            products = dbProducts
        } else {
            val result = apiClient.getProducts(type = "GOODS")
            result.fold(
                onSuccess = { products = it.filter { p -> p.type.uppercase() == "GOODS" } },
                onFailure = {},
            )
        }
    }

    val productItems = products.map { p ->
        DropdownItem(p.id, p.name, "Stock: ${p.stockQuantity.toInt()}")
    }

    val reasonItems = remember {
        listOf(
            DropdownItem("Damage", "Damage"),
            DropdownItem("Expired", "Expired"),
            DropdownItem("Count correction", "Count correction"),
            DropdownItem("Theft/Loss", "Theft / Loss"),
            DropdownItem("Other", "Other"),
        )
    }

    val warehouseItems = remember {
        listOf(
            DropdownItem("wh-1", "Main Warehouse"),
            DropdownItem("wh-2", "Branch Warehouse"),
        )
    }

    fun validate(): Boolean {
        productError = selectedProduct == null
        quantityError = quantity.isBlank() || (quantity.toDoubleOrNull() ?: 0.0) <= 0
        reasonError = selectedReason == null
        return !productError && !quantityError && !reasonError
    }

    fun save() {
        if (!validate()) return
        isSaving = true
        scope.launch {
            val request = StockAdjustmentRequest(
                productId = selectedProduct!!.value,
                type = adjustmentType,
                quantity = quantity.toDoubleOrNull() ?: 0.0,
                reason = selectedReason!!.value,
                notes = notes.ifBlank { null },
                warehouseId = selectedWarehouse?.value,
                date = date?.format(DateTimeFormatter.ISO_DATE) ?: LocalDate.now().format(DateTimeFormatter.ISO_DATE),
            )
            // Save locally by updating product stock quantity
            var savedLocally = false
            try {
                val product = productRepository.getById(request.productId)
                if (product != null) {
                    val newStock = if (request.type == "ADD") {
                        product.stockQuantity.toDouble() + request.quantity
                    } else {
                        (product.stockQuantity.toDouble() - request.quantity).coerceAtLeast(0.0)
                    }
                    productRepository.update(
                        product.copy(stockQuantity = java.math.BigDecimal.valueOf(newStock)),
                    )
                    savedLocally = true
                }
            } catch (_: Exception) {}

            // Also try API
            val result = apiClient.createStockAdjustment(request)
            result.fold(
                onSuccess = {
                    showSnackbar("Stock adjustment saved successfully")
                    onBack()
                },
                onFailure = {
                    if (savedLocally) {
                        showSnackbar("Stock adjustment saved locally")
                        onBack()
                    } else {
                        showSnackbar("Failed to save stock adjustment")
                        isSaving = false
                    }
                },
            )
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Stock Adjustment",
            actions = {
                KontafyButton(
                    text = "Cancel",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Save Adjustment",
                    onClick = ::save,
                    variant = ButtonVariant.Primary,
                    isLoading = isSaving,
                )
            },
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Adjustment Details", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))

                        // Product selector
                        KontafyDropdown(
                            items = productItems,
                            selectedItem = selectedProduct,
                            onItemSelected = { selectedProduct = it; productError = false },
                            label = "Product *",
                            placeholder = "Search and select a product",
                            searchable = true,
                            isError = productError,
                            errorMessage = if (productError) "Please select a product" else null,
                        )

                        Spacer(Modifier.height(16.dp))

                        // Adjustment type
                        Text(
                            "Adjustment Type",
                            style = MaterialTheme.typography.labelLarge,
                            color = KontafyColors.Ink,
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                RadioButton(
                                    selected = adjustmentType == "ADD",
                                    onClick = { adjustmentType = "ADD" },
                                    colors = RadioButtonDefaults.colors(selectedColor = KontafyColors.Green),
                                )
                                Spacer(Modifier.width(4.dp))
                                Text("Add Stock", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                RadioButton(
                                    selected = adjustmentType == "REMOVE",
                                    onClick = { adjustmentType = "REMOVE" },
                                    colors = RadioButtonDefaults.colors(selectedColor = KontafyColors.StatusOverdue),
                                )
                                Spacer(Modifier.width(4.dp))
                                Text("Remove Stock", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink)
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            KontafyTextField(
                                value = quantity,
                                onValueChange = { quantity = it; quantityError = false },
                                label = "Quantity *",
                                placeholder = "0",
                                modifier = Modifier.weight(1f),
                                keyboardType = KeyboardType.Number,
                                isError = quantityError,
                                errorMessage = if (quantityError) "Enter a valid quantity" else null,
                            )
                            KontafyDropdown(
                                items = reasonItems,
                                selectedItem = selectedReason,
                                onItemSelected = { selectedReason = it; reasonError = false },
                                label = "Reason *",
                                placeholder = "Select reason",
                                modifier = Modifier.weight(1f),
                                isError = reasonError,
                                errorMessage = if (reasonError) "Please select a reason" else null,
                            )
                        }

                        Spacer(Modifier.height(16.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            KontafyDropdown(
                                items = warehouseItems,
                                selectedItem = selectedWarehouse,
                                onItemSelected = { selectedWarehouse = it },
                                label = "Warehouse",
                                placeholder = "Select warehouse",
                                modifier = Modifier.weight(1f),
                            )
                            KontafyDatePicker(
                                value = date,
                                onValueChange = { date = it },
                                label = "Date",
                                modifier = Modifier.weight(1f),
                            )
                        }

                        Spacer(Modifier.height(16.dp))

                        KontafyTextField(
                            value = notes,
                            onValueChange = { notes = it },
                            label = "Notes",
                            placeholder = "Additional details about this adjustment",
                            singleLine = false,
                        )
                    }
                }
            }
        }
    }
}
