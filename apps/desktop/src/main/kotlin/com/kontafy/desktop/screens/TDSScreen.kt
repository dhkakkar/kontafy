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
import com.kontafy.desktop.db.repositories.TDSEntryRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.math.BigDecimal

@Composable
fun TDSScreen(
    apiClient: ApiClient,
    currentOrgId: String = "org-default",
    tdsEntryRepository: TDSEntryRepository = TDSEntryRepository(),
    showSnackbar: (String) -> Unit = {},
) {
    var entries by remember { mutableStateOf<List<TDSEntryDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showAddDialog by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            // Load from local DB first
            try {
                val localEntries = tdsEntryRepository.getByOrgId(currentOrgId)
                if (localEntries.isNotEmpty()) {
                    entries = localEntries.map { it.toDto() }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }

            // Try API as fallback/refresh, cache results locally
            try {
                val result = apiClient.getTDSEntries()
                result.fold(
                    onSuccess = { apiEntries ->
                        entries = apiEntries
                        // Cache to local DB
                        try {
                            apiEntries.forEach { dto ->
                                tdsEntryRepository.upsert(
                                    TDSEntryModel(
                                        id = dto.id,
                                        orgId = currentOrgId,
                                        section = dto.section,
                                        deducteeName = dto.deducteeName,
                                        pan = dto.pan,
                                        amount = BigDecimal.valueOf(dto.amount),
                                        tdsRate = BigDecimal.valueOf(dto.tdsRate),
                                        tdsAmount = BigDecimal.valueOf(dto.tdsAmount),
                                        status = dto.status,
                                        date = dto.date,
                                    )
                                )
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    },
                    onFailure = {
                        if (entries.isEmpty()) {
                            showSnackbar("Failed to load TDS entries")
                        }
                    },
                )
            } catch (e: Exception) {
                if (entries.isEmpty()) {
                    showSnackbar("Failed to load TDS entries")
                }
            }
            isLoading = false
        }
    }

    val totalDeducted = entries.sumOf { it.tdsAmount }
    val totalDeposited = entries.filter { it.status == "Deposited" }.sumOf { it.tdsAmount }
    val totalPending = entries.filter { it.status != "Deposited" }.sumOf { it.tdsAmount }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "TDS Management",
            actions = {
                KontafyButton(
                    text = "Add TDS Entry",
                    onClick = { showAddDialog = true },
                    variant = ButtonVariant.Secondary,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
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
                            title = "Total TDS Deducted",
                            value = formatCurrency(totalDeducted),
                            icon = Icons.Outlined.Receipt,
                            iconBackground = Color(0xFFDBEAFE),
                            iconTint = KontafyColors.StatusSent,
                            modifier = Modifier.weight(1f),
                            subtitle = "All entries",
                        )
                        StatCard(
                            title = "TDS Deposited",
                            value = formatCurrency(totalDeposited),
                            icon = Icons.Outlined.CheckCircle,
                            iconBackground = Color(0xFFD1FAE5),
                            iconTint = KontafyColors.Green,
                            modifier = Modifier.weight(1f),
                            subtitle = "Paid to govt",
                        )
                        StatCard(
                            title = "TDS Pending",
                            value = formatCurrency(totalPending),
                            icon = Icons.Outlined.PendingActions,
                            iconBackground = Color(0xFFFEE2E2),
                            iconTint = KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                            subtitle = "Yet to deposit",
                        )
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
                                "TDS Entries",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            // Header
                            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                Text("Section", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(70.dp))
                                Text("Deductee", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                Text("PAN", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp))
                                Text("Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                                Text("Rate", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(60.dp), textAlign = TextAlign.End)
                                Text("TDS Amt", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                Text("Status", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                            }
                            HorizontalDivider(color = KontafyColors.BorderLight)

                            entries.forEach { entry ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(entry.section, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(70.dp))
                                    Text(entry.deducteeName, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                    Text(entry.pan, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(110.dp))
                                    Text(formatCurrency(entry.amount), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                                    Text("${entry.tdsRate.toInt()}%", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(60.dp), textAlign = TextAlign.End)
                                    Text(formatCurrency(entry.tdsAmount), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                    Box(modifier = Modifier.width(100.dp)) {
                                        TDSStatusBadge(entry.status)
                                    }
                                    Text(entry.date, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                }
                                HorizontalDivider(color = KontafyColors.BorderLight)
                            }
                        }
                    }
                }
            }
        }
    }

    // Add TDS Entry Dialog
    if (showAddDialog) {
        AddTDSEntryDialog(
            onDismiss = { showAddDialog = false },
            onSave = { entry ->
                scope.launch {
                    // Save to local DB first
                    try {
                        tdsEntryRepository.create(
                            TDSEntryModel(
                                id = entry.id,
                                orgId = currentOrgId,
                                section = entry.section,
                                deducteeName = entry.deducteeName,
                                pan = entry.pan,
                                amount = BigDecimal.valueOf(entry.amount),
                                tdsRate = BigDecimal.valueOf(entry.tdsRate),
                                tdsAmount = BigDecimal.valueOf(entry.tdsAmount),
                                status = entry.status,
                                date = entry.date,
                            )
                        )
                        entries = entries + entry
                        showAddDialog = false
                    } catch (e: Exception) {
                        e.printStackTrace()
                        showSnackbar("Failed to save TDS entry: ${e.message}")
                    }

                    // Try API in background
                    try {
                        apiClient.createTDSEntry(entry)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            },
        )
    }
}

@Composable
private fun TDSStatusBadge(status: String) {
    val (bgColor, textColor) = when (status.lowercase()) {
        "deposited" -> KontafyColors.StatusPaidBg to KontafyColors.StatusPaid
        "deducted" -> KontafyColors.StatusSentBg to KontafyColors.StatusSent
        else -> KontafyColors.StatusOverdueBg to KontafyColors.StatusOverdue
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
                text = status,
                style = MaterialTheme.typography.labelSmall,
                color = textColor,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun AddTDSEntryDialog(
    onDismiss: () -> Unit,
    onSave: (TDSEntryDto) -> Unit,
) {
    var section by remember { mutableStateOf("") }
    var deducteeName by remember { mutableStateOf("") }
    var pan by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var tdsRate by remember { mutableStateOf("") }

    val sections = remember {
        listOf(
            DropdownItem("194A", "194A - Interest"),
            DropdownItem("194C", "194C - Contractors"),
            DropdownItem("194H", "194H - Commission"),
            DropdownItem("194I", "194I - Rent"),
            DropdownItem("194J", "194J - Professional Fees"),
        )
    }
    var selectedSection by remember { mutableStateOf<DropdownItem<String>?>(null) }

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = KontafyColors.SurfaceElevated,
            shadowElevation = 8.dp,
        ) {
            Column(modifier = Modifier.padding(24.dp).width(420.dp)) {
                Text(
                    "Add TDS Entry",
                    style = MaterialTheme.typography.titleLarge,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(20.dp))

                KontafyDropdown(
                    items = sections,
                    selectedItem = selectedSection,
                    onItemSelected = {
                        selectedSection = it
                        section = it.value
                    },
                    label = "Section",
                    placeholder = "Select section",
                )
                Spacer(Modifier.height(12.dp))

                KontafyTextField(
                    value = deducteeName,
                    onValueChange = { deducteeName = it },
                    label = "Deductee Name",
                    placeholder = "Enter name",
                )
                Spacer(Modifier.height(12.dp))

                KontafyTextField(
                    value = pan,
                    onValueChange = { pan = it.uppercase() },
                    label = "PAN",
                    placeholder = "ABCPD1234E",
                )
                Spacer(Modifier.height(12.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    KontafyTextField(
                        value = amount,
                        onValueChange = { amount = it },
                        label = "Amount",
                        placeholder = "0.00",
                        modifier = Modifier.weight(1f),
                    )
                    KontafyTextField(
                        value = tdsRate,
                        onValueChange = { tdsRate = it },
                        label = "TDS Rate (%)",
                        placeholder = "10",
                        modifier = Modifier.weight(1f),
                    )
                }

                Spacer(Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                ) {
                    KontafyButton(
                        text = "Cancel",
                        onClick = onDismiss,
                        variant = ButtonVariant.Outline,
                    )
                    KontafyButton(
                        text = "Save",
                        onClick = {
                            val amt = amount.toDoubleOrNull() ?: 0.0
                            val rate = tdsRate.toDoubleOrNull() ?: 0.0
                            val tdsAmt = amt * rate / 100.0
                            onSave(
                                TDSEntryDto(
                                    id = System.currentTimeMillis().toString(),
                                    section = section,
                                    deducteeName = deducteeName,
                                    pan = pan,
                                    amount = amt,
                                    tdsRate = rate,
                                    tdsAmount = tdsAmt,
                                    status = "Deducted",
                                    date = java.time.LocalDate.now().toString(),
                                ),
                            )
                        },
                        variant = ButtonVariant.Primary,
                        enabled = section.isNotBlank() && deducteeName.isNotBlank() && pan.isNotBlank() && amount.isNotBlank(),
                    )
                }
            }
        }
    }
}
