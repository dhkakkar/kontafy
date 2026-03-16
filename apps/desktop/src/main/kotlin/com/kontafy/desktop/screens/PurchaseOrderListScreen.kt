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
import com.kontafy.desktop.api.PurchaseOrderDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun PurchaseOrderListScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository,
    contactRepository: ContactRepository,
    onConvertToBill: (String) -> Unit,
    onCreatePurchaseOrder: () -> Unit = {},
    onPurchaseOrderClick: (String) -> Unit = {},
) {
    var orders by remember { mutableStateOf<List<PurchaseOrderDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedDetail by remember { mutableStateOf<PurchaseOrderDto?>(null) }
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

    LaunchedEffect(searchQuery) {
        scope.launch {
            isLoading = true
            try {
                val allPOs = invoiceRepository.getByOrgId(currentOrgId)
                    .filter { it.type == "purchase_order" }
                    .map { inv ->
                        PurchaseOrderDto(
                            id = inv.id,
                            number = inv.invoiceNumber,
                            vendorName = contactNameMap[inv.contactId] ?: "Unknown",
                            date = inv.issueDate,
                            amount = inv.totalAmount.toDouble(),
                            deliveryDate = inv.dueDate,
                            status = inv.status,
                        )
                    }

                orders = allPOs.filter { po ->
                    searchQuery.isBlank() ||
                        po.number.contains(searchQuery, ignoreCase = true) ||
                        po.vendorName.contains(searchQuery, ignoreCase = true)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                snackbarMessage = "Failed to load purchase orders: ${e.message}"
                orders = emptyList()
            }
            isLoading = false
        }
    }

    // Detail dialog
    selectedDetail?.let { po ->
        KontafyDialog(
            title = "Purchase Order ${po.number}",
            onDismiss = { selectedDetail = null },
            actions = {
                KontafyButton(
                    text = "Close",
                    onClick = { selectedDetail = null },
                    variant = ButtonVariant.Outline,
                )
                if (po.status == "RECEIVED") {
                    KontafyButton(
                        text = "Convert to Bill",
                        onClick = {
                            selectedDetail = null
                            onConvertToBill(po.id)
                        },
                        variant = ButtonVariant.Secondary,
                    )
                }
            },
        ) {
            PODetailRow("Vendor", po.vendorName)
            PODetailRow("Date", po.date)
            PODetailRow("Amount", formatCurrency(po.amount))
            PODetailRow("Delivery Date", po.deliveryDate ?: "-")
            PODetailRow("Status", po.status)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Purchase Orders",
            showSearch = true,
            searchQuery = searchQuery,
            onSearchChange = { searchQuery = it },
            actions = {
                KontafyButton(
                    text = "New PO",
                    onClick = onCreatePurchaseOrder,
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
                TableColumn<PurchaseOrderDto>(
                    header = "PO #",
                    width = 100.dp,
                    content = { po ->
                        Text(
                            po.number,
                            style = MaterialTheme.typography.bodyLarge,
                            color = KontafyColors.Navy,
                            fontWeight = FontWeight.SemiBold,
                        )
                    },
                ),
                TableColumn<PurchaseOrderDto>(
                    header = "Vendor",
                    weight = 1.5f,
                    content = { po ->
                        Text(po.vendorName, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink)
                    },
                ),
                TableColumn<PurchaseOrderDto>(
                    header = "Date",
                    width = 110.dp,
                    content = { po ->
                        Text(po.date, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink)
                    },
                ),
                TableColumn<PurchaseOrderDto>(
                    header = "Amount",
                    width = 120.dp,
                    content = { po ->
                        Text(
                            formatCurrency(po.amount),
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Ink,
                            fontWeight = FontWeight.Medium,
                        )
                    },
                ),
                TableColumn<PurchaseOrderDto>(
                    header = "Delivery",
                    width = 110.dp,
                    content = { po ->
                        Text(
                            po.deliveryDate ?: "-",
                            style = MaterialTheme.typography.bodyMedium,
                            color = KontafyColors.Muted,
                        )
                    },
                ),
                TableColumn<PurchaseOrderDto>(
                    header = "Status",
                    width = 100.dp,
                    content = { po ->
                        val badgeType = when (po.status) {
                            "DRAFT" -> BadgeType.Neutral
                            "SENT" -> BadgeType.Info
                            "APPROVED" -> BadgeType.Success
                            "RECEIVED" -> BadgeType.Success
                            "CANCELLED" -> BadgeType.Error
                            else -> BadgeType.Neutral
                        }
                        KontafyBadge(
                            text = po.status.replaceFirstChar { it.titlecase() },
                            type = badgeType,
                        )
                    },
                ),
            )

            Box(modifier = Modifier.fillMaxSize().padding(24.dp)) {
                KontafyDataTable(
                    columns = columns,
                    data = orders,
                    onRowClick = { onPurchaseOrderClick(it.id) },
                    emptyStateTitle = "No purchase orders found",
                    emptyStateSubtitle = "Create your first purchase order to get started",
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

@Composable
private fun PODetailRow(label: String, value: String) {
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
