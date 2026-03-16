package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.InvoiceDto
import com.kontafy.desktop.api.toDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.theme.KontafyColors
import com.kontafy.desktop.util.CsvExporter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun InvoiceListScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository,
    contactRepository: ContactRepository,
    onInvoiceClick: (String) -> Unit,
    onCreateInvoice: () -> Unit = {},
) {
    var invoices by remember { mutableStateOf<List<InvoiceDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf<String?>(null) }
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            snackbarMessage = null
        }
    }

    // Build a contact name lookup for resolving contactId -> name
    val contactNameMap = remember {
        try {
            contactRepository.getByOrgId(currentOrgId).associate { it.id to it.name }
        } catch (e: Exception) {
            e.printStackTrace()
            emptyMap()
        }
    }

    LaunchedEffect(searchQuery, selectedFilter) {
        scope.launch {
            isLoading = true
            try {
                // Load from local SQLite database
                val allInvoices = invoiceRepository.getByOrgId(currentOrgId)
                    .filter { it.type == "invoice" }
                    .map {
                        val dto = it.toDto()
                        dto.copy(customerName = contactNameMap[it.contactId] ?: dto.customerName.ifBlank { "Unknown" })
                    }

                invoices = allInvoices.filter { inv ->
                    val matchesSearch = searchQuery.isBlank() ||
                        inv.invoiceNumber.contains(searchQuery, ignoreCase = true) ||
                        inv.customerName.contains(searchQuery, ignoreCase = true)
                    val matchesFilter = selectedFilter == null || inv.status.equals(selectedFilter, ignoreCase = true)
                    matchesSearch && matchesFilter
                }
            } catch (e: Exception) {
                e.printStackTrace()
                snackbarMessage = "Failed to load invoices: ${e.message}"
                invoices = emptyList()
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Invoices",
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
                                    fileName = "Invoices",
                                    headers = listOf("Invoice Number", "Customer", "Date", "Due Date", "Amount", "Status"),
                                    rows = invoices.map { inv ->
                                        listOf(
                                            inv.invoiceNumber,
                                            inv.customerName,
                                            inv.issueDate,
                                            inv.dueDate,
                                            inv.amount.toString(),
                                            inv.status,
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
                    text = "New Invoice",
                    onClick = onCreateInvoice,
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        // Filter chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Outlined.FilterList,
                contentDescription = "Filters",
                tint = KontafyColors.Muted,
                modifier = Modifier.size(18.dp),
            )

            FilterChipItem("All", selectedFilter == null) { selectedFilter = null }
            FilterChipItem("Draft", selectedFilter == "DRAFT") { selectedFilter = "DRAFT" }
            FilterChipItem("Sent", selectedFilter == "SENT") { selectedFilter = "SENT" }
            FilterChipItem("Paid", selectedFilter == "PAID") { selectedFilter = "PAID" }
            FilterChipItem("Overdue", selectedFilter == "OVERDUE") { selectedFilter = "OVERDUE" }
        }

        // Table header
        Surface(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
            color = KontafyColors.Surface,
            shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Invoice", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp))
                Text("Customer", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                Text("Status", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                Spacer(Modifier.width(24.dp))
                Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp))
                Text("Due Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
            }
        }

        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (invoices.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "No invoices found",
                        style = MaterialTheme.typography.titleLarge,
                        color = KontafyColors.Muted,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Try adjusting your search or filters",
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.MutedLight,
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
            ) {
                items(invoices) { invoice ->
                    InvoiceRow(
                        invoice = invoice,
                        onClick = { onInvoiceClick(invoice.id) },
                    )
                    HorizontalDivider(color = KontafyColors.BorderLight)
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
private fun FilterChipItem(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = {
            Text(
                label,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            )
        },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = KontafyColors.Navy,
            selectedLabelColor = KontafyColors.White,
            containerColor = KontafyColors.SurfaceElevated,
            labelColor = KontafyColors.Muted,
        ),
        shape = RoundedCornerShape(8.dp),
        border = FilterChipDefaults.filterChipBorder(
            borderColor = KontafyColors.Border,
            selectedBorderColor = KontafyColors.Navy,
            enabled = true,
            selected = selected,
        ),
    )
}
