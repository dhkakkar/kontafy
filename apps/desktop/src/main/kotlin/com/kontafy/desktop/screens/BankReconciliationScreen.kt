package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

data class ReconciliationEntry(
    val id: String,
    val date: String,
    val description: String,
    val amount: Double,
    val isMatched: Boolean = false,
)

@Composable
fun BankReconciliationScreen(
    bankId: String,
    apiClient: ApiClient,
    onBack: () -> Unit,
) {
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    var bankEntries by remember { mutableStateOf<List<ReconciliationEntry>>(emptyList()) }

    var bookEntries by remember { mutableStateOf<List<ReconciliationEntry>>(emptyList()) }

    var selectedBankEntry by remember { mutableStateOf<String?>(null) }
    var selectedBookEntry by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        // TODO: Load bank statement and book entries from API
        isLoading = false
    }

    val matchedBankCount = bankEntries.count { it.isMatched }
    val unmatchedBankCount = bankEntries.count { !it.isMatched }
    val matchedBookCount = bookEntries.count { it.isMatched }
    val unmatchedBookCount = bookEntries.count { !it.isMatched }

    val bankBalance = bankEntries.sumOf { it.amount }
    val bookBalance = bookEntries.sumOf { it.amount }
    val difference = bankBalance - bookBalance

    fun matchEntries() {
        val bankId = selectedBankEntry ?: return
        val bookId = selectedBookEntry ?: return
        bankEntries = bankEntries.map { if (it.id == bankId) it.copy(isMatched = true) else it }
        bookEntries = bookEntries.map { if (it.id == bookId) it.copy(isMatched = true) else it }
        selectedBankEntry = null
        selectedBookEntry = null
    }

    fun autoMatch() {
        val unmatchedBank = bankEntries.filter { !it.isMatched }.toMutableList()
        val unmatchedBook = bookEntries.filter { !it.isMatched }.toMutableList()
        val matchedBankIds = mutableSetOf<String>()
        val matchedBookIds = mutableSetOf<String>()

        for (be in unmatchedBank) {
            for (ke in unmatchedBook) {
                if (ke.id !in matchedBookIds && be.amount == ke.amount) {
                    matchedBankIds.add(be.id)
                    matchedBookIds.add(ke.id)
                    break
                }
            }
        }

        bankEntries = bankEntries.map { if (it.id in matchedBankIds) it.copy(isMatched = true) else it }
        bookEntries = bookEntries.map { if (it.id in matchedBookIds) it.copy(isMatched = true) else it }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Bank Reconciliation",
            actions = {
                KontafyButton(
                    text = "Auto-Match",
                    onClick = { autoMatch() },
                    variant = ButtonVariant.Primary,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Back",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            Column(
                modifier = Modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Summary bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    ReconcileSummaryCard("Bank Balance", formatCurrency(bankBalance), KontafyColors.StatusSent, Modifier.weight(1f))
                    ReconcileSummaryCard("Book Balance", formatCurrency(bookBalance), KontafyColors.Navy, Modifier.weight(1f))
                    ReconcileSummaryCard("Difference", formatCurrency(difference), if (difference == 0.0) KontafyColors.Green else KontafyColors.StatusOverdue, Modifier.weight(1f))
                    ReconcileSummaryCard("Matched", "${bankEntries.count { it.isMatched }}", KontafyColors.Green, Modifier.weight(1f))
                    ReconcileSummaryCard("Unmatched", "${unmatchedBankCount} / ${unmatchedBookCount}", KontafyColors.Warning, Modifier.weight(1f))
                }

                // Match button
                if (selectedBankEntry != null && selectedBookEntry != null) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        KontafyButton(
                            text = "Match Selected Entries",
                            onClick = { matchEntries() },
                            variant = ButtonVariant.Secondary,
                        )
                    }
                }

                // Split view
                Row(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    // Left - Bank Statement
                    Card(
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "Bank Statement",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(12.dp))

                            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                Text("Date", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                                Text("Description", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                Text("Amount", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                            }
                            HorizontalDivider(color = KontafyColors.BorderLight)

                            LazyColumn {
                                items(bankEntries.filter { !it.isMatched }) { entry ->
                                    val isSelected = selectedBankEntry == entry.id
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 2.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(if (isSelected) KontafyColors.Navy.copy(alpha = 0.08f) else Color.Transparent)
                                            .border(
                                                width = if (isSelected) 1.dp else 0.dp,
                                                color = if (isSelected) KontafyColors.Navy else Color.Transparent,
                                                shape = RoundedCornerShape(6.dp),
                                            )
                                            .clickable { selectedBankEntry = if (isSelected) null else entry.id }
                                            .padding(horizontal = 8.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(entry.date, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                                        Text(entry.description, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                        Text(
                                            formatCurrency(kotlin.math.abs(entry.amount)),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = if (entry.amount >= 0) KontafyColors.Green else KontafyColors.StatusOverdue,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.width(100.dp),
                                            textAlign = TextAlign.End,
                                        )
                                    }
                                }

                                if (bankEntries.any { it.isMatched }) {
                                    item {
                                        Spacer(Modifier.height(12.dp))
                                        Text("Matched", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                                        Spacer(Modifier.height(4.dp))
                                    }
                                    items(bankEntries.filter { it.isMatched }) { entry ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Icon(Icons.Outlined.CheckCircle, "Matched", tint = KontafyColors.Green, modifier = Modifier.size(14.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Text(entry.description, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                            Text(formatCurrency(kotlin.math.abs(entry.amount)), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Right - Book Entries
                    Card(
                        modifier = Modifier.weight(1f).fillMaxHeight(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                "Book Entries",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(12.dp))

                            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                Text("Date", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                                Text("Description", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                Text("Amount", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                            }
                            HorizontalDivider(color = KontafyColors.BorderLight)

                            LazyColumn {
                                items(bookEntries.filter { !it.isMatched }) { entry ->
                                    val isSelected = selectedBookEntry == entry.id
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(vertical = 2.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(if (isSelected) KontafyColors.Navy.copy(alpha = 0.08f) else Color.Transparent)
                                            .border(
                                                width = if (isSelected) 1.dp else 0.dp,
                                                color = if (isSelected) KontafyColors.Navy else Color.Transparent,
                                                shape = RoundedCornerShape(6.dp),
                                            )
                                            .clickable { selectedBookEntry = if (isSelected) null else entry.id }
                                            .padding(horizontal = 8.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(entry.date, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                                        Text(entry.description, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                        Text(
                                            formatCurrency(kotlin.math.abs(entry.amount)),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = if (entry.amount >= 0) KontafyColors.Green else KontafyColors.StatusOverdue,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.width(100.dp),
                                            textAlign = TextAlign.End,
                                        )
                                    }
                                }

                                if (bookEntries.any { it.isMatched }) {
                                    item {
                                        Spacer(Modifier.height(12.dp))
                                        Text("Matched", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                                        Spacer(Modifier.height(4.dp))
                                    }
                                    items(bookEntries.filter { it.isMatched }) { entry ->
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Icon(Icons.Outlined.CheckCircle, "Matched", tint = KontafyColors.Green, modifier = Modifier.size(14.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Text(entry.description, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                            Text(formatCurrency(kotlin.math.abs(entry.amount)), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ReconcileSummaryCard(
    label: String,
    value: String,
    valueColor: Color,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
            Spacer(Modifier.height(4.dp))
            Text(value, style = MaterialTheme.typography.titleMedium, color = valueColor, fontWeight = FontWeight.Bold)
        }
    }
}
