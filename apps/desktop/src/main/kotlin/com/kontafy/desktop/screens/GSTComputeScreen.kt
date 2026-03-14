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
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun GSTComputeScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository = InvoiceRepository(),
    invoiceItemRepository: InvoiceItemRepository = InvoiceItemRepository(),
    onBack: () -> Unit,
) {
    var computeData by remember { mutableStateOf(GSTComputeDto()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedMonth by remember { mutableStateOf<DropdownItem<Int>?>(null) }
    var selectedYear by remember { mutableStateOf<DropdownItem<Int>?>(null) }
    val scope = rememberCoroutineScope()

    val months = remember {
        (1..12).map { DropdownItem(it, java.time.Month.of(it).name.lowercase().replaceFirstChar { c -> c.uppercase() }) }
    }
    val years = remember {
        (2024..2027).map { DropdownItem(it, it.toString()) }
    }

    fun buildGSTComputeFromLocal(): GSTComputeDto? {
        val invoices = invoiceRepository.getByOrgId(currentOrgId)
        if (invoices.isEmpty()) return null
        var totalOutputTax = 0.0
        var totalInputTax = 0.0
        val outputByRate = mutableMapOf<Double, RateWiseTax>()
        val hsnSummary = mutableMapOf<String, HSNRow>()

        invoices.forEach { invoice ->
            val items = invoiceItemRepository.getByInvoice(invoice.id)
            items.forEach { item ->
                val rate = item.taxRate.toDouble()
                val taxableValue = (item.quantity * item.unitPrice).toDouble()
                val cgst = item.cgstAmount.toDouble()
                val sgst = item.sgstAmount.toDouble()
                val igst = item.igstAmount.toDouble()
                val cess = item.cessAmount.toDouble()
                val totalTax = cgst + sgst + igst + cess

                if (invoice.type.equals("invoice", ignoreCase = true)) {
                    totalOutputTax += totalTax
                    val existing = outputByRate[rate]
                    outputByRate[rate] = RateWiseTax(
                        rate = rate,
                        taxableValue = (existing?.taxableValue ?: 0.0) + taxableValue,
                        cgst = (existing?.cgst ?: 0.0) + cgst,
                        sgst = (existing?.sgst ?: 0.0) + sgst,
                        igst = (existing?.igst ?: 0.0) + igst,
                        cess = (existing?.cess ?: 0.0) + cess,
                    )
                } else {
                    totalInputTax += totalTax
                }

                val hsn = item.hsnCode ?: ""
                if (hsn.isNotBlank()) {
                    val existingHsn = hsnSummary[hsn]
                    hsnSummary[hsn] = HSNRow(
                        hsn = hsn,
                        description = item.description ?: "",
                        qty = (existingHsn?.qty ?: 0.0) + item.quantity.toDouble(),
                        taxableValue = (existingHsn?.taxableValue ?: 0.0) + taxableValue,
                        taxAmount = (existingHsn?.taxAmount ?: 0.0) + totalTax,
                    )
                }
            }
        }

        return GSTComputeDto(
            period = "${selectedMonth?.label ?: ""} ${selectedYear?.value ?: ""}".trim(),
            outputByRate = outputByRate.values.toList(),
            inputByRate = emptyList(),
            hsnSummary = hsnSummary.values.toList(),
            totalOutputTax = totalOutputTax,
            totalInputTax = totalInputTax,
            netPayable = totalOutputTax - totalInputTax,
        )
    }

    fun loadData() {
        scope.launch {
            isLoading = true
            // Try local DB first
            val localData = buildGSTComputeFromLocal()
            if (localData != null) {
                computeData = localData
                isLoading = false
            }
            // Then try API
            val result = apiClient.getGSTCompute(
                month = selectedMonth?.value,
                year = selectedYear?.value,
            )
            result.fold(
                onSuccess = { computeData = it },
                onFailure = { },
            )
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { loadData() }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "GST Computation",
            actions = {
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
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                // Period selector
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(20.dp),
                            verticalAlignment = Alignment.Bottom,
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            KontafyDropdown(
                                items = months,
                                selectedItem = selectedMonth,
                                onItemSelected = { selectedMonth = it },
                                label = "Month",
                                placeholder = "Select month",
                                modifier = Modifier.width(200.dp),
                            )
                            KontafyDropdown(
                                items = years,
                                selectedItem = selectedYear,
                                onItemSelected = { selectedYear = it },
                                label = "Year",
                                placeholder = "Select year",
                                modifier = Modifier.width(140.dp),
                            )
                            KontafyButton(
                                text = "Compute",
                                onClick = { loadData() },
                                variant = ButtonVariant.Primary,
                            )
                        }
                    }
                }

                // Output Tax Table
                item {
                    GSTRateTable(
                        title = "Output Tax (Sales)",
                        rates = computeData.outputByRate,
                        totalLabel = "Total Output Tax",
                    )
                }

                // Input Tax Table
                item {
                    GSTRateTable(
                        title = "Input Tax (Purchases / ITC)",
                        rates = computeData.inputByRate,
                        totalLabel = "Total Input Tax (ITC)",
                    )
                }

                // Summary
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.Navy),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(24.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                        ) {
                            SummaryItem("Total Output Tax", formatCurrency(computeData.totalOutputTax), KontafyColors.White)
                            SummaryItem("Total ITC", formatCurrency(computeData.totalInputTax), KontafyColors.White)
                            SummaryItem(
                                if (computeData.netPayable >= 0) "Net Payable" else "Net Refundable",
                                formatCurrency(kotlin.math.abs(computeData.netPayable)),
                                Color(0xFF90EE90),
                            )
                        }
                    }
                }

                // HSN Summary
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "HSN Summary",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            // Header
                            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                                Text("HSN Code", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
                                Text("Description", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                                Text("Qty", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                Text("Taxable Value", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp), textAlign = TextAlign.End)
                                Text("Tax Amount", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                            }
                            HorizontalDivider(color = KontafyColors.BorderLight)

                            computeData.hsnSummary.forEach { hsn ->
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(hsn.hsn, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(100.dp))
                                    Text(hsn.description, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
                                    Text("${hsn.qty.toInt()}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(80.dp), textAlign = TextAlign.End)
                                    Text(formatCurrency(hsn.taxableValue), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(140.dp), textAlign = TextAlign.End)
                                    Text(formatCurrency(hsn.taxAmount), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
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

@Composable
private fun GSTRateTable(
    title: String,
    rates: List<RateWiseTax>,
    totalLabel: String,
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

            // Header
            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                Text("Rate", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(80.dp))
                Text("Taxable Value", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                Text("CGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                Text("SGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                Text("IGST", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                Text("Cess", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp), textAlign = TextAlign.End)
            }
            HorizontalDivider(color = KontafyColors.BorderLight)

            rates.forEach { rate ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("${rate.rate.toInt()}%", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(80.dp))
                    Text(formatCurrency(rate.taxableValue), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f), textAlign = TextAlign.End)
                    Text(formatCurrency(rate.cgst), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                    Text(formatCurrency(rate.sgst), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                    Text(formatCurrency(rate.igst), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(110.dp), textAlign = TextAlign.End)
                    Text(formatCurrency(rate.cess), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted, modifier = Modifier.width(90.dp), textAlign = TextAlign.End)
                }
                HorizontalDivider(color = KontafyColors.BorderLight)
            }

            // Total row
            val totalTax = rates.sumOf { it.cgst + it.sgst + it.igst + it.cess }
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(totalLabel, style = MaterialTheme.typography.titleSmall, color = KontafyColors.Ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                Text(
                    formatCurrency(totalTax),
                    style = MaterialTheme.typography.titleSmall,
                    color = KontafyColors.Navy,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.width(110.dp),
                    textAlign = TextAlign.End,
                )
            }
        }
    }
}

@Composable
private fun SummaryItem(label: String, value: String, valueColor: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.White.copy(alpha = 0.7f))
        Spacer(Modifier.height(4.dp))
        Text(value, style = MaterialTheme.typography.headlineSmall, color = valueColor, fontWeight = FontWeight.Bold)
    }
}
