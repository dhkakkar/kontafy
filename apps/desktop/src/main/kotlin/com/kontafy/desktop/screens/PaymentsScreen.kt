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
import com.kontafy.desktop.db.repositories.PaymentRepository
import com.kontafy.desktop.theme.KontafyColors
import com.kontafy.desktop.util.CsvExporter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun PaymentsScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    paymentRepository: PaymentRepository,
    onRecordPayment: () -> Unit,
) {
    var payments by remember { mutableStateOf<List<PaymentDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    val tabs = listOf("All", "Received", "Made")

    fun loadData() {
        scope.launch {
            isLoading = true
            try {
                val allPayments = paymentRepository.getByOrgId(currentOrgId).map { it.toDto() }
                val typeFilter = when (selectedTab) {
                    1 -> "RECEIVED"
                    2 -> "MADE"
                    else -> null
                }
                val filtered = if (typeFilter != null) {
                    allPayments.filter { it.type.uppercase() == typeFilter }
                } else {
                    allPayments
                }
                payments = if (searchQuery.isNotBlank()) {
                    filtered.filter { p ->
                        p.contactName.contains(searchQuery, ignoreCase = true) ||
                            p.reference.contains(searchQuery, ignoreCase = true) ||
                            p.invoiceNumber.contains(searchQuery, ignoreCase = true)
                    }
                } else {
                    filtered
                }
            } catch (_: Exception) {
                payments = emptyList()
            }
            isLoading = false
        }
    }

    LaunchedEffect(selectedTab, searchQuery) { loadData() }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Payments",
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
                                    fileName = "Payments",
                                    headers = listOf("Date", "Contact", "Invoice#", "Amount", "Method", "Type", "Reference"),
                                    rows = payments.map { p ->
                                        listOf(
                                            p.date,
                                            p.contactName,
                                            p.invoiceNumber,
                                            p.amount.toString(),
                                            p.method,
                                            p.type,
                                            p.reference,
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
                    text = "Record Payment",
                    onClick = onRecordPayment,
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        // Tabs
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = KontafyColors.SurfaceElevated,
            contentColor = KontafyColors.Navy,
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = {
                        Text(
                            title,
                            fontWeight = if (selectedTab == index) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (selectedTab == index) KontafyColors.Navy else KontafyColors.Muted,
                        )
                    },
                )
            }
        }

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
                Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                Text("Contact", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                Text("Invoice#", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                Text("Method", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp))
                Text("Reference", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            val displayPayments = payments
            if (displayPayments.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("No payments found", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Muted)
                        Spacer(Modifier.height(8.dp))
                        Text("Try adjusting your search or filters", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.MutedLight)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
                ) {
                    items(displayPayments) { payment ->
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = KontafyColors.SurfaceElevated,
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(payment.date, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(payment.contactName, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
                                    if (payment.type == "Received") {
                                        Text("Received", style = MaterialTheme.typography.bodySmall, color = KontafyColors.Green)
                                    } else {
                                        Text("Made", style = MaterialTheme.typography.bodySmall, color = KontafyColors.StatusOverdue)
                                    }
                                }
                                Text(
                                    payment.invoiceNumber.ifBlank { "-" },
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (payment.invoiceNumber.isNotBlank()) KontafyColors.Navy else KontafyColors.Muted,
                                    fontWeight = if (payment.invoiceNumber.isNotBlank()) FontWeight.Medium else FontWeight.Normal,
                                    modifier = Modifier.width(90.dp),
                                )
                                Text(
                                    formatCurrency(payment.amount),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (payment.type == "Received") KontafyColors.Green else KontafyColors.StatusOverdue,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.width(110.dp),
                                    textAlign = TextAlign.End,
                                )
                                Box(modifier = Modifier.width(110.dp)) {
                                    PaymentMethodBadge(payment.method)
                                }
                                Text(
                                    payment.reference.ifBlank { "-" },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = KontafyColors.Muted,
                                    modifier = Modifier.width(120.dp),
                                )
                            }
                        }
                        HorizontalDivider(color = KontafyColors.BorderLight)
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentMethodBadge(method: String) {
    val (bgColor, textColor) = when (method.lowercase()) {
        "cash" -> Color(0xFFD1FAE5) to Color(0xFF059669)
        "bank transfer" -> Color(0xFFDBEAFE) to Color(0xFF2563EB)
        "upi" -> Color(0xFFF3E8FF) to Color(0xFF7C3AED)
        "cheque" -> Color(0xFFFEF3C7) to Color(0xFFD97706)
        "card" -> Color(0xFFCCFBF1) to Color(0xFF0D9488)
        else -> KontafyColors.StatusDraftBg to KontafyColors.StatusDraft
    }
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = bgColor,
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
        ) {
            Text(
                text = method,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}
