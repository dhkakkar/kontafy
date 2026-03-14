package com.kontafy.desktop.screens

import androidx.compose.foundation.background
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
import com.kontafy.desktop.db.repositories.AccountRepository
import com.kontafy.desktop.db.repositories.JournalEntryRepository
import com.kontafy.desktop.db.repositories.JournalLineRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LedgerScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    accountRepository: AccountRepository = AccountRepository(),
    journalEntryRepository: JournalEntryRepository = JournalEntryRepository(),
    journalLineRepository: JournalLineRepository = JournalLineRepository(),
    initialAccountId: String? = null,
) {
    var selectedAccountId by remember { mutableStateOf(initialAccountId ?: "") }
    var accounts by remember { mutableStateOf<List<AccountDto>>(emptyList()) }
    var ledgerData by remember { mutableStateOf<LedgerResponse?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var accountExpanded by remember { mutableStateOf(false) }
    var fromDate by remember { mutableStateOf("") }
    var toDate by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            // Load from local DB first
            val dbAccounts = try {
                accountRepository.getByOrgId(currentOrgId).map { it.toDto() }
            } catch (_: Exception) { emptyList() }

            if (dbAccounts.isNotEmpty()) {
                accounts = dbAccounts.filter { !it.isGroup }
            } else {
                val result = apiClient.getAccounts()
                result.fold(
                    onSuccess = { list -> accounts = list.flatMap { flattenAll(it) } },
                    onFailure = {},
                )
            }
        }
    }

    fun loadLedger() {
        if (selectedAccountId.isBlank()) return
        scope.launch {
            isLoading = true
            val result = apiClient.getLedger(
                selectedAccountId,
                fromDate = fromDate.ifBlank { null },
                toDate = toDate.ifBlank { null },
            )
            result.fold(
                onSuccess = { ledgerData = it },
                onFailure = {
                    // Build ledger from local DB
                    try {
                        val account = accountRepository.getById(selectedAccountId)?.toDto()
                        if (account != null) {
                            val entries = journalEntryRepository.getByAccount(selectedAccountId)
                            val ledgerEntries = mutableListOf<LedgerEntryDto>()
                            var runningBalance = account.openingBalance

                            entries.sortedBy { it.date }.forEach { entry ->
                                val lines = journalLineRepository.getByEntry(entry.id)
                                    .filter { it.accountId == selectedAccountId }
                                lines.forEach { line ->
                                    val debit = line.debitAmount.toDouble()
                                    val credit = line.creditAmount.toDouble()
                                    runningBalance += debit - credit
                                    ledgerEntries.add(
                                        LedgerEntryDto(
                                            date = entry.date,
                                            entryNumber = entry.entryNumber,
                                            narration = entry.narration ?: "",
                                            debitAmount = debit,
                                            creditAmount = credit,
                                            runningBalance = runningBalance,
                                        ),
                                    )
                                }
                            }

                            val totalDebits = ledgerEntries.sumOf { it.debitAmount }
                            val totalCredits = ledgerEntries.sumOf { it.creditAmount }
                            ledgerData = LedgerResponse(
                                account = account,
                                entries = ledgerEntries,
                                openingBalance = account.openingBalance,
                                closingBalance = runningBalance,
                                totalDebits = totalDebits,
                                totalCredits = totalCredits,
                            )
                        }
                    } catch (_: Exception) {}
                },
            )
            isLoading = false
        }
    }

    // Auto-load if initialAccountId provided
    LaunchedEffect(selectedAccountId) {
        if (selectedAccountId.isNotBlank()) {
            loadLedger()
        }
    }

    val displayAccounts = accounts
    val selectedAccount = displayAccounts.find { it.id == selectedAccountId }

    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
        TopBar(
            title = "Account Ledger",
            actions = {
                KontafyButton(
                    text = "Export",
                    onClick = { /* placeholder */ },
                    variant = ButtonVariant.Outline,
                )
            },
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Account selector + date range
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            ExposedDropdownMenuBox(
                                expanded = accountExpanded,
                                onExpandedChange = { accountExpanded = !accountExpanded },
                                modifier = Modifier.weight(1f),
                            ) {
                                OutlinedTextField(
                                    value = selectedAccount?.let { "${it.code} - ${it.name}" } ?: "Select account...",
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Account") },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = accountExpanded) },
                                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                                    shape = RoundedCornerShape(8.dp),
                                )
                                ExposedDropdownMenu(
                                    expanded = accountExpanded,
                                    onDismissRequest = { accountExpanded = false },
                                ) {
                                    displayAccounts.forEach { acc ->
                                        DropdownMenuItem(
                                            text = { Text("${acc.code} - ${acc.name}") },
                                            onClick = {
                                                selectedAccountId = acc.id
                                                accountExpanded = false
                                            },
                                        )
                                    }
                                }
                            }
                            OutlinedTextField(
                                value = fromDate,
                                onValueChange = { fromDate = it },
                                label = { Text("From Date") },
                                modifier = Modifier.width(160.dp),
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                                placeholder = { Text("YYYY-MM-DD") },
                            )
                            OutlinedTextField(
                                value = toDate,
                                onValueChange = { toDate = it },
                                label = { Text("To Date") },
                                modifier = Modifier.width(160.dp),
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                                placeholder = { Text("YYYY-MM-DD") },
                            )
                            KontafyButton(
                                text = "Load",
                                onClick = { loadLedger() },
                                variant = ButtonVariant.Primary,
                            )
                        }
                    }
                }
            }

            if (isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = KontafyColors.Navy)
                    }
                }
            } else if (ledgerData != null) {
                val data = ledgerData!!

                // Account info card
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(20.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(data.account.name, style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "Code: ${data.account.code} | Type: ${data.account.type}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = KontafyColors.Muted,
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("Current Balance", style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                                Text(
                                    formatCurrency(data.closingBalance),
                                    style = MaterialTheme.typography.displaySmall,
                                    color = KontafyColors.Ink,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }

                // Summary row
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        StatCard(
                            title = "Opening Balance",
                            value = formatCurrency(data.openingBalance),
                            icon = Icons.Outlined.AccountBalanceWallet,
                            iconBackground = Color(0xFFDBEAFE),
                            iconTint = KontafyColors.StatusSent,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = "Total Debits",
                            value = formatCurrency(data.totalDebits),
                            icon = Icons.Outlined.TrendingUp,
                            iconBackground = Color(0xFFD1FAE5),
                            iconTint = KontafyColors.Green,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = "Total Credits",
                            value = formatCurrency(data.totalCredits),
                            icon = Icons.Outlined.TrendingDown,
                            iconBackground = Color(0xFFFEE2E2),
                            iconTint = KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = "Closing Balance",
                            value = formatCurrency(data.closingBalance),
                            icon = Icons.Outlined.AccountBalance,
                            iconBackground = Color(0xFFEDE9FE),
                            iconTint = Color(0xFF8B5CF6),
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                // Table header
                item {
                    LedgerTableHeader()
                }

                // Opening balance row
                item {
                    LedgerSpecialRow(
                        label = "Opening Balance",
                        balance = data.openingBalance,
                        bgColor = KontafyColors.Surface,
                    )
                }

                // Transaction rows
                items(data.entries) { entry ->
                    LedgerTransactionRow(entry)
                    HorizontalDivider(color = KontafyColors.BorderLight)
                }

                // Closing balance row
                item {
                    LedgerSpecialRow(
                        label = "Closing Balance",
                        balance = data.closingBalance,
                        bgColor = KontafyColors.Surface,
                    )
                }
            } else {
                item {
                    Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Outlined.ListAlt, contentDescription = null, tint = KontafyColors.MutedLight, modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("Select an account to view its ledger", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LedgerTableHeader() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = KontafyColors.Surface,
        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp))
            Text("Entry #", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
            Text("Narration", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
            Text("Debit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(130.dp), textAlign = TextAlign.End)
            Text("Credit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(130.dp), textAlign = TextAlign.End)
            Text("Balance", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp), textAlign = TextAlign.End)
        }
    }
}

@Composable
private fun LedgerTransactionRow(entry: LedgerEntryDto) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = KontafyColors.SurfaceElevated,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(entry.date, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp))
            Text(entry.entryNumber, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.Medium, modifier = Modifier.width(90.dp))
            Text(entry.narration, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f), maxLines = 1)
            Text(
                text = if (entry.debitAmount > 0) formatCurrency(entry.debitAmount) else "-",
                style = MaterialTheme.typography.bodyMedium,
                color = if (entry.debitAmount > 0) KontafyColors.Green else KontafyColors.MutedLight,
                modifier = Modifier.width(130.dp),
                textAlign = TextAlign.End,
            )
            Text(
                text = if (entry.creditAmount > 0) formatCurrency(entry.creditAmount) else "-",
                style = MaterialTheme.typography.bodyMedium,
                color = if (entry.creditAmount > 0) KontafyColors.StatusOverdue else KontafyColors.MutedLight,
                modifier = Modifier.width(130.dp),
                textAlign = TextAlign.End,
            )
            Text(
                text = formatCurrency(entry.runningBalance),
                style = MaterialTheme.typography.bodyMedium,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.width(140.dp),
                textAlign = TextAlign.End,
            )
        }
    }
}

@Composable
private fun LedgerSpecialRow(
    label: String,
    balance: Double,
    bgColor: Color,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = bgColor,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.titleSmall,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = formatCurrency(balance),
                style = MaterialTheme.typography.titleSmall,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(140.dp),
                textAlign = TextAlign.End,
            )
        }
    }
    HorizontalDivider(color = KontafyColors.Border)
}

private fun flattenAll(account: AccountDto): List<AccountDto> {
    val result = mutableListOf<AccountDto>()
    if (!account.isGroup) result.add(account)
    account.children.forEach { result.addAll(flattenAll(it)) }
    return result
}
