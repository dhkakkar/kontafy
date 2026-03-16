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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.JournalEntryDto
import com.kontafy.desktop.api.JournalLineDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AccountRepository
import com.kontafy.desktop.db.repositories.JournalEntryRepository
import com.kontafy.desktop.db.repositories.JournalLineRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun JournalEntryDetailScreen(
    entryId: String,
    apiClient: ApiClient,
    journalEntryRepository: JournalEntryRepository = JournalEntryRepository(),
    journalLineRepository: JournalLineRepository = JournalLineRepository(),
    accountRepository: AccountRepository = AccountRepository(),
    onBack: () -> Unit,
    onEdit: ((String) -> Unit)? = null,
) {
    var entry by remember { mutableStateOf<JournalEntryDto?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(entryId) {
        scope.launch {
            // Try local DB first
            val loaded = try {
                val accountMap = try {
                    accountRepository.getAll().associate { it.id to it.name }
                } catch (e: Exception) { e.printStackTrace(); emptyMap() }

                val dbEntry = journalEntryRepository.getById(entryId)
                if (dbEntry != null) {
                    val lines = try {
                        journalLineRepository.getByEntry(dbEntry.id).map { line ->
                            JournalLineDto(
                                id = line.id,
                                accountId = line.accountId,
                                accountName = accountMap[line.accountId] ?: "",
                                debitAmount = line.debitAmount.toDouble(),
                                creditAmount = line.creditAmount.toDouble(),
                                description = line.description ?: "",
                            )
                        }
                    } catch (e: Exception) { e.printStackTrace(); emptyList() }

                    JournalEntryDto(
                        id = dbEntry.id,
                        entryNumber = dbEntry.entryNumber,
                        date = dbEntry.date,
                        narration = dbEntry.narration ?: "",
                        type = dbEntry.type.uppercase(),
                        isPosted = dbEntry.isPosted,
                        lines = lines,
                    )
                } else null
            } catch (e: Exception) { e.printStackTrace(); null }

            // Fall back to API if not in local DB
            if (loaded != null) {
                entry = loaded
            } else {
                val result = apiClient.getJournalEntries()
                result.fold(
                    onSuccess = { list -> entry = list.find { it.id == entryId } },
                    onFailure = {},
                )
            }
            isLoading = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
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
                    entry?.entryNumber ?: "Journal Entry",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.Ink,
                    modifier = Modifier.weight(1f),
                )
                if (onEdit != null && entry != null) {
                    KontafyButton(
                        text = "Edit",
                        onClick = { onEdit(entryId) },
                        variant = ButtonVariant.Outline,
                    )
                }
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (entry == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Outlined.ErrorOutline,
                        contentDescription = null,
                        tint = KontafyColors.MutedLight,
                        modifier = Modifier.size(48.dp),
                    )
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Journal entry not found",
                        style = MaterialTheme.typography.bodyLarge,
                        color = KontafyColors.Muted,
                    )
                    Spacer(Modifier.height(16.dp))
                    KontafyButton(
                        text = "Go Back",
                        onClick = onBack,
                        variant = ButtonVariant.Outline,
                    )
                }
            }
        } else {
            val je = entry!!
            val totalDebit = je.lines.sumOf { it.debitAmount }
            val totalCredit = je.lines.sumOf { it.creditAmount }
            val isBalanced = kotlin.math.abs(totalDebit - totalCredit) < 0.01

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                // Header card
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.fillMaxWidth().padding(24.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column {
                                    Text(
                                        text = je.entryNumber,
                                        style = MaterialTheme.typography.headlineSmall,
                                        color = KontafyColors.Navy,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        text = je.date,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = KontafyColors.Muted,
                                    )
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    KontafyBadge(
                                        text = je.type.replaceFirstChar { it.titlecase() },
                                        type = BadgeType.Info,
                                    )
                                    KontafyBadge(
                                        text = if (je.isPosted) "Posted" else "Draft",
                                        type = if (je.isPosted) BadgeType.Success else BadgeType.Warning,
                                    )
                                }
                            }

                            if (je.narration.isNotBlank()) {
                                Spacer(Modifier.height(16.dp))
                                HorizontalDivider(color = KontafyColors.BorderLight)
                                Spacer(Modifier.height(12.dp))
                                Text(
                                    text = "Narration",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = KontafyColors.Muted,
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = je.narration,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = KontafyColors.Ink,
                                )
                            }
                        }
                    }
                }

                // Summary totals
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        SummaryCard(
                            label = "Total Debit",
                            value = formatCurrency(totalDebit),
                            color = KontafyColors.Navy,
                            modifier = Modifier.weight(1f),
                        )
                        SummaryCard(
                            label = "Total Credit",
                            value = formatCurrency(totalCredit),
                            color = KontafyColors.Navy,
                            modifier = Modifier.weight(1f),
                        )
                        SummaryCard(
                            label = "Status",
                            value = if (isBalanced) "Balanced" else "Unbalanced",
                            color = if (isBalanced) KontafyColors.StatusPaid else KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                // Lines table header
                item {
                    Text(
                        text = "Journal Lines",
                        style = MaterialTheme.typography.titleMedium,
                        color = KontafyColors.Ink,
                        fontWeight = FontWeight.SemiBold,
                    )
                }

                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = KontafyColors.Surface,
                        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("Account", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                            Text("Description", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                            Text("Debit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(130.dp), textAlign = TextAlign.End)
                            Text("Credit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(130.dp), textAlign = TextAlign.End)
                        }
                    }
                }

                items(je.lines, key = { it.id.ifEmpty { it.accountId + it.debitAmount + it.creditAmount } }) { line ->
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = KontafyColors.SurfaceElevated,
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = line.accountName.ifEmpty { line.accountId },
                                style = MaterialTheme.typography.bodyLarge,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                text = line.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = KontafyColors.Muted,
                                modifier = Modifier.weight(1f),
                                maxLines = 2,
                            )
                            Text(
                                text = if (line.debitAmount > 0) formatCurrency(line.debitAmount) else "-",
                                style = MaterialTheme.typography.bodyLarge,
                                color = if (line.debitAmount > 0) KontafyColors.Ink else KontafyColors.MutedLight,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.width(130.dp),
                                textAlign = TextAlign.End,
                            )
                            Text(
                                text = if (line.creditAmount > 0) formatCurrency(line.creditAmount) else "-",
                                style = MaterialTheme.typography.bodyLarge,
                                color = if (line.creditAmount > 0) KontafyColors.Ink else KontafyColors.MutedLight,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.width(130.dp),
                                textAlign = TextAlign.End,
                            )
                        }
                    }
                    HorizontalDivider(color = KontafyColors.BorderLight)
                }

                // Totals footer
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        color = KontafyColors.Surface,
                        shape = RoundedCornerShape(bottomStart = 8.dp, bottomEnd = 8.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Total",
                                style = MaterialTheme.typography.titleSmall,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.weight(1f),
                            )
                            Spacer(Modifier.weight(1f))
                            Text(
                                text = formatCurrency(totalDebit),
                                style = MaterialTheme.typography.titleSmall,
                                color = KontafyColors.Navy,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.width(130.dp),
                                textAlign = TextAlign.End,
                            )
                            Text(
                                text = formatCurrency(totalCredit),
                                style = MaterialTheme.typography.titleSmall,
                                color = KontafyColors.Navy,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.width(130.dp),
                                textAlign = TextAlign.End,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(
    label: String,
    value: String,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = KontafyColors.Muted,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                color = color,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}
