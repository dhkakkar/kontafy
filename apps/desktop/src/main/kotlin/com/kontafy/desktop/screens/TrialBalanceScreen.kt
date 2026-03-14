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
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.TrialBalanceResponse
import com.kontafy.desktop.api.TrialBalanceRow
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AccountRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun TrialBalanceScreen(
    apiClient: ApiClient,
    accountRepository: AccountRepository = AccountRepository(),
) {
    var asOfDate by remember { mutableStateOf("2026-03-13") }
    var data by remember { mutableStateOf<TrialBalanceResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    fun buildTrialBalanceFromLocal(): TrialBalanceResponse? {
        val accounts = accountRepository.getAll()
        if (accounts.isEmpty()) return null
        val rows = accounts.filter { !it.isGroup }.map { account ->
            val dto = account.toDto()
            val balance = account.currentBalance.toDouble()
            val debit = if (dto.type in listOf("ASSET", "EXPENSE") && balance > 0) balance
                else if (dto.type in listOf("LIABILITY", "EQUITY", "INCOME") && balance < 0) -balance
                else if (dto.type !in listOf("ASSET", "EXPENSE") && balance > 0) 0.0
                else if (balance < 0) -balance else 0.0
            val credit = if (dto.type in listOf("LIABILITY", "EQUITY", "INCOME") && balance > 0) balance
                else if (dto.type in listOf("ASSET", "EXPENSE") && balance < 0) -balance
                else 0.0
            TrialBalanceRow(
                accountCode = dto.code,
                accountName = dto.name,
                accountType = dto.type,
                debitBalance = debit,
                creditBalance = credit,
            )
        }
        val totalDebits = rows.sumOf { it.debitBalance }
        val totalCredits = rows.sumOf { it.creditBalance }
        return TrialBalanceResponse(
            asOfDate = asOfDate,
            rows = rows,
            totalDebits = totalDebits,
            totalCredits = totalCredits,
        )
    }

    LaunchedEffect(Unit) {
        scope.launch {
            // Try local DB first
            val localData = buildTrialBalanceFromLocal()
            if (localData != null) {
                data = localData
                isLoading = false
            }
            // Then try API
            val result = apiClient.getTrialBalance(asOfDate)
            result.fold(
                onSuccess = { data = it },
                onFailure = {},
            )
            isLoading = false
        }
    }

    val displayData = data
    val typeOrder = listOf("ASSET", "EXPENSE", "LIABILITY", "EQUITY", "INCOME")
    val grouped = (displayData?.rows ?: emptyList()).groupBy { it.accountType.uppercase() }

    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
        TopBar(
            title = "Trial Balance",
            actions = {
                OutlinedTextField(
                    value = asOfDate,
                    onValueChange = { asOfDate = it },
                    label = { Text("As of Date") },
                    modifier = Modifier.width(160.dp).height(48.dp),
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    textStyle = MaterialTheme.typography.bodyMedium,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = KontafyColors.Navy,
                        unfocusedBorderColor = KontafyColors.Border,
                    ),
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Refresh",
                    onClick = {
                        scope.launch {
                            isLoading = true
                            val localData = buildTrialBalanceFromLocal()
                            if (localData != null) {
                                data = localData
                                isLoading = false
                            }
                            val result = apiClient.getTrialBalance(asOfDate)
                            result.fold(
                                onSuccess = { data = it },
                                onFailure = {},
                            )
                            isLoading = false
                        }
                    },
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Print",
                    onClick = { /* placeholder */ },
                    variant = ButtonVariant.Ghost,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (displayData == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No trial balance data available", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                // Report title
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text("Trial Balance", style = MaterialTheme.typography.headlineMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                            Text("As of ${displayData.asOfDate}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                        }
                    }
                }

                item { Spacer(Modifier.height(8.dp)) }

                // Table header
                item { TrialBalanceTableHeader() }

                // Grouped rows
                typeOrder.forEach { type ->
                    val rows = grouped[type] ?: emptyList()
                    if (rows.isNotEmpty()) {
                        item {
                            TrialBalanceSectionHeader(type)
                        }
                        items(rows) { row ->
                            TrialBalanceRowItem(row)
                            HorizontalDivider(color = KontafyColors.BorderLight)
                        }
                        item {
                            val sectionDebit = rows.sumOf { it.debitBalance }
                            val sectionCredit = rows.sumOf { it.creditBalance }
                            TrialBalanceSubtotalRow(type, sectionDebit, sectionCredit)
                        }
                    }
                }

                // Grand total
                item {
                    TrialBalanceGrandTotal(displayData.totalDebits, displayData.totalCredits)
                }
            }
        }
    }
}

@Composable
private fun TrialBalanceTableHeader() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = KontafyColors.Surface,
        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Code", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
            Text("Account Name", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
            Text("Debit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(150.dp), textAlign = TextAlign.End)
            Text("Credit", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(150.dp), textAlign = TextAlign.End)
        }
    }
}

