package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AccountRepository
import com.kontafy.desktop.db.repositories.JournalEntryRepository
import com.kontafy.desktop.db.repositories.JournalLineRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID
import kotlin.math.abs

data class JournalLineDraft(
    val accountId: String = "",
    val accountName: String = "",
    val debitAmount: String = "",
    val creditAmount: String = "",
    val description: String = "",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateJournalEntryScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    accountRepository: AccountRepository = AccountRepository(),
    journalEntryRepository: JournalEntryRepository = JournalEntryRepository(),
    journalLineRepository: JournalLineRepository = JournalLineRepository(),
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    var date by remember { mutableStateOf("2026-03-13") }
    var narration by remember { mutableStateOf("") }
    var entryType by remember { mutableStateOf("GENERAL") }
    var lines by remember {
        mutableStateOf(
            listOf(
                JournalLineDraft(),
                JournalLineDraft(),
            ),
        )
    }
    var isSaving by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var accounts by remember { mutableStateOf<List<AccountDto>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            // Load from local DB first
            val dbAccounts = try {
                accountRepository.getByOrgId(currentOrgId).map { it.toDto() }.filter { !it.isGroup }
            } catch (_: Exception) { emptyList() }

            if (dbAccounts.isNotEmpty()) {
                accounts = dbAccounts
            } else {
                val result = apiClient.getAccounts()
                result.fold(
                    onSuccess = { list ->
                        accounts = list.flatMap { flattenAccountsForSelection(it) }
                    },
                    onFailure = {},
                )
            }
        }
    }

    val displayAccounts = accounts
    val totalDebit = lines.sumOf { it.debitAmount.toDoubleOrNull() ?: 0.0 }
    val totalCredit = lines.sumOf { it.creditAmount.toDoubleOrNull() ?: 0.0 }
    val difference = totalDebit - totalCredit
    val isBalanced = abs(difference) < 0.01
    val entryTypes = listOf("GENERAL", "SALES", "PURCHASE", "PAYMENT", "RECEIPT")

    fun validate(): String? {
        if (date.isBlank()) return "Date is required"
        if (narration.isBlank()) return "Narration is required"
        if (lines.size < 2) return "At least 2 lines are required"
        val validLines = lines.filter { it.accountId.isNotBlank() && ((it.debitAmount.toDoubleOrNull() ?: 0.0) > 0 || (it.creditAmount.toDoubleOrNull() ?: 0.0) > 0) }
        if (validLines.size < 2) return "At least 2 lines with amounts are required"
        if (!isBalanced) return "Debits must equal credits (difference: ${formatCurrency(abs(difference))})"
        return null
    }

    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
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
                    Icon(Icons.Outlined.ArrowBack, contentDescription = "Back", tint = KontafyColors.Ink)
                }
                Spacer(Modifier.width(12.dp))
                Text(
                    "New Journal Entry",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.Ink,
                )
                Spacer(Modifier.weight(1f))
                KontafyButton(
                    text = "Save as Draft",
                    onClick = {
                        val err = validate()
                        if (err != null) {
                            errorMessage = err
                            return@KontafyButton
                        }
                        scope.launch {
                            isSaving = true
                            errorMessage = null
                            val validLines = lines.filter { it.accountId.isNotBlank() }
                            val entryId = UUID.randomUUID().toString()
                            val entryNumber = "JE-${System.currentTimeMillis().toString().takeLast(8)}"

                            // Save locally
                            try {
                                journalEntryRepository.create(
                                    JournalEntryModel(
                                        id = entryId,
                                        orgId = currentOrgId,
                                        entryNumber = entryNumber,
                                        date = date,
                                        narration = narration,
                                        type = entryType,
                                        isPosted = false,
                                    ),
                                )
                                validLines.forEach { line ->
                                    journalLineRepository.create(
                                        JournalLineModel(
                                            id = UUID.randomUUID().toString(),
                                            entryId = entryId,
                                            accountId = line.accountId,
                                            debitAmount = java.math.BigDecimal.valueOf(line.debitAmount.toDoubleOrNull() ?: 0.0),
                                            creditAmount = java.math.BigDecimal.valueOf(line.creditAmount.toDoubleOrNull() ?: 0.0),
                                            description = line.description,
                                        ),
                                    )
                                }
                            } catch (_: Exception) {}

                            // Also try API
                            try {
                                val request = CreateJournalEntryRequest(
                                    date = date,
                                    narration = narration,
                                    type = entryType,
                                    isPosted = false,
                                    lines = validLines.map {
                                        JournalLineDto(
                                            accountId = it.accountId,
                                            accountName = it.accountName,
                                            debitAmount = it.debitAmount.toDoubleOrNull() ?: 0.0,
                                            creditAmount = it.creditAmount.toDoubleOrNull() ?: 0.0,
                                            description = it.description,
                                        )
                                    },
                                )
                                apiClient.createJournalEntry(request)
                            } catch (_: Exception) {}
                            isSaving = false
                            onSaved()
                        }
                    },
                    variant = ButtonVariant.Outline,
                    isLoading = isSaving,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Post Entry",
                    onClick = {
                        val err = validate()
                        if (err != null) {
                            errorMessage = err
                            return@KontafyButton
                        }
                        scope.launch {
                            isSaving = true
                            errorMessage = null
                            val validLines = lines.filter { it.accountId.isNotBlank() }
                            val entryId = UUID.randomUUID().toString()
                            val entryNumber = "JE-${System.currentTimeMillis().toString().takeLast(8)}"

                            // Save locally
                            try {
                                journalEntryRepository.create(
                                    JournalEntryModel(
                                        id = entryId,
                                        orgId = currentOrgId,
                                        entryNumber = entryNumber,
                                        date = date,
                                        narration = narration,
                                        type = entryType,
                                        isPosted = true,
                                    ),
                                )
                                validLines.forEach { line ->
                                    journalLineRepository.create(
                                        JournalLineModel(
                                            id = UUID.randomUUID().toString(),
                                            entryId = entryId,
                                            accountId = line.accountId,
                                            debitAmount = java.math.BigDecimal.valueOf(line.debitAmount.toDoubleOrNull() ?: 0.0),
                                            creditAmount = java.math.BigDecimal.valueOf(line.creditAmount.toDoubleOrNull() ?: 0.0),
                                            description = line.description,
                                        ),
                                    )
                                }
                            } catch (_: Exception) {}

                            // Also try API
                            try {
                                val request = CreateJournalEntryRequest(
                                    date = date,
                                    narration = narration,
                                    type = entryType,
                                    isPosted = true,
                                    lines = validLines.map {
                                        JournalLineDto(
                                            accountId = it.accountId,
                                            accountName = it.accountName,
                                            debitAmount = it.debitAmount.toDoubleOrNull() ?: 0.0,
                                            creditAmount = it.creditAmount.toDoubleOrNull() ?: 0.0,
                                            description = it.description,
                                        )
                                    },
                                )
                                apiClient.createJournalEntry(request)
                            } catch (_: Exception) {}
                            isSaving = false
                            onSaved()
                        }
                    },
                    variant = ButtonVariant.Primary,
                    isLoading = isSaving,
                )
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Error message
            if (errorMessage != null) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = KontafyColors.StatusOverdueBg,
                        shape = RoundedCornerShape(8.dp),
                    ) {
                        Text(
                            text = errorMessage!!,
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.StatusOverdue,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                }
            }

            // Entry info card
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text("Entry Details", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            OutlinedTextField(
                                value = date,
                                onValueChange = { date = it },
                                label = { Text("Date (YYYY-MM-DD)") },
                                modifier = Modifier.weight(1f),
                                singleLine = true,
                                shape = RoundedCornerShape(8.dp),
                            )
                            // Entry type dropdown
                            var typeExpanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(
                                expanded = typeExpanded,
                                onExpandedChange = { typeExpanded = !typeExpanded },
                                modifier = Modifier.weight(1f),
                            ) {
                                OutlinedTextField(
                                    value = entryType.lowercase().replaceFirstChar { it.uppercase() },
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Entry Type") },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = typeExpanded) },
                                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                                    shape = RoundedCornerShape(8.dp),
                                )
                                ExposedDropdownMenu(
                                    expanded = typeExpanded,
                                    onDismissRequest = { typeExpanded = false },
                                ) {
                                    entryTypes.forEach { t ->
                                        DropdownMenuItem(
                                            text = { Text(t.lowercase().replaceFirstChar { it.uppercase() }) },
                                            onClick = {
                                                entryType = t
                                                typeExpanded = false
                                            },
                                        )
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = narration,
                            onValueChange = { narration = it },
                            label = { Text("Narration / Description") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2,
                            maxLines = 3,
                            shape = RoundedCornerShape(8.dp),
                        )
                    }
                }
            }

            // Lines header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Debit / Credit Lines", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                    TextButton(onClick = { lines = lines + JournalLineDraft() }) {
                        Icon(Icons.Filled.Add, contentDescription = "Add Line", tint = KontafyColors.Navy, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(4.dp))
                        Text("Add Line", color = KontafyColors.Navy, style = MaterialTheme.typography.labelLarge)
                    }
                }
            }

            // Lines table header
            item {
                Card(
                    shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp, bottomStart = 0.dp, bottomEnd = 0.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.Surface),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Account", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                        Text("Debit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp))
                        Text("Credit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp))
                        Text("Description", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(200.dp))
                        Spacer(Modifier.width(40.dp))
                    }
                }
            }

            // Line items
            itemsIndexed(lines) { index, line ->
                JournalLineRow(
                    line = line,
                    accounts = displayAccounts,
                    onLineChanged = { updated ->
                        lines = lines.toMutableList().also { it[index] = updated }
                    },
                    onRemove = {
                        if (lines.size > 2) {
                            lines = lines.toMutableList().also { it.removeAt(index) }
                        }
                    },
                    canRemove = lines.size > 2,
                )
            }

            // Totals row
            item {
                Card(
                    shape = RoundedCornerShape(bottomStart = 12.dp, bottomEnd = 12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isBalanced || (totalDebit == 0.0 && totalCredit == 0.0))
                            KontafyColors.SurfaceElevated
                        else
                            KontafyColors.StatusOverdueBg.copy(alpha = 0.3f),
                    ),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "TOTALS",
                            style = MaterialTheme.typography.titleSmall,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            text = formatCurrency(totalDebit),
                            style = MaterialTheme.typography.bodyLarge,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.width(140.dp),
                        )
                        Text(
                            text = formatCurrency(totalCredit),
                            style = MaterialTheme.typography.bodyLarge,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.width(140.dp),
                        )
                        if (!isBalanced && (totalDebit > 0 || totalCredit > 0)) {
                            Text(
                                text = "Diff: ${formatCurrency(abs(difference))}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = KontafyColors.StatusOverdue,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.width(200.dp),
                            )
                        } else {
                            Spacer(Modifier.width(200.dp))
                        }
                        Spacer(Modifier.width(40.dp))
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JournalLineRow(
    line: JournalLineDraft,
    accounts: List<AccountDto>,
    onLineChanged: (JournalLineDraft) -> Unit,
    onRemove: () -> Unit,
    canRemove: Boolean,
) {
    var accountExpanded by remember { mutableStateOf(false) }
    var accountSearch by remember { mutableStateOf("") }

    val filteredAccounts = if (accountSearch.isBlank()) accounts else {
        accounts.filter {
            it.name.contains(accountSearch, ignoreCase = true) ||
                it.code.contains(accountSearch, ignoreCase = true)
        }
    }

    Card(
        shape = RoundedCornerShape(0.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Account selector
            ExposedDropdownMenuBox(
                expanded = accountExpanded,
                onExpandedChange = { accountExpanded = !accountExpanded },
                modifier = Modifier.weight(1f),
            ) {
                OutlinedTextField(
                    value = if (line.accountName.isNotBlank()) line.accountName else accountSearch,
                    onValueChange = {
                        accountSearch = it
                        if (!accountExpanded) accountExpanded = true
                    },
                    placeholder = { Text("Search account...", color = KontafyColors.MutedLight) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    textStyle = MaterialTheme.typography.bodyMedium,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = KontafyColors.Navy,
                        unfocusedBorderColor = KontafyColors.Border,
                    ),
                )
                ExposedDropdownMenu(
                    expanded = accountExpanded,
                    onDismissRequest = { accountExpanded = false },
                ) {
                    filteredAccounts.take(10).forEach { acc ->
                        DropdownMenuItem(
                            text = {
                                Text("${acc.code} - ${acc.name}", style = MaterialTheme.typography.bodyMedium)
                            },
                            onClick = {
                                onLineChanged(line.copy(accountId = acc.id, accountName = acc.name))
                                accountSearch = ""
                                accountExpanded = false
                            },
                        )
                    }
                }
            }

            Spacer(Modifier.width(8.dp))

            // Debit
            OutlinedTextField(
                value = line.debitAmount,
                onValueChange = { value ->
                    val newDebit = value.filter { it.isDigit() || it == '.' }
                    onLineChanged(
                        line.copy(
                            debitAmount = newDebit,
                            creditAmount = if (newDebit.isNotBlank() && (newDebit.toDoubleOrNull() ?: 0.0) > 0) "" else line.creditAmount,
                        ),
                    )
                },
                placeholder = { Text("0.00", color = KontafyColors.MutedLight) },
                modifier = Modifier.width(140.dp),
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                textStyle = MaterialTheme.typography.bodyMedium,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = KontafyColors.Navy,
                    unfocusedBorderColor = KontafyColors.Border,
                ),
            )

            Spacer(Modifier.width(8.dp))

            // Credit
            OutlinedTextField(
                value = line.creditAmount,
                onValueChange = { value ->
                    val newCredit = value.filter { it.isDigit() || it == '.' }
                    onLineChanged(
                        line.copy(
                            creditAmount = newCredit,
                            debitAmount = if (newCredit.isNotBlank() && (newCredit.toDoubleOrNull() ?: 0.0) > 0) "" else line.debitAmount,
                        ),
                    )
                },
                placeholder = { Text("0.00", color = KontafyColors.MutedLight) },
                modifier = Modifier.width(140.dp),
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                textStyle = MaterialTheme.typography.bodyMedium,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = KontafyColors.Navy,
                    unfocusedBorderColor = KontafyColors.Border,
                ),
            )

            Spacer(Modifier.width(8.dp))

            // Description
            OutlinedTextField(
                value = line.description,
                onValueChange = { onLineChanged(line.copy(description = it)) },
                placeholder = { Text("Note...", color = KontafyColors.MutedLight) },
                modifier = Modifier.width(200.dp),
                singleLine = true,
                shape = RoundedCornerShape(8.dp),
                textStyle = MaterialTheme.typography.bodyMedium,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = KontafyColors.Navy,
                    unfocusedBorderColor = KontafyColors.Border,
                ),
            )

            Spacer(Modifier.width(4.dp))

            // Remove button
            IconButton(
                onClick = onRemove,
                enabled = canRemove,
                modifier = Modifier.size(36.dp),
            ) {
                Icon(
                    Icons.Filled.Delete,
                    contentDescription = "Remove line",
                    tint = if (canRemove) KontafyColors.StatusOverdue else KontafyColors.MutedLight,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
    HorizontalDivider(color = KontafyColors.BorderLight)
}

private fun flattenAccountsForSelection(account: AccountDto): List<AccountDto> {
    val result = mutableListOf<AccountDto>()
    if (!account.isGroup) {
        result.add(account)
    }
    account.children.forEach {
        result.addAll(flattenAccountsForSelection(it))
    }
    return result
}
