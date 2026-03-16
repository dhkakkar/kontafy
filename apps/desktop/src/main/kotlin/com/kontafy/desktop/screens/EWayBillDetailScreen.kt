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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

@Composable
fun EWayBillDetailScreen(
    ewayBillId: String,
    apiClient: ApiClient,
    onBack: () -> Unit,
    showSnackbar: (String) -> Unit = {},
) {
    var bill by remember { mutableStateOf<EWayBillDto?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()
    val clipboardManager = LocalClipboardManager.current

    // Dialog states
    var showExtendDialog by remember { mutableStateOf(false) }
    var showUpdateVehicleDialog by remember { mutableStateOf(false) }
    var showCancelDialog by remember { mutableStateOf(false) }
    var isActionLoading by remember { mutableStateOf(false) }

    LaunchedEffect(ewayBillId) {
        scope.launch {
            val result = apiClient.getEWayBill(ewayBillId)
            result.fold(
                onSuccess = { bill = it },
                onFailure = { showSnackbar("Failed to load e-way bill details") },
            )
            isLoading = false
        }
    }

    fun calculateDaysRemaining(validUntil: String?): Long? {
        if (validUntil == null) return null
        return try {
            val endDate = LocalDate.parse(validUntil, DateTimeFormatter.ISO_LOCAL_DATE)
            ChronoUnit.DAYS.between(LocalDate.now(), endDate)
        } catch (e: Exception) {
            null
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "E-Way Bill Detail",
            actions = {
                bill?.let { currentBill ->
                    if (currentBill.ewbNumber != null) {
                        Text(
                            currentBill.ewbNumber,
                            style = MaterialTheme.typography.titleMedium,
                            color = KontafyColors.Navy,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Spacer(Modifier.width(12.dp))
                    }
                    EWayBillStatusBadge(currentBill.status)
                    Spacer(Modifier.width(12.dp))
                }
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
        } else if (bill == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    "E-Way Bill not found",
                    style = MaterialTheme.typography.bodyLarge,
                    color = KontafyColors.Muted,
                )
            }
        } else {
            val currentBill = bill!!
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                // E-Way Bill Info Card
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "E-Way Bill Information",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                // EWB Number (large, copyable)
                                Column {
                                    Text("EWB Number", style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
                                    Spacer(Modifier.height(4.dp))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            currentBill.ewbNumber ?: "Not Generated",
                                            style = MaterialTheme.typography.headlineMedium,
                                            color = KontafyColors.Navy,
                                            fontWeight = FontWeight.Bold,
                                        )
                                        if (currentBill.ewbNumber != null) {
                                            Spacer(Modifier.width(8.dp))
                                            IconButton(
                                                onClick = {
                                                    clipboardManager.setText(AnnotatedString(currentBill.ewbNumber))
                                                },
                                                modifier = Modifier.size(28.dp),
                                            ) {
                                                Icon(
                                                    Icons.Outlined.ContentCopy,
                                                    contentDescription = "Copy",
                                                    tint = KontafyColors.Muted,
                                                    modifier = Modifier.size(16.dp),
                                                )
                                            }
                                        }
                                    }
                                }

                                // Validity countdown
                                val daysRemaining = calculateDaysRemaining(currentBill.validUntil)
                                if (daysRemaining != null) {
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = when {
                                            currentBill.status.lowercase() == "cancelled" -> KontafyColors.StatusOverdueBg
                                            daysRemaining > 0 -> KontafyColors.StatusPaidBg
                                            daysRemaining == 0L -> Color(0xFFFEF3C7)
                                            else -> KontafyColors.StatusOverdueBg
                                        },
                                    ) {
                                        Column(
                                            modifier = Modifier.padding(16.dp),
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                        ) {
                                            val countdownText = when {
                                                currentBill.status.lowercase() == "cancelled" -> "Cancelled"
                                                daysRemaining > 0 -> "$daysRemaining day${if (daysRemaining != 1L) "s" else ""} remaining"
                                                daysRemaining == 0L -> "Expires today"
                                                else -> "Expired ${-daysRemaining} day${if (-daysRemaining != 1L) "s" else ""} ago"
                                            }
                                            val countdownColor = when {
                                                currentBill.status.lowercase() == "cancelled" -> KontafyColors.StatusOverdue
                                                daysRemaining > 0 -> KontafyColors.Green
                                                daysRemaining == 0L -> KontafyColors.Warning
                                                else -> KontafyColors.StatusOverdue
                                            }
                                            Icon(
                                                Icons.Outlined.Schedule,
                                                contentDescription = "Validity",
                                                tint = countdownColor,
                                                modifier = Modifier.size(24.dp),
                                            )
                                            Spacer(Modifier.height(4.dp))
                                            Text(
                                                countdownText,
                                                style = MaterialTheme.typography.titleSmall,
                                                color = countdownColor,
                                                fontWeight = FontWeight.SemiBold,
                                            )
                                        }
                                    }
                                }
                            }

                            Spacer(Modifier.height(20.dp))
                            HorizontalDivider(color = KontafyColors.BorderLight)
                            Spacer(Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(32.dp),
                            ) {
                                DetailInfoItem("Generated Date", currentBill.createdAt)
                                DetailInfoItem("Valid From", currentBill.validFrom ?: "-")
                                DetailInfoItem("Valid Until", currentBill.validUntil ?: "-")
                                DetailInfoItem("Supply Type", currentBill.supplyType.replaceFirstChar { it.titlecase() })
                                DetailInfoItem("Sub Type", currentBill.subType.replace("_", " ").replaceFirstChar { it.titlecase() })
                                DetailInfoItem("Document Type", currentBill.documentType.replace("_", " ").replaceFirstChar { it.titlecase() })
                            }
                        }
                    }
                }

                // Invoice and Transport side by side
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        // Invoice Card
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Outlined.Receipt, contentDescription = null, tint = KontafyColors.Navy, modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text("Invoice Details", style = MaterialTheme.typography.titleMedium, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold)
                                }
                                Spacer(Modifier.height(16.dp))
                                DetailInfoItem("Invoice Number", currentBill.invoiceNumber)
                                Spacer(Modifier.height(12.dp))
                                DetailInfoItem("Customer", currentBill.customerName)
                                Spacer(Modifier.height(12.dp))
                                DetailInfoItem("Amount", formatCurrency(currentBill.invoiceAmount))
                                Spacer(Modifier.height(12.dp))
                                DetailInfoItem("Date", currentBill.createdAt)
                            }
                        }

                        // Transport Card
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Outlined.LocalShipping, contentDescription = null, tint = KontafyColors.Navy, modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text("Transport Details", style = MaterialTheme.typography.titleMedium, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold)
                                }
                                Spacer(Modifier.height(16.dp))
                                DetailInfoItem("Transport Mode", currentBill.transportMode.replaceFirstChar { it.titlecase() })
                                Spacer(Modifier.height(12.dp))
                                DetailInfoItem("Vehicle Number", currentBill.vehicleNumber ?: "-")
                                Spacer(Modifier.height(12.dp))
                                DetailInfoItem("Transporter Name", currentBill.transporterName ?: "-")
                                Spacer(Modifier.height(12.dp))
                                DetailInfoItem("Transporter ID", currentBill.transporterId ?: "-")
                                Spacer(Modifier.height(12.dp))
                                DetailInfoItem("Distance", "${currentBill.distance} km")
                            }
                        }
                    }
                }

                // Route Card
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Outlined.Route, contentDescription = null, tint = KontafyColors.Navy, modifier = Modifier.size(20.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Route", style = MaterialTheme.typography.titleMedium, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold)
                            }
                            Spacer(Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(24.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                // From
                                Surface(
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(8.dp),
                                    color = KontafyColors.Green.copy(alpha = 0.06f),
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text("FROM", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Green, fontWeight = FontWeight.SemiBold)
                                        Spacer(Modifier.height(8.dp))
                                        Text(currentBill.fromAddress, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
                                        Spacer(Modifier.height(4.dp))
                                        Text("${currentBill.fromState} - ${currentBill.fromPincode}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                                    }
                                }

                                // Arrow
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Icon(Icons.Outlined.ArrowForward, contentDescription = "To", tint = KontafyColors.Muted, modifier = Modifier.size(28.dp))
                                    Spacer(Modifier.height(4.dp))
                                    Text("${currentBill.distance} km", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, fontWeight = FontWeight.SemiBold)
                                }

                                // To
                                Surface(
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(8.dp),
                                    color = KontafyColors.StatusSent.copy(alpha = 0.06f),
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text("TO", style = MaterialTheme.typography.labelMedium, color = KontafyColors.StatusSent, fontWeight = FontWeight.SemiBold)
                                        Spacer(Modifier.height(8.dp))
                                        Text(currentBill.toAddress, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
                                        Spacer(Modifier.height(4.dp))
                                        Text("${currentBill.toState} - ${currentBill.toPincode}", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                                    }
                                }
                            }
                        }
                    }
                }

                // Actions
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "Actions",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                val isActive = currentBill.status.lowercase() == "active" || currentBill.status.lowercase() == "in_transit"

                                KontafyButton(
                                    text = "Extend Validity",
                                    onClick = { showExtendDialog = true },
                                    variant = ButtonVariant.Secondary,
                                    enabled = isActive,
                                )
                                KontafyButton(
                                    text = "Update Vehicle",
                                    onClick = { showUpdateVehicleDialog = true },
                                    variant = ButtonVariant.Primary,
                                    enabled = isActive,
                                )
                                KontafyButton(
                                    text = "Cancel E-Way Bill",
                                    onClick = { showCancelDialog = true },
                                    variant = ButtonVariant.Outline,
                                    enabled = isActive,
                                )
                                KontafyButton(
                                    text = "Print",
                                    onClick = {
                                        val b = bill ?: return@KontafyButton
                                        try {
                                            val content = buildString {
                                                appendLine("=" .repeat(60))
                                                appendLine("                    E-WAY BILL")
                                                appendLine("=".repeat(60))
                                                appendLine()
                                                appendLine("EWB Number:      ${b.ewbNumber ?: "Pending"}")
                                                appendLine("Invoice:         ${b.invoiceNumber}")
                                                appendLine("Customer:        ${b.customerName}")
                                                appendLine("Amount:          ${b.invoiceAmount}")
                                                appendLine("Status:          ${b.status.uppercase()}")
                                                appendLine()
                                                appendLine("Supply Type:     ${b.supplyType}")
                                                appendLine("Transport Mode:  ${b.transportMode}")
                                                b.vehicleNumber?.let { appendLine("Vehicle:         $it") }
                                                b.transporterName?.let { appendLine("Transporter:     $it") }
                                                appendLine("Distance:        ${b.distance} km")
                                                appendLine()
                                                appendLine("From: ${b.fromAddress}, ${b.fromState} - ${b.fromPincode}")
                                                appendLine("To:   ${b.toAddress}, ${b.toState} - ${b.toPincode}")
                                                appendLine()
                                                b.validFrom?.let { appendLine("Valid From:      $it") }
                                                b.validUntil?.let { appendLine("Valid Until:     $it") }
                                                appendLine("=".repeat(60))
                                            }
                                            val tempFile = java.io.File.createTempFile("eway-bill-${b.ewbNumber ?: b.id}", ".txt")
                                            tempFile.writeText(content)
                                            java.awt.Desktop.getDesktop().open(tempFile)
                                        } catch (e: Exception) {
                                            e.printStackTrace()
                                        }
                                    },
                                    variant = ButtonVariant.Ghost,
                                )
                            }
                        }
                    }
                }

                // Timeline
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "Timeline",
                                style = MaterialTheme.typography.titleMedium,
                                color = KontafyColors.Ink,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Spacer(Modifier.height(16.dp))

                            TimelineItem(
                                title = "E-Way Bill Generated",
                                subtitle = currentBill.createdAt,
                                icon = Icons.Outlined.CheckCircle,
                                color = KontafyColors.Green,
                                isFirst = true,
                            )

                            if (currentBill.status.lowercase() == "in_transit" || currentBill.status.lowercase() == "active") {
                                TimelineItem(
                                    title = "In Transit",
                                    subtitle = "Vehicle: ${currentBill.vehicleNumber ?: "Not assigned"}",
                                    icon = Icons.Outlined.LocalShipping,
                                    color = KontafyColors.StatusSent,
                                )
                            }

                            when (currentBill.status.lowercase()) {
                                "cancelled" -> TimelineItem(
                                    title = "Cancelled",
                                    subtitle = currentBill.cancelReason ?: "No reason provided",
                                    icon = Icons.Outlined.Cancel,
                                    color = KontafyColors.StatusOverdue,
                                    isLast = true,
                                )
                                "expired" -> TimelineItem(
                                    title = "Expired",
                                    subtitle = "Validity ended on ${currentBill.validUntil ?: "-"}",
                                    icon = Icons.Outlined.Schedule,
                                    color = KontafyColors.Warning,
                                    isLast = true,
                                )
                                else -> TimelineItem(
                                    title = "Awaiting Delivery",
                                    subtitle = "Valid until ${currentBill.validUntil ?: "-"}",
                                    icon = Icons.Outlined.Inventory,
                                    color = KontafyColors.Muted,
                                    isLast = true,
                                )
                            }
                        }
                    }
                }

                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    // Extend Validity Dialog
    if (showExtendDialog) {
        ExtendValidityDialog(
            onDismiss = { showExtendDialog = false },
            onConfirm = { reason, days ->
                isActionLoading = true
                scope.launch {
                    val result = apiClient.extendEWayBill(ewayBillId, ExtendEWayBillRequest(reason, days))
                    result.fold(
                        onSuccess = { bill = it },
                        onFailure = { showSnackbar("Failed to extend e-way bill validity") },
                    )
                    isActionLoading = false
                    showExtendDialog = false
                }
            },
            isLoading = isActionLoading,
        )
    }

    // Update Vehicle Dialog
    if (showUpdateVehicleDialog) {
        UpdateVehicleDialog(
            currentVehicle = bill?.vehicleNumber ?: "",
            onDismiss = { showUpdateVehicleDialog = false },
            onConfirm = { newVehicle, reason ->
                isActionLoading = true
                scope.launch {
                    val result = apiClient.updateEWayBillVehicle(ewayBillId, UpdateVehicleRequest(newVehicle, reason))
                    result.fold(
                        onSuccess = { bill = it },
                        onFailure = { showSnackbar("Failed to update vehicle details") },
                    )
                    isActionLoading = false
                    showUpdateVehicleDialog = false
                }
            },
            isLoading = isActionLoading,
        )
    }

    // Cancel Dialog
    if (showCancelDialog) {
        CancelEWayBillDialog(
            onDismiss = { showCancelDialog = false },
            onConfirm = { reason ->
                isActionLoading = true
                scope.launch {
                    val result = apiClient.cancelEWayBill(ewayBillId, CancelEWayBillRequest(reason))
                    result.fold(
                        onSuccess = { bill = it },
                        onFailure = { showSnackbar("Failed to cancel e-way bill") },
                    )
                    isActionLoading = false
                    showCancelDialog = false
                }
            },
            isLoading = isActionLoading,
        )
    }
}

