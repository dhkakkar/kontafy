package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.InvoiceItemModel
import com.kontafy.desktop.api.ProductModel
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.InvoiceModel
import com.kontafy.desktop.api.ProductDto
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.theme.KontafyColors
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

// Indian states list for GST place of supply
val indianStates = listOf(
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
)

val taxRates = listOf(0.0, 5.0, 12.0, 18.0, 28.0)

val paymentTermsList = listOf(
    "Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90", "Custom",
)

data class LineItemState(
    val id: String = UUID.randomUUID().toString(),
    var description: String = "",
    var hsnSac: String = "",
    var quantity: String = "1",
    var unitPrice: String = "0",
    var discountPercent: String = "0",
    var taxRate: Double = 18.0,
) {
    val quantityNum: Double get() = quantity.toDoubleOrNull() ?: 0.0
    val unitPriceNum: Double get() = unitPrice.toDoubleOrNull() ?: 0.0
    val discountNum: Double get() = discountPercent.toDoubleOrNull() ?: 0.0

    val subtotalBeforeDiscount: Double get() = quantityNum * unitPriceNum
    val discountAmount: Double get() = subtotalBeforeDiscount * discountNum / 100.0
    val taxableAmount: Double get() = subtotalBeforeDiscount - discountAmount
    val taxAmount: Double get() = taxableAmount * taxRate / 100.0
    val totalAmount: Double get() = taxableAmount + taxAmount
}

