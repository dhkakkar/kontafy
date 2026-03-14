package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kontafy.desktop.api.OrganizationModel
import com.kontafy.desktop.db.repositories.OrganizationRepository
import com.kontafy.desktop.theme.KontafyColors

@Composable
fun AddCompanyScreen(
    organizationRepository: OrganizationRepository,
    onBack: () -> Unit,
    onCompanyCreated: (orgId: String, orgName: String) -> Unit,
) {
    var companyName by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var pan by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var pincode by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var financialYearStart by remember { mutableStateOf("04-01") }
    var invoicePrefix by remember { mutableStateOf("") }

    var nameError by remember { mutableStateOf<String?>(null) }
    var gstinError by remember { mutableStateOf<String?>(null) }
    var isSaving by remember { mutableStateOf(false) }

    fun validateGstin(value: String): Boolean {
        if (value.isBlank()) return true // optional
        val gstinRegex = Regex("^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
        return gstinRegex.matches(value.uppercase())
    }

    fun save() {
        // Validate
        nameError = if (companyName.isBlank()) "Company name is required" else null
        gstinError = if (gstin.isNotBlank() && !validateGstin(gstin)) "Invalid GSTIN format" else null

        if (nameError != null || gstinError != null) return

        isSaving = true
        try {
            val orgId = "org-${System.currentTimeMillis()}"
            val model = OrganizationModel(
                id = orgId,
                name = companyName.trim(),
                gstin = gstin.uppercase().trim().ifBlank { null },
                pan = pan.uppercase().trim().ifBlank { null },
                address = address.trim().ifBlank { null },
                city = city.trim().ifBlank { null },
                state = state.trim().ifBlank { null },
                pincode = pincode.trim().ifBlank { null },
                phone = phone.trim().ifBlank { null },
                email = email.trim().ifBlank { null },
                financialYearStart = financialYearStart.trim().ifBlank { "04-01" },
                invoicePrefix = invoicePrefix.trim().ifBlank { null },
            )
            organizationRepository.create(model)
            onCompanyCreated(orgId, companyName.trim())
        } finally {
            isSaving = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(KontafyColors.Surface),
    ) {
        // Top bar
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = KontafyColors.SurfaceElevated,
            shadowElevation = 1.dp,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        Icons.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = KontafyColors.Ink,
                    )
                }
                Spacer(Modifier.width(8.dp))
                Icon(
                    Icons.Filled.Business,
                    contentDescription = null,
                    tint = KontafyColors.Navy,
                    modifier = Modifier.size(28.dp),
                )
                Spacer(Modifier.width(12.dp))
                Text(
                    "Add Company",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = KontafyColors.Ink,
                )
            }
        }

        // Form content
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            // Basic Info Section
            FormSection(title = "Basic Information") {
                OutlinedTextField(
                    value = companyName,
                    onValueChange = {
                        companyName = it
                        nameError = null
                    },
                    label = { Text("Company Name *") },
                    isError = nameError != null,
                    supportingText = nameError?.let { { Text(it, color = KontafyColors.Error) } },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = formFieldColors(),
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    OutlinedTextField(
                        value = gstin,
                        onValueChange = {
                            gstin = it.uppercase()
                            gstinError = null
                        },
                        label = { Text("GSTIN") },
                        placeholder = { Text("e.g., 29ABCDE1234F1Z5") },
                        isError = gstinError != null,
                        supportingText = gstinError?.let { { Text(it, color = KontafyColors.Error) } },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = formFieldColors(),
                    )

                    OutlinedTextField(
                        value = pan,
                        onValueChange = { pan = it.uppercase() },
                        label = { Text("PAN") },
                        placeholder = { Text("e.g., ABCDE1234F") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = formFieldColors(),
                    )
                }
            }

            // Address Section
            FormSection(title = "Address") {
                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("Address") },
                    singleLine = false,
                    maxLines = 3,
                    modifier = Modifier.fillMaxWidth(),
                    colors = formFieldColors(),
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    OutlinedTextField(
                        value = city,
                        onValueChange = { city = it },
                        label = { Text("City") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = formFieldColors(),
                    )

                    OutlinedTextField(
                        value = state,
                        onValueChange = { state = it },
                        label = { Text("State") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = formFieldColors(),
                    )

                    OutlinedTextField(
                        value = pincode,
                        onValueChange = { pincode = it.filter { c -> c.isDigit() }.take(6) },
                        label = { Text("Pincode") },
                        singleLine = true,
                        modifier = Modifier.weight(0.7f),
                        colors = formFieldColors(),
                    )
                }
            }

            // Contact Section
            FormSection(title = "Contact") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = formFieldColors(),
                    )

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = formFieldColors(),
                    )
                }
            }

            // Settings Section
            FormSection(title = "Settings") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    OutlinedTextField(
                        value = financialYearStart,
                        onValueChange = { financialYearStart = it },
                        label = { Text("Financial Year Start (MM-DD)") },
                        placeholder = { Text("04-01") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = formFieldColors(),
                    )

                    OutlinedTextField(
                        value = invoicePrefix,
                        onValueChange = { invoicePrefix = it },
                        label = { Text("Invoice Prefix") },
                        placeholder = { Text("e.g., INV") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = formFieldColors(),
                    )
                }
            }

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.End),
            ) {
                OutlinedButton(
                    onClick = onBack,
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = KontafyColors.Muted,
                    ),
                ) {
                    Text("Cancel")
                }

                Button(
                    onClick = { save() },
                    enabled = !isSaving,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = KontafyColors.Green,
                        contentColor = KontafyColors.White,
                    ),
                    shape = RoundedCornerShape(8.dp),
                ) {
                    Icon(
                        Icons.Filled.Save,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (isSaving) "Saving..." else "Save Company",
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun FormSection(
    title: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = KontafyColors.SurfaceElevated,
        shape = RoundedCornerShape(12.dp),
        shadowElevation = 1.dp,
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = KontafyColors.Navy,
                fontSize = 15.sp,
            )
            content()
        }
    }
}

@Composable
private fun formFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = KontafyColors.Navy,
    unfocusedBorderColor = KontafyColors.Border,
    cursorColor = KontafyColors.Navy,
    focusedLabelColor = KontafyColors.Navy,
)