@Composable
private fun DetailInfoItem(label: String, value: String) {
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

@Composable
private fun TimelineItem(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    color: Color,
    isFirst: Boolean = false,
    isLast: Boolean = false,
) {
    Row(
        modifier = Modifier.padding(vertical = 4.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(40.dp),
        ) {
            if (!isFirst) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(8.dp)
                        .background(KontafyColors.BorderLight),
                )
            }
            Surface(
                modifier = Modifier.size(28.dp),
                shape = RoundedCornerShape(14.dp),
                color = color.copy(alpha = 0.15f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = title, tint = color, modifier = Modifier.size(16.dp))
                }
            }
            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(16.dp)
                        .background(KontafyColors.BorderLight),
                )
            }
        }

        Spacer(Modifier.width(12.dp))

        Column(modifier = Modifier.padding(top = if (!isFirst) 8.dp else 0.dp)) {
            Text(title, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = KontafyColors.Muted)
        }
    }
}

@Composable
private fun ExtendValidityDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, Int) -> Unit,
    isLoading: Boolean,
) {
    val reasons = listOf(
        DropdownItem("natural_calamity", "Natural Calamity"),
        DropdownItem("law_order", "Law and Order Situation"),
        DropdownItem("transshipment", "Transshipment"),
        DropdownItem("accident", "Accident"),
        DropdownItem("other", "Other"),
    )
    var selectedReason by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var additionalDaysText by remember { mutableStateOf("1") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Extend Validity", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                KontafyDropdown(
                    items = reasons,
                    selectedItem = selectedReason,
                    onItemSelected = { selectedReason = it },
                    label = "Reason for Extension",
                    placeholder = "Select reason...",
                )
                KontafyTextField(
                    value = additionalDaysText,
                    onValueChange = { if (it.all { c -> c.isDigit() } && it.length <= 2) additionalDaysText = it },
                    label = "Additional Days",
                    placeholder = "Enter number of days",
                    keyboardType = KeyboardType.Number,
                )
            }
        },
        confirmButton = {
            KontafyButton(
                text = "Extend",
                onClick = {
                    val days = additionalDaysText.toIntOrNull() ?: 1
                    onConfirm(selectedReason?.value ?: "other", days)
                },
                variant = ButtonVariant.Primary,
                isLoading = isLoading,
                enabled = selectedReason != null && (additionalDaysText.toIntOrNull() ?: 0) > 0,
            )
        },
        dismissButton = {
            KontafyButton(
                text = "Cancel",
                onClick = onDismiss,
                variant = ButtonVariant.Outline,
            )
        },
        containerColor = KontafyColors.SurfaceElevated,
        shape = RoundedCornerShape(16.dp),
    )
}

