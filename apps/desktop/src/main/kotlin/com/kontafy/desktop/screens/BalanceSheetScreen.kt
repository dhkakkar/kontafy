package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
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
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import kotlin.math.abs

@Composable
fun BalanceSheetScreen(
    apiClient: ApiClient,
    accountRepository: AccountRepository = AccountRepository(),
) {
    var asOfDate by remember { mutableStateOf("2026-03-13") }
    var data by remember { mutableStateOf<BalanceSheetData?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    fun buildBalanceSheetFromLocal(): BalanceSheetData? {
        val accounts = accountRepository.getAll()
        if (accounts.isEmpty()) return null
        fun buildSection(type: String): BalanceSheetSection {
            val matching = accounts.filter { it.type.equals(type, ignoreCase = true) && !it.isGroup }
            val items = matching.map { AccountAmount(it.id, it.name, it.currentBalance.toDouble()) }
            return BalanceSheetSection(label = type.replaceFirstChar { it.uppercase() }, accounts = items, total = items.sumOf { it.amount })
        }
        val assetSection = buildSection("asset")
        val liabilitySection = buildSection("liability")
        val equitySection = buildSection("equity")
        return BalanceSheetData(
            asOfDate = asOfDate,
            assets = listOf(assetSection),
            liabilities = listOf(liabilitySection),
            equity = listOf(equitySection),
            totalAssets = assetSection.total,
            totalLiabilities = liabilitySection.total,
            totalEquity = equitySection.total,
        )
    }

    LaunchedEffect(Unit) {
        scope.launch {
            // Try local DB first
            val localData = buildBalanceSheetFromLocal()
            if (localData != null) {
                data = localData
                isLoading = false
            }
            // Then try API
            val result = apiClient.getBalanceSheet(asOfDate)
            result.fold(
                onSuccess = { data = it },
                onFailure = {},
            )
            isLoading = false
        }
    }

    val displayData = data
    val liabilitiesPlusEquity = (displayData?.totalLiabilities ?: 0.0) + (displayData?.totalEquity ?: 0.0)
    val isBalanced = displayData != null && abs(displayData.totalAssets - liabilitiesPlusEquity) < 0.01

    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
        TopBar(
            title = "Balance Sheet",
            actions = {
                OutlinedTextField(
                    value = asOfDate,
                    onValueChange = { asOfDate = it },
                    label = { Text("As of Date") },
                    modifier = Modifier.width(160.dp).height(48.dp),
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    textStyle = MaterialTheme.typography.bodyMedium,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = KontafyColors.Navy, unfocusedBorderColor = KontafyColors.Border),
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Refresh",
                    onClick = {
                        scope.launch {
                            isLoading = true
                            val localData = buildBalanceSheetFromLocal()
                            if (localData != null) {
                                data = localData
                                isLoading = false
                            }
                            val result = apiClient.getBalanceSheet(asOfDate)
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
                Text("No balance sheet data available", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Title
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
                            Text("Balance Sheet", style = MaterialTheme.typography.headlineMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                            Text("As of ${displayData.asOfDate}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                            if (!isBalanced) {
                                Spacer(Modifier.height(8.dp))
                                Surface(shape = RoundedCornerShape(6.dp), color = KontafyColors.StatusOverdueBg) {
                                    Text(
                                        "Balance mismatch: Assets (${formatCurrency(displayData.totalAssets)}) != Liabilities + Equity (${formatCurrency(liabilitiesPlusEquity)})",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = KontafyColors.StatusOverdue,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                    )
                                }
                            }
                        }
                    }
                }

                // Assets
                item {
                    BSMajorSection(
                        title = "Assets",
                        sections = displayData.assets,
                        total = displayData.totalAssets,
                        color = Color(0xFF3B82F6),
                        bgColor = Color(0xFFDBEAFE),
                    )
                }

                // Liabilities
                item {
                    BSMajorSection(
                        title = "Liabilities",
                        sections = displayData.liabilities,
                        total = displayData.totalLiabilities,
                        color = Color(0xFFEF4444),
                        bgColor = Color(0xFFFEE2E2),
                    )
                }

                // Equity
                item {
                    BSMajorSection(
                        title = "Equity",
                        sections = displayData.equity,
                        total = displayData.totalEquity,
                        color = Color(0xFF8B5CF6),
                        bgColor = Color(0xFFEDE9FE),
                    )
                }

                // Balance check
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isBalanced) KontafyColors.StatusPaidBg.copy(alpha = 0.5f) else KontafyColors.StatusOverdueBg.copy(alpha = 0.5f),
                        ),
                    ) {
                        Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Total Assets", style = MaterialTheme.typography.titleSmall, color = KontafyColors.Ink)
                                Text(formatCurrency(displayData.totalAssets), style = MaterialTheme.typography.titleSmall, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                            }
                            Spacer(Modifier.height(4.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text("Total Liabilities + Equity", style = MaterialTheme.typography.titleSmall, color = KontafyColors.Ink)
                                Text(formatCurrency(liabilitiesPlusEquity), style = MaterialTheme.typography.titleSmall, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                            }
                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = KontafyColors.Border)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    if (isBalanced) "BALANCED" else "MISMATCH",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = if (isBalanced) KontafyColors.StatusPaid else KontafyColors.StatusOverdue,
                                    fontWeight = FontWeight.Bold,
                                )
                                if (!isBalanced) {
                                    Text(
                                        "Difference: ${formatCurrency(abs(displayData.totalAssets - liabilitiesPlusEquity))}",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = KontafyColors.StatusOverdue,
                                    )
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
private fun BSMajorSection(
    title: String,
    sections: List<BalanceSheetSection>,
    total: Double,
    color: Color,
    bgColor: Color,
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column {
            // Major section header
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = bgColor.copy(alpha = 0.4f),
                shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(modifier = Modifier.size(10.dp), shape = RoundedCornerShape(5.dp), color = color) {}
                    Spacer(Modifier.width(10.dp))
                    Text(
                        title,
                        style = MaterialTheme.typography.headlineSmall,
                        color = color,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        formatCurrency(total),
                        style = MaterialTheme.typography.headlineSmall,
                        color = color,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            // Sub-sections
            sections.forEach { section ->
                BSSubSection(section, color)
            }
        }
    }
}

@Composable
private fun BSSubSection(section: BalanceSheetSection, accentColor: Color) {
    var expanded by remember { mutableStateOf(true) }

    Column {
        // Sub-section header
        Surface(
            modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded },
            color = KontafyColors.Surface.copy(alpha = 0.5f),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                    contentDescription = if (expanded) "Collapse" else "Expand",
                    tint = KontafyColors.Muted,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    section.label,
                    style = MaterialTheme.typography.titleSmall,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    formatCurrency(section.total),
                    style = MaterialTheme.typography.titleSmall,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
        HorizontalDivider(color = KontafyColors.BorderLight)

        if (expanded) {
            section.accounts.forEach { account ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(start = 48.dp, end = 20.dp, top = 10.dp, bottom = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(account.accountName, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                    Text(
                        formatCurrency(account.amount),
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.Ink,
                        textAlign = TextAlign.End,
                    )
                }
                HorizontalDivider(color = KontafyColors.BorderLight, modifier = Modifier.padding(start = 48.dp))
            }
        }
    }
}
