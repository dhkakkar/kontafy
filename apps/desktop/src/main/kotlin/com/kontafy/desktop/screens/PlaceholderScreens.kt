package com.kontafy.desktop.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.theme.KontafyColors

@Composable
private fun ComingSoonScreen(
    title: String,
    subtitle: String,
    icon: ImageVector,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(32.dp),
    ) {
        Text(
            title,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = KontafyColors.Ink,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            subtitle,
            style = MaterialTheme.typography.bodyLarge,
            color = KontafyColors.Muted,
        )
        Spacer(Modifier.height(48.dp))
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = KontafyColors.Muted.copy(alpha = 0.4f),
                modifier = Modifier.size(64.dp),
            )
            Spacer(Modifier.height(16.dp))
            Text(
                "Coming Soon",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
                color = KontafyColors.Muted,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "This feature is under development and will be available in a future update.",
                style = MaterialTheme.typography.bodyMedium,
                color = KontafyColors.Muted.copy(alpha = 0.7f),
            )
        }
    }
}

@Composable
fun CreditNotesScreen() = ComingSoonScreen(
    title = "Credit Notes",
    subtitle = "Manage credit notes and refunds",
    icon = Icons.Outlined.RemoveCircle,
)

@Composable
fun EInvoiceDashboardScreen() = ComingSoonScreen(
    title = "E-Invoice Dashboard",
    subtitle = "Overview of all e-invoices and their status",
    icon = Icons.Outlined.VerifiedUser,
)

@Composable
fun EInvoiceGenerateScreen() = ComingSoonScreen(
    title = "Generate E-Invoice",
    subtitle = "Create and submit e-invoices to the IRP portal",
    icon = Icons.Outlined.FilePresent,
)

@Composable
fun EInvoiceSettingsScreen() = ComingSoonScreen(
    title = "E-Invoice Settings",
    subtitle = "Configure e-invoice credentials and preferences",
    icon = Icons.Outlined.Settings,
)

@Composable
fun BranchesScreen() = ComingSoonScreen(
    title = "Branches",
    subtitle = "Manage your business branches and locations",
    icon = Icons.Outlined.Business,
)

@Composable
fun BudgetListScreen() = ComingSoonScreen(
    title = "Budgets",
    subtitle = "View and manage your budgets",
    icon = Icons.Outlined.PieChart,
)

@Composable
fun CreateBudgetScreen() = ComingSoonScreen(
    title = "Create Budget",
    subtitle = "Set up a new budget for tracking",
    icon = Icons.Outlined.Add,
)

@Composable
fun BudgetVarianceScreen() = ComingSoonScreen(
    title = "Variance Report",
    subtitle = "Compare actual vs budgeted amounts",
    icon = Icons.Outlined.TrendingUp,
)

@Composable
fun OutstandingPaymentsScreen() = ComingSoonScreen(
    title = "Outstanding Payments",
    subtitle = "Track overdue and pending payments",
    icon = Icons.Outlined.Warning,
)

@Composable
fun CommerceConnectionsScreen() = ComingSoonScreen(
    title = "E-commerce Connections",
    subtitle = "Connect your online stores and marketplaces",
    icon = Icons.Outlined.ShoppingBag,
)

@Composable
fun CommerceOrdersScreen() = ComingSoonScreen(
    title = "Synced Orders",
    subtitle = "View orders synced from connected stores",
    icon = Icons.Outlined.ShoppingCart,
)

@Composable
fun CommerceDashboardScreen() = ComingSoonScreen(
    title = "Commerce Analytics",
    subtitle = "Sales analytics across all channels",
    icon = Icons.Outlined.Analytics,
)

@Composable
fun WhatsAppMessagesScreen() = ComingSoonScreen(
    title = "WhatsApp Messages",
    subtitle = "Send invoices and reminders via WhatsApp",
    icon = Icons.Outlined.Message,
)

@Composable
fun WhatsAppSettingsScreen() = ComingSoonScreen(
    title = "WhatsApp Settings",
    subtitle = "Configure WhatsApp Business API integration",
    icon = Icons.Outlined.Settings,
)

@Composable
fun AIInsightsScreen() = ComingSoonScreen(
    title = "AI Insights",
    subtitle = "AI-powered financial insights and recommendations",
    icon = Icons.Outlined.Lightbulb,
)

@Composable
fun CAPortalScreen() = ComingSoonScreen(
    title = "CA Portal",
    subtitle = "Chartered Accountant collaboration portal",
    icon = Icons.Outlined.Security,
)

@Composable
fun BillingOverviewScreen() = ComingSoonScreen(
    title = "Billing",
    subtitle = "Your subscription and billing overview",
    icon = Icons.Outlined.CreditCard,
)

@Composable
fun BillingPlansScreen() = ComingSoonScreen(
    title = "Plans",
    subtitle = "View and compare available plans",
    icon = Icons.Outlined.Loyalty,
)

@Composable
fun BillingInvoicesScreen() = ComingSoonScreen(
    title = "Billing Invoices",
    subtitle = "Your billing history and invoices",
    icon = Icons.Outlined.Receipt,
)

@Composable
fun GeneralLedgerReportScreen() = ComingSoonScreen(
    title = "General Ledger",
    subtitle = "Complete general ledger report",
    icon = Icons.Outlined.ListAlt,
)

@Composable
fun DayBookScreen() = ComingSoonScreen(
    title = "Day Book",
    subtitle = "Daily transaction register",
    icon = Icons.Outlined.CalendarToday,
)

@Composable
fun ARAgingReportScreen() = ComingSoonScreen(
    title = "Receivable Aging",
    subtitle = "Accounts receivable aging analysis",
    icon = Icons.Outlined.Schedule,
)

@Composable
fun APAgingReportScreen() = ComingSoonScreen(
    title = "Payable Aging",
    subtitle = "Accounts payable aging analysis",
    icon = Icons.Outlined.Schedule,
)

@Composable
fun SalesRegisterScreen() = ComingSoonScreen(
    title = "Sales Register",
    subtitle = "Detailed sales transaction register",
    icon = Icons.Outlined.PointOfSale,
)

@Composable
fun GSTSummaryReportScreen() = ComingSoonScreen(
    title = "GST Summary",
    subtitle = "GST collection and input credit summary",
    icon = Icons.Outlined.Summarize,
)
