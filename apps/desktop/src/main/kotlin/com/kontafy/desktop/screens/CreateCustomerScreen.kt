package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.ContactModel
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.ContactRepository
import com.kontafy.desktop.shortcuts.LocalShortcutAction
import com.kontafy.desktop.theme.KontafyColors
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

private val gstinRegex = Regex("^\\d{2}[A-Z]{5}\\d{4}[A-Z]{1}[A-Z\\d]{1}[Z]{1}[A-Z\\d]{1}$")

@Composable
fun CreateCustomerScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    contactRepository: ContactRepository,
    onBack: () -> Unit,
    onSaveSuccess: (String) -> Unit = {},
) {
    // Form state
    var customerType by remember { mutableStateOf("CUSTOMER") }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var pan by remember { mutableStateOf("") }

    // Billing address
    var billingStreet by remember { mutableStateOf("") }
    var billingCity by remember { mutableStateOf("") }
    var billingState by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var billingPincode by remember { mutableStateOf("") }

    // Shipping address
    var sameAsBilling by remember { mutableStateOf(true) }
    var shippingStreet by remember { mutableStateOf("") }
    var shippingCity by remember { mutableStateOf("") }
    var shippingState by remember { mutableStateOf<DropdownItem<String>?>(null) }
    var shippingPincode by remember { mutableStateOf("") }

    var creditLimit by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    var showValidation by remember { mutableStateOf(false) }

    // Validation
    val isNameValid = name.isNotBlank()
    val isEmailValid = email.isBlank() || email.contains("@")
    val isGstinValid = gstin.isBlank() || gstinRegex.matches(gstin)
    val isPanValid = pan.isBlank() || Regex("^[A-Z]{5}\\d{4}[A-Z]$").matches(pan)
    val isFormValid = isNameValid && isEmailValid && isGstinValid && isPanValid

    // Handle Ctrl+S shortcut
    val shortcutAction = LocalShortcutAction.current
    LaunchedEffect(shortcutAction.value) {
        if (shortcutAction.value == "save" && !isSaving && isFormValid) {
            shortcutAction.value = null
            isSaving = true
            try {
                val billingAddr = listOfNotNull(
                    billingStreet.ifBlank { null },
                    billingCity.ifBlank { null },
                    billingState?.label,
                    billingPincode.ifBlank { null },
                ).joinToString(", ").ifBlank { null }
                val shippingAddr = if (sameAsBilling) billingAddr else {
                    listOfNotNull(
                        shippingStreet.ifBlank { null },
                        shippingCity.ifBlank { null },
                        shippingState?.label,
                        shippingPincode.ifBlank { null },
                    ).joinToString(", ").ifBlank { null }
                }
                val model = com.kontafy.desktop.api.ContactModel(
                    id = java.util.UUID.randomUUID().toString(),
                    orgId = currentOrgId,
                    name = name,
                    type = customerType.lowercase(),
                    email = email.ifBlank { null },
                    phone = phone.ifBlank { null },
                    gstin = gstin.ifBlank { null },
                    pan = pan.ifBlank { null },
                    billingAddress = billingAddr,
                    shippingAddress = shippingAddr,
                    city = billingCity.ifBlank { null },
                    state = billingState?.label,
                    pincode = billingPincode.ifBlank { null },
                    creditLimit = creditLimit.toBigDecimalOrNull() ?: java.math.BigDecimal.ZERO,
                    outstandingBalance = java.math.BigDecimal.ZERO,
                    isActive = true,
                    updatedAt = java.time.LocalDateTime.now(),
                )
                contactRepository.create(model)
                onSaveSuccess("Customer created successfully")
            } catch (e: Exception) {
                e.printStackTrace()
                isSaving = false
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        // Top bar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = KontafyColors.SurfaceElevated,
            shadowElevation = 1.dp,
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Outlined.ArrowBack, "Back", tint = KontafyColors.Ink)
                }
                Spacer(Modifier.width(12.dp))
                Text(
                    "New Customer",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.Ink,
                )
                Spacer(Modifier.weight(1f))
                KontafyButton(
                    text = "Cancel",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
                Spacer(Modifier.width(8.dp))
                KontafyButton(
                    text = "Save Customer",
                    onClick = {
                        showValidation = true
                        if (isFormValid) {
                            isSaving = true
                            try {
                                val billingAddr = listOfNotNull(
                                    billingStreet.ifBlank { null },
                                    billingCity.ifBlank { null },
                                    billingState?.label,
                                    billingPincode.ifBlank { null },
                                ).joinToString(", ").ifBlank { null }
                                val shippingAddr = if (sameAsBilling) billingAddr else {
                                    listOfNotNull(
                                        shippingStreet.ifBlank { null },
                                        shippingCity.ifBlank { null },
                                        shippingState?.label,
                                        shippingPincode.ifBlank { null },
                                    ).joinToString(", ").ifBlank { null }
                                }
                                val model = ContactModel(
                                    id = UUID.randomUUID().toString(),
                                    orgId = currentOrgId,
                                    name = name,
                                    type = customerType.lowercase(),
                                    email = email.ifBlank { null },
                                    phone = phone.ifBlank { null },
                                    gstin = gstin.ifBlank { null },
                                    pan = pan.ifBlank { null },
                                    billingAddress = billingAddr,
                                    shippingAddress = shippingAddr,
                                    city = billingCity.ifBlank { null },
                                    state = billingState?.label,
                                    pincode = billingPincode.ifBlank { null },
                                    creditLimit = creditLimit.toBigDecimalOrNull() ?: BigDecimal.ZERO,
                                    outstandingBalance = BigDecimal.ZERO,
                                    isActive = true,
                                    updatedAt = LocalDateTime.now(),
                                )
                                contactRepository.create(model)
                            } catch (e: Exception) {
                                e.printStackTrace()
                                isSaving = false
                                return@KontafyButton
                            }
                            onSaveSuccess("Customer created successfully")
                        }
                    },
                    variant = ButtonVariant.Secondary,
                    isLoading = isSaving,
                )
            }
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // Type Selection
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Type", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                            listOf("CUSTOMER" to "Customer", "VENDOR" to "Vendor", "BOTH" to "Both").forEach { (value, label) ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(vertical = 4.dp),
                                ) {
                                    RadioButton(
                                        selected = customerType == value,
                                        onClick = { customerType = value },
                                        colors = RadioButtonDefaults.colors(
                                            selectedColor = KontafyColors.Navy,
                                            unselectedColor = KontafyColors.Muted,
                                        ),
                                    )
                                    Spacer(Modifier.width(4.dp))
                                    Text(
                                        label,
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = KontafyColors.Ink,
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Basic Info
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Basic Information", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        KontafyTextField(
                            value = name,
                            onValueChange = { name = it },
                            label = "Name *",
                            placeholder = "Business or individual name",
                            isError = showValidation && !isNameValid,
                            errorMessage = if (showValidation && !isNameValid) "Name is required" else null,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            KontafyTextField(
                                value = email,
                                onValueChange = { email = it },
                                label = "Email",
                                placeholder = "billing@example.com",
                                isError = showValidation && !isEmailValid,
                                errorMessage = if (showValidation && !isEmailValid) "Enter a valid email" else null,
                                keyboardType = KeyboardType.Email,
                                modifier = Modifier.weight(1f),
                            )
                            KontafyTextField(
                                value = phone,
                                onValueChange = { phone = it },
                                label = "Phone",
                                placeholder = "+91 98765 43210",
                                keyboardType = KeyboardType.Phone,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }

            // Tax Information
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Tax Information", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            KontafyTextField(
                                value = gstin,
                                onValueChange = { gstin = it.uppercase().take(15) },
                                label = "GSTIN",
                                placeholder = "22AAAAA0000A1Z5",
                                isError = showValidation && !isGstinValid,
                                errorMessage = if (showValidation && !isGstinValid) "Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)" else null,
                                modifier = Modifier.weight(1f),
                            )
                            KontafyTextField(
                                value = pan,
                                onValueChange = { pan = it.uppercase().take(10) },
                                label = "PAN",
                                placeholder = "AAAAA0000A",
                                isError = showValidation && !isPanValid,
                                errorMessage = if (showValidation && !isPanValid) "Invalid PAN format (e.g. AAAAA0000A)" else null,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }

            // Billing Address
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Billing Address", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        KontafyTextField(
                            value = billingStreet,
                            onValueChange = { billingStreet = it },
                            label = "Street Address",
                            placeholder = "Street, Building, Floor",
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            KontafyTextField(
                                value = billingCity,
                                onValueChange = { billingCity = it },
                                label = "City",
                                placeholder = "City",
                                modifier = Modifier.weight(1f),
                            )
                            KontafyDropdown(
                                items = indianStates.map { DropdownItem(it, it) },
                                selectedItem = billingState,
                                onItemSelected = { billingState = it },
                                label = "State",
                                placeholder = "Select state",
                                searchable = true,
                                modifier = Modifier.weight(1f),
                            )
                            KontafyTextField(
                                value = billingPincode,
                                onValueChange = { billingPincode = it.filter { c -> c.isDigit() }.take(6) },
                                label = "Pincode",
                                placeholder = "400001",
                                keyboardType = KeyboardType.Number,
                                modifier = Modifier.weight(0.7f),
                            )
                        }
                    }
                }
            }

            // Shipping Address
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Shipping Address", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                            Spacer(Modifier.weight(1f))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Checkbox(
                                    checked = sameAsBilling,
                                    onCheckedChange = { sameAsBilling = it },
                                    colors = CheckboxDefaults.colors(
                                        checkedColor = KontafyColors.Navy,
                                        uncheckedColor = KontafyColors.Muted,
                                    ),
                                )
                                Text(
                                    "Same as billing",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = KontafyColors.Ink,
                                )
                            }
                        }

                        if (!sameAsBilling) {
                            Spacer(Modifier.height(16.dp))
                            KontafyTextField(
                                value = shippingStreet,
                                onValueChange = { shippingStreet = it },
                                label = "Street Address",
                                placeholder = "Street, Building, Floor",
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Spacer(Modifier.height(16.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(16.dp),
                            ) {
                                KontafyTextField(
                                    value = shippingCity,
                                    onValueChange = { shippingCity = it },
                                    label = "City",
                                    placeholder = "City",
                                    modifier = Modifier.weight(1f),
                                )
                                KontafyDropdown(
                                    items = indianStates.map { DropdownItem(it, it) },
                                    selectedItem = shippingState,
                                    onItemSelected = { shippingState = it },
                                    label = "State",
                                    placeholder = "Select state",
                                    searchable = true,
                                    modifier = Modifier.weight(1f),
                                )
                                KontafyTextField(
                                    value = shippingPincode,
                                    onValueChange = { shippingPincode = it.filter { c -> c.isDigit() }.take(6) },
                                    label = "Pincode",
                                    placeholder = "400001",
                                    keyboardType = KeyboardType.Number,
                                    modifier = Modifier.weight(0.7f),
                                )
                            }
                        }
                    }
                }
            }

            // Credit Limit
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                    elevation = CardDefaults.cardElevation(1.dp),
                ) {
                    Column(modifier = Modifier.padding(24.dp)) {
                        Text("Credit Settings", style = MaterialTheme.typography.titleLarge, color = KontafyColors.Ink)
                        Spacer(Modifier.height(16.dp))
                        KontafyTextField(
                            value = creditLimit,
                            onValueChange = { creditLimit = it.filter { c -> c.isDigit() || c == '.' } },
                            label = "Credit Limit (INR)",
                            placeholder = "0.00",
                            keyboardType = KeyboardType.Number,
                            modifier = Modifier.width(300.dp),
                        )
                    }
                }
            }

            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}
