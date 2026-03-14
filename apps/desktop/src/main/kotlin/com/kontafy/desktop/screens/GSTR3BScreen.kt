package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
fun GSTR3BScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    invoiceRepository: InvoiceRepository = InvoiceRepository(),
    invoiceItemRepository: InvoiceItemRepository = InvoiceItemRepository(),
    onBack: () -> Unit,
) {
    var data by remember { mutableStateOf(GSTR3BData()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedMonth by remember { mutableStateOf<DropdownItem<Int>?>(null) }
    var selectedYear by remember { mutableStateOf<DropdownItem<Int>?>(null) }
    var filingStatus by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    val months = remember {
        (1..12).map { DropdownItem(it, java.time.Month.of(it).name.lowercase().replaceFirstChar { c -> c.uppercase() }) }
    }
    val years = remember {
        (2024..2027).map { DropdownItem(it, it.toString()) }
    }

    fun buildGSTR3BFromLocal(): GSTR3BData? {
        val invoices = invoiceRepository.getByOrgId(currentOrgId)
        if (invoices.isEmpty()) return null
        var totalOutputCgst = 0.0
        var totalOutputSgst = 0.0
        var totalOutputIgst = 0.0
        var totalInputCgst = 0.0
        var totalInputSgst = 0.0
        var totalInputIgst = 0.0
        var taxableOutward = 0.0

        invoices.forEach { invoice ->
            val items = invoiceItemRepository.getByInvoice(invoice.id)
            val cgst = items.sumOf { it.cgstAmount.toDouble() }
            val sgst = items.sumOf { it.sgstAmount.toDouble() }
            val igst = items.sumOf { it.igstAmount.toDouble() }
            if (invoice.type.equals("invoice", ignoreCase = true)) {
                totalOutputCgst += cgst
                totalOutputSgst += sgst
                totalOutputIgst += igst
                taxableOutward += invoice.subtotal.toDouble()
            } else {
                totalInputCgst += cgst
                totalInputSgst += sgst
                totalInputIgst += igst
            }
        }

        val totalItc = totalInputCgst + totalInputSgst + totalInputIgst
        val cgstCash = maxOf(0.0, totalOutputCgst - totalInputCgst)
        val sgstCash = maxOf(0.0, totalOutputSgst - totalInputSgst)
        val igstCash = maxOf(0.0, totalOutputIgst - totalInputIgst)

        return GSTR3BData(
            period = "${selectedMonth?.label ?: ""} ${selectedYear?.value ?: ""}".trim(),
            table31 = GSTR3BTable31(taxableOutward = taxableOutward),
            table4 = GSTR3BTable4(allOther = totalItc, totalItc = totalItc),
            table6 = GSTR3BTable6(
                igstTax = totalOutputIgst, igstItc = totalInputIgst, igstCash = igstCash,
                cgstTax = totalOutputCgst, cgstItc = totalInputCgst, cgstCash = cgstCash,
                sgstTax = totalOutputSgst, sgstItc = totalInputSgst, sgstCash = sgstCash,
            ),
            totalTaxPayable = cgstCash + sgstCash + igstCash,
            status = "Draft",
        )
    }

    fun loadData() {
        scope.launch {
            isLoading = true
            // Try local DB first
            val localData = buildGSTR3BFromLocal()
            if (localData != null) {
                data = localData
                isLoading = false
            }
            // Then try API
            val result = apiClient.getGSTR3B(
                month = selectedMonth?.value,
                year = selectedYear?.value,
            )
            result.fold(
                onSuccess = { data = it },
                onFailure = {
                    data = GSTR3BData(
                        period = "${selectedMonth?.label ?: "March"} ${selectedYear?.value ?: 2026}",
                        table31 = GSTR3BTable31(
                            taxableOutward = 1145000.0,
                            interState = 530000.0,
                            intraState = 615000.0,
                            zeroRated = 50000.0,
                            nilRated = 25000.0,
                            exempt = 15000.0,
                        ),
                        table4 = GSTR3BTable4(
                            imports = 18000.0,
                            reverseCharge = 5400.0,
                            isd = 0.0,
                            allOther = 75400.0,
                            totalItc = 98800.0,
                        ),
                        table5 = GSTR3BTable5(
                            interStateExempt = 12000.0,
                            intraStateExempt = 8000.0,
                            interStateNil = 15000.0,
                            intraStateNil = 10000.0,
                        ),
                        table6 = GSTR3BTable6(
                            igstTax = 77400.0,
                            igstItc = 45000.0,
                            igstCash = 32400.0,
                            cgstTax = 50550.0,
                            cgstItc = 28000.0,
                            cgstCash = 22550.0,
                            sgstTax = 50550.0,
                            sgstItc = 25800.0,
                            sgstCash = 24750.0,
                            cessTax = 500.0,
                            cessItc = 0.0,
                            cessCash = 500.0,
                        ),
                        totalTaxPayable = 80200.0,
                        status = "Draft",
                    )
                },
            )
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { loadData() }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "GSTR-3B",
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
                                text = "Load",
                                onClick = { loadData() },
                                variant = ButtonVariant.Primary,
                            )
                            Spacer(Modifier.weight(1f))
                            GSTR3BStatusBadge(data.status)
                        }
                    }
                }

                // Table 3.1 - Outward Supplies
                item {
                    GSTR3BTableCard(title = "3.1 - Details of Outward Supplies") {
                        GSTR3BRow("(a) Outward taxable supplies (other than zero rated, nil and exempted)", formatCurrency(data.table31.taxableOutward))
                        GSTR3BRow("     Inter-State supplies", formatCurrency(data.table31.interState))
                        GSTR3BRow("     Intra-State supplies", formatCurrency(data.table31.intraState))
                        GSTR3BRow("(b) Outward taxable supplies (zero rated)", formatCurrency(data.table31.zeroRated))
                        GSTR3BRow("(c) Other outward supplies (nil rated, exempted)", formatCurrency(data.table31.nilRated))
                        GSTR3BRow("(d) Exempt supplies", formatCurrency(data.table31.exempt))
                    }
                }

                // Table 4 - Eligible ITC
                item {
                    GSTR3BTableCard(title = "4 - Eligible ITC") {
                        GSTR3BRow("(A) ITC Available - Import of goods", formatCurrency(data.table4.imports))
                        GSTR3BRow("(B) ITC Available - Import of services (Reverse charge)", formatCurrency(data.table4.reverseCharge))
                        GSTR3BRow("(C) ITC Available - Inward supplies from ISD", formatCurrency(data.table4.isd))
                        GSTR3BRow("(D) ITC Available - All other ITC", formatCurrency(data.table4.allOther))
                        HorizontalDivider(color = KontafyColors.Border, modifier = Modifier.padding(vertical = 4.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        ) {
                            Text("Total ITC Available", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text(formatCurrency(data.table4.totalItc), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.Bold, modifier = Modifier.width(140.dp), textAlign = TextAlign.End)
                        }
                    }
                }

                // Table 5 - Exempt / Nil-rated
                item {
                    GSTR3BTableCard(title = "5 - Exempt, Nil-Rated Inward Supplies") {
                        GSTR3BRow("Inter-State - Exempt", formatCurrency(data.table5.interStateExempt))
                        GSTR3BRow("Intra-State - Exempt", formatCurrency(data.table5.intraStateExempt))
                        GSTR3BRow("Inter-State - Nil Rated", formatCurrency(data.table5.interStateNil))
                        GSTR3BRow("Intra-State - Nil Rated", formatCurrency(data.table5.intraStateNil))
                    }
                }

                // Table 6 - Payment of Tax
                item {
                    GSTR3BTableCard(title = "6 - Payment of Tax") {
                        // Header
                        Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
                            Text("Description", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
                            Text("Tax Payable", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                            Text("ITC Utilized", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                            Text("Cash Payable", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
                        }
                        HorizontalDivider(color = KontafyColors.BorderLight)

                        PaymentTaxRow("IGST", data.table6.igstTax, data.table6.igstItc, data.table6.igstCash)
                        PaymentTaxRow("CGST", data.table6.cgstTax, data.table6.cgstItc, data.table6.cgstCash)
                        PaymentTaxRow("SGST/UTGST", data.table6.sgstTax, data.table6.sgstItc, data.table6.sgstCash)
                        PaymentTaxRow("Cess", data.table6.cessTax, data.table6.cessItc, data.table6.cessCash)

                        HorizontalDivider(color = KontafyColors.Border, modifier = Modifier.padding(vertical = 4.dp))
                        Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                            Text("Total", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text(
                                formatCurrency(data.table6.igstTax + data.table6.cgstTax + data.table6.sgstTax + data.table6.cessTax),
                                style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Bold, modifier = Modifier.width(120.dp), textAlign = TextAlign.End,
                            )
                            Text(
                                formatCurrency(data.table6.igstItc + data.table6.cgstItc + data.table6.sgstItc + data.table6.cessItc),
                                style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Bold, modifier = Modifier.width(120.dp), textAlign = TextAlign.End,
                            )
                            Text(
                                formatCurrency(data.table6.igstCash + data.table6.cgstCash + data.table6.sgstCash + data.table6.cessCash),
                                style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.Bold, modifier = Modifier.width(120.dp), textAlign = TextAlign.End,
                            )
                        }
                    }
                }

                // Total Tax Payable summary
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.Navy),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(24.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Total Tax Payable (Cash)",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.White,
                            )
                            Text(
                                formatCurrency(data.totalTaxPayable),
                                style = MaterialTheme.typography.headlineSmall,
                                color = Color(0xFF90EE90),
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }

                // Action buttons
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.End),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        if (filingStatus.isNotEmpty()) {
                            Text(
                                text = filingStatus,
                                style = MaterialTheme.typography.bodyMedium,
                                color = KontafyColors.StatusPaid,
                            )
                            Spacer(Modifier.weight(1f))
                        }
                        KontafyButton(
                            text = "Save Draft",
                            onClick = { filingStatus = "Draft saved" },
                            variant = ButtonVariant.Outline,
                        )
                        KontafyButton(
                            text = "Mark as Filed",
                            onClick = { filingStatus = "Marked as filed" },
                            variant = ButtonVariant.Secondary,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GSTR3BTableCard(
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

@Composable
private fun GSTR3BRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(140.dp), textAlign = TextAlign.End)
    }
    HorizontalDivider(color = KontafyColors.BorderLight)
}

@Composable
private fun PaymentTaxRow(label: String, tax: Double, itc: Double, cash: Double) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
        Text(formatCurrency(tax), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
        Text(formatCurrency(itc), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Green, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
        Text(formatCurrency(cash), style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Navy, fontWeight = FontWeight.SemiBold, modifier = Modifier.width(120.dp), textAlign = TextAlign.End)
    }
    HorizontalDivider(color = KontafyColors.BorderLight)
}

@Composable
private fun GSTR3BStatusBadge(status: String) {
    val (bgColor, textColor) = when (status.lowercase()) {
        "filed" -> KontafyColors.StatusPaidBg to KontafyColors.StatusPaid
        "draft" -> KontafyColors.StatusDraftBg to KontafyColors.StatusDraft
        else -> KontafyColors.StatusSentBg to KontafyColors.StatusSent
    }
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = bgColor,
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
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
