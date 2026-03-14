package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.QuotationDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun QuotationListScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository,
    contactRepository: ContactRepository,
    onConvertToInvoice: (String) -> Unit,
    onCreateQuotation: () -> Unit = {},
    onQuotationClick: (String) -> Unit = {},
) {
    var quotations by remember { mutableStateOf<List<QuotationDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedDetail by remember { mutableStateOf<QuotationDto?>(null) }
    val scope = rememberCoroutineScope()

    val contactNameMap = remember {
        try { contactRepository.getByOrgId(currentOrgId).associate { it.id to it.name } } catch (_: Exception) { emptyMap() }
    }

    LaunchedEffect(searchQuery) {
        scope.launch {
            isLoading = true
            try {
                val allQuotations = invoiceRepository.getByOrgId(currentOrgId)
                    .filter { it.type == "quotation" }
                    .map { inv ->
                        QuotationDto(
                            id = inv.id,
                            number = inv.invoiceNumber,
                            customerName = contactNameMap[inv.contactId] ?: "Unknown",
                            date = inv.issueDate,
                            amount = inv.totalAmount.toDouble(),
                            validityDate = inv.dueDate,
                            status = inv.status,
                        )
                    }

                quotations = allQuotations.filter { q ->
                    searchQuery.isBlank() ||
                        q.number.contains(searchQuery, ignoreCase = true) ||
                        q.customerName.contains(searchQuery, ignoreCase = true)
                }
            } catch (_: Exception) {
                quotations = emptyList()
            }
            isLoading = false
        }
    }

    // Detail dialog
    selectedDetail?.let { q ->
        KontafyDialog(
            title = "Quotation ${q.number}",
            onDismiss = { selectedDetail = null },
            actions = {
                KontafyButton(
                    text = "Close",
                    onClick = { selectedDetail = null },
                    variant = ButtonVariant.Outline,
                )
                if (q.status == "ACCEPTED") {
                    KontafyButton(
                        text = "Convert to Invoice",
                        onClick = {
                            selectedDetail = null
                            onConvertToInvoice(q.id)
                        },
                        variant = ButtonVariant.Secondary,
                    )
                }
            },
        ) {
            QuotationDetailRow("Customer", q.customerName)
            QuotationDetailRow("Date", q.date)
            QuotationDetailRow("Amount", formatCurrency(q.amount))
            QuotationDetailRow("Valid Until", q.validityDate ?: "-")
            QuotationDetailRow("Status", q.status)
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Quotations",
            showSearch = true,
            searchQuery = searchQuery,
            onSearchChange = { searchQuery = it },
            actions = {
                KontafyButton(
                    text = "New Quotation",
                    onClick = onCreateQuotation,
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            val columns = listOf(
                TableColumn<QuotationDto>(
                    header = "Quotation #",
                    width = 120.dp,
                    content = { q ->
                        Text(
                            q.number,
                            style = MaterialTheme.typography.bodyLarge,
                            color = KontafyColors.Navy,
                            fontWeight = FontWeight.SemiBold,
                        )
                    },
                ),
                TableColumn<QuotationDto>(
                    header = "Customer",
                    weight = 1.5f,
                    content = { q ->
                        Text(q.customerName, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink)
                    },
                ),
                TableColumn<QuotationDto>(
                    header = "Date",
                    width = 110.dp,
                    content = { q ->
                        Text(q.date, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink)
                    },
                ),
                TableColumn<QuotationDto>(
                    header = "Amount",
                    width = 120.dp,
                    content = { q ->
                        Text(
                            formatCurrency(q.amount),
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.Medium,
                        )
                    },
                ),
                TableColumn<QuotationDto>(
                    header = "Valid Until",
                    width = 110.dp,
                    content = { q ->
                        Text(
                            q.validityDate ?: "-",
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Muted,
                        )
                    },
                ),
                TableColumn<QuotationDto>(
                    header = "Status",
                    width = 100.dp,
                    content = { q ->
                        val badgeType = when (q.status) {
                            "DRAFT" -> BadgeType.Neutral
                            "SENT" -> BadgeType.Info
                            "ACCEPTED" -> BadgeType.Success
                            "REJECTED" -> BadgeType.Error
                            "EXPIRED" -> BadgeType.Warning
                            else -> BadgeType.Neutral
                        }
                        KontafyBadge(
                            text = q.status.replaceFirstChar { it.titlecase() },
                            type = badgeType,
                        )
                    },
                ),
            )

            Box(modifier = Modifier.fillMaxSize().padding(24.dp)) {
                KontafyDataTable(
                    columns = columns,
                    data = quotations,
                    onRowClick = { onQuotationClick(it.id) },
                    emptyStateTitle = "No quotations found",
                    emptyStateSubtitle = "Create your first quotation to get started",
                )
            }
        }
    }
}

@Composable
private fun QuotationDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = KontafyColors.Muted,
            modifier = Modifier.width(120.dp),
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyLarge,
            color = KontafyColors.Ink,
            fontWeight = FontWeight.Medium,
        )
    }
}