@Composable
fun CreateInvoiceScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository,
    invoiceItemRepository: com.kontafy.desktop.db.repositories.InvoiceItemRepository,
    contactRepository: ContactRepository,
    productRepository: ProductRepository,
    onBack: () -> Unit,
    onSaveSuccess: (String) -> Unit = {},
    onNavigateToCreateCustomer: () -> Unit,
    orgState: String = "Maharashtra", // Organization's state for GST logic
) {
    // Quick create customer dialog
    var showQuickCreateCustomer by remember { mutableStateOf(false) }

    // Form state
    var selectedCustomer by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var invoiceNumber by remember { mutableStateOf("INV-${System.currentTimeMillis().toString().takeLast(6)}") }
    var issueDate by remember { mutableStateOf<LocalDate?>(LocalDate.now()) }
    var dueDate by remember { mutableStateOf<LocalDate?>(LocalDate.now().plusDays(30)) }
    var paymentTerms by remember { mutableStateOf<DropdownItem<String>?>(DropdownItem("Net 30", "Net 30")) }
    var placeOfSupply by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var lineItems by remember { mutableStateOf(listOf(LineItemState())) }
    var notes by remember { mutableStateOf("") }
    var terms by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }

    // Validation state
    var showValidation by remember { mutableStateOf(false) }

    // Customer list (mutable to allow adding from quick create) — loaded from local DB
    var customerList by remember {
        val dbContacts = try { contactRepository.getByOrgId(currentOrgId) } catch (_: Exception) { emptyList() }
        val items = dbContacts.map { DropdownItem(it.id, it.name, it.gstin) }
        mutableStateOf(items)
    }

    // Product list for line item dropdown
    var productDtoList by remember {
        val dbProducts = try { productRepository.getByOrgId(currentOrgId).map { it.toDto() } } catch (_: Exception) { emptyList() }
        mutableStateOf(dbProducts)
    }
    val productDropdownItems = remember(productDtoList) {
        productDtoList.map { p ->
            DropdownItem(p.id, p.name, "${p.hsnCode ?: p.sacCode ?: ""} · ${formatCurrency(p.sellingPrice)}")
        }
    }

    // Quick create product dialog
    var showQuickCreateProduct by remember { mutableStateOf(false) }
    var quickCreateProductCallback by remember { mutableStateOf<((ProductDto) -> Unit)?>(null) }

    if (showQuickCreateProduct) {
        QuickCreateProductDialog(
            onDismiss = { showQuickCreateProduct = false },
            onCreated = { product ->
                // Save to database
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
                } catch (_: Exception) {}
                productDtoList = productDtoList + product
                quickCreateProductCallback?.invoke(product)
                showQuickCreateProduct = false
            },
        )
    }

    // Quick create customer dialog
    if (showQuickCreateCustomer) {
        QuickCreateCustomerDialog(
            onDismiss = { showQuickCreateCustomer = false },
            onCreated = { result ->
                // Save to database
                try {
                    val model = com.kontafy.desktop.api.ContactModel(
                        id = result.id,
                        orgId = currentOrgId,
                        name = result.name,
                        type = result.type.lowercase(),
                        email = result.email,
                        phone = result.phone,
                        gstin = result.gstin,
                        updatedAt = LocalDateTime.now(),
                    )
                    contactRepository.create(model)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                val newItem = DropdownItem(result.id, result.name, result.gstin)
                customerList = customerList + newItem
                selectedCustomer = newItem
                showQuickCreateCustomer = false
            },
        )
    }

    // GST logic
    val isInterState = placeOfSupply != null && placeOfSupply?.label != orgState

    // Tax calculations
    val subtotal = lineItems.sumOf { it.taxableAmount }
    val totalDiscount = lineItems.sumOf { it.discountAmount }
    val totalTax = lineItems.sumOf { it.taxAmount }
    val cgst = if (!isInterState) totalTax / 2.0 else 0.0
    val sgst = if (!isInterState) totalTax / 2.0 else 0.0
    val igst = if (isInterState) totalTax else 0.0
    val grandTotal = subtotal + totalTax

    // Validation
    val isCustomerValid = selectedCustomer != null
    val hasLineItems = lineItems.any { it.description.isNotBlank() && it.quantityNum > 0 && it.unitPriceNum > 0 }
    val isFormValid = isCustomerValid && hasLineItems

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
                    "New Invoice",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.Ink,
                )
                Spacer(Modifier.weight(1f))
                KontafyButton(
                    text = "Cancel",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Save as Draft",
                    onClick = {
                        showValidation = true
                        if (isFormValid) {
                            isSaving = true
                            try {
                                val invoiceId = UUID.randomUUID().toString()
                                val model = InvoiceModel(
                                    id = invoiceId,
                                    orgId = currentOrgId,
                                    invoiceNumber = invoiceNumber,
                                    contactId = selectedCustomer?.value,
                                    type = "invoice",
                                    status = "DRAFT",
                                    issueDate = issueDate?.toString() ?: LocalDate.now().toString(),
                                    dueDate = dueDate?.toString() ?: LocalDate.now().plusDays(30).toString(),
                                    subtotal = BigDecimal.valueOf(subtotal),
                                    discountAmount = BigDecimal.valueOf(totalDiscount),
                                    taxAmount = BigDecimal.valueOf(totalTax),
                                    totalAmount = BigDecimal.valueOf(grandTotal),
                                    amountPaid = BigDecimal.ZERO,
                                    amountDue = BigDecimal.valueOf(grandTotal),
                                    currency = "INR",
                                    notes = notes.ifBlank { null },
                                    terms = terms.ifBlank { null },
                                    placeOfSupply = placeOfSupply?.label,
                                    reverseCharge = false,
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
                                            discountPercent = BigDecimal.valueOf(li.discountNum),
                                            taxRate = BigDecimal.valueOf(li.taxRate),
                                            cgstAmount = BigDecimal.valueOf(halfTax),
                                            sgstAmount = BigDecimal.valueOf(halfTax),
                                            totalAmount = BigDecimal.valueOf(li.totalAmount),
                                            sortOrder = idx,
                                        ))
                                    }
                                }
                            } catch (_: Exception) {}
                            onSaveSuccess("Invoice saved as draft")
                        }
                    },
                    variant = ButtonVariant.Outline,
                    isLoading = isSaving,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Send Invoice",
                    onClick = {
                        showValidation = true
                        if (isFormValid) {
                            isSaving = true
                            try {
                                val invoiceId = UUID.randomUUID().toString()
                                val model = InvoiceModel(
                                    id = invoiceId,
                                    orgId = currentOrgId,
                                    invoiceNumber = invoiceNumber,
                                    contactId = selectedCustomer?.value,
                                    type = "invoice",
                                    status = "SENT",
                                    issueDate = issueDate?.toString() ?: LocalDate.now().toString(),
                                    dueDate = dueDate?.toString() ?: LocalDate.now().plusDays(30).toString(),
                                    subtotal = BigDecimal.valueOf(subtotal),
                                    discountAmount = BigDecimal.valueOf(totalDiscount),
                                    taxAmount = BigDecimal.valueOf(totalTax),
                                    totalAmount = BigDecimal.valueOf(grandTotal),
                                    amountPaid = BigDecimal.ZERO,
                                    amountDue = BigDecimal.valueOf(grandTotal),
                                    currency = "INR",
                                    notes = notes.ifBlank { null },
                                    terms = terms.ifBlank { null },
                                    placeOfSupply = placeOfSupply?.label,
                                    reverseCharge = false,
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
                                            discountPercent = BigDecimal.valueOf(li.discountNum),
                                            taxRate = BigDecimal.valueOf(li.taxRate),
                                            cgstAmount = BigDecimal.valueOf(halfTax),
                                            sgstAmount = BigDecimal.valueOf(halfTax),
                                            totalAmount = BigDecimal.valueOf(li.totalAmount),
                                            sortOrder = idx,
                                        ))
                                    }
                                }
                            } catch (_: Exception) {}
                            onSaveSuccess("Invoice created successfully")
                        }
                    },
                    variant = ButtonVariant.Secondary,
                    isLoading = isSaving,
                )
            }
        }

        // Form content
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // Customer Selection
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Customer", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        KontafyDropdown(
                            items = customerList,
                            selectedItem = selectedCustomer,
                            onItemSelected = { selectedCustomer = it },
                            label = "Bill To",
                            placeholder = "Select customer",
                            searchable = true,
                            showCreateNew = true,
                            createNewLabel = "Create new customer",
                            onCreateNew = { showQuickCreateCustomer = true },
                            isError = showValidation && !isCustomerValid,
                            errorMessage = if (showValidation && !isCustomerValid) "Customer is required" else null,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            // Invoice Details
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Invoice Details", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            KontafyTextField(
                                value = invoiceNumber,
                                onValueChange = { invoiceNumber = it },
                                label = "Invoice Number",
                                placeholder = "INV-001",
                                modifier = Modifier.weight(1f),
                            )
                            KontafyDatePicker(
                                value = issueDate,
                                onValueChange = { issueDate = it },
                                label = "Issue Date",
                                modifier = Modifier.weight(1f),
                            )
                            KontafyDatePicker(
                                value = dueDate,
                                onValueChange = { dueDate = it },
                                label = "Due Date",
                                modifier = Modifier.weight(1f),
                            )
                        }

                        Spacer(Modifier.height(16.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            KontafyDropdown(
                                items = paymentTermsList.map { DropdownItem(it, it) },
                                selectedItem = paymentTerms,
                                onItemSelected = { item ->
                                    paymentTerms = item
                                    // Auto-set due date based on terms
                                    issueDate?.let { issue ->
                                        dueDate = when (item.label) {
                                            "Due on Receipt" -> issue
                                            "Net 15" -> issue.plusDays(15)
                                            "Net 30" -> issue.plusDays(30)
                                            "Net 45" -> issue.plusDays(45)
                                            "Net 60" -> issue.plusDays(60)
                                            "Net 90" -> issue.plusDays(90)
                                            else -> dueDate
                                        }
                                    }
                                },
                                label = "Payment Terms",
                                modifier = Modifier.weight(1f),
                            )
                            KontafyDropdown(
                                items = indianStates.map { DropdownItem(it, it) },
                                selectedItem = placeOfSupply,
                                onItemSelected = { placeOfSupply = it },
                                label = "Place of Supply",
                                placeholder = "Select state",
                                searchable = true,
                                modifier = Modifier.weight(1f),
                            )
                        }
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
                                style = MaterialTheme.typography.bodySmall,
                                color = KontafyColors.Error,
                                modifier = Modifier.padding(bottom = 8.dp),
                            )
                        }

                        // Table header
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("Product / Service", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1.5f))
                            Text("HSN/SAC", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                            Text("Qty", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(70.dp))
                            Text("Rate", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                            Text("Disc %", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(70.dp))
                            Text("Tax %", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                            Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp))
                            Spacer(Modifier.width(40.dp)) // Delete button space
                        }
                        HorizontalDivider(color = KontafyColors.Border)

                        // Line item rows
                        lineItems.forEachIndexed { index, item ->
                            LineItemRow(
                                item = item,
                                productDropdownItems = productDropdownItems,
                                onProductSelected = { productId ->
                                    val product = productDtoList.find { it.id == productId }
                                    if (product != null) {
                                        lineItems = lineItems.toMutableList().also {
                                            it[index] = it[index].copy(
                                                description = product.name,
                                                hsnSac = product.hsnCode ?: product.sacCode ?: "",
                                                unitPrice = if (product.sellingPrice > 0) product.sellingPrice.toString() else it[index].unitPrice,
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
                                                unitPrice = if (product.sellingPrice > 0) product.sellingPrice.toString() else it[index].unitPrice,
                                                taxRate = product.taxRate,
                                            )
                                        }
                                    }
                                    showQuickCreateProduct = true
                                },
                                onHsnChange = { value ->
                                    lineItems = lineItems.toMutableList().also { it[index] = it[index].copy(hsnSac = value) }
                                },
                                onQuantityChange = { value ->
                                    lineItems = lineItems.toMutableList().also { it[index] = it[index].copy(quantity = value) }
                                },
                                onUnitPriceChange = { value ->
                                    lineItems = lineItems.toMutableList().also { it[index] = it[index].copy(unitPrice = value) }
                                },
                                onDiscountChange = { value ->
                                    lineItems = lineItems.toMutableList().also { it[index] = it[index].copy(discountPercent = value) }
                                },
                                onTaxRateChange = { value ->
                                    lineItems = lineItems.toMutableList().also { it[index] = it[index].copy(taxRate = value) }
                                },
                                onDelete = {
                                    if (lineItems.size > 1) {
                                        lineItems = lineItems.toMutableList().also { it.removeAt(index) }
                                    }
                                },
                                canDelete = lineItems.size > 1,
                            )
                            HorizontalDivider(color = KontafyColors.BorderLight)
                        }

                        Spacer(Modifier.height(12.dp))

                        // Add line item button
                        KontafyButton(
                            text = "Add Line Item",
                            onClick = {
                                lineItems = lineItems + LineItemState()
                            },
                            variant = ButtonVariant.Outline,
                        )
                    }
                }
            }

            // Tax Summary
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Tax Summary", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))

                        Row(modifier = Modifier.fillMaxWidth()) {
                            Spacer(Modifier.weight(1f))
                            Column(modifier = Modifier.width(300.dp)) {
                                TaxSummaryRow("Subtotal", subtotal)
                                if (totalDiscount > 0) {
                                    TaxSummaryRow("Discount", -totalDiscount)
                                }
                                if (!isInterState) {
                                    TaxSummaryRow("CGST", cgst)
                                    TaxSummaryRow("SGST", sgst)
                                } else {
                                    TaxSummaryRow("IGST", igst)
                                }
                                Spacer(Modifier.height(8.dp))
                                HorizontalDivider(color = KontafyColors.Border)
                                Spacer(Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text("Total", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                                    Text(
                                        formatCurrency(grandTotal),
                                        style = MaterialTheme.typography.titleLarge,
                                        color = KontafyColors.Navy,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Notes & Terms
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Notes & Terms", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            KontafyTextField(
                                value = notes,
                                onValueChange = { notes = it },
                                label = "Notes",
                                placeholder = "Notes visible to the customer...",
                                singleLine = false,
                                modifier = Modifier.weight(1f).defaultMinSize(minHeight = 100.dp),
                            )
                            KontafyTextField(
                                value = terms,
                                onValueChange = { terms = it },
                                label = "Terms & Conditions",
                                placeholder = "Payment terms, late fees, etc.",
                                singleLine = false,
                                modifier = Modifier.weight(1f).defaultMinSize(minHeight = 100.dp),
                            )
                        }
                    }
                }
            }

            // Bottom spacing
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun LineItemRow(
    item: LineItemState,
    productDropdownItems: List<DropdownItem<String>> = emptyList(),
    onProductSelected: (String) -> Unit = {},
    onCreateProduct: () -> Unit = {},
    onHsnChange: (String) -> Unit,
    onQuantityChange: (String) -> Unit,
    onUnitPriceChange: (String) -> Unit,
    onDiscountChange: (String) -> Unit,
    onTaxRateChange: (Double) -> Unit,
    onDelete: () -> Unit,
    canDelete: Boolean,
) {
    val selectedProduct = productDropdownItems.find { it.label == item.description }

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Product dropdown
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
        // HSN/SAC
        OutlinedTextField(
            value = item.hsnSac,
            onValueChange = onHsnChange,
            modifier = Modifier.width(90.dp),
            placeholder = { Text("HSN", color = KontafyColors.MutedLight, style = MaterialTheme.typography.bodySmall) },
            singleLine = true,
            shape = RoundedCornerShape(6.dp),
            colors = compactFieldColors(),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        // Quantity
        OutlinedTextField(
            value = item.quantity,
            onValueChange = { v -> onQuantityChange(v.filter { it.isDigit() || it == '.' }) },
            modifier = Modifier.width(70.dp),
            singleLine = true,
            shape = RoundedCornerShape(6.dp),
            colors = compactFieldColors(),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        // Unit Price
        OutlinedTextField(
            value = item.unitPrice,
            onValueChange = { v -> onUnitPriceChange(v.filter { it.isDigit() || it == '.' }) },
            modifier = Modifier.width(100.dp),
            singleLine = true,
            shape = RoundedCornerShape(6.dp),
            colors = compactFieldColors(),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        // Discount %
        OutlinedTextField(
            value = item.discountPercent,
            onValueChange = { v -> onDiscountChange(v.filter { it.isDigit() || it == '.' }) },
            modifier = Modifier.width(70.dp),
            singleLine = true,
            shape = RoundedCornerShape(6.dp),
            colors = compactFieldColors(),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        // Tax Rate
        Box(modifier = Modifier.width(80.dp)) {
            var taxExpanded by remember { mutableStateOf(false) }
            OutlinedTextField(
                value = "${item.taxRate.toInt()}%",
                onValueChange = {},
                modifier = Modifier.fillMaxWidth(),
                readOnly = true,
                singleLine = true,
                shape = RoundedCornerShape(6.dp),
                colors = compactFieldColors(),
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
            )
            DropdownMenu(
                expanded = taxExpanded,
                onDismissRequest = { taxExpanded = false },
            ) {
                taxRates.forEach { rate ->
                    DropdownMenuItem(
                        text = { Text("${rate.toInt()}%") },
                        onClick = {
                            onTaxRateChange(rate)
                            taxExpanded = false
                        },
                    )
                }
            }
        }
        Spacer(Modifier.width(4.dp))
        // Amount (read-only)
        Text(
            text = formatCurrency(item.totalAmount),
            style = MaterialTheme.typography.bodyMedium,
            color = KontafyColors.Ink,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.width(110.dp),
        )
        // Delete button
        IconButton(
            onClick = onDelete,
            enabled = canDelete,
            modifier = Modifier.size(32.dp),
        ) {
            Icon(
                Icons.Outlined.Delete,
                "Remove",
                tint = if (canDelete) KontafyColors.Error else KontafyColors.MutedLight,
                modifier = Modifier.size(18.dp),
            )
        }
    }
}

@Composable
private fun TaxSummaryRow(label: String, amount: Double) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
        Text(
            formatCurrency(amount),
            style = MaterialTheme.typography.bodyLarge,
            color = KontafyColors.Ink,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
private fun compactFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = KontafyColors.Navy,
    unfocusedBorderColor = KontafyColors.Border,
    cursorColor = KontafyColors.Navy,
    focusedContainerColor = KontafyColors.White,
    unfocusedContainerColor = KontafyColors.White,
)

