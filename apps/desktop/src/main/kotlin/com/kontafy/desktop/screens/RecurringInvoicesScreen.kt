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
import com.kontafy.desktop.api.RecurringInvoiceDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun RecurringInvoicesScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository,
    contactRepository: ContactRepository,
    onCreateRecurring: () -> Unit = {},
) {
    var invoices by remember { mutableStateOf<List<RecurringInvoiceDto>>(emptyList()) }
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

    val contactNameMap = remember {
        try { contactRepository.getByOrgId(currentOrgId).associate { it.id to it.name } } catch (e: Exception) {
            e.printStackTrace()
            emptyMap()
        }
    }

    fun loadData() {
        scope.launch {
            isLoading = true
            try {
                invoices = invoiceRepository.getByOrgId(currentOrgId)
                    .filter { it.type == "recurring" }
                    .map { inv ->
                        val noteParts = (inv.notes ?: "MONTHLY|").split("|", limit = 2)
                        RecurringInvoiceDto(
                            id = inv.id,
                            customerName = contactNameMap[inv.contactId] ?: "Unknown",
                            amount = inv.totalAmount.toDouble(),
                            frequency = noteParts.getOrNull(0) ?: "MONTHLY",
                            nextDate = inv.issueDate,
                            status = inv.status,
                        )
                    }
            } catch (e: Exception) {
                e.printStackTrace()
                snackbarMessage = "Failed to load recurring invoices: ${e.message}"
                invoices = emptyList()
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { loadData() }

    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Recurring Invoices",
            actions = {
                KontafyButton(
                    text = "New Recurring",
                    onClick = onCreateRecurring,
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
                TableColumn<RecurringInvoiceDto>(
                    header = "Customer",
                    weight = 1.5f,
                    content = { inv ->
                        Text(
                            inv.customerName,
                            style = MaterialTheme.typography.bodyLarge,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.Medium,
                        )
                    },
                ),
                TableColumn<RecurringInvoiceDto>(
                    header = "Amount",
                    width = 120.dp,
                    content = { inv ->
                        Text(
                            formatCurrency(inv.amount),
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.Medium,
                        )
                    },
                ),
                TableColumn<RecurringInvoiceDto>(
                    header = "Frequency",
                    width = 110.dp,
                    content = { inv ->
                        KontafyBadge(
                            text = inv.frequency.replaceFirstChar { it.titlecase() },
                            type = BadgeType.Info,
                        )
                    },
                ),
                TableColumn<RecurringInvoiceDto>(
                    header = "Next Date",
                    width = 110.dp,
                    content = { inv ->
                        Text(inv.nextDate, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink)
                    },
                ),
                TableColumn<RecurringInvoiceDto>(
                    header = "Status",
                    width = 90.dp,
                    content = { inv ->
                        KontafyBadge(
                            text = inv.status.replaceFirstChar { it.titlecase() },
                            type = if (inv.status == "ACTIVE") BadgeType.Success else BadgeType.Warning,
                        )
                    },
                ),
                TableColumn<RecurringInvoiceDto>(
                    header = "Actions",
                    width = 120.dp,
                    content = { inv ->
                        KontafyButton(
                            text = if (inv.status == "ACTIVE") "Pause" else "Resume",
                            onClick = {
                                // Toggle status locally for demo
                                invoices = invoices.map { i ->
                                    if (i.id == inv.id) {
                                        i.copy(status = if (i.status == "ACTIVE") "PAUSED" else "ACTIVE")
                                    } else i
                                }
                            },
                            variant = if (inv.status == "ACTIVE") ButtonVariant.Outline else ButtonVariant.Secondary,
                        )
                    },
                ),
            )

            Box(modifier = Modifier.fillMaxSize().padding(24.dp)) {
                KontafyDataTable(
                    columns = columns,
                    data = invoices,
                    emptyStateTitle = "No recurring invoices",
                    emptyStateSubtitle = "Set up recurring invoices for repeat billing",
                )
            }
        }
    }
    SnackbarHost(
        hostState = snackbarHostState,
        modifier = Modifier.align(Alignment.BottomCenter),
    )
    }
}
