package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.kontafy.desktop.theme.KontafyColors
import java.time.LocalDate
import kotlinx.coroutines.launch

@Composable
fun CashFlowScreen(
    apiClient: ApiClient,
    accountRepository: AccountRepository = AccountRepository(),
) {
    var fromDate by remember { mutableStateOf(LocalDate.now().withDayOfMonth(1).toString()) }
    var toDate by remember { mutableStateOf(LocalDate.now().toString()) }
    var data by remember { mutableStateOf<CashFlowData?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            snackbarMessage = null
        }
    }

    fun buildCashFlowFromLocal(): CashFlowData? {
        val accounts = accountRepository.getAll()
        if (accounts.isEmpty()) return null
        // Simple heuristic: group accounts by type for cash flow sections
        val incomeAccounts = accounts.filter { it.type.equals("income", ignoreCase = true) && !it.isGroup }
        val expenseAccounts = accounts.filter { it.type.equals("expense", ignoreCase = true) && !it.isGroup }
        val assetAccounts = accounts.filter { it.type.equals("asset", ignoreCase = true) && !it.isGroup }
        val liabilityAccounts = accounts.filter { it.type.equals("liability", ignoreCase = true) && !it.isGroup }

        val operatingItems = (incomeAccounts + expenseAccounts).map { AccountAmount(it.id, it.name, it.currentBalance.toDouble()) }
        val investingItems = assetAccounts.filter { it.name.contains("invest", ignoreCase = true) || it.name.contains("fixed", ignoreCase = true) }
            .map { AccountAmount(it.id, it.name, it.currentBalance.toDouble()) }
        val financingItems = liabilityAccounts.filter { it.name.contains("loan", ignoreCase = true) || it.name.contains("capital", ignoreCase = true) }
            .map { AccountAmount(it.id, it.name, it.currentBalance.toDouble()) }

        val operatingTotal = operatingItems.sumOf { it.amount }
        val investingTotal = investingItems.sumOf { it.amount }
        val financingTotal = financingItems.sumOf { it.amount }
        val cashAccounts = assetAccounts.filter { it.name.contains("cash", ignoreCase = true) || it.name.contains("bank", ignoreCase = true) }
        val openingCash = cashAccounts.sumOf { it.openingBalance.toDouble() }
        val netChange = operatingTotal + investingTotal + financingTotal

        return CashFlowData(
            fromDate = fromDate,
            toDate = toDate,
            operating = CashFlowSection("Operating Activities", operatingItems, operatingTotal),
            investing = CashFlowSection("Investing Activities", investingItems, investingTotal),
            financing = CashFlowSection("Financing Activities", financingItems, financingTotal),
            openingCash = openingCash,
            netChange = netChange,
            closingCash = openingCash + netChange,
        )
    }

    LaunchedEffect(Unit) {
        scope.launch {
            // Try local DB first
            val localData = buildCashFlowFromLocal()
            if (localData != null) {
                data = localData
                isLoading = false
            }
            // Then try API
            val result = apiClient.getCashFlow(fromDate, toDate)
            result.fold(
                onSuccess = { data = it },
                onFailure = { e ->
                    e.printStackTrace()
                    if (data == null) {
                        snackbarMessage = "Failed to fetch cash flow data: ${e.message}"
                    }
                },
            )
            isLoading = false
        }
    }

    val displayData = data

    Box(modifier = Modifier.fillMaxSize()) {
    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
        TopBar(
            title = "Cash Flow Statement",
            actions = {
                OutlinedTextField(
                    value = fromDate,
                    onValueChange = { fromDate = it },
                    label = { Text("From") },
                    modifier = Modifier.width(150.dp).height(48.dp),
                    singleLine = true,
                    shape = RoundedCornerShape(8.dp),
                    textStyle = MaterialTheme.typography.bodyMedium,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = KontafyColors.Navy, unfocusedBorderColor = KontafyColors.Border),
                )
                Spacer(Modifier.width(8.dp))
                OutlinedTextField(
                    value = toDate,
                    onValueChange = { toDate = it },
                    label = { Text("To") },
                    modifier = Modifier.width(150.dp).height(48.dp),
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
                            val localData = buildCashFlowFromLocal()
                            if (localData != null) {
                                data = localData
                                isLoading = false
                            }
                            val result = apiClient.getCashFlow(fromDate, toDate)
                            result.fold(
                                onSuccess = { data = it },
                                onFailure = { e ->
                                    e.printStackTrace()
                                    if (data == null) {
                                        snackbarMessage = "Failed to fetch cash flow data: ${e.message}"
                                    }
                                },
                            )
                            isLoading = false
                        }
                    },
                    variant = ButtonVariant.Outline,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (displayData == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No cash flow data available", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
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
                            Text("Cash Flow Statement", style = MaterialTheme.typography.headlineMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                            Text("${displayData.fromDate} to ${displayData.toDate}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                        }
                    }
                }

                // Summary cards
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        StatCard(
                            title = "Opening Cash",
                            value = formatCurrency(displayData.openingCash),
                            icon = Icons.Outlined.AccountBalanceWallet,
                            iconBackground = Color(0xFFDBEAFE),
                            iconTint = Color(0xFF3B82F6),
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = "Net Change",
                            value = formatCurrency(displayData.netChange),
                            icon = if (displayData.netChange >= 0) Icons.Outlined.TrendingUp else Icons.Outlined.TrendingDown,
                            iconBackground = if (displayData.netChange >= 0) Color(0xFFD1FAE5) else Color(0xFFFEE2E2),
                            iconTint = if (displayData.netChange >= 0) KontafyColors.Green else KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = "Closing Cash",
                            value = formatCurrency(displayData.closingCash),
                            icon = Icons.Outlined.AccountBalance,
                            iconBackground = Color(0xFFEDE9FE),
                            iconTint = Color(0xFF8B5CF6),
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                // Operating Activities
                item {
                    CashFlowSectionCard(
                        section = displayData.operating,
                        color = KontafyColors.Green,
                        bgColor = Color(0xFFD1FAE5),
                        icon = Icons.Outlined.Business,
                    )
                }

                // Investing Activities
                item {
                    CashFlowSectionCard(
                        section = displayData.investing,
                        color = Color(0xFF3B82F6),
                        bgColor = Color(0xFFDBEAFE),
                        icon = Icons.Outlined.TrendingUp,
                    )
                }

                // Financing Activities
                item {
                    CashFlowSectionCard(
                        section = displayData.financing,
                        color = Color(0xFF8B5CF6),
                        bgColor = Color(0xFFEDE9FE),
                        icon = Icons.Outlined.AccountBalance,
                    )
                }

                // Summary
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                            CashFlowSummaryRow("Opening Cash Balance", displayData.openingCash)
                            Spacer(Modifier.height(4.dp))
                            CashFlowSummaryRow("Operating Activities", displayData.operating.total, indent = true)
                            CashFlowSummaryRow("Investing Activities", displayData.investing.total, indent = true)
                            CashFlowSummaryRow("Financing Activities", displayData.financing.total, indent = true)
                            Spacer(Modifier.height(4.dp))
                            HorizontalDivider(color = KontafyColors.Border)
                            Spacer(Modifier.height(4.dp))
                            CashFlowSummaryRow("Net Change in Cash", displayData.netChange)
                            HorizontalDivider(color = KontafyColors.Border, modifier = Modifier.padding(vertical = 8.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    "CLOSING CASH BALANCE",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = KontafyColors.Ink,
                                    fontWeight = FontWeight.Bold,
                                )
                                Text(
                                    formatCurrency(displayData.closingCash),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = KontafyColors.Ink,
                                    fontWeight = FontWeight.Bold,
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
private fun CashFlowSectionCard(
    section: CashFlowSection,
    color: Color,
    bgColor: Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column {
            // Header
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = bgColor.copy(alpha = 0.3f),
                shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    Text(
                        section.label,
                        style = MaterialTheme.typography.titleLarge,
                        color = color,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        formatCurrency(section.total),
                        style = MaterialTheme.typography.titleLarge,
                        color = if (section.total >= 0) KontafyColors.Green else KontafyColors.StatusOverdue,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            // Items
            section.items.forEach { item ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        item.accountName,
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.Ink,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        formatCurrency(item.amount),
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (item.amount >= 0) KontafyColors.Green else KontafyColors.StatusOverdue,
                        textAlign = TextAlign.End,
                    )
                }
                HorizontalDivider(color = KontafyColors.BorderLight)
            }

            // Section total
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
            ) {
                Text(
                    "Net ${section.label}",
                    style = MaterialTheme.typography.titleSmall,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    formatCurrency(section.total),
                    style = MaterialTheme.typography.titleSmall,
                    color = if (section.total >= 0) KontafyColors.Green else KontafyColors.StatusOverdue,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.End,
                )
            }
        }
    }
}

@Composable
private fun CashFlowSummaryRow(label: String, amount: Double, indent: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(start = if (indent) 20.dp else 0.dp, top = 4.dp, bottom = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            label,
            style = if (indent) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.titleSmall,
            color = if (indent) KontafyColors.Muted else KontafyColors.Ink,
            fontWeight = if (indent) FontWeight.Normal else FontWeight.SemiBold,
        )
        Text(
            formatCurrency(amount),
            style = if (indent) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.titleSmall,
            color = if (amount >= 0) KontafyColors.Ink else KontafyColors.StatusOverdue,
            fontWeight = if (indent) FontWeight.Normal else FontWeight.SemiBold,
        )
    }
}
