package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.shortcuts.LocalShortcutAction
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.BankAccountRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.InvoiceItemRepository
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.PaymentRepository
import com.kontafy.desktop.services.AccountingService
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

data class OutstandingInvoice(
    val id: String,
    val invoiceNumber: String,
    val amount: Double,
    val dueDate: String,
    val isSelected: Boolean = false,
)

@Composable
fun RecordPaymentScreen(
    currentOrgId: String,
    contactRepository: ContactRepository,
    paymentRepository: PaymentRepository,
    bankAccountRepository: BankAccountRepository = BankAccountRepository(),
    invoiceRepository: InvoiceRepository = InvoiceRepository(),
    invoiceItemRepository: InvoiceItemRepository = InvoiceItemRepository(),
    accountingService: AccountingService = AccountingService(),
    onBack: () -> Unit,
    onSaved: () -> Unit,
    onAddBankAccount: () -> Unit = {},
    editPaymentId: String? = null,
) {
    val isEditMode = editPaymentId != null
    var paymentType by remember { mutableStateOf("Received") }
    var selectedContact by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var paymentAmount by remember { mutableStateOf("") }
    var paymentDate by remember { mutableStateOf<LocalDate?>(LocalDate.now()) }
    var reference by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    var contacts by remember { mutableStateOf<List<DropdownItem<String>>>(emptyList()) }
    var bankAccounts by remember { mutableStateOf<List<DropdownItem<String>>>(emptyList()) }
    var selectedBank by remember { mutableStateOf<DropdownItem<String>?>(null) }

    // Load contacts and bank accounts from local DB
    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val dbContacts = contactRepository.getByOrgId(currentOrgId)
                contacts = dbContacts.map { c ->
                    DropdownItem(c.id, c.name, c.gstin?.let { "GSTIN: $it" })
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
            try {
                val dbBanks = bankAccountRepository.getByOrgId(currentOrgId)
                bankAccounts = dbBanks.map { b ->
                    DropdownItem(b.id, "${b.bankName} - ${b.accountNumber}", b.ifscCode)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    val methods = remember {
        listOf(
            DropdownItem("Cash", "Cash"),
            DropdownItem("Bank Transfer", "Bank Transfer"),
            DropdownItem("UPI", "UPI"),
            DropdownItem("Cheque", "Cheque"),
            DropdownItem("Card", "Card"),
        )
    }
    var selectedMethod by remember { mutableStateOf<DropdownItem<String>?>(null) }

    // Load existing payment for edit mode
    LaunchedEffect(editPaymentId) {
        if (editPaymentId != null) {
            try {
                val existing = paymentRepository.getById(editPaymentId)
                if (existing != null) {
                    paymentType = if (existing.type.lowercase() == "received") "Received" else "Made"
                    paymentAmount = existing.amount.toPlainString()
                    paymentDate = try { LocalDate.parse(existing.paymentDate) } catch (e: Exception) { LocalDate.now() }
                    reference = existing.reference ?: ""
                    notes = existing.notes ?: ""
                    selectedMethod = methods.find { it.value.equals(existing.method, ignoreCase = true) }
                    selectedContact = contacts.find { it.value == existing.contactId }
                }
            } catch (e: Exception) { e.printStackTrace() }
        }
    }

    var outstandingInvoices by remember { mutableStateOf<List<OutstandingInvoice>>(emptyList()) }
    var previewInvoice by remember { mutableStateOf<InvoiceModel?>(null) }
    var previewInvoiceItems by remember { mutableStateOf<List<InvoiceItemModel>>(emptyList()) }

    // Auto-fill amount from selected invoices
    val selectedTotal = outstandingInvoices.filter { it.isSelected }.sumOf { it.amount }
    LaunchedEffect(selectedTotal) {
        if (selectedTotal > 0 && paymentAmount.isBlank()) {
            paymentAmount = BigDecimal.valueOf(selectedTotal).setScale(2, RoundingMode.HALF_UP).toPlainString()
        }
    }

    val showBankSelector = selectedMethod?.value in listOf("Bank Transfer", "Cheque")
    val isValid = selectedContact != null && paymentAmount.isNotBlank() && paymentDate != null && selectedMethod != null

    // Handle Ctrl+S shortcut
    val shortcutAction = LocalShortcutAction.current
    LaunchedEffect(shortcutAction.value) {
        if (shortcutAction.value == "save" && !isSaving && isValid) {
            shortcutAction.value = null
            isSaving = true
            try {
                val paidAmount = paymentAmount.toBigDecimalOrNull() ?: java.math.BigDecimal.ZERO
                val linkedInvoiceId = outstandingInvoices.filter { it.isSelected }.firstOrNull()?.id
                val model = PaymentModel(
                    id = java.util.UUID.randomUUID().toString(),
                    orgId = currentOrgId,
                    contactId = selectedContact?.value,
                    invoiceId = linkedInvoiceId,
                    amount = paidAmount,
                    paymentDate = paymentDate?.toString() ?: java.time.LocalDate.now().toString(),
                    method = selectedMethod?.value ?: "cash",
                    reference = reference.ifBlank { null },
                    notes = notes.ifBlank { null },
                    type = paymentType.lowercase(),
                    updatedAt = java.time.LocalDateTime.now(),
                )
                accountingService.recordPayment(model)
                isSaving = false
                onSaved()
            } catch (e: Exception) {
                e.printStackTrace()
                isSaving = false
            }
        }
    }

    // Invoice preview dialog
    if (previewInvoice != null) {
        val inv = previewInvoice!!
        AlertDialog(
            onDismissRequest = { previewInvoice = null },
            confirmButton = {
                KontafyButton(text = "Close", onClick = { previewInvoice = null }, variant = ButtonVariant.Outline)
            },
            title = {
                Text(inv.invoiceNumber, style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Text("Status", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                        KontafyBadge(
                            text = inv.status.replaceFirstChar { it.titlecase() },
                            type = when (inv.status.uppercase()) {
                                "PAID" -> BadgeType.Success
                                "OVERDUE" -> BadgeType.Error
                                "SENT" -> BadgeType.Info
                                else -> BadgeType.Neutral
                            },
                        )
                    }
                    InvoicePreviewRow("Issue Date", inv.issueDate)
                    InvoicePreviewRow("Due Date", inv.dueDate)
                    InvoicePreviewRow("Subtotal", formatCurrency(inv.subtotal.toDouble()))
                    if (inv.discountAmount > BigDecimal.ZERO) {
                        InvoicePreviewRow("Discount", "-${formatCurrency(inv.discountAmount.toDouble())}")
                    }
                    if (inv.taxAmount > BigDecimal.ZERO) {
                        InvoicePreviewRow("Tax", formatCurrency(inv.taxAmount.toDouble()))
                    }
                    HorizontalDivider(color = KontafyColors.Border)
                    InvoicePreviewRow("Total", formatCurrency(inv.totalAmount.toDouble()), bold = true)
                    InvoicePreviewRow("Paid", formatCurrency(inv.amountPaid.toDouble()))
                    InvoicePreviewRow("Amount Due", formatCurrency(inv.amountDue.toDouble()), bold = true, valueColor = KontafyColors.StatusOverdue)

                    if (previewInvoiceItems.isNotEmpty()) {
                        Spacer(Modifier.height(4.dp))
                        Text("Line Items", style = MaterialTheme.typography.labelLarge, color = KontafyColors.Ink)
                        previewInvoiceItems.forEach { item ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    "${item.description ?: "Item"} × ${item.quantity.stripTrailingZeros().toPlainString()}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = KontafyColors.Ink,
                                    modifier = Modifier.weight(1f),
                                )
                                Text(
                                    formatCurrency(item.totalAmount.toDouble()),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = KontafyColors.Ink,
                                    fontWeight = FontWeight.Medium,
                                )
                            }
                        }
                    }

                    if (!inv.notes.isNullOrBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text("Notes", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                        Text(inv.notes, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink)
                    }
                }
            },
            containerColor = KontafyColors.SurfaceElevated,
            shape = RoundedCornerShape(12.dp),
        )
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = if (isEditMode) "Edit Payment" else "Record Payment",
            actions = {
                KontafyButton(
                    text = "Back",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
            },
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            item {
                Card(
                    modifier = Modifier.widthIn(max = 640.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                ) {
                    Column(
                        modifier = Modifier.padding(32.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Text(
                            "Payment Details",
                            style = MaterialTheme.typography.titleLarge,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.SemiBold,
                        )

                        // Payment Type Toggle
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            listOf("Received", "Made").forEach { type ->
                                FilterChip(
                                    selected = paymentType == type,
                                    onClick = {
                                        paymentType = type
                                        // Reload outstanding invoices for updated type
                                        outstandingInvoices = emptyList()
                                        selectedContact?.let { contact ->
                                            scope.launch {
                                                try {
                                                    val allDocs = invoiceRepository.getByContact(contact.value)
                                                    val relevantType2 = if (type == "Received") "invoice" else "purchase_order"
                                                    outstandingInvoices = allDocs
                                                        .filter {
                                                            it.type.lowercase() == relevantType2 &&
                                                                it.amountDue > BigDecimal.ZERO &&
                                                                it.status.uppercase() !in listOf("PAID", "CANCELLED")
                                                        }
                                                        .map { inv ->
                                                            OutstandingInvoice(
                                                                id = inv.id,
                                                                invoiceNumber = inv.invoiceNumber,
                                                                amount = inv.amountDue.toDouble(),
                                                                dueDate = inv.dueDate,
                                                            )
                                                        }
                                                } catch (e: Exception) {
                                                    e.printStackTrace()
                                                }
                                            }
                                        }
                                    },
                                    label = {
                                        Text(
                                            "Payment $type",
                                            fontWeight = if (paymentType == type) FontWeight.SemiBold else FontWeight.Normal,
                                        )
                                    },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = if (type == "Received") KontafyColors.Green else KontafyColors.StatusOverdue,
                                        selectedLabelColor = KontafyColors.White,
                                        containerColor = KontafyColors.Surface,
                                        labelColor = KontafyColors.Muted,
                                    ),
                                    shape = RoundedCornerShape(8.dp),
                                    border = FilterChipDefaults.filterChipBorder(
                                        borderColor = KontafyColors.Border,
                                        selectedBorderColor = if (type == "Received") KontafyColors.Green else KontafyColors.StatusOverdue,
                                        enabled = true,
                                        selected = paymentType == type,
                                    ),
                                )
                            }
                        }

                        // Contact selector
                        KontafyDropdown(
                            items = contacts,
                            selectedItem = selectedContact,
                            onItemSelected = { contact ->
                                selectedContact = contact
                                // Load outstanding invoices for this contact
                                scope.launch {
                                    try {
                                        val allDocs = invoiceRepository.getByContact(contact.value)
                                        // Filter by document type: invoices for "Received", purchase orders for "Made"
                                        val relevantType = if (paymentType == "Received") "invoice" else "purchase_order"
                                        outstandingInvoices = allDocs
                                            .filter {
                                                it.type.lowercase() == relevantType &&
                                                    it.amountDue > BigDecimal.ZERO &&
                                                    it.status.uppercase() !in listOf("PAID", "CANCELLED")
                                            }
                                            .map { inv ->
                                                OutstandingInvoice(
                                                    id = inv.id,
                                                    invoiceNumber = inv.invoiceNumber,
                                                    amount = inv.amountDue.toDouble(),
                                                    dueDate = inv.dueDate,
                                                )
                                            }
                                    } catch (e: Exception) {
                                        e.printStackTrace()
                                    }
                                }
                            },
                            label = "Contact",
                            placeholder = "Search contact...",
                            searchable = true,
                        )

                        // Outstanding invoices
                        if (selectedContact != null) {
                            Text(
                                if (paymentType == "Received") "Outstanding Invoices" else "Outstanding Purchase Orders",
                                style = MaterialTheme.typography.labelLarge,
                                color = KontafyColors.Ink,
                            )
                            Card(
                                shape = RoundedCornerShape(8.dp),
                                colors = CardDefaults.cardColors(containerColor = KontafyColors.Surface),
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    outstandingInvoices.forEachIndexed { index, inv ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Checkbox(
                                                checked = inv.isSelected,
                                                onCheckedChange = { checked ->
                                                    outstandingInvoices = outstandingInvoices.toMutableList().also {
                                                        it[index] = inv.copy(isSelected = checked)
                                                    }
                                                    if (checked) {
                                                        val newTotal = outstandingInvoices.toMutableList().also { it[index] = inv.copy(isSelected = true) }.filter { it.isSelected }.sumOf { it.amount }
                                                        paymentAmount = BigDecimal.valueOf(newTotal).setScale(2, RoundingMode.HALF_UP).toPlainString()
                                                    }
                                                },
                                                colors = CheckboxDefaults.colors(
                                                    checkedColor = KontafyColors.Navy,
                                                ),
                                            )
                                            Spacer(Modifier.width(8.dp))
                                            Text(
                                                inv.invoiceNumber,
                                                style = MaterialTheme.typography.bodyMedium.copy(textDecoration = TextDecoration.Underline),
                                                color = KontafyColors.Navy,
                                                fontWeight = FontWeight.SemiBold,
                                                modifier = Modifier.width(80.dp).clickable {
                                                    scope.launch {
                                                        try {
                                                            previewInvoice = invoiceRepository.getById(inv.id)
                                                            previewInvoiceItems = invoiceItemRepository.getByInvoice(inv.id)
                                                        } catch (e: Exception) { e.printStackTrace() }
                                                    }
                                                },
                                            )
                                            Text(formatCurrency(inv.amount), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                            Text("Due: ${inv.dueDate}", style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                                        }
                                    }
                                }
                            }
                        }

                        // Amount & Date row
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            KontafyTextField(
                                value = paymentAmount,
                                onValueChange = { paymentAmount = it },
                                label = "Payment Amount",
                                placeholder = "0.00",
                                modifier = Modifier.weight(1f),
                            )
                            KontafyDatePicker(
                                value = paymentDate,
                                onValueChange = { paymentDate = it },
                                label = "Payment Date",
                                modifier = Modifier.weight(1f),
                            )
                        }

                        // Method
                        KontafyDropdown(
                            items = methods,
                            selectedItem = selectedMethod,
                            onItemSelected = { selectedMethod = it },
                            label = "Payment Method",
                            placeholder = "Select method",
                        )

                        // Reference
                        KontafyTextField(
                            value = reference,
                            onValueChange = { reference = it },
                            label = "Reference",
                            placeholder = "Cheque#, UTR#, Transaction ID...",
                        )

                        // Bank account (conditional)
                        if (showBankSelector) {
                            KontafyDropdown(
                                items = bankAccounts,
                                selectedItem = selectedBank,
                                onItemSelected = { selectedBank = it },
                                label = "Bank Account",
                                placeholder = "Select bank account",
                                showCreateNew = true,
                                createNewLabel = "Add Bank Account",
                                onCreateNew = onAddBankAccount,
                            )
                        }

                        // Notes
                        KontafyTextField(
                            value = notes,
                            onValueChange = { notes = it },
                            label = "Notes (Optional)",
                            placeholder = "Additional notes...",
                            singleLine = false,
                        )

                        Spacer(Modifier.height(8.dp))

                        // Actions
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.End),
                        ) {
                            KontafyButton(
                                text = "Cancel",
                                onClick = onBack,
                                variant = ButtonVariant.Outline,
                            )
                            KontafyButton(
                                text = if (isEditMode) "Update Payment" else "Save Payment",
                                onClick = {
                                    scope.launch {
                                        isSaving = true
                                        try {
                                            val paidAmount = paymentAmount.toBigDecimalOrNull() ?: BigDecimal.ZERO
                                            val linkedInvoiceId = outstandingInvoices.filter { it.isSelected }.firstOrNull()?.id
                                            if (isEditMode) {
                                                val existing = paymentRepository.getById(editPaymentId!!)
                                                if (existing != null) {
                                                    paymentRepository.update(existing.copy(
                                                        contactId = selectedContact?.value,
                                                        invoiceId = linkedInvoiceId ?: existing.invoiceId,
                                                        amount = paidAmount,
                                                        paymentDate = paymentDate?.toString() ?: LocalDate.now().toString(),
                                                        method = selectedMethod?.value ?: "cash",
                                                        reference = reference.ifBlank { null },
                                                        notes = notes.ifBlank { null },
                                                        type = paymentType.lowercase(),
                                                        updatedAt = LocalDateTime.now(),
                                                    ))
                                                }
                                            } else {
                                                val model = PaymentModel(
                                                    id = UUID.randomUUID().toString(),
                                                    orgId = currentOrgId,
                                                    contactId = selectedContact?.value,
                                                    invoiceId = linkedInvoiceId,
                                                    amount = paidAmount,
                                                    paymentDate = paymentDate?.toString() ?: LocalDate.now().toString(),
                                                    method = selectedMethod?.value ?: "cash",
                                                    reference = reference.ifBlank { null },
                                                    notes = notes.ifBlank { null },
                                                    type = paymentType.lowercase(),
                                                    updatedAt = LocalDateTime.now(),
                                                )
                                                accountingService.recordPayment(model)
                                            }

                                            isSaving = false
                                            onSaved()
                                        } catch (e: Exception) {
                                            e.printStackTrace()
                                            isSaving = false
                                        }
                                    }
                                },
                                variant = ButtonVariant.Primary,
                                enabled = isValid && !isSaving,
                                isLoading = isSaving,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun InvoicePreviewRow(
    label: String,
    value: String,
    bold: Boolean = false,
    valueColor: androidx.compose.ui.graphics.Color = KontafyColors.Ink,
) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = valueColor,
            fontWeight = if (bold) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}
