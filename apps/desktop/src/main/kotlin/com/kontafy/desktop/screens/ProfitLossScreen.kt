package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.kontafy.desktop.api.AccountAmount
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.ProfitLossData
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AccountRepository
import com.kontafy.desktop.theme.KontafyColors
import java.time.LocalDate
import kotlinx.coroutines.launch

@Composable
fun ProfitLossScreen(
    apiClient: ApiClient,
    accountRepository: AccountRepository = AccountRepository(),
) {
    var fromDate by remember { mutableStateOf(LocalDate.now().withDayOfMonth(1).toString()) }
    var toDate by remember { mutableStateOf(LocalDate.now().toString()) }
    var data by remember { mutableStateOf<ProfitLossData?>(null) }
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

    fun buildProfitLossFromLocal(): ProfitLossData? {
        val accounts = accountRepository.getAll()
        if (accounts.isEmpty()) return null
        val incomeAccounts = accounts.filter { it.type.equals("income", ignoreCase = true) && !it.isGroup }
        val expenseAccounts = accounts.filter { it.type.equals("expense", ignoreCase = true) && !it.isGroup }
        val incomeItems = incomeAccounts.map { AccountAmount(it.id, it.name, it.currentBalance.toDouble()) }
        val expenseItems = expenseAccounts.map { AccountAmount(it.id, it.name, it.currentBalance.toDouble()) }
        val totalIncome = incomeItems.sumOf { it.amount }
        val totalExpenses = expenseItems.sumOf { it.amount }
        return ProfitLossData(
            fromDate = fromDate,
            toDate = toDate,
            income = incomeItems,
            expenses = expenseItems,
            totalIncome = totalIncome,
            totalExpenses = totalExpenses,
            netProfit = totalIncome - totalExpenses,
        )
    }

    LaunchedEffect(Unit) {
        scope.launch {
            // Try local DB first
            val localData = buildProfitLossFromLocal()
            if (localData != null) {
                data = localData
                isLoading = false
            }
            // Then try API
            val result = apiClient.getProfitLoss(fromDate, toDate)
            result.fold(
                onSuccess = { data = it },
                onFailure = { e ->
                    e.printStackTrace()
                    if (data == null) {
                        snackbarMessage = "Failed to fetch profit & loss data: ${e.message}"
                    }
                },
            )
            isLoading = false
        }
    }

    val displayData = data
    val isProfit = (displayData?.netProfit ?: 0.0) >= 0

    Box(modifier = Modifier.fillMaxSize()) {
    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
        TopBar(
            title = "Profit & Loss",
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
                            val localData = buildProfitLossFromLocal()
                            if (localData != null) {
                                data = localData
                                isLoading = false
                            }
                            val result = apiClient.getProfitLoss(fromDate, toDate)
                            result.fold(
                                onSuccess = { data = it },
                                onFailure = { e ->
                                    e.printStackTrace()
                                    if (data == null) {
                                        snackbarMessage = "Failed to fetch profit & loss data: ${e.message}"
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
                Text("No profit & loss data available", style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
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
                            Text("Profit & Loss Statement", style = MaterialTheme.typography.headlineMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Bold)
                            Text("${displayData.fromDate} to ${displayData.toDate}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                        }
                    }
                }

                // Summary cards
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        StatCard(
                            title = "Total Income",
                            value = formatCurrency(displayData.totalIncome),
                            icon = Icons.Outlined.TrendingUp,
                            iconBackground = Color(0xFFD1FAE5),
                            iconTint = KontafyColors.Green,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = "Total Expenses",
                            value = formatCurrency(displayData.totalExpenses),
                            icon = Icons.Outlined.TrendingDown,
                            iconBackground = Color(0xFFFEE2E2),
                            iconTint = KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                        )
                        StatCard(
                            title = if (isProfit) "Net Profit" else "Net Loss",
                            value = formatCurrency(kotlin.math.abs(displayData.netProfit)),
                            icon = if (isProfit) Icons.Outlined.CheckCircle else Icons.Outlined.Warning,
                            iconBackground = if (isProfit) Color(0xFFD1FAE5) else Color(0xFFFEE2E2),
                            iconTint = if (isProfit) KontafyColors.Green else KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                // Income section
                item {
                    PLSection(
                        title = "Income",
                        items = displayData.income,
                        total = displayData.totalIncome,
                        color = KontafyColors.Green,
                        bgColor = Color(0xFFD1FAE5),
                    )
                }

                // Expense section
                item {
                    PLSection(
                        title = "Expenses",
                        items = displayData.expenses,
                        total = displayData.totalExpenses,
                        color = KontafyColors.StatusOverdue,
                        bgColor = Color(0xFFFEE2E2),
                    )
                }

                // Net Profit/Loss
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isProfit) Color(0xFFD1FAE5).copy(alpha = 0.5f) else Color(0xFFFEE2E2).copy(alpha = 0.5f),
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(20.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = if (isProfit) "NET PROFIT" else "NET LOSS",
                                style = MaterialTheme.typography.headlineMedium,
                                color = if (isProfit) KontafyColors.Green else KontafyColors.StatusOverdue,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = formatCurrency(kotlin.math.abs(displayData.netProfit)),
                                style = MaterialTheme.typography.headlineMedium,
                                color = if (isProfit) KontafyColors.Green else KontafyColors.StatusOverdue,
                                fontWeight = FontWeight.Bold,
                            )
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
private fun PLSection(
    title: String,
    items: List<AccountAmount>,
    total: Double,
    color: Color,
    bgColor: Color,
) {
    var expanded by remember { mutableStateOf(true) }

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column {
            // Section header
            Surface(
                modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded },
                color = bgColor.copy(alpha = 0.3f),
                shape = RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(modifier = Modifier.size(8.dp), shape = RoundedCornerShape(4.dp), color = color) {}
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleLarge,
                        color = color,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = formatCurrency(total),
                        style = MaterialTheme.typography.titleLarge,
                        color = color,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(Modifier.width(8.dp))
                    Icon(
                        if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                        contentDescription = if (expanded) "Collapse" else "Expand",
                        tint = color,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }

            if (expanded) {
                // Column headers
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                ) {
                    Text("Account", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                    Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(150.dp), textAlign = TextAlign.End)
                }
                HorizontalDivider(color = KontafyColors.BorderLight)

                items.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(item.accountName, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                        Text(
                            text = formatCurrency(item.amount),
                            style = MaterialTheme.typography.bodyLarge,
                            color = KontafyColors.Ink,
                            modifier = Modifier.width(150.dp),
                            textAlign = TextAlign.End,
                        )
                    }
                    HorizontalDivider(color = KontafyColors.BorderLight)
                }

                // Section total
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Total $title",
                        style = MaterialTheme.typography.titleSmall,
                        color = KontafyColors.Ink,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = formatCurrency(total),
                        style = MaterialTheme.typography.titleSmall,
                        color = KontafyColors.Ink,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.width(150.dp),
                        textAlign = TextAlign.End,
                    )
                }
            }
        }
    }
}
