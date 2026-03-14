package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.PaymentRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.math.BigDecimal
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
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    var paymentType by remember { mutableStateOf("Received") }
    var selectedContact by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var paymentAmount by remember { mutableStateOf("") }
    var paymentDate by remember { mutableStateOf<LocalDate?>(LocalDate.now()) }
    var reference by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    var contacts by remember { mutableStateOf<List<DropdownItem<String>>>(emptyList()) }

    // Load contacts from local DB
    LaunchedEffect(Unit) {
        scope.launch {
            try {
                val dbContacts = contactRepository.getByOrgId(currentOrgId)
                contacts = dbContacts.map { c ->
                    DropdownItem(c.id, c.name, c.gstin?.let { "GSTIN: $it" })
                }
            } catch (_: Exception) {}
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

    var bankAccounts by remember { mutableStateOf<List<DropdownItem<String>>>(emptyList()) }
    var selectedBank by remember { mutableStateOf<DropdownItem<String>?>(null) }

    var outstandingInvoices by remember { mutableStateOf<List<OutstandingInvoice>>(emptyList()) }

    // Auto-fill amount from selected invoices
    val selectedTotal = outstandingInvoices.filter { it.isSelected }.sumOf { it.amount }
    LaunchedEffect(selectedTotal) {
        if (selectedTotal > 0 && paymentAmount.isBlank()) {
            paymentAmount = selectedTotal.toLong().toString()
        }
    }

    val showBankSelector = selectedMethod?.value in listOf("Bank Transfer", "Cheque")
    val isValid = selectedContact != null && paymentAmount.isNotBlank() && paymentDate != null && selectedMethod != null

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Record Payment",
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
                                    onClick = { paymentType = type },
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
                            onItemSelected = { selectedContact = it },
                            label = "Contact",
                            placeholder = "Search contact...",
                            searchable = true,
                        )

                        // Outstanding invoices
                        if (selectedContact != null) {
                            Text(
                                "Outstanding Invoices",
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
                                                        paymentAmount = newTotal.toLong().toString()
                                                    }
                                                },
                                                colors = CheckboxDefaults.colors(
                                                    checkedColor = KontafyColors.Navy,
                                                ),
                                            )
                                            Spacer(Modifier.width(8.dp))
                                            Text(inv.invoiceNumber, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(80.dp))
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
                                text = "Save Payment",
                                onClick = {
                                    scope.launch {
                                        isSaving = true
                                        try {
                                            val model = PaymentModel(
                                                id = UUID.randomUUID().toString(),
                                                orgId = currentOrgId,
                                                contactId = selectedContact?.value,
                                                invoiceId = outstandingInvoices.filter { it.isSelected }.firstOrNull()?.id,
                                                amount = paymentAmount.toBigDecimalOrNull() ?: BigDecimal.ZERO,
                                                paymentDate = paymentDate?.toString() ?: LocalDate.now().toString(),
                                                method = selectedMethod?.value ?: "cash",
                                                reference = reference.ifBlank { null },
                                                notes = notes.ifBlank { null },
                                                type = paymentType.lowercase(),
                                                updatedAt = LocalDateTime.now(),
                                            )
                                            paymentRepository.create(model)
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
