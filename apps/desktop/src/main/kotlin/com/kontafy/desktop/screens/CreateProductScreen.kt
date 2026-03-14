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
import com.kontafy.desktop.api.ProductModel
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@Composable
fun CreateProductScreen(
    currentOrgId: String,
    productRepository: ProductRepository,
    onBack: () -> Unit,
    onSaveSuccess: (String) -> Unit = {},
    editProductId: String? = null,
) {
    var name by remember { mutableStateOf("") }
    var productType by remember { mutableStateOf("GOODS") }
    var sku by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }

    var hsnCode by remember { mutableStateOf("") }
    var sacCode by remember { mutableStateOf("") }
    var selectedTaxRate by remember { mutableStateOf<DropdownItem<Double>?>(null) }

    var sellingPrice by remember { mutableStateOf("") }
    var purchasePrice by remember { mutableStateOf("") }
    var selectedUnit by remember { mutableStateOf<DropdownItem<String>?>(null) }

    var openingStock by remember { mutableStateOf("") }
    var reorderLevel by remember { mutableStateOf("") }

    var isSaving by remember { mutableStateOf(false) }
    var nameError by remember { mutableStateOf(false) }
    var priceError by remember { mutableStateOf(false) }
    var hsnError by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    val taxRateItems = remember {
        listOf(
            DropdownItem(0.0, "0% - Exempt"),
            DropdownItem(5.0, "5%"),
            DropdownItem(12.0, "12%"),
            DropdownItem(18.0, "18%"),
            DropdownItem(28.0, "28%"),
        )
    }

    val unitItems = remember {
        listOf(
            DropdownItem("Nos", "Nos (Numbers)"),
            DropdownItem("Kg", "Kg (Kilograms)"),
            DropdownItem("Ltrs", "Ltrs (Litres)"),
            DropdownItem("Mtrs", "Mtrs (Metres)"),
            DropdownItem("Box", "Box"),
            DropdownItem("Pair", "Pair"),
            DropdownItem("Hrs", "Hrs (Hours)"),
            DropdownItem("Sq.Ft", "Sq.Ft (Square Feet)"),
            DropdownItem("Tons", "Tons"),
            DropdownItem("Bags", "Bags"),
        )
    }

    // Load existing product for editing
    LaunchedEffect(editProductId) {
        if (editProductId != null) {
            try {
                productRepository.getById(editProductId)?.let { product ->
                    name = product.name
                    productType = product.type.uppercase()
                    sku = product.sku ?: ""
                    description = product.description ?: ""
                    hsnCode = product.hsnCode ?: ""
                    sacCode = product.sacCode ?: ""
                    selectedTaxRate = taxRateItems.find { it.value == product.taxRate.toDouble() }
                    sellingPrice = if (product.sellingPrice > BigDecimal.ZERO) product.sellingPrice.toPlainString() else ""
                    purchasePrice = if (product.purchasePrice > BigDecimal.ZERO) product.purchasePrice.toPlainString() else ""
                    selectedUnit = unitItems.find { it.value == product.unit }
                    openingStock = if (product.stockQuantity > BigDecimal.ZERO) product.stockQuantity.toPlainString() else ""
                    reorderLevel = if (product.reorderLevel > BigDecimal.ZERO) product.reorderLevel.toPlainString() else ""
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun validate(): Boolean {
        nameError = name.isBlank()
        priceError = sellingPrice.isBlank() && purchasePrice.isBlank()
        hsnError = productType == "GOODS" && hsnCode.isBlank()
        return !nameError && !priceError && !hsnError
    }

    fun save() {
        if (!validate()) return
        isSaving = true
        scope.launch {
            try {
                val model = ProductModel(
                    id = editProductId ?: UUID.randomUUID().toString(),
                    orgId = currentOrgId,
                    name = name,
                    type = productType.lowercase(),
                    hsnCode = hsnCode.ifBlank { null },
                    sacCode = sacCode.ifBlank { null },
                    unit = selectedUnit?.value ?: "Nos",
                    sellingPrice = sellingPrice.toBigDecimalOrNull() ?: BigDecimal.ZERO,
                    purchasePrice = purchasePrice.toBigDecimalOrNull() ?: BigDecimal.ZERO,
                    taxRate = BigDecimal.valueOf(selectedTaxRate?.value ?: 0.0),
                    sku = sku.ifBlank { null },
                    description = description.ifBlank { null },
                    stockQuantity = openingStock.toBigDecimalOrNull() ?: BigDecimal.ZERO,
                    reorderLevel = reorderLevel.toBigDecimalOrNull() ?: BigDecimal.ZERO,
                    updatedAt = LocalDateTime.now(),
                )
                if (editProductId != null) {
                    productRepository.update(model)
                    onSaveSuccess("Product updated successfully")
                } else {
                    productRepository.create(model)
                    onSaveSuccess("Product created successfully")
                }
            } catch (e: Exception) {
                e.printStackTrace()
                isSaving = false
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = if (editProductId != null) "Edit Product" else "New Product",
            actions = {
                KontafyButton(
                    text = "Cancel",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = if (editProductId != null) "Update" else "Save Product",
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
            // Basic Info
            item {
                CreateProductSection(title = "Basic Information") {
                    KontafyTextField(
                        value = name,
                        onValueChange = { name = it; nameError = false },
                        label = "Product Name *",
                        placeholder = "Enter product name",
                        isError = nameError,
                        errorMessage = if (nameError) "Product name is required" else null,
                    )
                    Spacer(Modifier.height(12.dp))

                    // Type selection
                    Text(
                        "Product Type",
                        style = MaterialTheme.typography.labelLarge,
                        color = KontafyColors.Ink,
                    )
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = productType == "GOODS",
                                onClick = { productType = "GOODS" },
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = KontafyColors.Navy,
                                ),
                            )
                            Spacer(Modifier.width(4.dp))
                            Text("Goods", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = productType == "SERVICES",
                                onClick = { productType = "SERVICES" },
                                colors = RadioButtonDefaults.colors(
                                    selectedColor = KontafyColors.Navy,
                                ),
                            )
                            Spacer(Modifier.width(4.dp))
                            Text("Services", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink)
                        }
                    }

                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KontafyTextField(
                            value = sku,
                            onValueChange = { sku = it },
                            label = "SKU",
                            placeholder = "e.g., PRD-001",
                            modifier = Modifier.weight(1f),
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    KontafyTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = "Description",
                        placeholder = "Optional product description",
                        singleLine = false,
                    )
                }
            }

            // Tax Info
            item {
                CreateProductSection(title = "Tax Information") {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        if (productType == "GOODS") {
                            KontafyTextField(
                                value = hsnCode,
                                onValueChange = { hsnCode = it; hsnError = false },
                                label = "HSN Code *",
                                placeholder = "e.g., 8471",
                                modifier = Modifier.weight(1f),
                                isError = hsnError,
                                errorMessage = if (hsnError) "HSN code is required for goods" else null,
                            )
                        } else {
                            KontafyTextField(
                                value = sacCode,
                                onValueChange = { sacCode = it },
                                label = "SAC Code",
                                placeholder = "e.g., 998314",
                                modifier = Modifier.weight(1f),
                            )
                        }
                        KontafyDropdown(
                            items = taxRateItems,
                            selectedItem = selectedTaxRate,
                            onItemSelected = { selectedTaxRate = it },
                            label = "Tax Rate",
                            placeholder = "Select rate",
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }

            // Pricing
            item {
                CreateProductSection(title = "Pricing") {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KontafyTextField(
                            value = sellingPrice,
                            onValueChange = { sellingPrice = it; priceError = false },
                            label = "Selling Price",
                            placeholder = "0.00",
                            modifier = Modifier.weight(1f),
                            keyboardType = KeyboardType.Number,
                            isError = priceError,
                        )
                        KontafyTextField(
                            value = purchasePrice,
                            onValueChange = { purchasePrice = it; priceError = false },
                            label = "Purchase Price",
                            placeholder = "0.00",
                            modifier = Modifier.weight(1f),
                            keyboardType = KeyboardType.Number,
                            isError = priceError,
                        )
                        KontafyDropdown(
                            items = unitItems,
                            selectedItem = selectedUnit,
                            onItemSelected = { selectedUnit = it },
                            label = "Unit",
                            placeholder = "Select unit",
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (priceError) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "At least one price (selling or purchase) is required",
                            style = MaterialTheme.typography.bodySmall,
                            color = KontafyColors.Error,
                        )
                    }
                }
            }

            // Stock Info (only for goods)
            if (productType == "GOODS") {
                item {
                    CreateProductSection(title = "Stock Information") {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            KontafyTextField(
                                value = openingStock,
                                onValueChange = { openingStock = it },
                                label = "Opening Stock",
                                placeholder = "0",
                                modifier = Modifier.weight(1f),
                                keyboardType = KeyboardType.Number,
                            )
                            KontafyTextField(
                                value = reorderLevel,
                                onValueChange = { reorderLevel = it },
                                label = "Reorder Level",
                                placeholder = "0",
                                modifier = Modifier.weight(1f),
                                keyboardType = KeyboardType.Number,
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            "You'll receive a low-stock alert when quantity falls below the reorder level.",
                            style = MaterialTheme.typography.bodySmall,
                            color = KontafyColors.Muted,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CreateProductSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(1.dp),
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleLarge,
                color = KontafyColors.Ink,
            )
            Spacer(Modifier.height(16.dp))
            content()
        }
    }
}
