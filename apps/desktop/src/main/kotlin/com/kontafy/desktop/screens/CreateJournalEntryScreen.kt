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
import com.kontafy.desktop.db.repositories.AuditLogEntry
import com.kontafy.desktop.db.repositories.AuditLogRepository
import com.kontafy.desktop.db.repositories.JournalEntryRepository
import com.kontafy.desktop.db.repositories.JournalLineRepository
import com.kontafy.desktop.shortcuts.LocalShortcutAction
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
    auditLogRepository: AuditLogRepository = AuditLogRepository(),
    editEntryId: String? = null,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    val isEditMode = editEntryId != null
    var date by remember { mutableStateOf(LocalDate.now().toString()) }
    var narration by remember { mutableStateOf("") }
    var entryType by remember { mutableStateOf("GENERAL") }
    var debitLines by remember {
        mutableStateOf(listOf(JournalLineDraft()))
    }
    var creditLines by remember {
        mutableStateOf(listOf(JournalLineDraft()))
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
            } catch (e: Exception) { e.printStackTrace(); emptyList() }

            if (dbAccounts.isNotEmpty()) {
                accounts = dbAccounts
            } else {
                // Fallback: try all accounts (handles orgId mismatch)
                val allAccounts = try {
                    accountRepository.getAll().map { it.toDto() }.filter { !it.isGroup }
                } catch (e: Exception) { e.printStackTrace(); emptyList() }

                if (allAccounts.isNotEmpty()) {
                    accounts = allAccounts
                } else {
                    val result = apiClient.getAccounts()
                    result.fold(
                        onSuccess = { list ->
                            accounts = list.flatMap { flattenAccountsForSelection(it) }
                        },
                        onFailure = { it.printStackTrace() },
                    )
                }
            }
        }
    }

    // Load existing entry in edit mode
    LaunchedEffect(editEntryId) {
        if (editEntryId != null) {
            scope.launch {
                try {
                    val accountMap = try {
                        accountRepository.getAll().associate { it.id to it.name }
                    } catch (e: Exception) { emptyMap() }

                    val dbEntry = journalEntryRepository.getById(editEntryId)
                    if (dbEntry != null) {
                        date = dbEntry.date
                        narration = dbEntry.narration ?: ""
                        entryType = dbEntry.type.uppercase()

                        val lines = try {
                            journalLineRepository.getByEntry(dbEntry.id)
                        } catch (e: Exception) { emptyList() }

                        debitLines = lines
                            .filter { it.debitAmount.toDouble() > 0 }
                            .map { line ->
                                JournalLineDraft(
                                    accountId = line.accountId,
                                    accountName = accountMap[line.accountId] ?: "",
                                    debitAmount = line.debitAmount.toPlainString(),
                                    description = line.description ?: "",
                                )
                            }
                            .ifEmpty { listOf(JournalLineDraft()) }

                        creditLines = lines
                            .filter { it.creditAmount.toDouble() > 0 }
                            .map { line ->
                                JournalLineDraft(
                                    accountId = line.accountId,
                                    accountName = accountMap[line.accountId] ?: "",
                                    creditAmount = line.creditAmount.toPlainString(),
                                    description = line.description ?: "",
                                )
                            }
                            .ifEmpty { listOf(JournalLineDraft()) }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    val displayAccounts = accounts
    val totalDebit = debitLines.sumOf { it.debitAmount.toDoubleOrNull() ?: 0.0 }
    val totalCredit = creditLines.sumOf { it.creditAmount.toDoubleOrNull() ?: 0.0 }
    val difference = totalDebit - totalCredit
    val isBalanced = abs(difference) < 0.01
    val entryTypes = listOf("GENERAL", "SALES", "PURCHASE", "PAYMENT", "RECEIPT")

    fun validate(): String? {
        if (date.isBlank()) return "Date is required"
        if (narration.isBlank()) return "Narration is required"
        val validDebits = debitLines.filter { it.accountId.isNotBlank() && (it.debitAmount.toDoubleOrNull() ?: 0.0) > 0 }
        val validCredits = creditLines.filter { it.accountId.isNotBlank() && (it.creditAmount.toDoubleOrNull() ?: 0.0) > 0 }
        if (validDebits.isEmpty()) return "At least one debit entry is required"
        if (validCredits.isEmpty()) return "At least one credit entry is required"
        if (!isBalanced) return "Debits must equal credits (difference: ${formatCurrency(abs(difference))})"
        return null
    }

    fun buildAllLines(): List<JournalLineDraft> {
        val validDebits = debitLines.filter { it.accountId.isNotBlank() && (it.debitAmount.toDoubleOrNull() ?: 0.0) > 0 }
        val validCredits = creditLines.filter { it.accountId.isNotBlank() && (it.creditAmount.toDoubleOrNull() ?: 0.0) > 0 }
        return validDebits + validCredits
    }

    fun saveEntry(isPosted: Boolean) {
        val err = validate()
        if (err != null) {
            errorMessage = err
            return
        }
        scope.launch {
            isSaving = true
            errorMessage = null
            val allLines = buildAllLines()
            val entryId = editEntryId ?: UUID.randomUUID().toString()
            val entryNumber = if (isEditMode) {
                journalEntryRepository.getById(entryId)?.entryNumber ?: "JE-0001"
            } else {
                try { journalEntryRepository.getNextNumber(currentOrgId, "JE") } catch (e: Exception) { "JE-0001" }
            }

            // Save locally
            try {
                if (isEditMode) {
                    // Delete old lines and update entry
                    journalLineRepository.deleteByEntry(entryId)
                    journalEntryRepository.update(
                        JournalEntryModel(
                            id = entryId,
                            orgId = currentOrgId,
                            entryNumber = entryNumber,
                            date = date,
                            narration = narration,
                            type = entryType,
                            isPosted = isPosted,
                        ),
                    )
                } else {
                    journalEntryRepository.create(
                        JournalEntryModel(
                            id = entryId,
                            orgId = currentOrgId,
                            entryNumber = entryNumber,
                            date = date,
                            narration = narration,
                            type = entryType,
                            isPosted = isPosted,
                        ),
                    )
                }
                allLines.forEach { line ->
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
            } catch (e: Exception) {
                e.printStackTrace()
                errorMessage = "Failed to save journal entry: ${e.message}"
                isSaving = false
                return@launch
            }

            // Also try API
            try {
                val request = CreateJournalEntryRequest(
                    date = date,
                    narration = narration,
                    type = entryType,
                    isPosted = isPosted,
                    lines = allLines.map {
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
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // Audit trail
            try {
                auditLogRepository.create(
                    AuditLogEntry(
                        orgId = currentOrgId,
                        entityType = "journal_entry",
                        entityId = entryId,
                        action = if (isEditMode) "UPDATED" else "CREATED",
                        description = "Journal Entry $entryNumber ${if (isEditMode) "updated" else "created"}. ${if (isPosted) "Posted" else "Draft"}. Debit: $totalDebit",
                    ),
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }

            isSaving = false
            onSaved()
        }
    }

    // Handle Ctrl+S shortcut
    val shortcutAction = LocalShortcutAction.current
    LaunchedEffect(shortcutAction.value) {
        if (shortcutAction.value == "save" && !isSaving) {
            shortcutAction.value = null
            saveEntry(false) // Save as unposted draft
        }
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
                    if (isEditMode) "Edit Journal Entry" else "New Journal Entry",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.Ink,
                )
                Spacer(Modifier.weight(1f))
                KontafyButton(
                    text = "Save as Draft",
                    onClick = { saveEntry(isPosted = false) },
                    variant = ButtonVariant.Outline,
                    isLoading = isSaving,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Post Entry",
                    onClick = { saveEntry(isPosted = true) },
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

            // Debit and Credit side-by-side
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    // DEBIT SIDE
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        shape = RoundedCornerShape(4.dp),
                                        color = Color(0xFF2563EB).copy(alpha = 0.1f),
                                    ) {
                                        Text(
                                            "Dr",
                                            style = MaterialTheme.typography.titleMedium,
                                            color = Color(0xFF2563EB),
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        )
                                    }
                                    Spacer(Modifier.width(8.dp))
                                    Text("Debit Side", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                }
                                TextButton(onClick = { debitLines = debitLines + JournalLineDraft() }) {
                                    Icon(Icons.Filled.Add, contentDescription = "Add", tint = KontafyColors.Navy, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Add", color = KontafyColors.Navy, style = MaterialTheme.typography.labelLarge)
                                }
                            }
                            Spacer(Modifier.height(12.dp))

                            // Header
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                            ) {
                                Text("Account", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                                Spacer(Modifier.width(36.dp))
                            }
                            HorizontalDivider(color = KontafyColors.Border)

                            debitLines.forEachIndexed { index, line ->
                                JournalSideLine(
                                    line = line,
                                    accounts = displayAccounts,
                                    isDebit = true,
                                    onLineChanged = { updated ->
                                        debitLines = debitLines.toMutableList().also { it[index] = updated }
                                    },
                                    onRemove = {
                                        if (debitLines.size > 1) {
                                            debitLines = debitLines.toMutableList().also { it.removeAt(index) }
                                        }
                                    },
                                    canRemove = debitLines.size > 1,
                                )
                            }

                            HorizontalDivider(color = KontafyColors.Border, modifier = Modifier.padding(top = 4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Total Debit", style = MaterialTheme.typography.titleSmall, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                                Text(
                                    formatCurrency(totalDebit),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = Color(0xFF2563EB),
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }

                    // CREDIT SIDE
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Surface(
                                        shape = RoundedCornerShape(4.dp),
                                        color = Color(0xFF16A34A).copy(alpha = 0.1f),
                                    ) {
                                        Text(
                                            "Cr",
                                            style = MaterialTheme.typography.titleMedium,
                                            color = Color(0xFF16A34A),
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                        )
                                    }
                                    Spacer(Modifier.width(8.dp))
                                    Text("Credit Side", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                                }
                                TextButton(onClick = { creditLines = creditLines + JournalLineDraft() }) {
                                    Icon(Icons.Filled.Add, contentDescription = "Add", tint = KontafyColors.Navy, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Add", color = KontafyColors.Navy, style = MaterialTheme.typography.labelLarge)
                                }
                            }
                            Spacer(Modifier.height(12.dp))

                            // Header
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                            ) {
                                Text("Account", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                                Spacer(Modifier.width(36.dp))
                            }
                            HorizontalDivider(color = KontafyColors.Border)

                            creditLines.forEachIndexed { index, line ->
                                JournalSideLine(
                                    line = line,
                                    accounts = displayAccounts,
                                    isDebit = false,
                                    onLineChanged = { updated ->
                                        creditLines = creditLines.toMutableList().also { it[index] = updated }
                                    },
                                    onRemove = {
                                        if (creditLines.size > 1) {
                                            creditLines = creditLines.toMutableList().also { it.removeAt(index) }
                                        }
                                    },
                                    canRemove = creditLines.size > 1,
                                )
                            }

                            HorizontalDivider(color = KontafyColors.Border, modifier = Modifier.padding(top = 4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Total Credit", style = MaterialTheme.typography.titleSmall, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                                Text(
                                    formatCurrency(totalCredit),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = Color(0xFF16A34A),
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                }
            }

            // Balance indicator
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isBalanced && (totalDebit > 0 || totalCredit > 0))
                            Color(0xFF16A34A).copy(alpha = 0.08f)
                        else if (totalDebit > 0 || totalCredit > 0)
                            KontafyColors.StatusOverdueBg.copy(alpha = 0.5f)
                        else
                            KontafyColors.SurfaceElevated,
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "Balance Check",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.Bold,
                            )
                            if (isBalanced && (totalDebit > 0 || totalCredit > 0)) {
                                Spacer(Modifier.width(12.dp))
                                Surface(
                                    shape = RoundedCornerShape(4.dp),
                                    color = Color(0xFF16A34A).copy(alpha = 0.15f),
                                ) {
                                    Text(
                                        "Balanced",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = Color(0xFF16A34A),
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                                    )
                                }
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                            Column(horizontalAlignment = Alignment.End) {
                                Text("Total Debit", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                                Text(formatCurrency(totalDebit), style = MaterialTheme.typography.titleMedium, color = Color(0xFF2563EB), fontWeight = FontWeight.Bold)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("Total Credit", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                                Text(formatCurrency(totalCredit), style = MaterialTheme.typography.titleMedium, color = Color(0xFF16A34A), fontWeight = FontWeight.Bold)
                            }
                            if (!isBalanced && (totalDebit > 0 || totalCredit > 0)) {
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("Difference", style = MaterialTheme.typography.labelSmall, color = KontafyColors.StatusOverdue)
                                    Text(formatCurrency(abs(difference)), style = MaterialTheme.typography.titleMedium, color = KontafyColors.StatusOverdue, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun JournalSideLine(
    line: JournalLineDraft,
    accounts: List<AccountDto>,
    isDebit: Boolean,
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

    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
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
                if (filteredAccounts.isEmpty()) {
                    DropdownMenuItem(
                        text = { Text("No accounts found", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted) },
                        onClick = { accountExpanded = false },
                    )
                } else {
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
        }

        Spacer(Modifier.width(8.dp))

        // Amount
        OutlinedTextField(
            value = if (isDebit) line.debitAmount else line.creditAmount,
            onValueChange = { value ->
                val cleaned = value.filter { it.isDigit() || it == '.' }
                if (isDebit) {
                    onLineChanged(line.copy(debitAmount = cleaned, creditAmount = ""))
                } else {
                    onLineChanged(line.copy(creditAmount = cleaned, debitAmount = ""))
                }
            },
            placeholder = { Text("0.00", color = KontafyColors.MutedLight) },
            modifier = Modifier.width(120.dp),
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
            modifier = Modifier.size(32.dp),
        ) {
            Icon(
                Icons.Filled.Delete,
                contentDescription = "Remove",
                tint = if (canRemove) KontafyColors.StatusOverdue else KontafyColors.MutedLight,
                modifier = Modifier.size(16.dp),
            )
        }
    }
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
