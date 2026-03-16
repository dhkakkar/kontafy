package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.BankTransactionRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.JournalEntryRepository
import com.kontafy.desktop.db.repositories.PaymentRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.math.BigDecimal

@Composable
fun BankRegisterScreen(
    bankId: String,
    apiClient: ApiClient,
    currentOrgId: String = "org-default",
    bankTransactionRepository: BankTransactionRepository = BankTransactionRepository(),
    paymentRepository: PaymentRepository = PaymentRepository(),
    contactRepository: ContactRepository = ContactRepository(),
    journalEntryRepository: JournalEntryRepository = JournalEntryRepository(),
    onBack: () -> Unit,
    onReconcile: (String) -> Unit,
    onNavigateToEntry: (String) -> Unit = {},
    onEditPayment: (String) -> Unit = {},
    showSnackbar: (String) -> Unit = {},
) {
    var transactions by remember { mutableStateOf<List<BankTransactionDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var filterStatus by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    // Map payment ID -> journal entry ID for click navigation
    val paymentToEntryMap = remember { mutableStateMapOf<String, String>() }
    LaunchedEffect(Unit) {
        try {
            val entries = journalEntryRepository.getByOrgId(currentOrgId)
            entries.filter { it.referenceType == "payment" && it.referenceId != null }.forEach { entry ->
                paymentToEntryMap[entry.referenceId!!] = entry.id
            }
        } catch (e: Exception) { e.printStackTrace() }
    }

    LaunchedEffect(Unit) {
        scope.launch {
            val allTransactions = mutableListOf<BankTransactionDto>()

            // Load from local bank_transactions table
            try {
                val localTxns = bankTransactionRepository.getByBankAccountId(bankId)
                if (localTxns.isNotEmpty()) {
                    allTransactions.addAll(localTxns.map { it.toDto() })
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // Also load payments made via non-cash methods and show them as bank transactions
            try {
                val contactNameMap = try {
                    contactRepository.getByOrgId(currentOrgId).associate { it.id to it.name }
                } catch (e: Exception) { emptyMap() }

                val payments = paymentRepository.getByOrgId(currentOrgId)
                val bankPayments = payments.filter { it.method.lowercase() !in listOf("cash") }

                // Convert payments to bank transaction format
                var runningBalance = BigDecimal.ZERO
                val paymentTxns = bankPayments.sortedBy { it.paymentDate }.map { p ->
                    val contactName = p.contactId?.let { contactNameMap[it] } ?: ""
                    val isDebit = p.type.lowercase() == "made"
                    val debit = if (isDebit) p.amount.toDouble() else 0.0
                    val credit = if (!isDebit) p.amount.toDouble() else 0.0
                    if (isDebit) runningBalance -= p.amount else runningBalance += p.amount

                    BankTransactionDto(
                        id = "pmt-${p.id}",
                        date = p.paymentDate,
                        description = "${if (isDebit) "Payment to" else "Payment from"} $contactName".trim(),
                        reference = p.reference ?: "${p.method} payment",
                        debit = debit,
                        credit = credit,
                        balance = runningBalance.toDouble(),
                        isReconciled = false,
                    )
                }
                // Add payment transactions that aren't already in the bank transactions (avoid duplicates by date+amount)
                val existingKeys = allTransactions.map { "${it.date}-${it.debit}-${it.credit}" }.toSet()
                paymentTxns.forEach { pTxn ->
                    val key = "${pTxn.date}-${pTxn.debit}-${pTxn.credit}"
                    if (key !in existingKeys) {
                        allTransactions.add(pTxn)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // Sort by date descending
            transactions = allTransactions.sortedByDescending { it.date }

            // Try API as fallback/refresh if we have no data at all
            if (transactions.isEmpty()) {
                try {
                    val result = apiClient.getBankTransactions(bankId)
                    result.fold(
                        onSuccess = { apiTxns ->
                            transactions = apiTxns
                            // Cache to local DB
                            try {
                                apiTxns.forEach { dto ->
                                    bankTransactionRepository.upsert(
                                        BankTransactionModel(
                                            id = dto.id,
                                            bankAccountId = bankId,
                                            date = dto.date,
                                            description = dto.description,
                                            reference = dto.reference,
                                            debit = BigDecimal.valueOf(dto.debit),
                                            credit = BigDecimal.valueOf(dto.credit),
                                            balance = BigDecimal.valueOf(dto.balance),
                                            isReconciled = dto.isReconciled,
                                        ),
                                    )
                                }
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                        },
                        onFailure = {
                            if (transactions.isEmpty()) {
                                showSnackbar("No bank transactions found")
                            }
                        },
                    )
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            isLoading = false
        }
    }

    val displayTransactions = transactions.let { txns ->
        when (filterStatus) {
            "Reconciled" -> txns.filter { it.isReconciled }
            "Unreconciled" -> txns.filter { !it.isReconciled }
            else -> txns
        }
    }

    val totalDebit = displayTransactions.sumOf { it.debit }
    val totalCredit = displayTransactions.sumOf { it.credit }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Bank Register",
            actions = {
                KontafyButton(
                    text = "Reconcile",
                    onClick = { onReconcile(bankId) },
                    variant = ButtonVariant.Secondary,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Back",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
            },
        )

        // Summary row
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Money In", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                    Text(formatCurrency(totalCredit), style = MaterialTheme.typography.titleMedium, color = KontafyColors.Green, fontWeight = FontWeight.Bold)
                }
            }
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Money Out", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                    Text(formatCurrency(totalDebit), style = MaterialTheme.typography.titleMedium, color = KontafyColors.StatusOverdue, fontWeight = FontWeight.Bold)
                }
            }
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("${displayTransactions.size} Transactions", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                    Text(formatCurrency(totalCredit - totalDebit), style = MaterialTheme.typography.titleMedium, color = KontafyColors.Navy, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Filter chips
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Outlined.FilterList, contentDescription = "Filters", tint = KontafyColors.Muted, modifier = Modifier.size(18.dp))
            BankFilterChip("All", filterStatus == null) { filterStatus = null }
            BankFilterChip("Reconciled", filterStatus == "Reconciled") { filterStatus = "Reconciled" }
            BankFilterChip("Unreconciled", filterStatus == "Unreconciled") { filterStatus = "Unreconciled" }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (displayTransactions.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No transactions found", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Muted)
                    Spacer(Modifier.height(8.dp))
                    Text("Record payments to see them here", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.MutedLight)
                }
            }
        } else {
            // Table header
            Surface(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
                color = KontafyColors.Surface,
                shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                    Text("Description", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                    Text("Reference", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                    Text("Money Out", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                    Text("Money In", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                    Text("Balance", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                    Text("Status", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                    Text("", style = MaterialTheme.typography.labelMedium, modifier = Modifier.width(40.dp))
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
            ) {
                items(displayTransactions) { txn ->
                    val paymentId = if (txn.id.startsWith("pmt-")) txn.id.removePrefix("pmt-") else null
                    val entryId = paymentId?.let { paymentToEntryMap[it] }
                    Surface(
                        modifier = Modifier.fillMaxWidth().clickable {
                            if (entryId != null) onNavigateToEntry(entryId)
                        },
                        color = KontafyColors.SurfaceElevated,
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(txn.date, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                            Text(txn.description, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                            Text(txn.reference, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                            Text(
                                if (txn.debit > 0) formatCurrency(txn.debit) else "-",
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (txn.debit > 0) KontafyColors.StatusOverdue else KontafyColors.Muted,
                                fontWeight = if (txn.debit > 0) FontWeight.SemiBold else FontWeight.Normal,
                                modifier = Modifier.width(110.dp),
                                textAlign = TextAlign.End,
                            )
                            Text(
                                if (txn.credit > 0) formatCurrency(txn.credit) else "-",
                                style = MaterialTheme.typography.bodyMedium,
                                color = if (txn.credit > 0) KontafyColors.Green else KontafyColors.Muted,
                                fontWeight = if (txn.credit > 0) FontWeight.SemiBold else FontWeight.Normal,
                                modifier = Modifier.width(110.dp),
                                textAlign = TextAlign.End,
                            )
                            Text(
                                formatCurrency(txn.balance),
                                style = MaterialTheme.typography.bodyMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.width(120.dp),
                                textAlign = TextAlign.End,
                            )
                            Box(modifier = Modifier.width(100.dp)) {
                                ReconciliationBadge(txn.isReconciled)
                            }
                            if (paymentId != null) {
                                IconButton(
                                    onClick = { onEditPayment(paymentId) },
                                    modifier = Modifier.size(30.dp),
                                ) {
                                    Icon(Icons.Outlined.Edit, "Edit", tint = KontafyColors.Navy, modifier = Modifier.size(16.dp))
                                }
                            } else {
                                Spacer(Modifier.width(40.dp))
                            }
                        }
                    }
                    HorizontalDivider(color = KontafyColors.BorderLight)
                }
            }
        }
    }
}

@Composable
private fun ReconciliationBadge(isReconciled: Boolean) {
    val (bgColor, textColor, label) = if (isReconciled) {
        Triple(KontafyColors.StatusPaidBg, KontafyColors.StatusPaid, "Reconciled")
    } else {
        Triple(KontafyColors.StatusOverdueBg, KontafyColors.StatusOverdue, "Unreconciled")
    }
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = bgColor,
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun BankFilterChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = {
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            )
        },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = KontafyColors.Navy,
            selectedLabelColor = KontafyColors.White,
            containerColor = KontafyColors.SurfaceElevated,
            labelColor = KontafyColors.Muted,
        ),
        shape = RoundedCornerShape(8.dp),
        border = FilterChipDefaults.filterChipBorder(
            borderColor = KontafyColors.Border,
            selectedBorderColor = KontafyColors.Navy,
            enabled = true,
            selected = selected,
        ),
    )
}
