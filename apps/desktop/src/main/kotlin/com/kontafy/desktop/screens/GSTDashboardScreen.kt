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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.InvoiceItemRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import javax.swing.JFileChooser
import javax.swing.filechooser.FileNameExtensionFilter

@Composable
fun GSTDashboardScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository = InvoiceRepository(),
    invoiceItemRepository: InvoiceItemRepository = InvoiceItemRepository(),
    onNavigateToCompute: () -> Unit,
    onNavigateToGSTR1: () -> Unit,
    onNavigateToGSTR3B: () -> Unit,
) {
    var summary by remember { mutableStateOf(GSTSummaryDto()) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    fun buildGSTSummaryFromLocal(): GSTSummaryDto? {
        val invoices = invoiceRepository.getByOrgId(currentOrgId)
        if (invoices.isEmpty()) return null
        var outputTax = 0.0
        var inputTax = 0.0
        invoices.forEach { invoice ->
            val items = invoiceItemRepository.getByInvoice(invoice.id)
            val tax = items.sumOf { (it.cgstAmount + it.sgstAmount + it.igstAmount + it.cessAmount).toDouble() }
            if (invoice.type.equals("invoice", ignoreCase = true)) {
                outputTax += tax
            } else if (invoice.type.equals("bill", ignoreCase = true) || invoice.type.equals("purchase", ignoreCase = true)) {
                inputTax += tax
            }
        }
        return GSTSummaryDto(
            outputTax = outputTax,
            inputTax = inputTax,
            netPayable = outputTax - inputTax,
        )
    }

    LaunchedEffect(Unit) {
        scope.launch {
            // Try local DB first
            val localSummary = buildGSTSummaryFromLocal()
            if (localSummary != null) {
                summary = localSummary
                isLoading = false
            }
            // Then try API
            val result = apiClient.getGSTSummary()
            result.fold(
                onSuccess = { summary = it },
                onFailure = { },
            )
            isLoading = false
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "GST Dashboard",
            actions = {
                KontafyButton(
                    text = "Compute GST",
                    onClick = onNavigateToCompute,
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
                // Stat cards
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        StatCard(
                            title = "Output Tax",
                            value = formatCurrency(summary.outputTax),
                            icon = Icons.Outlined.TrendingUp,
                            iconBackground = Color(0xFFFEE2E2),
                            iconTint = KontafyColors.StatusOverdue,
                            modifier = Modifier.weight(1f),
                            subtitle = "CGST + SGST + IGST",
                        )
                        StatCard(
                            title = "Input Tax (ITC)",
                            value = formatCurrency(summary.inputTax),
                            icon = Icons.Outlined.TrendingDown,
                            iconBackground = Color(0xFFD1FAE5),
                            iconTint = KontafyColors.Green,
                            modifier = Modifier.weight(1f),
                            subtitle = "Available credit",
                        )
                        StatCard(
                            title = "Net GST Payable",
                            value = formatCurrency(summary.netPayable),
                            icon = Icons.Outlined.AccountBalance,
                            iconBackground = Color(0xFFDBEAFE),
                            iconTint = KontafyColors.StatusSent,
                            modifier = Modifier.weight(1f),
                            subtitle = "Output - Input",
                        )
                        StatCard(
                            title = "TDS Deducted",
                            value = formatCurrency(summary.tdsDeducted),
                            icon = Icons.Outlined.Receipt,
                            iconBackground = Color(0xFFFEF3C7),
                            iconTint = KontafyColors.Warning,
                            modifier = Modifier.weight(1f),
                            subtitle = "This period",
                        )
                    }
                }

                // Quick actions
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        GSTQuickAction(
                            title = "Compute GST",
                            icon = Icons.Outlined.Calculate,
                            color = KontafyColors.Green,
                            onClick = onNavigateToCompute,
                            modifier = Modifier.weight(1f),
                        )
                        GSTQuickAction(
                            title = "View GSTR-1",
                            icon = Icons.Outlined.Description,
                            color = KontafyColors.Navy,
                            onClick = onNavigateToGSTR1,
                            modifier = Modifier.weight(1f),
                        )
                        GSTQuickAction(
                            title = "View GSTR-3B",
                            icon = Icons.Outlined.Summarize,
                            color = KontafyColors.StatusSent,
                            onClick = onNavigateToGSTR3B,
                            modifier = Modifier.weight(1f),
                        )
                        GSTQuickAction(
                            title = "Export JSON",
                            icon = Icons.Outlined.FileDownload,
                            color = KontafyColors.StatusOverdue,
                            onClick = {
                                val chooser = JFileChooser().apply {
                                    dialogTitle = "Export GST Summary"
                                    selectedFile = java.io.File("gst-summary.json")
                                    fileFilter = FileNameExtensionFilter("JSON files", "json")
                                }
                                if (chooser.showSaveDialog(null) == JFileChooser.APPROVE_OPTION) {
                                    try {
                                        val json = buildString {
                                            appendLine("{")
                                            appendLine("""  "gstin": "${summary.gstin}",""")
                                            appendLine("""  "registrationType": "${summary.registrationType}",""")
                                            appendLine("""  "filingFrequency": "${summary.filingFrequency}",""")
                                            appendLine("""  "outputTax": ${summary.outputTax},""")
                                            appendLine("""  "inputTax": ${summary.inputTax},""")
                                            appendLine("""  "netPayable": ${summary.netPayable},""")
                                            appendLine("""  "tdsDeducted": ${summary.tdsDeducted}""")
                                            appendLine("}")
                                        }
                                        val file = chooser.selectedFile.let {
                                            if (!it.name.endsWith(".json")) java.io.File(it.absolutePath + ".json") else it
                                        }
                                        file.writeText(json)
                                        try { java.awt.Desktop.getDesktop().open(file) } catch (_: Exception) {}
                                    } catch (_: Exception) {}
                                }
                            },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                // Recent filings + GST Info side by side
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        // Recent Filings
                        Card(
                            modifier = Modifier.weight(2f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Text(
                                    "Recent Filings",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = KontafyColors.Ink,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Spacer(Modifier.height(16.dp))

                                // Table header
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                                ) {
                                    Text("Period", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("Return Type", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("Status", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("Filing Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                }
                                HorizontalDivider(color = KontafyColors.BorderLight)

                                summary.recentFilings.forEach { filing ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(filing.period, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                        Text(filing.returnType, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                        Box(modifier = Modifier.weight(1f)) {
                                            GSTFilingStatusBadge(filing.status)
                                        }
                                        Text(
                                            filing.filingDate ?: "-",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = KontafyColors.Muted,
                                            modifier = Modifier.weight(1f),
                                        )
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }

                        // GST Info Card
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Text(
                                    "GST Information",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = KontafyColors.Ink,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Spacer(Modifier.height(20.dp))

                                GSTInfoRow("GSTIN", summary.gstin.ifBlank { "-" })
                                Spacer(Modifier.height(14.dp))
                                GSTInfoRow("Registration Type", summary.registrationType)
                                Spacer(Modifier.height(14.dp))
                                GSTInfoRow("Filing Frequency", summary.filingFrequency)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GSTQuickAction(
    title: String,
    icon: ImageVector,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        onClick = onClick,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(36.dp),
                shape = RoundedCornerShape(8.dp),
                color = color.copy(alpha = 0.1f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = title, tint = color, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(Modifier.width(12.dp))
            Text(
                title,
                style = MaterialTheme.typography.titleSmall,
                color = KontafyColors.Ink,
            )
        }
    }
}

@Composable
private fun GSTFilingStatusBadge(status: String) {
    val (bgColor, textColor) = when (status.lowercase()) {
        "filed" -> KontafyColors.StatusPaidBg to KontafyColors.StatusPaid
        "pending" -> KontafyColors.StatusOverdueBg to KontafyColors.StatusOverdue
        else -> KontafyColors.StatusDraftBg to KontafyColors.StatusDraft
    }

    Surface(
        shape = RoundedCornerShape(6.dp),
        color = bgColor,
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        ) {
            Text(
                text = status,
                style = MaterialTheme.typography.labelMedium,
                color = textColor,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun GSTInfoRow(label: String, value: String) {
    Column {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = KontafyColors.Muted,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            value,
            style = MaterialTheme.typography.bodyLarge,
            color = KontafyColors.Ink,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
