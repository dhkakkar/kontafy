package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun EWayBillListScreen(
    apiClient: ApiClient,
    onEWayBillClick: (String) -> Unit,
    onGenerateEWayBill: () -> Unit,
    showSnackbar: (String) -> Unit = {},
) {
    var ewayBills by remember { mutableStateOf<List<EWayBillDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("All") }
    val scope = rememberCoroutineScope()

    val filters = listOf("All", "Active", "In Transit", "Expired", "Cancelled")

    LaunchedEffect(Unit) {
        scope.launch {
            val result = apiClient.getEWayBills()
            result.fold(
                onSuccess = { ewayBills = it.data },
                onFailure = { showSnackbar("Failed to load e-way bills") },
            )
            isLoading = false
        }
    }

    val filteredBills = remember(ewayBills, selectedFilter, searchQuery) {
        ewayBills.filter { bill ->
            val matchesFilter = when (selectedFilter) {
                "Active" -> bill.status.lowercase() == "active"
                "In Transit" -> bill.status.lowercase() == "in_transit"
                "Expired" -> bill.status.lowercase() == "expired"
                "Cancelled" -> bill.status.lowercase() == "cancelled"
                else -> true
            }
            val matchesSearch = searchQuery.isBlank() ||
                bill.invoiceNumber.contains(searchQuery, ignoreCase = true) ||
                bill.customerName.contains(searchQuery, ignoreCase = true) ||
                (bill.ewbNumber?.contains(searchQuery, ignoreCase = true) == true) ||
                (bill.vehicleNumber?.contains(searchQuery, ignoreCase = true) == true)
            matchesFilter && matchesSearch
        }
    }

    val activeBills = ewayBills.count { it.status.lowercase() == "active" || it.status.lowercase() == "in_transit" }
    val expiredBills = ewayBills.count { it.status.lowercase() == "expired" }
    val cancelledBills = ewayBills.count { it.status.lowercase() == "cancelled" }
    val totalBills = ewayBills.size

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "E-Way Bills",
            showSearch = true,
            searchQuery = searchQuery,
            onSearchChange = { searchQuery = it },
            actions = {
                KontafyButton(
                    text = "Generate E-Way Bill",
                    onClick = onGenerateEWayBill,
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        if (isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                // Summary cards
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        StatCard(
                            title = "Total Generated",
                            value = "$totalBills",
                            icon = Icons.Outlined.LocalShipping,
                            iconBackground = Color(0xFFDBEAFE),
                            iconTint = KontafyColors.StatusSent,
                            modifier = Modifier.weight(1f),
                            subtitle = "All e-way bills",
                        )
                        StatCard(
                            title = "Active",
                            value = "$activeBills",
                            icon = Icons.Outlined.CheckCircle,
                            iconBackground = Color(0xFFD1FAE5),
                            iconTint = KontafyColors.Green,
                            modifier = Modifier.weight(1f),
                            subtitle = "Currently valid",
                        )
                        StatCard(
                            title = "Expired",
                            value = "$expiredBills",
                            icon = Icons.Outlined.Schedule,
                            iconBackground = Color(0xFFFEF3C7),
                            iconTint = KontafyColors.Warning,
                            modifier = Modifier.weight(1f),
                            subtitle = "Validity ended",
                        )
                        StatCard(
                            title = "Cancelled",
                            value = "$cancelledBills",
                            icon = Icons.Outlined.Cancel,
                            iconBackground = Color(0xFFFEE2E2),
                            iconTint = KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                            subtitle = "Cancelled bills",
                        )
                    }
                }

                // Filter chips
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        filters.forEach { filter ->
                            val isSelected = selectedFilter == filter
                            FilterChip(
                                selected = isSelected,
                                onClick = { selectedFilter = filter },
                                label = {
                                    Text(
                                        filter,
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                    )
                                },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = KontafyColors.Navy,
                                    selectedLabelColor = KontafyColors.White,
                                    containerColor = KontafyColors.SurfaceElevated,
                                    labelColor = KontafyColors.Muted,
                                ),
                                border = FilterChipDefaults.filterChipBorder(
                                    borderColor = KontafyColors.Border,
                                    selectedBorderColor = KontafyColors.Navy,
                                    enabled = true,
                                    selected = isSelected,
                                ),
                                shape = RoundedCornerShape(8.dp),
                            )
                        }
                    }
                }

                // Table
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "E-Way Bills",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            // Table header
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                            ) {
                                Text("EWB Number", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp))
                                Text("Invoice#", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                Text("From \u2192 To", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                Text("Mode", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(70.dp))
                                Text("Vehicle", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp))
                                Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                Text("Valid Until", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                Text("Status", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                            }
                            HorizontalDivider(color = KontafyColors.BorderLight)

                            if (filteredBills.isEmpty()) {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(40.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        "No e-way bills found",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = KontafyColors.Muted,
                                    )
                                }
                            } else {
                                filteredBills.forEach { bill ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(4.dp))
                                            .clickable { onEWayBillClick(bill.id) }
                                            .padding(vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column(modifier = Modifier.width(140.dp)) {
                                            Text(
                                                bill.ewbNumber ?: "-",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = KontafyColors.Navy,
                                                fontWeight = FontWeight.Medium,
                                            )
                                            if (bill.ewbNumber == null && bill.invoiceAmount > 50000) {
                                                Spacer(Modifier.height(2.dp))
                                                KontafyBadge(
                                                    text = "Required",
                                                    type = BadgeType.Warning,
                                                )
                                            }
                                        }
                                        Text(bill.invoiceNumber, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(90.dp))
                                        Text(
                                            "${bill.fromState} \u2192 ${bill.toState}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = KontafyColors.Ink,
                                            modifier = Modifier.weight(1f),
                                        )
                                        Text(
                                            bill.transportMode.replaceFirstChar { it.titlecase() },
                                            style = MaterialTheme.typography.bodySmall,
                                            color = KontafyColors.Muted,
                                            modifier = Modifier.width(70.dp),
                                        )
                                        Text(
                                            bill.vehicleNumber ?: "-",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = KontafyColors.Ink,
                                            modifier = Modifier.width(110.dp),
                                        )
                                        Text(
                                            formatCurrency(bill.invoiceAmount),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = KontafyColors.Ink,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.width(100.dp),
                                            textAlign = TextAlign.End,
                                        )
                                        Text(
                                            bill.validUntil ?: "-",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = KontafyColors.Muted,
                                            modifier = Modifier.width(90.dp),
                                        )
                                        Box(modifier = Modifier.width(100.dp)) {
                                            EWayBillStatusBadge(bill.status)
                                        }
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EWayBillStatusBadge(status: String) {
    val badgeType = when (status.lowercase()) {
        "active" -> BadgeType.Success
        "in_transit" -> BadgeType.Info
        "expired" -> BadgeType.Warning
        "cancelled" -> BadgeType.Error
        else -> BadgeType.Neutral
    }
    val label = when (status.lowercase()) {
        "in_transit" -> "In Transit"
        else -> status.replaceFirstChar { it.titlecase() }
    }
    KontafyBadge(text = label, type = badgeType)
}
