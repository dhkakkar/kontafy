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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.JournalEntryDto
import com.kontafy.desktop.api.JournalLineDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AccountRepository
import com.kontafy.desktop.db.repositories.JournalEntryRepository
import com.kontafy.desktop.db.repositories.JournalLineRepository
import com.kontafy.desktop.theme.KontafyColors
import com.kontafy.desktop.util.CsvExporter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun JournalEntryScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    journalEntryRepository: JournalEntryRepository = JournalEntryRepository(),
    journalLineRepository: JournalLineRepository = JournalLineRepository(),
    accountRepository: AccountRepository = AccountRepository(),
    onCreateNew: () -> Unit,
    onEntryClick: (String) -> Unit,
) {
    var entries by remember { mutableStateOf<List<JournalEntryDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            snackbarMessage = null
        }
    }

    LaunchedEffect(Unit) {
        scope.launch {
            // Load from local DB first
            val dbEntries = try {
                val accountMap = try {
                    accountRepository.getByOrgId(currentOrgId).associate { it.id to it.name }
                } catch (e: Exception) {
                    e.printStackTrace()
                    snackbarMessage = "Failed to load accounts: ${e.message}"
                    emptyMap()
                }

                journalEntryRepository.getByOrgId(currentOrgId).map { entry ->
                    val lines = try {
                        journalLineRepository.getByEntry(entry.id).map { line ->
                            JournalLineDto(
                                id = line.id,
                                accountId = line.accountId,
                                accountName = accountMap[line.accountId] ?: "",
                                debitAmount = line.debitAmount.toDouble(),
                                creditAmount = line.creditAmount.toDouble(),
                                description = line.description ?: "",
                            )
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                        snackbarMessage = "Failed to load journal lines: ${e.message}"
                        emptyList()
                    }

                    JournalEntryDto(
                        id = entry.id,
                        entryNumber = entry.entryNumber,
                        date = entry.date,
                        narration = entry.narration ?: "",
                        type = entry.type.uppercase(),
                        isPosted = entry.isPosted,
                        lines = lines,
                    )
                }
            } catch (e: Exception) {
                e.printStackTrace()
                snackbarMessage = "Failed to load journal entries: ${e.message}"
                emptyList()
            }

            if (dbEntries.isNotEmpty()) {
                entries = dbEntries
            } else {
                val result = apiClient.getJournalEntries()
                result.fold(
                    onSuccess = { entries = it },
                    onFailure = { e ->
                        e.printStackTrace()
                        snackbarMessage = "Failed to fetch journal entries: ${e.message}"
                    },
                )
            }
            isLoading = false
        }
    }

    val displayEntries = entries
    val filteredEntries = if (searchQuery.isBlank()) displayEntries else {
        displayEntries.filter {
            it.narration.contains(searchQuery, ignoreCase = true) ||
                it.entryNumber.contains(searchQuery, ignoreCase = true)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
        TopBar(
            title = "Journal Entries",
            showSearch = true,
            searchQuery = searchQuery,
            onSearchChange = { searchQuery = it },
            actions = {
                KontafyButton(
                    text = "Export",
                    onClick = {
                        scope.launch {
                            withContext(Dispatchers.IO) {
                                CsvExporter.export(
                                    fileName = "JournalEntries",
                                    headers = listOf("Entry Number", "Date", "Narration", "Type", "Status"),
                                    rows = filteredEntries.map { e ->
                                        listOf(
                                            e.entryNumber,
                                            e.date,
                                            e.narration,
                                            e.type,
                                            if (e.isPosted) "Posted" else "Draft",
                                        )
                                    },
                                )
                            }
                        }
                    },
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "New Entry",
                    onClick = onCreateNew,
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                // Table header
                item {
                    JournalTableHeader()
                }

                items(filteredEntries, key = { it.id }) { entry ->
                    JournalEntryRow(
                        entry = entry,
                        onClick = { onEntryClick(entry.id) },
                    )
                    HorizontalDivider(color = KontafyColors.BorderLight)
                }

                if (filteredEntries.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier.fillMaxWidth().padding(40.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    Icons.Outlined.MenuBook,
                                    contentDescription = null,
                                    tint = KontafyColors.MutedLight,
                                    modifier = Modifier.size(48.dp),
                                )
                                Spacer(Modifier.height(12.dp))
                                Text(
                                    "No journal entries found",
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = KontafyColors.Muted,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
    SnackbarHost(
        hostState = snackbarHostState,
        modifier = Modifier.align(Alignment.BottomCenter),
    )
    }
}

@Composable
private fun JournalTableHeader() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = KontafyColors.Surface,
        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Entry #", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
            Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp))
            Text("Narration", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
            Text("Debit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
            Text("Credit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
            Text("Status", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
        }
    }
}

@Composable
private fun JournalEntryRow(
    entry: JournalEntryDto,
    onClick: () -> Unit,
) {
    val totalDebit = entry.lines.sumOf { it.debitAmount }
    val totalCredit = entry.lines.sumOf { it.creditAmount }
    val statusColor = if (entry.isPosted) KontafyColors.StatusPaid else KontafyColors.StatusDraft
    val statusBgColor = if (entry.isPosted) KontafyColors.StatusPaidBg else KontafyColors.StatusDraftBg
    val statusLabel = if (entry.isPosted) "Posted" else "Draft"

    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        color = KontafyColors.SurfaceElevated,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = entry.entryNumber,
                style = MaterialTheme.typography.bodyLarge,
                color = KontafyColors.Navy,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.width(100.dp),
            )
            Text(
                text = entry.date,
                style = MaterialTheme.typography.bodyMedium,
                color = KontafyColors.Muted,
                modifier = Modifier.width(110.dp),
            )
            Text(
                text = entry.narration,
                style = MaterialTheme.typography.bodyLarge,
                color = KontafyColors.Ink,
                modifier = Modifier.weight(1f),
                maxLines = 1,
            )
            Text(
                text = formatCurrency(totalDebit),
                style = MaterialTheme.typography.bodyLarge,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.width(120.dp),
            )
            Text(
                text = formatCurrency(totalCredit),
                style = MaterialTheme.typography.bodyLarge,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.width(120.dp),
            )
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = statusBgColor,
                modifier = Modifier.width(80.dp),
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) {
                    Text(
                        text = statusLabel,
                        style = MaterialTheme.typography.labelMedium,
                        color = statusColor,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }
    }
}

