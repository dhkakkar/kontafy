package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.InvoiceItemModel
import com.kontafy.desktop.api.InvoiceModel
import com.kontafy.desktop.api.ProductDto
import com.kontafy.desktop.api.ProductModel
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AppSettingsRepository
import com.kontafy.desktop.db.repositories.InvoiceItemRepository
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.shortcuts.LocalShortcutAction
import com.kontafy.desktop.theme.KontafyColors
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

@Composable
fun CreatePurchaseOrderScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository,
    invoiceItemRepository: InvoiceItemRepository,
    contactRepository: ContactRepository,
    productRepository: ProductRepository,
    onBack: () -> Unit,
    onSaveSuccess: (String) -> Unit = {},
    onNavigateToCreateVendor: () -> Unit,
    appSettingsRepository: AppSettingsRepository = AppSettingsRepository(),
) {
    val savedSettings = remember {
        try { appSettingsRepository.getAll() } catch (e: Exception) { e.printStackTrace(); emptyMap() }
    }

    var productDtoList by remember {
        val dbProducts = try { productRepository.getByOrgId(currentOrgId).map { it.toDto() } } catch (e: Exception) { e.printStackTrace(); emptyList() }
        mutableStateOf(dbProducts)
    }
    val productDropdownItems = remember(productDtoList) {
        productDtoList.map { p ->
            DropdownItem(p.id, p.name, "${p.hsnCode ?: p.sacCode ?: ""} · ${formatCurrency(p.purchasePrice)}")
        }
    }

    var showQuickCreateProduct by remember { mutableStateOf(false) }
    var quickCreateProductCallback by remember { mutableStateOf<((ProductDto) -> Unit)?>(null) }

    if (showQuickCreateProduct) {
        QuickCreateProductDialog(
            onDismiss = { showQuickCreateProduct = false },
            onCreated = { product ->
                try {
                    productRepository.upsert(ProductModel(
                        id = product.id, orgId = currentOrgId, name = product.name, type = product.type,
                        hsnCode = product.hsnCode, sacCode = product.sacCode, unit = product.unit,
                        sellingPrice = BigDecimal.valueOf(product.sellingPrice),
                        purchasePrice = BigDecimal.valueOf(product.purchasePrice),
                        taxRate = BigDecimal.valueOf(product.taxRate),
                        sku = null, description = product.description,
                        stockQuantity = BigDecimal.ZERO, reorderLevel = BigDecimal.ZERO, isActive = true,
                    ))
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                productDtoList = productDtoList + product
                quickCreateProductCallback?.invoke(product)
                showQuickCreateProduct = false
            },
        )
    }

    var selectedVendor by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var poNumber by remember { mutableStateOf(
        try { invoiceRepository.getNextNumber(currentOrgId, "PO") } catch (e: Exception) { "PO-0001" }
    ) }
    var orderDate by remember { mutableStateOf<LocalDate?>(LocalDate.now()) }
    var deliveryDate by remember { mutableStateOf<LocalDate?>(LocalDate.now().plusDays(14)) }
    var lineItems by remember { mutableStateOf(listOf(LineItemState())) }
    var notes by remember { mutableStateOf(savedSettings["default_notes"] ?: "") }
    var shippingAddress by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var showValidation by remember { mutableStateOf(false) }

    val vendorItems = remember {
        val dbVendors = try { contactRepository.getByOrgId(currentOrgId).filter { it.type in listOf("vendor", "both", "VENDOR", "BOTH") } } catch (e: Exception) { e.printStackTrace(); emptyList() }
        dbVendors.map { DropdownItem(it.id, it.name, it.gstin) }
    }

    val subtotal = lineItems.sumOf { it.taxableAmount }
    val totalTax = lineItems.sumOf { it.taxAmount }
    val grandTotal = subtotal + totalTax

    val isVendorValid = selectedVendor != null
    val hasLineItems = lineItems.any { it.description.isNotBlank() && it.quantityNum > 0 && it.unitPriceNum > 0 }
    val isFormValid = isVendorValid && hasLineItems

    fun savePO(status: String): Boolean {
        try {
            val invoiceId = UUID.randomUUID().toString()
            val model = InvoiceModel(
                id = invoiceId,
                orgId = currentOrgId,
                invoiceNumber = poNumber,
                contactId = selectedVendor?.value,
                type = "purchase_order",
                status = status,
                issueDate = orderDate?.toString() ?: LocalDate.now().toString(),
                dueDate = deliveryDate?.toString() ?: LocalDate.now().plusDays(14).toString(),
                subtotal = BigDecimal.valueOf(subtotal),
                discountAmount = BigDecimal.ZERO,
                taxAmount = BigDecimal.valueOf(totalTax),
                totalAmount = BigDecimal.valueOf(grandTotal),
                amountPaid = BigDecimal.ZERO,
                amountDue = BigDecimal.valueOf(grandTotal),
                currency = "INR",
                notes = notes.ifBlank { null },
                updatedAt = LocalDateTime.now(),
            )
            invoiceRepository.create(model)
            // Save line items
            lineItems.forEachIndexed { idx, li ->
                if (li.description.isNotBlank()) {
                    val halfTax = li.taxAmount / 2.0
                    invoiceItemRepository.upsert(InvoiceItemModel(
                        id = UUID.randomUUID().toString(),
                        invoiceId = invoiceId,
                        description = li.description,
                        hsnCode = li.hsnSac.ifBlank { null },
                        quantity = BigDecimal.valueOf(li.quantityNum),
                        unitPrice = BigDecimal.valueOf(li.unitPriceNum),
                        discountPercent = BigDecimal.ZERO,
                        taxRate = BigDecimal.valueOf(li.taxRate),
                        cgstAmount = BigDecimal.valueOf(halfTax),
                        sgstAmount = BigDecimal.valueOf(halfTax),
                        totalAmount = BigDecimal.valueOf(li.totalAmount),
                        sortOrder = idx,
                    ))
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
        return true
    }

    // Handle Ctrl+S shortcut
    val shortcutAction = LocalShortcutAction.current
    LaunchedEffect(shortcutAction.value) {
        if (shortcutAction.value == "save" && !isSaving) {
            shortcutAction.value = null
            if (isFormValid) {
                isSaving = true
                if (savePO("DRAFT")) onSaveSuccess("Purchase order saved as draft") else isSaving = false
            }
        }
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
                Text("New Purchase Order", style = MaterialTheme.typography.headlineMedium, color = KontafyColors.Ink)
                Spacer(Modifier.weight(1f))
                KontafyButton(text = "Cancel", onClick = onBack, variant = ButtonVariant.Outline)
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Save as Draft",
                    onClick = {
                        showValidation = true
                        if (isFormValid) { isSaving = true; if (savePO("DRAFT")) onSaveSuccess("Purchase order saved as draft") else isSaving = false }
                    },
                    variant = ButtonVariant.Outline,
                    isLoading = isSaving,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Send to Vendor",
                    onClick = {
                        showValidation = true
                        if (isFormValid) { isSaving = true; if (savePO("SENT")) onSaveSuccess("Purchase order created successfully") else isSaving = false }
                    },
                    variant = ButtonVariant.Secondary,
                    isLoading = isSaving,
                )
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // Vendor Selection
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Vendor", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        KontafyDropdown(
                            items = vendorItems,
                            selectedItem = selectedVendor,
                            onItemSelected = { selectedVendor = it },
                            label = "Order From",
                            placeholder = "Select vendor",
                            searchable = true,
                            showCreateNew = true,
                            createNewLabel = "Create new vendor",
                            onCreateNew = onNavigateToCreateVendor,
                            isError = showValidation && !isVendorValid,
                            errorMessage = if (showValidation && !isVendorValid) "Vendor is required" else null,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            // PO Details
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Order Details", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            KontafyTextField(
                                value = poNumber, onValueChange = { poNumber = it },
                                label = "PO Number", placeholder = "PO-001",
                                modifier = Modifier.weight(1f),
                            )
                            KontafyDatePicker(
                                value = orderDate, onValueChange = { orderDate = it },
                                label = "Order Date", modifier = Modifier.weight(1f),
                            )
                            KontafyDatePicker(
                                value = deliveryDate, onValueChange = { deliveryDate = it },
                                label = "Expected Delivery", modifier = Modifier.weight(1f),
                            )
                        }
                        Spacer(Modifier.height(16.dp))
                        KontafyTextField(
                            value = shippingAddress, onValueChange = { shippingAddress = it },
                            label = "Shipping Address", placeholder = "Delivery address...",
                            singleLine = false, modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 80.dp),
                        )
                    }
                }
            }

            // Line Items
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

                        if (showValidation && !hasLineItems) {
                            Text(
                                "At least one line item with description, quantity, and price is required",
                                style = MaterialTheme.typography.bodySmall, color = KontafyColors.Error,
                                modifier = Modifier.padding(bottom = 8.dp),
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("Product / Service", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1.5f))
                            Text("HSN/SAC", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                            Text("Qty", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(70.dp))
                            Text("Rate", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                            Text("Tax %", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                            Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp))
                            Spacer(Modifier.width(40.dp))
                        }
                        HorizontalDivider(color = KontafyColors.Border)

                        lineItems.forEachIndexed { index, item ->
                            POLineItemRow(
                                item = item,
                                productDropdownItems = productDropdownItems,
                                onProductSelected = { productId ->
                                    val product = productDtoList.find { it.id == productId }
                                    if (product != null) {
                                        lineItems = lineItems.toMutableList().also {
                                            it[index] = it[index].copy(
                                                description = product.name,
                                                hsnSac = product.hsnCode ?: product.sacCode ?: "",
                                                unitPrice = if (product.purchasePrice > 0) product.purchasePrice.toString() else it[index].unitPrice,
                                                taxRate = product.taxRate,
                                            )
                                        }
                                    }
                                },
                                onCreateProduct = {
                                    quickCreateProductCallback = { product ->
                                        lineItems = lineItems.toMutableList().also {
                                            it[index] = it[index].copy(
                                                description = product.name,
                                                hsnSac = product.hsnCode ?: product.sacCode ?: "",
                                                unitPrice = if (product.purchasePrice > 0) product.purchasePrice.toString() else it[index].unitPrice,
                                                taxRate = product.taxRate,
                                            )
                                        }
                                    }
                                    showQuickCreateProduct = true
                                },
                                onHsnChange = { v -> lineItems = lineItems.toMutableList().also { it[index] = it[index].copy(hsnSac = v) } },
                                onQuantityChange = { v -> lineItems = lineItems.toMutableList().also { it[index] = it[index].copy(quantity = v) } },
                                onUnitPriceChange = { v -> lineItems = lineItems.toMutableList().also { it[index] = it[index].copy(unitPrice = v) } },
                                onTaxRateChange = { v -> lineItems = lineItems.toMutableList().also { it[index] = it[index].copy(taxRate = v) } },
                                onDelete = { if (lineItems.size > 1) lineItems = lineItems.toMutableList().also { it.removeAt(index) } },
                                canDelete = lineItems.size > 1,
                            )
                            HorizontalDivider(color = KontafyColors.BorderLight)
                        }

                        Spacer(Modifier.height(12.dp))
                        KontafyButton(text = "Add Line Item", onClick = { lineItems = lineItems + LineItemState() }, variant = ButtonVariant.Outline)
                    }
                }
            }

            // Summary
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Summary", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Spacer(Modifier.weight(1f))
                            Column(modifier = Modifier.width(300.dp)) {
                                POSummaryRow("Subtotal", subtotal)
                                POSummaryRow("Tax", totalTax)
                                Spacer(Modifier.height(8.dp))
                                HorizontalDivider(color = KontafyColors.Border)
                                Spacer(Modifier.height(8.dp))
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Total", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                                    Text(formatCurrency(grandTotal), style = MaterialTheme.typography.titleLarge, color = KontafyColors.Navy, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }

            // Notes
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Notes", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        KontafyTextField(
                            value = notes, onValueChange = { notes = it },
                            label = "Internal Notes", placeholder = "Notes for internal reference...",
                            singleLine = false, modifier = Modifier.fillMaxWidth().defaultMinSize(minHeight = 100.dp),
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun POLineItemRow(
    item: LineItemState,
    productDropdownItems: List<DropdownItem<String>> = emptyList(),
    onProductSelected: (String) -> Unit = {},
    onCreateProduct: () -> Unit = {},
    onHsnChange: (String) -> Unit,
    onQuantityChange: (String) -> Unit,
    onUnitPriceChange: (String) -> Unit,
    onTaxRateChange: (Double) -> Unit,
    onDelete: () -> Unit,
    canDelete: Boolean,
) {
    val selectedProduct = productDropdownItems.find { it.label == item.description }

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        KontafyDropdown(
            items = productDropdownItems,
            selectedItem = selectedProduct,
            onItemSelected = { onProductSelected(it.value) },
            placeholder = "Select product",
            searchable = true,
            showCreateNew = true,
            createNewLabel = "Create new product",
            onCreateNew = onCreateProduct,
            modifier = Modifier.weight(1.5f),
        )
        Spacer(Modifier.width(4.dp))
        OutlinedTextField(
            value = item.hsnSac, onValueChange = onHsnChange,
            modifier = Modifier.width(90.dp),
            placeholder = { Text("HSN", color = KontafyColors.MutedLight, style = MaterialTheme.typography.bodySmall) },
            singleLine = true, shape = RoundedCornerShape(6.dp),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = KontafyColors.Navy, unfocusedBorderColor = KontafyColors.Border, cursorColor = KontafyColors.Navy, focusedContainerColor = KontafyColors.White, unfocusedContainerColor = KontafyColors.White),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        OutlinedTextField(
            value = item.quantity, onValueChange = { v -> onQuantityChange(v.filter { it.isDigit() || it == '.' }) },
            modifier = Modifier.width(70.dp), singleLine = true, shape = RoundedCornerShape(6.dp),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = KontafyColors.Navy, unfocusedBorderColor = KontafyColors.Border, cursorColor = KontafyColors.Navy, focusedContainerColor = KontafyColors.White, unfocusedContainerColor = KontafyColors.White),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        OutlinedTextField(
            value = item.unitPrice, onValueChange = { v -> onUnitPriceChange(v.filter { it.isDigit() || it == '.' }) },
            modifier = Modifier.width(100.dp), singleLine = true, shape = RoundedCornerShape(6.dp),
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = KontafyColors.Navy, unfocusedBorderColor = KontafyColors.Border, cursorColor = KontafyColors.Navy, focusedContainerColor = KontafyColors.White, unfocusedContainerColor = KontafyColors.White),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        Box(modifier = Modifier.width(80.dp)) {
            var taxExpanded by remember { mutableStateOf(false) }
            OutlinedTextField(
                value = "${item.taxRate.toInt()}%", onValueChange = {},
                modifier = Modifier.fillMaxWidth(), readOnly = true, singleLine = true, shape = RoundedCornerShape(6.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = KontafyColors.Navy, unfocusedBorderColor = KontafyColors.Border, cursorColor = KontafyColors.Navy, focusedContainerColor = KontafyColors.White, unfocusedContainerColor = KontafyColors.White),
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
            )
            DropdownMenu(expanded = taxExpanded, onDismissRequest = { taxExpanded = false }) {
                taxRates.forEach { rate ->
                    DropdownMenuItem(text = { Text("${rate.toInt()}%") }, onClick = { onTaxRateChange(rate); taxExpanded = false })
                }
            }
        }
        Spacer(Modifier.width(4.dp))
        Text(
            text = formatCurrency(item.totalAmount),
            style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink,
            fontWeight = FontWeight.Medium, modifier = Modifier.width(110.dp),
        )
        IconButton(onClick = onDelete, enabled = canDelete, modifier = Modifier.size(32.dp)) {
            Icon(Icons.Outlined.Delete, "Remove", tint = if (canDelete) KontafyColors.Error else KontafyColors.MutedLight, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun POSummaryRow(label: String, amount: Double) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
        Text(formatCurrency(amount), style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
    }
}