@Composable
private fun UpdateVehicleDialog(
    currentVehicle: String,
    onDismiss: () -> Unit,
    onConfirm: (String, String?) -> Unit,
    isLoading: Boolean,
) {
    var newVehicle by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var vehicleError by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Update Vehicle (Part-B)", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                if (currentVehicle.isNotBlank()) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = KontafyColors.Surface,
                    ) {
                        Row(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                            Text("Current Vehicle: ", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
                            Text(currentVehicle, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                KontafyTextField(
                    value = newVehicle,
                    onValueChange = {
                        newVehicle = it.uppercase()
                        vehicleError = null
                    },
                    label = "New Vehicle Number",
                    placeholder = "e.g., KA-01-AB-1234",
                    isError = vehicleError != null,
                    errorMessage = vehicleError,
                )
                KontafyTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = "Reason (optional)",
                    placeholder = "Enter reason for vehicle change",
                )
            }
        },
        confirmButton = {
            KontafyButton(
                text = "Update Vehicle",
                onClick = {
                    if (newVehicle.isBlank()) {
                        vehicleError = "Vehicle number is required"
                        return@KontafyButton
                    }
                    onConfirm(newVehicle, reason.ifBlank { null })
                },
                variant = ButtonVariant.Primary,
                isLoading = isLoading,
                enabled = newVehicle.isNotBlank(),
            )
        },
        dismissButton = {
            KontafyButton(
                text = "Cancel",
                onClick = onDismiss,
                variant = ButtonVariant.Outline,
            )
        },
        containerColor = KontafyColors.SurfaceElevated,
        shape = RoundedCornerShape(16.dp),
    )
}

