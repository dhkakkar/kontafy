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
import com.kontafy.desktop.api.InvoiceDto
import com.kontafy.desktop.api.InvoiceItemModel
import com.kontafy.desktop.api.InvoiceModel
import com.kontafy.desktop.api.ProductDto
import com.kontafy.desktop.api.ProductModel
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.InvoiceItemRepository
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.ProductRepository
import com.kontafy.desktop.shortcuts.LocalShortcutAction
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

@Composable
fun EditInvoiceScreen(
    invoiceId: String,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository,
    invoiceItemRepository: InvoiceItemRepository,
    contactRepository: ContactRepository,
    productRepository: ProductRepository,
    onBack: () -> Unit,
    onSaveSuccess: (String) -> Unit = {},
    onNavigateToCreateCustomer: () -> Unit,
    orgState: String = "Maharashtra",
) {
    var productDtoList by remember {
        val dbProducts = try { productRepository.getByOrgId(currentOrgId).map { it.toDto() } } catch (e: Exception) { e.printStackTrace(); emptyList() }
        mutableStateOf(dbProducts)
    }
    val productDropdownItems = remember(productDtoList) {
        productDtoList.map { p ->
            DropdownItem(p.id, p.name, "${p.hsnCode ?: p.sacCode ?: ""} · ${formatCurrency(p.sellingPrice)}")
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

    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    // Form state - pre-filled from fetched invoice
    var selectedCustomer by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var invoiceNumber by remember { mutableStateOf("") }
    var issueDate by remember { mutableStateOf<LocalDate?>(null) }
    var dueDate by remember { mutableStateOf<LocalDate?>(null) }
    var paymentTerms by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var placeOfSupply by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var lineItems by remember { mutableStateOf(listOf(LineItemState())) }
    var notes by remember { mutableStateOf("") }
    var terms by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var showValidation by remember { mutableStateOf(false) }
    var documentType by remember { mutableStateOf("invoice") }

    val dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    var customerList by remember { mutableStateOf<List<DropdownItem<String>>>(emptyList()) }
    var contactStateMap by remember { mutableStateOf<Map<String, String?>>(emptyMap()) }

    val isPurchaseOrder = documentType.lowercase() == "purchase_order"
    val isQuotation = documentType.lowercase() == "quotation"
    val documentLabel = when {
        isPurchaseOrder -> "Purchase Order"
        isQuotation -> "Quotation"
        else -> "Invoice"
    }

    // Fetch customers and invoice data from local DB
    LaunchedEffect(invoiceId) {
        scope.launch {
            try {
                val dbContacts = contactRepository.getByOrgId(currentOrgId)
                contactStateMap = dbContacts.associate { it.id to it.state }

                // Load invoice from local DB first to determine type
                val model = invoiceRepository.getById(invoiceId)
                if (model != null) {
                    documentType = model.type

                    // Filter contacts based on document type
                    val contactTypeFilter = if (model.type.lowercase() == "purchase_order") {
                        listOf("VENDOR", "BOTH")
                    } else {
                        listOf("CUSTOMER", "BOTH")
                    }
                    customerList = dbContacts.filter { it.type.uppercase() in contactTypeFilter }
                        .map { c -> DropdownItem(c.id, c.name, c.gstin) }

                    val contactName = model.contactId?.let { cId ->
                        dbContacts.find { it.id == cId }?.name
                    } ?: ""
                    val items = try {
                        invoiceItemRepository.getByInvoice(invoiceId).map { it.toDto() }
                    } catch (e: Exception) { e.printStackTrace(); emptyList() }
                    val inv = model.toDto().copy(
                        customerName = contactName,
                        items = items,
                    )
                    populateForm(inv, dateFormatter, customerList) { c, n, id, dd, pt, pos, li, nt, tm ->
                        selectedCustomer = c; invoiceNumber = n; issueDate = id; dueDate = dd
                        paymentTerms = pt; placeOfSupply = pos; lineItems = li; notes = nt; terms = tm
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            isLoading = false
        }
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

    // Snackbar
    val snackbarHostState = remember { SnackbarHostState() }

    val isInvoiceNumberValid = invoiceNumber.isNotBlank()
    val isCustomerValid = selectedCustomer != null
    val hasLineItems = lineItems.any { it.description.isNotBlank() && it.quantityNum > 0 && it.unitPriceNum > 0 }
    val isFormValid = isInvoiceNumberValid && isCustomerValid && hasLineItems

    // Handle Ctrl+S shortcut
    val shortcutAction = LocalShortcutAction.current
    LaunchedEffect(shortcutAction.value) {
        if (shortcutAction.value == "save" && !isSaving && isFormValid) {
            shortcutAction.value = null
            isSaving = true
            try {
                val updated = InvoiceModel(
                    id = invoiceId,
                    orgId = currentOrgId,
                    invoiceNumber = invoiceNumber,
                    contactId = selectedCustomer?.value,
                    issueDate = issueDate?.toString() ?: java.time.LocalDate.now().toString(),
                    dueDate = dueDate?.toString() ?: java.time.LocalDate.now().plusDays(30).toString(),
                    subtotal = java.math.BigDecimal.valueOf(subtotal),
                    discountAmount = java.math.BigDecimal.valueOf(totalDiscount),
                    taxAmount = java.math.BigDecimal.valueOf(totalTax),
                    totalAmount = java.math.BigDecimal.valueOf(grandTotal),
                    amountDue = java.math.BigDecimal.valueOf(grandTotal),
                    notes = notes.ifBlank { null },
                    terms = terms.ifBlank { null },
                    placeOfSupply = placeOfSupply?.value,
                    updatedAt = java.time.LocalDateTime.now(),
                )
                invoiceRepository.update(updated)
                invoiceItemRepository.deleteByInvoice(invoiceId)
                lineItems.forEachIndexed { idx, li ->
                    if (li.description.isNotBlank()) {
                        val halfTax = li.taxAmount / 2.0
                        invoiceItemRepository.upsert(com.kontafy.desktop.api.InvoiceItemModel(
                            id = java.util.UUID.randomUUID().toString(),
                            invoiceId = invoiceId,
                            description = li.description,
                            hsnCode = li.hsnSac.ifBlank { null },
                            quantity = java.math.BigDecimal.valueOf(li.quantityNum),
                            unitPrice = java.math.BigDecimal.valueOf(li.unitPriceNum),
                            discountPercent = java.math.BigDecimal.valueOf(li.discountNum),
                            taxRate = java.math.BigDecimal.valueOf(li.taxRate),
                            cgstAmount = java.math.BigDecimal.valueOf(halfTax),
                            sgstAmount = java.math.BigDecimal.valueOf(halfTax),
                            totalAmount = java.math.BigDecimal.valueOf(li.totalAmount),
                            sortOrder = idx,
                        ))
                    }
                }
                onSaveSuccess("Invoice updated successfully")
            } catch (e: Exception) {
                e.printStackTrace()
                isSaving = false
            }
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = KontafyColors.Surface,
    ) { scaffoldPadding ->
    Column(
        modifier = Modifier.fillMaxSize().padding(scaffoldPadding).background(KontafyColors.Surface),
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
                    "Edit ${when (documentType.lowercase()) {
                        "purchase_order" -> "Purchase Order"
                        "quotation" -> "Quotation"
                        else -> "Invoice"
                    }} - $invoiceNumber",
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
                    text = "Save Changes",
                    onClick = {
                        showValidation = true
                        if (!isFormValid) {
                            val errorMsg = when {
                                !isInvoiceNumberValid -> "$documentLabel number must not be blank"
                                !isCustomerValid -> "Please select a ${if (isPurchaseOrder) "vendor" else "customer"}"
                                !hasLineItems -> "At least one line item is required"
                                else -> "Please fix validation errors"
                            }
                            scope.launch { snackbarHostState.showSnackbar(errorMsg) }
                            return@KontafyButton
                        }
                        if (isFormValid) {
                            isSaving = true
                            scope.launch {
                                try {
                                    val updated = InvoiceModel(
                                        id = invoiceId,
                                        orgId = currentOrgId,
                                        invoiceNumber = invoiceNumber,
                                        contactId = selectedCustomer?.value,
                                        issueDate = issueDate?.toString() ?: LocalDate.now().toString(),
                                        dueDate = dueDate?.toString() ?: LocalDate.now().plusDays(30).toString(),
                                        subtotal = BigDecimal.valueOf(subtotal),
                                        discountAmount = BigDecimal.valueOf(totalDiscount),
                                        taxAmount = BigDecimal.valueOf(totalTax),
                                        totalAmount = BigDecimal.valueOf(grandTotal),
                                        amountDue = BigDecimal.valueOf(grandTotal),
                                        notes = notes.ifBlank { null },
                                        terms = terms.ifBlank { null },
                                        placeOfSupply = placeOfSupply?.value,
                                        updatedAt = LocalDateTime.now(),
                                    )
                                    invoiceRepository.update(updated)
                                    // Delete old line items and save new ones
                                    invoiceItemRepository.deleteByInvoice(invoiceId)
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
                                    onSaveSuccess("Invoice updated successfully")
                                } catch (e: Exception) {
                                    e.printStackTrace()
                                    isSaving = false
                                }
                            }
                        }
                    },
                    variant = ButtonVariant.Secondary,
                    isLoading = isSaving,
                )
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            // Form content - reuses same layout as CreateInvoiceScreen
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
                                onItemSelected = { customer ->
                                    selectedCustomer = customer
                                    val customerState = contactStateMap[customer.value]
                                    if (!customerState.isNullOrBlank()) {
                                        placeOfSupply = DropdownItem(customerState, customerState)
                                    }
                                },
                                label = if (isPurchaseOrder) "Vendor" else "Bill To",
                                placeholder = if (isPurchaseOrder) "Select vendor" else "Select customer",
                                searchable = true,
                                showCreateNew = true,
                                createNewLabel = if (isPurchaseOrder) "Create new vendor" else "Create new customer",
                                onCreateNew = onNavigateToCreateCustomer,
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
                            Text("$documentLabel Details", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                            Spacer(Modifier.height(16.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                            ) {
                                KontafyTextField(
                                    value = invoiceNumber,
                                    onValueChange = { invoiceNumber = it },
                                    label = "$documentLabel Number",
                                    isError = showValidation && !isInvoiceNumberValid,
                                    errorMessage = if (showValidation && !isInvoiceNumberValid) "$documentLabel number is required" else null,
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
                            if (!isPurchaseOrder && !isQuotation) {
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
                                Spacer(Modifier.width(40.dp))
                            }
                            HorizontalDivider(color = KontafyColors.Border)

                            lineItems.forEachIndexed { index, item ->
                                EditLineItemRow(
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
                            KontafyButton(
                                text = "Add Line Item",
                                onClick = { lineItems = lineItems + LineItemState() },
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
                                    EditTaxSummaryRow("Subtotal", subtotal)
                                    if (totalDiscount > 0) EditTaxSummaryRow("Discount", -totalDiscount)
                                    if (!isInterState) {
                                        EditTaxSummaryRow("CGST", cgst)
                                        EditTaxSummaryRow("SGST", sgst)
                                    } else {
                                        EditTaxSummaryRow("IGST", igst)
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    HorizontalDivider(color = KontafyColors.Border)
                                    Spacer(Modifier.height(8.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Text("Total", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                                        Text(formatCurrency(grandTotal), style = MaterialTheme.typography.titleLarge, color = KontafyColors.Navy, fontWeight = FontWeight.Bold)
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

                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
    } // Scaffold
}

// Helper to populate form from InvoiceDto
private fun populateForm(
    inv: InvoiceDto,
    dateFormatter: DateTimeFormatter,
    customers: List<DropdownItem<String>>,
    setter: (
        customer: DropdownItem<String>?,
        invoiceNumber: String,
        issueDate: LocalDate?,
        dueDate: LocalDate?,
        paymentTerms: DropdownItem<String>?,
        placeOfSupply: DropdownItem<String>?,
        lineItems: List<LineItemState>,
        notes: String,
        terms: String,
    ) -> Unit,
) {
    val customer = customers.find { it.value == inv.customerId }
        ?: if (inv.customerId != null) DropdownItem(inv.customerId, inv.customerName) else null
    val issue = try { LocalDate.parse(inv.issueDate, dateFormatter) } catch (_: Exception) { LocalDate.now() }
    val due = try { LocalDate.parse(inv.dueDate, dateFormatter) } catch (_: Exception) { LocalDate.now().plusDays(30) }
    val pos = inv.placeOfSupply?.let { DropdownItem(it, it) }
    val items = if (inv.items.isNotEmpty()) {
        inv.items.map { item ->
            LineItemState(
                description = item.description,
                hsnSac = item.hsnCode ?: "",
                quantity = item.quantity.toString(),
                unitPrice = item.unitPrice.toString(),
                discountPercent = if (item.discountPercent > 0) item.discountPercent.toString() else "",
                taxRate = item.taxRate,
            )
        }
    } else {
        listOf(LineItemState())
    }
    setter(customer, inv.invoiceNumber, issue, due, null, pos, items, inv.notes ?: "", inv.terms ?: "")
}

@Composable
private fun EditLineItemRow(
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
            value = item.hsnSac,
            onValueChange = onHsnChange,
            modifier = Modifier.width(90.dp),
            placeholder = { Text("HSN", color = KontafyColors.MutedLight, style = MaterialTheme.typography.bodySmall) },
            singleLine = true,
            shape = RoundedCornerShape(6.dp),
            colors = editCompactFieldColors(),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        OutlinedTextField(
            value = item.quantity,
            onValueChange = { v -> onQuantityChange(v.filter { it.isDigit() || it == '.' }) },
            modifier = Modifier.width(70.dp),
            singleLine = true,
            shape = RoundedCornerShape(6.dp),
            colors = editCompactFieldColors(),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        OutlinedTextField(
            value = item.unitPrice,
            onValueChange = { v -> onUnitPriceChange(v.filter { it.isDigit() || it == '.' }) },
            modifier = Modifier.width(100.dp),
            singleLine = true,
            shape = RoundedCornerShape(6.dp),
            colors = editCompactFieldColors(),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        OutlinedTextField(
            value = item.discountPercent,
            onValueChange = { v -> onDiscountChange(v.filter { it.isDigit() || it == '.' }) },
            modifier = Modifier.width(70.dp),
            singleLine = true,
            shape = RoundedCornerShape(6.dp),
            colors = editCompactFieldColors(),
            textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
        )
        Spacer(Modifier.width(4.dp))
        Box(modifier = Modifier.width(80.dp)) {
            var taxExpanded by remember { mutableStateOf(false) }
            OutlinedTextField(
                value = "${item.taxRate.toInt()}%",
                onValueChange = {},
                modifier = Modifier.fillMaxWidth(),
                readOnly = true,
                singleLine = true,
                shape = RoundedCornerShape(6.dp),
                colors = editCompactFieldColors(),
                textStyle = MaterialTheme.typography.bodyMedium.copy(color = KontafyColors.Ink),
            )
            DropdownMenu(expanded = taxExpanded, onDismissRequest = { taxExpanded = false }) {
                taxRates.forEach { rate ->
                    DropdownMenuItem(
                        text = { Text("${rate.toInt()}%") },
                        onClick = { onTaxRateChange(rate); taxExpanded = false },
                    )
                }
            }
        }
        Spacer(Modifier.width(4.dp))
        Text(
            text = formatCurrency(item.totalAmount),
            style = MaterialTheme.typography.bodyMedium,
            color = KontafyColors.Ink,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.width(110.dp),
        )
        IconButton(onClick = onDelete, enabled = canDelete, modifier = Modifier.size(32.dp)) {
            Icon(Icons.Outlined.Delete, "Remove", tint = if (canDelete) KontafyColors.Error else KontafyColors.MutedLight, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun EditTaxSummaryRow(label: String, amount: Double) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
        Text(formatCurrency(amount), style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun editCompactFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = KontafyColors.Navy,
    unfocusedBorderColor = KontafyColors.Border,
    cursorColor = KontafyColors.Navy,
    focusedContainerColor = KontafyColors.White,
    unfocusedContainerColor = KontafyColors.White,
)
