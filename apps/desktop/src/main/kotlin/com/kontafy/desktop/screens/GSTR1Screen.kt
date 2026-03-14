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
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.InvoiceItemRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import javax.swing.JFileChooser
import javax.swing.filechooser.FileNameExtensionFilter

@Composable
fun GSTR1Screen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository = InvoiceRepository(),
    invoiceItemRepository: InvoiceItemRepository = InvoiceItemRepository(),
    contactRepository: ContactRepository = ContactRepository(),
    onBack: () -> Unit,
) {
    var data by remember { mutableStateOf(GSTR1Data()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()

    val tabs = listOf("B2B", "B2C Large", "B2C Small", "Credit/Debit Notes", "HSN Summary", "Doc Summary")

    fun buildGSTR1FromLocal(): GSTR1Data? {
        val invoices = invoiceRepository.getByOrgId(currentOrgId)
        if (invoices.isEmpty()) return null
        val b2bEntries = mutableListOf<GSTR1B2BEntry>()
        val hsnEntries = mutableMapOf<String, HSNRow>()

        invoices.filter { it.type.equals("invoice", ignoreCase = true) }.forEach { invoice ->
            val contact = invoice.contactId?.let { contactRepository.getById(it) }
            val items = invoiceItemRepository.getByInvoice(invoice.id)
            val taxableValue = invoice.subtotal.toDouble()
            val cgst = items.sumOf { it.cgstAmount.toDouble() }
            val sgst = items.sumOf { it.sgstAmount.toDouble() }
            val igst = items.sumOf { it.igstAmount.toDouble() }
            val total = invoice.totalAmount.toDouble()

            if (contact?.gstin != null && contact.gstin.isNotBlank()) {
                b2bEntries.add(GSTR1B2BEntry(
                    gstin = contact.gstin,
                    invoiceNumber = invoice.invoiceNumber,
                    invoiceDate = invoice.issueDate,
                    taxableValue = taxableValue,
                    cgst = cgst,
                    sgst = sgst,
                    igst = igst,
                    total = total,
                ))
            }

            items.forEach { item ->
                val hsn = item.hsnCode ?: ""
                if (hsn.isNotBlank()) {
                    val existing = hsnEntries[hsn]
                    hsnEntries[hsn] = HSNRow(
                        hsn = hsn,
                        description = item.description ?: "",
                        qty = (existing?.qty ?: 0.0) + item.quantity.toDouble(),
                        taxableValue = (existing?.taxableValue ?: 0.0) + (item.quantity * item.unitPrice).toDouble(),
                        taxAmount = (existing?.taxAmount ?: 0.0) + (item.cgstAmount + item.sgstAmount + item.igstAmount + item.cessAmount).toDouble(),
                    )
                }
            }
        }

        return GSTR1Data(
            period = "",
            b2b = b2bEntries,
            hsnSummary = hsnEntries.values.toList(),
        )
    }

    LaunchedEffect(Unit) {
        scope.launch {
            // Try local DB first
            val localData = buildGSTR1FromLocal()
            if (localData != null) {
                data = localData
                isLoading = false
            }
            // Then try API
            val result = apiClient.getGSTR1()
            result.fold(
                onSuccess = { data = it },
                onFailure = { },
            )
            isLoading = false
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "GSTR-1",
            actions = {
                KontafyButton(
                    text = "Export JSON",
                    onClick = {
                        val chooser = JFileChooser()
                        chooser.dialogTitle = "Save GSTR-1 JSON"
                        chooser.selectedFile = java.io.File("GSTR1_March_2026.json")
                        chooser.fileFilter = FileNameExtensionFilter("JSON Files", "json")
                        if (chooser.showSaveDialog(null) == JFileChooser.APPROVE_OPTION) {
                            val file = chooser.selectedFile
                            file.writeText("""{"gstin":"${data.b2b.firstOrNull()?.gstin ?: ""}","period":"032026","b2b":[],"b2cs":[],"status":"Generated"}""")
                        }
                    },
                    variant = ButtonVariant.Secondary,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Back",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
            },
        )

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
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

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Validation panel
                val errors = data.validationErrors
                val warnings = data.validationWarnings
                if (errors.isNotEmpty() || warnings.isNotEmpty()) {
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text("Validation", style = MaterialTheme.typography.titleSmall, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold)
                                Spacer(Modifier.height(8.dp))
                                errors.forEach { err ->
                                    Row(
                                        modifier = Modifier.padding(vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(Icons.Outlined.Error, "Error", tint = KontafyColors.StatusOverdue, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text(err.message, style = MaterialTheme.typography.bodySmall, color = KontafyColors.StatusOverdue)
                                    }
                                }
                                warnings.forEach { warn ->
                                    Row(
                                        modifier = Modifier.padding(vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Icon(Icons.Outlined.Warning, "Warning", tint = KontafyColors.Warning, modifier = Modifier.size(16.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text(warn.message, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Warning)
                                    }
                                }
                            }
                        }
                    }
                }

                when (selectedTab) {
                    0 -> { // B2B
                        item {
                            GSTR1TableCard(title = "B2B Supplies") {
                                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Text("GSTIN", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("Invoice#", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                    Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                    Text("Taxable", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                    Text("CGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                    Text("SGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                    Text("IGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                    Text("Total", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                }
                                HorizontalDivider(color = KontafyColors.BorderLight)

                                data.b2b.forEach { entry ->
                                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text(entry.gstin, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Navy, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                        Text(entry.invoiceNumber, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(90.dp))
                                        Text(entry.invoiceDate, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                        Text(formatCurrency(entry.taxableValue), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.cgst), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.sgst), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.igst), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.total), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }
                    }
                    1 -> { // B2C Large
                        item {
                            GSTR1TableCard(title = "B2C Large (Inter-state > 2.5L)") {
                                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Text("State", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("Invoice#", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                    Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                    Text("Taxable Value", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                                    Text("IGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                }
                                HorizontalDivider(color = KontafyColors.BorderLight)

                                data.b2cl.forEach { entry ->
                                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text(entry.state, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                        Text(entry.invoiceNumber, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, modifier = Modifier.width(100.dp))
                                        Text(entry.invoiceDate, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                        Text(formatCurrency(entry.taxableValue), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.igst), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }
                    }
                    2 -> { // B2C Small
                        item {
                            GSTR1TableCard(title = "B2C Small (State-wise, Rate-wise Summary)") {
                                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Text("State", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("Rate", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(60.dp))
                                    Text("Taxable Value", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                                    Text("CGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp), textAlign = TextAlign.End)
                                    Text("SGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp), textAlign = TextAlign.End)
                                    Text("IGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp), textAlign = TextAlign.End)
                                }
                                HorizontalDivider(color = KontafyColors.BorderLight)

                                data.b2cs.forEach { entry ->
                                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text(entry.state, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                        Text("${entry.rate.toInt()}%", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.Medium, modifier = Modifier.width(60.dp))
                                        Text(formatCurrency(entry.taxableValue), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.cgst), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(90.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.sgst), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(90.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.igst), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(90.dp), textAlign = TextAlign.End)
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }
                    }
                    3 -> { // Credit/Debit Notes
                        item {
                            GSTR1TableCard(title = "Credit / Debit Notes") {
                                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Text("GSTIN", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("Note#", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                                    Text("Date", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                    Text("Type", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(70.dp))
                                    Text("Taxable", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                    Text("CGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                    Text("SGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                    Text("IGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                }
                                HorizontalDivider(color = KontafyColors.BorderLight)

                                data.cdnr.forEach { entry ->
                                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text(entry.gstin, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Navy, modifier = Modifier.weight(1f))
                                        Text(entry.noteNumber, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(80.dp))
                                        Text(entry.noteDate, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted, modifier = Modifier.width(90.dp))
                                        Text(entry.noteType, style = MaterialTheme.typography.bodySmall, color = if (entry.noteType == "Credit") KontafyColors.Green else KontafyColors.StatusOverdue, fontWeight = FontWeight.Medium, modifier = Modifier.width(70.dp))
                                        Text(formatCurrency(entry.taxableValue), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.cgst), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.sgst), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(entry.igst), style = MaterialTheme.typography.bodySmall, color = KontafyColors.Ink, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }
                    }
                    4 -> { // HSN Summary
                        item {
                            GSTR1TableCard(title = "HSN Summary") {
                                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Text("HSN Code", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                    Text("Description", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("Qty", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(60.dp), textAlign = TextAlign.End)
                                    Text("Taxable Value", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(130.dp), textAlign = TextAlign.End)
                                    Text("Tax Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                                }
                                HorizontalDivider(color = KontafyColors.BorderLight)

                                data.hsnSummary.forEach { hsn ->
                                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text(hsn.hsn, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(100.dp))
                                        Text(hsn.description, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                        Text("${hsn.qty.toInt()}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(60.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(hsn.taxableValue), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(130.dp), textAlign = TextAlign.End)
                                        Text(formatCurrency(hsn.taxAmount), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                                    }
                                    HorizontalDivider(color = KontafyColors.BorderLight)
                                }
                            }
                        }
                    }
                    5 -> { // Doc Summary
                        item {
                            GSTR1TableCard(title = "Document Summary") {
                                Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                    Text("Document Type", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                    Text("From", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                    Text("To", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                    Text("Total", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(60.dp), textAlign = TextAlign.End)
                                    Text("Cancelled", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                    Text("Net Issued", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                }
                                HorizontalDivider(color = KontafyColors.BorderLight)

                                data.docSummary.forEach { doc ->
                                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text(doc.docType, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                                        Text(doc.fromSerial, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                        Text(doc.toSerial, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                        Text("${doc.totalCount}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(60.dp), textAlign = TextAlign.End)
                                        Text("${doc.cancelled}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.StatusOverdue, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                        Text("${doc.netIssued}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Green, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
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
private fun GSTR1TableCard(
    title: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(16.dp))
            content()
        }
    }
}
