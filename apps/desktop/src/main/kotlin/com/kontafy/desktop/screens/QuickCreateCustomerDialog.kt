package com.kontafy.desktop.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.kontafy.desktop.components.*
import com.kontafy.desktop.theme.KontafyColors
import java.util.UUID

data class QuickCustomerResult(
    val id: String,
    val name: String,
    val type: String,
    val email: String?,
    val phone: String?,
    val gstin: String?,
)

@Composable
fun QuickCreateCustomerDialog(
    onDismiss: () -> Unit,
    onCreated: (QuickCustomerResult) -> Unit,
    defaultType: String = "CUSTOMER",
) {
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf(defaultType) }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var pan by remember { mutableStateOf("") }
    var billingStreet by remember { mutableStateOf("") }
    var billingCity by remember { mutableStateOf("") }
    var billingState by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var billingPincode by remember { mutableStateOf("") }
    var showValidation by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }

    val isNameValid = name.isNotBlank()

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.width(550.dp).heightIn(max = 650.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
            elevation = CardDefaults.cardElevation(8.dp),
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Quick Create ${if (type == "VENDOR") "Vendor" else "Customer"}",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        color = KontafyColors.Ink,
                    )
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = KontafyColors.Muted)
                    }
                }

                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = KontafyColors.Border)
                Spacer(Modifier.height(16.dp))

                Column(
                    modifier = Modifier.fillMaxWidth().weight(1f, fill = false).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    // Type selector
                    Text("Type", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        listOf("CUSTOMER", "VENDOR", "BOTH").forEach { t ->
                            FilterChip(
                                selected = type == t,
                                onClick = { type = t },
                                label = { Text(t.replaceFirstChar { it.titlecase() }) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = KontafyColors.Navy,
                                    selectedLabelColor = KontafyColors.White,
                                ),
                            )
                        }
                    }

                    // Name
                    KontafyTextField(
                        value = name, onValueChange = { name = it },
                        label = "Name *", placeholder = "Business or contact name",
                        isError = showValidation && !isNameValid,
                        errorMessage = if (showValidation && !isNameValid) "Name is required" else null,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    // Contact
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KontafyTextField(
                            value = email, onValueChange = { email = it },
                            label = "Email", placeholder = "email@example.com",
                            modifier = Modifier.weight(1f),
                        )
                        KontafyTextField(
                            value = phone, onValueChange = { phone = it },
                            label = "Phone", placeholder = "+91 ...",
                            modifier = Modifier.weight(1f),
                        )
                    }

                    // Tax info
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KontafyTextField(
                            value = gstin, onValueChange = { gstin = it },
                            label = "GSTIN", placeholder = "22AAAAA0000A1Z5",
                            modifier = Modifier.weight(1f),
                        )
                        KontafyTextField(
                            value = pan, onValueChange = { pan = it },
                            label = "PAN", placeholder = "AAAAA0000A",
                            modifier = Modifier.weight(1f),
                        )
                    }

                    // Address
                    Text("Billing Address", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted)
                    KontafyTextField(
                        value = billingStreet, onValueChange = { billingStreet = it },
                        label = "Street", placeholder = "Street address",
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        KontafyTextField(
                            value = billingCity, onValueChange = { billingCity = it },
                            label = "City", modifier = Modifier.weight(1f),
                        )
                        KontafyDropdown(
                            items = indianStates.map { DropdownItem(it, it) },
                            selectedItem = billingState,
                            onItemSelected = { billingState = it },
                            label = "State", placeholder = "Select state",
                            searchable = true, modifier = Modifier.weight(1f),
                        )
                        KontafyTextField(
                            value = billingPincode, onValueChange = { v -> billingPincode = v.filter { it.isDigit() }.take(6) },
                            label = "Pincode", modifier = Modifier.weight(0.6f),
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = KontafyColors.Border)
                Spacer(Modifier.height(16.dp))

                // Actions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    KontafyButton(text = "Cancel", onClick = onDismiss, variant = ButtonVariant.Outline)
                    Spacer(Modifier.width(8.dp))
                    KontafyButton(
                        text = "Create & Select",
                        onClick = {
                            showValidation = true
                            if (isNameValid) {
                                isSaving = true
                                val result = QuickCustomerResult(
                                    id = UUID.randomUUID().toString(),
                                    name = name,
                                    type = type,
                                    email = email.ifBlank { null },
                                    phone = phone.ifBlank { null },
                                    gstin = gstin.ifBlank { null },
                                )
                                onCreated(result)
                            }
                        },
                        variant = ButtonVariant.Secondary,
                        isLoading = isSaving,
                    )
                }
            }
        }
    }
}
