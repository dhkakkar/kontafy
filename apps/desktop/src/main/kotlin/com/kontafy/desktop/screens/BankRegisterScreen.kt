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
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun BankRegisterScreen(
    bankId: String,
    apiClient: ApiClient,
    onBack: () -> Unit,
    onReconcile: (String) -> Unit,
    showSnackbar: (String) -> Unit = {},
) {
    var transactions by remember { mutableStateOf<List<BankTransactionDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var filterStatus by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            val result = apiClient.getBankTransactions(bankId)
            result.fold(
                onSuccess = { transactions = it },
                onFailure = { showSnackbar("Failed to load bank transactions") },
            )
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

        // Filter chips
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 12.dp),
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
                    Text("Debit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                    Text("Credit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                    Text("Balance", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                    Text("Status", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
            ) {
                items(displayTransactions) { txn ->
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
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
