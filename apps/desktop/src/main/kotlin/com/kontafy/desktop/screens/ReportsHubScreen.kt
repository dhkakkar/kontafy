package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.components.TopBar
import com.kontafy.desktop.navigation.Screen
import com.kontafy.desktop.theme.KontafyColors

private data class ReportCategory(
    val title: String,
    val color: Color,
    val reports: List<ReportItem>,
)

private data class ReportItem(
    val title: String,
    val description: String,
    val icon: ImageVector,
    val screen: Screen?,
)

private val reportCategories = listOf(
    ReportCategory(
        "Financial Reports",
        Color(0xFF3B82F6),
        listOf(
            ReportItem("Profit & Loss", "Income and expense summary for a period", Icons.Outlined.TrendingUp, Screen.ProfitLoss),
            ReportItem("Balance Sheet", "Assets, liabilities and equity snapshot", Icons.Outlined.AccountBalance, Screen.BalanceSheet),
            ReportItem("Cash Flow Statement", "Cash movement across activities", Icons.Outlined.Payments, Screen.CashFlow),
            ReportItem("Trial Balance", "Debit and credit balances of all accounts", Icons.Outlined.Balance, Screen.TrialBalance),
        ),
    ),
    ReportCategory(
        "Sales Reports",
        Color(0xFF10B981),
        listOf(
            ReportItem("Sales Register", "All sales transactions for the period", Icons.Outlined.Receipt, null),
            ReportItem("Customer-wise Sales", "Sales breakdown by customer", Icons.Outlined.People, null),
            ReportItem("Invoice Aging", "Outstanding invoices by age", Icons.Outlined.Schedule, null),
        ),
    ),
    ReportCategory(
        "Purchase Reports",
        Color(0xFFF59E0B),
        listOf(
            ReportItem("Purchase Register", "All purchase transactions for the period", Icons.Outlined.ShoppingCart, null),
            ReportItem("Vendor-wise Purchases", "Purchase breakdown by vendor", Icons.Outlined.Store, null),
            ReportItem("Payables Aging", "Outstanding payables by age", Icons.Outlined.Schedule, null),
        ),
    ),
    ReportCategory(
        "Tax Reports",
        Color(0xFFEF4444),
        listOf(
            ReportItem("GST Summary", "GST output, input and net payable", Icons.Outlined.ReceiptLong, null),
            ReportItem("TDS Summary", "Tax deducted at source details", Icons.Outlined.AssuredWorkload, null),
        ),
    ),
    ReportCategory(
        "Inventory Reports",
        Color(0xFF8B5CF6),
        listOf(
            ReportItem("Stock Summary", "Current stock levels across all items", Icons.Outlined.Inventory, null),
            ReportItem("Stock Movement", "Inventory in/out movement log", Icons.Outlined.SwapHoriz, null),
        ),
    ),
)

@Composable
fun ReportsHubScreen(
    onNavigate: (Screen) -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
        TopBar(title = "Reports")

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            items(reportCategories) { category ->
                ReportCategorySection(category, onNavigate)
            }
        }
    }
}

@Composable
private fun ReportCategorySection(
    category: ReportCategory,
    onNavigate: (Screen) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Section header
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(
                modifier = Modifier.size(8.dp),
                shape = RoundedCornerShape(4.dp),
                color = category.color,
            ) {}
            Spacer(Modifier.width(10.dp))
            Text(
                category.title,
                style = MaterialTheme.typography.titleLarge,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.SemiBold,
            )
        }

        // Report cards grid
        val chunked = category.reports.chunked(2)
        chunked.forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                row.forEach { report ->
                    ReportCard(
                        report = report,
                        accentColor = category.color,
                        onClick = { report.screen?.let { onNavigate(it) } },
                        modifier = Modifier.weight(1f),
                    )
                }
                // Fill remaining space if odd number
                if (row.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun ReportCard(
    report: ReportItem,
    accentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isAvailable = report.screen != null

    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isAvailable) KontafyColors.SurfaceElevated else KontafyColors.SurfaceElevated.copy(alpha = 0.7f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        onClick = onClick,
        enabled = isAvailable,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top,
        ) {
            Surface(
                modifier = Modifier.size(40.dp),
                shape = RoundedCornerShape(10.dp),
                color = accentColor.copy(alpha = 0.1f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        report.icon,
                        contentDescription = report.title,
                        tint = if (isAvailable) accentColor else KontafyColors.MutedLight,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        report.title,
                        style = MaterialTheme.typography.titleSmall,
                        color = if (isAvailable) KontafyColors.Ink else KontafyColors.Muted,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (!isAvailable) {
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = KontafyColors.StatusDraftBg,
                        ) {
                            Text(
                                "Soon",
                                style = MaterialTheme.typography.labelSmall,
                                color = KontafyColors.StatusDraft,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                            )
                        }
                    }
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    report.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = KontafyColors.Muted,
                    maxLines = 2,
                )
            }
        }
    }
}