@Composable
private fun CancelEWayBillDialog(
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
    isLoading: Boolean,
) {
    val reasons = listOf(
        DropdownItem("duplicate", "Duplicate"),
        DropdownItem("order_cancelled", "Order Cancelled"),
        DropdownItem("data_entry_mistake", "Data Entry Mistake"),
        DropdownItem("other", "Other"),
    )
    var selectedReason by remember { mutableStateOf<DropdownItem<String>?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("Cancel E-Way Bill", style = MaterialTheme.typography.titleLarge, color = KontafyColors.StatusOverdue)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = KontafyColors.StatusOverdueBg,
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Outlined.Warning, contentDescription = "Warning", tint = KontafyColors.StatusOverdue, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "This action cannot be undone. The E-Way Bill will be permanently cancelled.",
                            style = MaterialTheme.typography.bodySmall,
                            color = KontafyColors.StatusOverdue,
                        )
                    }
                }

                KontafyDropdown(
                    items = reasons,
                    selectedItem = selectedReason,
                    onItemSelected = { selectedReason = it },
                    label = "Reason for Cancellation",
                    placeholder = "Select reason...",
                )
            }
        },
        confirmButton = {
            KontafyButton(
                text = "Cancel E-Way Bill",
                onClick = {
                    onConfirm(selectedReason?.value ?: "other")
                },
                variant = ButtonVariant.Primary,
                isLoading = isLoading,
                enabled = selectedReason != null,
            )
        },
        dismissButton = {
            KontafyButton(
                text = "Go Back",
                onClick = onDismiss,
                variant = ButtonVariant.Outline,
            )
        },
        containerColor = KontafyColors.SurfaceElevated,
        shape = RoundedCornerShape(16.dp),
    )
}