@Composable
private fun TrialBalanceSectionHeader(type: String) {
    val color = when (type) {
        "ASSET" -> Color(0xFF3B82F6)
        "LIABILITY" -> Color(0xFFEF4444)
        "EQUITY" -> Color(0xFF8B5CF6)
        "INCOME" -> Color(0xFF10B981)
        "EXPENSE" -> Color(0xFFF59E0B)
        else -> KontafyColors.Muted
    }
    val bgColor = when (type) {
        "ASSET" -> Color(0xFFDBEAFE)
        "LIABILITY" -> Color(0xFFFEE2E2)
        "EQUITY" -> Color(0xFFEDE9FE)
        "INCOME" -> Color(0xFFD1FAE5)
        "EXPENSE" -> Color(0xFFFEF3C7)
        else -> KontafyColors.StatusDraftBg
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = bgColor.copy(alpha = 0.5f),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(modifier = Modifier.size(8.dp), shape = RoundedCornerShape(4.dp), color = color) {}
            Spacer(Modifier.width(10.dp))
            Text(
                text = type.lowercase().replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.titleSmall,
                color = color,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun TrialBalanceRowItem(row: TrialBalanceRow) {
    Surface(modifier = Modifier.fillMaxWidth(), color = KontafyColors.SurfaceElevated) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(row.accountCode, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
            Text(row.accountName, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
            Text(
                text = if (row.debitBalance > 0) formatCurrency(row.debitBalance) else "-",
                style = MaterialTheme.typography.bodyLarge,
                color = if (row.debitBalance > 0) KontafyColors.Ink else KontafyColors.MutedLight,
                modifier = Modifier.width(150.dp),
                textAlign = TextAlign.End,
            )
            Text(
                text = if (row.creditBalance > 0) formatCurrency(row.creditBalance) else "-",
                style = MaterialTheme.typography.bodyLarge,
                color = if (row.creditBalance > 0) KontafyColors.Ink else KontafyColors.MutedLight,
                modifier = Modifier.width(150.dp),
                textAlign = TextAlign.End,
            )
        }
    }
}

@Composable
private fun TrialBalanceSubtotalRow(type: String, debit: Double, credit: Double) {
    Surface(modifier = Modifier.fillMaxWidth(), color = KontafyColors.Surface) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Spacer(Modifier.width(80.dp))
            Text(
                "Subtotal - ${type.lowercase().replaceFirstChar { it.uppercase() }}",
                style = MaterialTheme.typography.titleSmall,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = if (debit > 0) formatCurrency(debit) else "-",
                style = MaterialTheme.typography.titleSmall,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.width(150.dp),
                textAlign = TextAlign.End,
            )
            Text(
                text = if (credit > 0) formatCurrency(credit) else "-",
                style = MaterialTheme.typography.titleSmall,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.width(150.dp),
                textAlign = TextAlign.End,
            )
        }
    }
    HorizontalDivider(color = KontafyColors.Border)
}

@Composable
private fun TrialBalanceGrandTotal(totalDebits: Double, totalCredits: Double) {
    val isBalanced = kotlin.math.abs(totalDebits - totalCredits) < 0.01

    Card(
        shape = RoundedCornerShape(0.dp, 0.dp, 12.dp, 12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isBalanced) KontafyColors.StatusPaidBg.copy(alpha = 0.5f) else KontafyColors.StatusOverdueBg.copy(alpha = 0.5f),
        ),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Spacer(Modifier.width(80.dp))
            Row(modifier = Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "GRAND TOTAL",
                    style = MaterialTheme.typography.titleMedium,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.Bold,
                )
                if (isBalanced) {
                    Spacer(Modifier.width(8.dp))
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = KontafyColors.StatusPaidBg,
                    ) {
                        Text(
                            "Balanced",
                            style = MaterialTheme.typography.labelSmall,
                            color = KontafyColors.StatusPaid,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        )
                    }
                }
            }
            Text(
                text = formatCurrency(totalDebits),
                style = MaterialTheme.typography.titleMedium,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(150.dp),
                textAlign = TextAlign.End,
            )
            Text(
                text = formatCurrency(totalCredits),
                style = MaterialTheme.typography.titleMedium,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(150.dp),
                textAlign = TextAlign.End,
            )
        }
    }
}
