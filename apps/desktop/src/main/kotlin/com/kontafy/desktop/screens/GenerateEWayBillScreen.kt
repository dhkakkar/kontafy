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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.InvoiceRepository
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun GenerateEWayBillScreen(
    apiClient: ApiClient,
    invoiceRepository: InvoiceRepository = InvoiceRepository(),
    contactRepository: ContactRepository = ContactRepository(),
    onBack: () -> Unit,
    onGenerated: (String) -> Unit,
) {
    var isLoading by remember { mutableStateOf(false) }
    var isLoadingInvoices by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    // Invoice selection
    var invoiceItems by remember { mutableStateOf<List<DropdownItem<InvoiceDto>>>(emptyList()) }
    var selectedInvoice by remember { mutableStateOf<DropdownItem<InvoiceDto>?>(null) }

    // Supply details
    val supplyTypes = listOf(
        DropdownItem("outward", "Outward"),
        DropdownItem("inward", "Inward"),
    )
    var selectedSupplyType by remember { mutableStateOf(supplyTypes[0]) }

    val subTypes = listOf(
        DropdownItem("supply", "Supply"),
        DropdownItem("export", "Export"),
        DropdownItem("job_work", "Job Work"),
        DropdownItem("skd_ckd", "SKD/CKD"),
        DropdownItem("recipient_not_known", "Recipient Not Known"),
    )
    var selectedSubType by remember { mutableStateOf(subTypes[0]) }

    val documentTypes = listOf(
        DropdownItem("tax_invoice", "Tax Invoice"),
        DropdownItem("bill_of_supply", "Bill of Supply"),
        DropdownItem("delivery_challan", "Delivery Challan"),
        DropdownItem("credit_note", "Credit Note"),
    )
    var selectedDocType by remember { mutableStateOf(documentTypes[0]) }

    // Transport details
    var transporterName by remember { mutableStateOf("") }
    var transporterId by remember { mutableStateOf("") }
    var selectedTransportMode by remember { mutableStateOf("road") }
    val transportModes = listOf("road", "rail", "air", "ship")

    // Vehicle details
    var vehicleNumber by remember { mutableStateOf("") }
    var vehicleNumberError by remember { mutableStateOf<String?>(null) }
    val vehicleTypes = listOf(
        DropdownItem("regular", "Regular"),
        DropdownItem("odc", "Over Dimensional Cargo"),
    )
    var selectedVehicleType by remember { mutableStateOf(vehicleTypes[0]) }

    // Distance
    var distanceText by remember { mutableStateOf("") }
    val distance = distanceText.toIntOrNull() ?: 0

    // Address fields
    var fromAddress by remember { mutableStateOf("") }
    var fromState by remember { mutableStateOf("") }
    var fromPincode by remember { mutableStateOf("") }
    var toAddress by remember { mutableStateOf("") }
    var toState by remember { mutableStateOf("") }
    var toPincode by remember { mutableStateOf("") }

    // Transporter ID validation
    var transporterIdError by remember { mutableStateOf<String?>(null) }

    // Load invoices
    LaunchedEffect(Unit) {
        scope.launch {
            // Try local DB first
            val localInvoices = invoiceRepository.getAll()
            if (localInvoices.isNotEmpty()) {
                val eligible = localInvoices
                    .filter { it.totalAmount.toDouble() > 50000 }
                    .map { inv ->
                        val contact = inv.contactId?.let { contactRepository.getById(it) }
                        val dto = inv.toDto().copy(customerName = contact?.name ?: "")
                        DropdownItem(
                            value = dto,
                            label = "${dto.invoiceNumber} - ${dto.customerName}",
                            subtitle = "${formatCurrency(dto.amount)} | ${dto.issueDate}",
                        )
                    }
                if (eligible.isNotEmpty()) {
                    invoiceItems = eligible
                    isLoadingInvoices = false
                }
            }
            // Then try API
            val result = apiClient.getInvoices(pageSize = 100)
            val invoices = result.getOrNull()
                ?.filter { it.amount > 50000 }
                ?: emptyList()

            if (invoices.isNotEmpty()) {
                invoiceItems = invoices.map { inv ->
                    DropdownItem(
                        value = inv,
                        label = "${inv.invoiceNumber} - ${inv.customerName}",
                        subtitle = "${formatCurrency(inv.amount)} | ${inv.issueDate}",
                    )
                }
            }
            isLoadingInvoices = false
        }
    }

    // Auto-fill addresses when invoice is selected
    LaunchedEffect(selectedInvoice) {
        selectedInvoice?.value?.let { inv ->
            toState = inv.placeOfSupply ?: ""
        }
    }

    fun calculateValidity(distanceKm: Int): Int {
        return when {
            distanceKm <= 0 -> 0
            distanceKm <= 200 -> 1
            distanceKm <= 400 -> 3
            distanceKm <= 600 -> 5
            distanceKm <= 800 -> 7
            distanceKm <= 1000 -> 9
            else -> 9 + ((distanceKm - 1000 + 199) / 200) * 2
        }
    }

    fun validateVehicleNumber(number: String): Boolean {
        if (number.isBlank()) return true
        val pattern = Regex("^[A-Z]{2}-?\\d{1,2}-?[A-Z]{1,3}-?\\d{1,4}$", RegexOption.IGNORE_CASE)
        return pattern.matches(number.replace(" ", ""))
    }

    fun validateTransporterId(id: String): Boolean {
        if (id.isBlank()) return true
        val gstinPattern = Regex("^\\d{2}[A-Z]{5}\\d{4}[A-Z]{1}[A-Z\\d]{1}[Z]{1}[A-Z\\d]{1}$")
        val transporterIdPattern = Regex("^TRANS[A-Z\\d]{11}$")
        return gstinPattern.matches(id) || transporterIdPattern.matches(id) || id.length == 15
    }

    fun handleGenerate() {
        val inv = selectedInvoice?.value ?: return

        // Validate vehicle number for road mode
        if (selectedTransportMode == "road" && vehicleNumber.isNotBlank() && !validateVehicleNumber(vehicleNumber)) {
            vehicleNumberError = "Invalid vehicle number format (e.g., KA-01-AB-1234)"
            return
        }
        vehicleNumberError = null

        // Validate transporter ID
        if (transporterId.isNotBlank() && !validateTransporterId(transporterId)) {
            transporterIdError = "Invalid Transporter ID / GSTIN format"
            return
        }
        transporterIdError = null

        isLoading = true
        scope.launch {
            val request = GenerateEWayBillRequest(
                invoiceId = inv.id,
                supplyType = selectedSupplyType.value,
                subType = selectedSubType.value,
                documentType = selectedDocType.value,
                transporterName = transporterName.ifBlank { null },
                transporterId = transporterId.ifBlank { null },
                transportMode = selectedTransportMode,
                vehicleNumber = vehicleNumber.ifBlank { null },
                vehicleType = if (selectedTransportMode == "road") selectedVehicleType.value else null,
                distance = distance,
                fromAddress = fromAddress,
                fromState = fromState,
                fromPincode = fromPincode,
                toAddress = toAddress,
                toState = toState,
                toPincode = toPincode,
            )
            val result = apiClient.generateEWayBill(request)
            result.fold(
                onSuccess = { onGenerated(it.id) },
                onFailure = { },
            )
            isLoading = false
        }
    }

    val validityDays = calculateValidity(distance)

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Generate E-Way Bill",
            actions = {
                KontafyButton(
                    text = "Back",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
            },
        )

        if (isLoadingInvoices) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KontafyColors.Navy)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                // Invoice Selector
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "Select Invoice",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                "Only goods invoices above \u20B950,000 are eligible for E-Way Bill",
                                style = MaterialTheme.typography.bodySmall,
                                color = KontafyColors.Muted,
                            )
                            Spacer(Modifier.height(12.dp))

                            KontafyDropdown(
                                items = invoiceItems,
                                selectedItem = selectedInvoice,
                                onItemSelected = { selectedInvoice = it },
                                label = "Invoice",
                                placeholder = "Search and select an invoice...",
                                searchable = true,
                            )

                            // Invoice summary card
                            selectedInvoice?.value?.let { inv ->
                                Spacer(Modifier.height(16.dp))
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = KontafyColors.Navy.copy(alpha = 0.05f),
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                    ) {
                                        Column {
                                            Text("Invoice#", style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                                            Text(inv.invoiceNumber, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Navy, fontWeight = FontWeight.SemiBold)
                                        }
                                        Column {
                                            Text("Customer", style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                                            Text(inv.customerName, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
                                        }
                                        Column {
                                            Text("Amount", style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                                            Text(formatCurrency(inv.amount), style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold)
                                        }
                                        Column {
                                            Text("Date", style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                                            Text(inv.issueDate, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Muted)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Supply Details
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "Supply Details",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                            ) {
                                KontafyDropdown(
                                    items = supplyTypes,
                                    selectedItem = selectedSupplyType,
                                    onItemSelected = { selectedSupplyType = it },
                                    label = "Supply Type",
                                    modifier = Modifier.weight(1f),
                                )
                                KontafyDropdown(
                                    items = subTypes,
                                    selectedItem = selectedSubType,
                                    onItemSelected = { selectedSubType = it },
                                    label = "Sub Type",
                                    modifier = Modifier.weight(1f),
                                )
                                KontafyDropdown(
                                    items = documentTypes,
                                    selectedItem = selectedDocType,
                                    onItemSelected = { selectedDocType = it },
                                    label = "Document Type",
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }

                // Transporter Details
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "Transporter Details",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                            ) {
                                KontafyTextField(
                                    value = transporterName,
                                    onValueChange = { transporterName = it },
                                    label = "Transporter Name",
                                    placeholder = "Enter transporter name",
                                    modifier = Modifier.weight(1f),
                                )
                                KontafyTextField(
                                    value = transporterId,
                                    onValueChange = {
                                        transporterId = it.uppercase()
                                        transporterIdError = null
                                    },
                                    label = "Transporter ID / GSTIN",
                                    placeholder = "e.g., 29ABCDE1234F1Z5",
                                    modifier = Modifier.weight(1f),
                                    isError = transporterIdError != null,
                                    errorMessage = transporterIdError,
                                )
                            }

                            Spacer(Modifier.height(16.dp))

                            Text(
                                "Transport Mode",
                                style = MaterialTheme.typography.labelLarge,
                                color = KontafyColors.Ink,
                                modifier = Modifier.padding(bottom = 8.dp),
                            )
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(24.dp),
                            ) {
                                transportModes.forEach { mode ->
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.clickable { selectedTransportMode = mode },
                                    ) {
                                        RadioButton(
                                            selected = selectedTransportMode == mode,
                                            onClick = { selectedTransportMode = mode },
                                            colors = RadioButtonDefaults.colors(
                                                selectedColor = KontafyColors.Navy,
                                                unselectedColor = KontafyColors.Muted,
                                            ),
                                        )
                                        Spacer(Modifier.width(4.dp))
                                        Text(
                                            mode.replaceFirstChar { it.titlecase() },
                                            style = MaterialTheme.typography.bodyLarge,
                                            color = KontafyColors.Ink,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Vehicle Details (shown for Road mode)
                if (selectedTransportMode == "road") {
                    item {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Text(
                                    "Vehicle Details",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = KontafyColors.Ink,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Spacer(Modifier.height(16.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                                ) {
                                    KontafyTextField(
                                        value = vehicleNumber,
                                        onValueChange = {
                                            vehicleNumber = it.uppercase()
                                            vehicleNumberError = null
                                        },
                                        label = "Vehicle Number",
                                        placeholder = "e.g., KA-01-AB-1234",
                                        modifier = Modifier.weight(1f),
                                        isError = vehicleNumberError != null,
                                        errorMessage = vehicleNumberError,
                                    )
                                    KontafyDropdown(
                                        items = vehicleTypes,
                                        selectedItem = selectedVehicleType,
                                        onItemSelected = { selectedVehicleType = it },
                                        label = "Vehicle Type",
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            }
                        }
                    }
                }

                // Distance
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "Distance",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                                verticalAlignment = Alignment.Bottom,
                            ) {
                                KontafyTextField(
                                    value = distanceText,
                                    onValueChange = { newValue ->
                                        if (newValue.all { it.isDigit() }) {
                                            distanceText = newValue
                                        }
                                    },
                                    label = "Approximate Distance (KM)",
                                    placeholder = "Enter distance in km",
                                    modifier = Modifier.weight(1f),
                                    keyboardType = KeyboardType.Number,
                                )

                                if (distance > 0) {
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = KontafyColors.StatusSentBg,
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(16.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Icon(
                                                Icons.Outlined.Schedule,
                                                contentDescription = "Validity",
                                                tint = KontafyColors.StatusSent,
                                                modifier = Modifier.size(20.dp),
                                            )
                                            Spacer(Modifier.width(8.dp))
                                            Column {
                                                Text(
                                                    "Valid for $validityDays day${if (validityDays != 1) "s" else ""}",
                                                    style = MaterialTheme.typography.bodyLarge,
                                                    color = KontafyColors.StatusSent,
                                                    fontWeight = FontWeight.SemiBold,
                                                )
                                                Text(
                                                    "Based on $distance km distance",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = KontafyColors.Muted,
                                                )
                                            }
                                        }
                                    }
                                } else {
                                    Spacer(Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }

                // From / To Address
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "From / To Address",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(24.dp),
                            ) {
                                // From
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        "FROM (Dispatch)",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = KontafyColors.Green,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(bottom = 12.dp),
                                    )
                                    KontafyTextField(
                                        value = fromAddress,
                                        onValueChange = { fromAddress = it },
                                        label = "Address",
                                        placeholder = "Enter dispatch address",
                                    )
                                    Spacer(Modifier.height(12.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        KontafyTextField(
                                            value = fromState,
                                            onValueChange = { fromState = it },
                                            label = "State",
                                            placeholder = "State",
                                            modifier = Modifier.weight(1f),
                                        )
                                        KontafyTextField(
                                            value = fromPincode,
                                            onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) fromPincode = it },
                                            label = "Pincode",
                                            placeholder = "Pincode",
                                            modifier = Modifier.weight(1f),
                                            keyboardType = KeyboardType.Number,
                                        )
                                    }
                                }

                                // Arrow separator
                                Box(
                                    modifier = Modifier.padding(top = 40.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        Icons.Outlined.ArrowForward,
                                        contentDescription = "To",
                                        tint = KontafyColors.Muted,
                                        modifier = Modifier.size(24.dp),
                                    )
                                }

                                // To
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        "TO (Delivery)",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = KontafyColors.StatusSent,
                                        fontWeight = FontWeight.SemiBold,
                                        modifier = Modifier.padding(bottom = 12.dp),
                                    )
                                    KontafyTextField(
                                        value = toAddress,
                                        onValueChange = { toAddress = it },
                                        label = "Address",
                                        placeholder = "Enter delivery address",
                                    )
                                    Spacer(Modifier.height(12.dp))
                                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        KontafyTextField(
                                            value = toState,
                                            onValueChange = { toState = it },
                                            label = "State",
                                            placeholder = "State",
                                            modifier = Modifier.weight(1f),
                                        )
                                        KontafyTextField(
                                            value = toPincode,
                                            onValueChange = { if (it.length <= 6 && it.all { c -> c.isDigit() }) toPincode = it },
                                            label = "Pincode",
                                            placeholder = "Pincode",
                                            modifier = Modifier.weight(1f),
                                            keyboardType = KeyboardType.Number,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Actions
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.End),
                    ) {
                        KontafyButton(
                            text = "Cancel",
                            onClick = onBack,
                            variant = ButtonVariant.Outline,
                        )
                        KontafyButton(
                            text = "Generate E-Way Bill",
                            onClick = { handleGenerate() },
                            variant = ButtonVariant.Primary,
                            isLoading = isLoading,
                            enabled = selectedInvoice != null && distance > 0,
                        )
                    }
                }

                // Bottom spacer
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}
