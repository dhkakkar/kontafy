package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.CustomerDto
import com.kontafy.desktop.api.toCustomerDto
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.theme.KontafyColors
import com.kontafy.desktop.util.CsvExporter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun CustomerListScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    contactRepository: ContactRepository,
    invoiceRepository: InvoiceRepository,
    onCustomerClick: (String) -> Unit = {},
    onCreateCustomer: () -> Unit = {},
) {
    var customers by remember { mutableStateOf<List<CustomerDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var snackbarMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            snackbarMessage = null
        }
    }

    LaunchedEffect(searchQuery) {
        scope.launch {
            isLoading = true
            try {
                // Only count actual invoices (not quotations/POs) and calculate real outstanding
                val invoicesOnly = try {
                    invoiceRepository.getByOrgId(currentOrgId)
                        .filter { it.type.lowercase() == "invoice" }
                } catch (e: Exception) {
                    e.printStackTrace()
                    snackbarMessage = "Failed to load invoice counts: ${e.message}"
                    emptyList()
                }
                val invoiceCounts = invoicesOnly.groupBy { it.contactId }.mapValues { it.value.size }
                val outstandingByContact = invoicesOnly
                    .filter { it.status.uppercase() !in listOf("PAID", "CANCELLED") }
                    .groupBy { it.contactId }
                    .mapValues { entry -> entry.value.sumOf { it.amountDue.toDouble() } }

                val allContacts = contactRepository.getByOrgId(currentOrgId)
                    .filter { it.type in listOf("customer", "both", "CUSTOMER", "BOTH") }
                    .map {
                        it.toCustomerDto().copy(
                            totalInvoices = invoiceCounts[it.id] ?: 0,
                            outstandingAmount = outstandingByContact[it.id] ?: 0.0,
                        )
                    }

                customers = allContacts.filter { c ->
                    searchQuery.isBlank() ||
                        c.name.contains(searchQuery, ignoreCase = true) ||
                        c.email?.contains(searchQuery, ignoreCase = true) == true
                }
            } catch (e: Exception) {
                e.printStackTrace()
                snackbarMessage = "Failed to load customers: ${e.message}"
                customers = emptyList()
            }
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Customers",
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
                                    fileName = "Customers",
                                    headers = listOf("Name", "Email", "Phone", "GSTIN", "Outstanding Balance"),
                                    rows = customers.map { c ->
                                        listOf(
                                            c.name,
                                            c.email ?: "",
                                            c.phone ?: "",
                                            c.gstin ?: "",
                                            c.outstandingAmount.toString(),
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
                    text = "Add Customer",
                    onClick = onCreateCustomer,
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else if (customers.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("No customers found", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Muted)
                    Spacer(Modifier.height(8.dp))
                    Text("Add your first customer to get started", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.MutedLight)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(customers) { customer ->
                    CustomerCard(
                        customer = customer,
                        onClick = { onCustomerClick(customer.id) },
                    )
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
private fun CustomerCard(
    customer: CustomerDto,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {},
) {
    Card(
        modifier = modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(1.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Avatar
            Surface(
                modifier = Modifier.size(44.dp),
                shape = RoundedCornerShape(22.dp),
                color = KontafyColors.Navy.copy(alpha = 0.1f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        customer.name.take(2).uppercase(),
                        style = MaterialTheme.typography.titleSmall,
                        color = KontafyColors.Navy,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Spacer(Modifier.width(16.dp))

            // Info
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    customer.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(4.dp))
                Row {
                    customer.email?.let { email ->
                        Icon(Icons.Outlined.Email, "Email", tint = KontafyColors.Muted, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(email, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                        Spacer(Modifier.width(16.dp))
                    }
                    customer.phone?.let { phone ->
                        Icon(Icons.Outlined.Phone, "Phone", tint = KontafyColors.Muted, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(phone, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                    }
                }
            }

            // GSTIN
            customer.gstin?.let { gstin ->
                Column(
                    modifier = Modifier.width(180.dp),
                    horizontalAlignment = Alignment.Start,
                ) {
                    Text("GSTIN", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                    Text(gstin, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
                }
            }

            // Stats
            Column(
                modifier = Modifier.width(100.dp),
                horizontalAlignment = Alignment.End,
            ) {
                Text("${customer.totalInvoices} invoices", style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                if (customer.outstandingAmount > 0) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        formatCurrency(customer.outstandingAmount),
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.StatusOverdue,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text("outstanding", style = MaterialTheme.typography.labelSmall, color = KontafyColors.Muted)
                }
            }
        }
    }
}
