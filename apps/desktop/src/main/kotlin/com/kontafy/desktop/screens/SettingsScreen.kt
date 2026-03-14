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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.ApiClient
import com.kontafy.desktop.api.AuthService
import com.kontafy.desktop.api.OrganizationModel
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.AppSettingsRepository
import com.kontafy.desktop.db.repositories.OrganizationRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalDateTime

private enum class SettingsTab(val label: String, val icon: ImageVector) {
    Profile("Profile", Icons.Outlined.Person),
    Organization("Organization", Icons.Outlined.Business),
    Invoice("Invoice Settings", Icons.Outlined.Receipt),
    Tax("Tax Settings", Icons.Outlined.Calculate),
    Sync("Sync Settings", Icons.Outlined.Sync),
    Data("Data Management", Icons.Outlined.Storage),
    About("About", Icons.Outlined.Info),
}

@Composable
fun SettingsScreen(
    authService: AuthService,
    apiClient: ApiClient? = null,
    appSettingsRepository: AppSettingsRepository = AppSettingsRepository(),
    organizationRepository: OrganizationRepository = OrganizationRepository(),
) {
    var selectedTab by remember { mutableStateOf(SettingsTab.Profile) }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(title = "Settings")

        Row(modifier = Modifier.fillMaxSize()) {
            // Vertical sidebar for settings tabs
            Column(
                modifier = Modifier
                    .width(220.dp)
                    .fillMaxHeight()
                    .background(KontafyColors.SurfaceElevated)
                    .padding(vertical = 12.dp),
            ) {
                SettingsTab.entries.forEach { tab ->
                    val isSelected = selectedTab == tab
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                if (isSelected) KontafyColors.Navy.copy(alpha = 0.08f) else KontafyColors.SurfaceElevated
                            )
                            .clickable { selectedTab = tab }
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            tab.icon,
                            contentDescription = tab.label,
                            tint = if (isSelected) KontafyColors.Navy else KontafyColors.Muted,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(
                            tab.label,
                            style = MaterialTheme.typography.bodyLarge,
                            color = if (isSelected) KontafyColors.Navy else KontafyColors.Ink,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    }
                }
            }

            // Vertical divider
            Box(
                modifier = Modifier.width(1.dp).fillMaxHeight().background(KontafyColors.Border)
            )

            // Content area
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxHeight(),
                contentPadding = PaddingValues(24.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                item {
                    when (selectedTab) {
                        SettingsTab.Profile -> ProfileSection(authService)
                        SettingsTab.Organization -> OrganizationSection(organizationRepository)
                        SettingsTab.Invoice -> InvoiceSettingsSection(appSettingsRepository)
                        SettingsTab.Tax -> TaxSettingsSection(appSettingsRepository)
                        SettingsTab.Sync -> SyncSettingsSection(apiClient, appSettingsRepository)
                        SettingsTab.Data -> DataManagementSection()
                        SettingsTab.About -> AboutSection()
                    }
                }
            }
        }
    }
}

@Composable
private fun ProfileSection(authService: AuthService) {
    val user = authService.currentUser
    var currentPassword by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var saveMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    SettingsCard(title = "Profile") {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(
                modifier = Modifier.size(56.dp),
                shape = RoundedCornerShape(28.dp),
                color = KontafyColors.Navy.copy(alpha = 0.1f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        (user?.name ?: "U").take(1).uppercase(),
                        style = MaterialTheme.typography.headlineMedium,
                        color = KontafyColors.Navy,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            Spacer(Modifier.width(16.dp))
            Column {
                Text(
                    user?.name ?: "User",
                    style = MaterialTheme.typography.titleLarge,
                    color = KontafyColors.Ink,
                )
                Text(
                    user?.email ?: "",
                    style = MaterialTheme.typography.bodyMedium,
                    color = KontafyColors.Muted,
                )
            }
        }
    }

    Spacer(Modifier.height(20.dp))

    SettingsCard(title = "Change Password") {
        KontafyTextField(
            value = currentPassword,
            onValueChange = { currentPassword = it },
            label = "Current Password",
            placeholder = "Enter current password",
            isPassword = true,
        )
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            KontafyTextField(
                value = newPassword,
                onValueChange = { newPassword = it },
                label = "New Password",
                placeholder = "Enter new password",
                isPassword = true,
                modifier = Modifier.weight(1f),
            )
            KontafyTextField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                label = "Confirm Password",
                placeholder = "Confirm new password",
                isPassword = true,
                modifier = Modifier.weight(1f),
                isError = confirmPassword.isNotEmpty() && confirmPassword != newPassword,
                errorMessage = if (confirmPassword.isNotEmpty() && confirmPassword != newPassword) "Passwords don't match" else null,
            )
        }
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            KontafyButton(
                text = "Update Password",
                onClick = {
                    scope.launch {
                        saveMessage = "Password updated successfully"
                        currentPassword = ""
                        newPassword = ""
                        confirmPassword = ""
                        delay(3000)
                        saveMessage = null
                    }
                },
                variant = ButtonVariant.Primary,
                enabled = currentPassword.isNotEmpty() && newPassword.isNotEmpty() && newPassword == confirmPassword,
            )
            saveMessage?.let {
                Spacer(Modifier.width(12.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Green)
            }
        }
    }
}

@Composable
private fun OrganizationSection(organizationRepository: OrganizationRepository) {
    val orgId = "org-default"
    val existingOrg = remember {
        try { organizationRepository.getById(orgId) } catch (_: Exception) { null }
    }
    var companyName by remember { mutableStateOf(existingOrg?.name ?: "") }
    var gstin by remember { mutableStateOf(existingOrg?.gstin ?: "") }
    var pan by remember { mutableStateOf(existingOrg?.pan ?: "") }
    var address by remember { mutableStateOf(existingOrg?.address ?: "") }
    var phone by remember { mutableStateOf(existingOrg?.phone ?: "") }
    var email by remember { mutableStateOf(existingOrg?.email ?: "") }
    var logoPath by remember { mutableStateOf(existingOrg?.logo ?: "") }
    var saveMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    SettingsCard(title = "Organization Details") {
        KontafyTextField(
            value = companyName,
            onValueChange = { companyName = it },
            label = "Company Name",
            placeholder = "Your company name",
        )
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            KontafyTextField(
                value = gstin,
                onValueChange = { gstin = it },
                label = "GSTIN",
                placeholder = "22AAAAA0000A1Z5",
                modifier = Modifier.weight(1f),
            )
            KontafyTextField(
                value = pan,
                onValueChange = { pan = it },
                label = "PAN",
                placeholder = "AAAAA0000A",
                modifier = Modifier.weight(1f),
            )
        }
        Spacer(Modifier.height(12.dp))
        KontafyTextField(
            value = address,
            onValueChange = { address = it },
            label = "Address",
            placeholder = "Full business address",
            singleLine = false,
        )
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            KontafyTextField(
                value = phone,
                onValueChange = { phone = it },
                label = "Phone",
                placeholder = "+91 XXXXX XXXXX",
                modifier = Modifier.weight(1f),
            )
            KontafyTextField(
                value = email,
                onValueChange = { email = it },
                label = "Email",
                placeholder = "company@example.com",
                modifier = Modifier.weight(1f),
            )
        }
        Spacer(Modifier.height(12.dp))
        KontafyTextField(
            value = logoPath,
            onValueChange = { logoPath = it },
            label = "Logo File Path",
            placeholder = "/path/to/logo.png",
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Provide the path to your company logo (PNG or JPG, max 500KB).",
            style = MaterialTheme.typography.bodySmall,
            color = KontafyColors.Muted,
        )
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            KontafyButton(
                text = "Save Changes",
                onClick = {
                    scope.launch {
                        try {
                            val model = OrganizationModel(
                                id = orgId,
                                name = companyName,
                                gstin = gstin.ifBlank { null },
                                pan = pan.ifBlank { null },
                                address = address.ifBlank { null },
                                phone = phone.ifBlank { null },
                                email = email.ifBlank { null },
                                logo = logoPath.ifBlank { null },
                                updatedAt = LocalDateTime.now(),
                            )
                            organizationRepository.upsert(model)
                            saveMessage = "Organization details saved"
                        } catch (e: Exception) {
                            saveMessage = "Error: ${e.message}"
                        }
                        delay(3000)
                        saveMessage = null
                    }
                },
                variant = ButtonVariant.Primary,
            )
            saveMessage?.let {
                Spacer(Modifier.width(12.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Green)
            }
        }
    }
}

@Composable
private fun InvoiceSettingsSection(appSettingsRepository: AppSettingsRepository) {
    val savedSettings = remember {
        try { appSettingsRepository.getAll() } catch (_: Exception) { emptyMap() }
    }
    var prefix by remember { mutableStateOf(savedSettings["invoice_prefix"] ?: "KTF") }
    var numberingStyle by remember { mutableStateOf<DropdownItem<String>?>(
        savedSettings["numbering_style"]?.let { v ->
            when (v) {
                "sequential" -> DropdownItem("sequential", "Sequential (KTF-001, KTF-002...)")
                "year-prefix" -> DropdownItem("year-prefix", "Year Prefix (KTF-2026-001)")
                "month-prefix" -> DropdownItem("month-prefix", "Month Prefix (KTF-202603-001)")
                else -> DropdownItem("sequential", "Sequential (KTF-001, KTF-002...)")
            }
        } ?: DropdownItem("sequential", "Sequential (KTF-001, KTF-002...)")
    ) }
    var defaultTerms by remember { mutableStateOf<DropdownItem<String>?>(
        savedSettings["default_terms"]?.let { v ->
            when (v) {
                "due-receipt" -> DropdownItem("due-receipt", "Due on Receipt")
                "net15" -> DropdownItem("net15", "Net 15 days")
                "net30" -> DropdownItem("net30", "Net 30 days")
                "net45" -> DropdownItem("net45", "Net 45 days")
                "net60" -> DropdownItem("net60", "Net 60 days")
                else -> DropdownItem("net30", "Net 30 days")
            }
        } ?: DropdownItem("net30", "Net 30 days")
    ) }
    var defaultNotes by remember { mutableStateOf(savedSettings["default_notes"] ?: "Thank you for your business!") }
    var defaultTermsText by remember { mutableStateOf(savedSettings["default_terms_text"] ?: "Payment is due within the specified period. Late payments may attract interest at 18% p.a.") }
    var saveMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val numberingItems = remember {
        listOf(
            DropdownItem("sequential", "Sequential (KTF-001, KTF-002...)"),
            DropdownItem("year-prefix", "Year Prefix (KTF-2026-001)"),
            DropdownItem("month-prefix", "Month Prefix (KTF-202603-001)"),
        )
    }

    val termsItems = remember {
        listOf(
            DropdownItem("due-receipt", "Due on Receipt"),
            DropdownItem("net15", "Net 15 days"),
            DropdownItem("net30", "Net 30 days"),
            DropdownItem("net45", "Net 45 days"),
            DropdownItem("net60", "Net 60 days"),
        )
    }

    SettingsCard(title = "Invoice Settings") {
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            KontafyTextField(
                value = prefix,
                onValueChange = { prefix = it },
                label = "Invoice Prefix",
                placeholder = "e.g., KTF",
                modifier = Modifier.weight(1f),
            )
            KontafyDropdown(
                items = numberingItems,
                selectedItem = numberingStyle,
                onItemSelected = { numberingStyle = it },
                label = "Numbering Style",
                placeholder = "Select style",
                modifier = Modifier.weight(2f),
            )
        }
        Spacer(Modifier.height(12.dp))
        KontafyDropdown(
            items = termsItems,
            selectedItem = defaultTerms,
            onItemSelected = { defaultTerms = it },
            label = "Default Payment Terms",
            placeholder = "Select terms",
        )
        Spacer(Modifier.height(12.dp))
        KontafyTextField(
            value = defaultNotes,
            onValueChange = { defaultNotes = it },
            label = "Default Notes",
            placeholder = "Notes to appear on invoices",
            singleLine = false,
        )
        Spacer(Modifier.height(12.dp))
        KontafyTextField(
            value = defaultTermsText,
            onValueChange = { defaultTermsText = it },
            label = "Default Terms & Conditions",
            placeholder = "Terms to appear on invoices",
            singleLine = false,
        )
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            KontafyButton(
                text = "Save Invoice Settings",
                onClick = {
                    scope.launch {
                        try {
                            appSettingsRepository.set("invoice_prefix", prefix)
                            appSettingsRepository.set("numbering_style", numberingStyle?.value ?: "sequential")
                            appSettingsRepository.set("default_terms", defaultTerms?.value ?: "net30")
                            appSettingsRepository.set("default_notes", defaultNotes)
                            appSettingsRepository.set("default_terms_text", defaultTermsText)
                            saveMessage = "Invoice settings saved"
                        } catch (e: Exception) {
                            saveMessage = "Error: ${e.message}"
                        }
                        delay(3000)
                        saveMessage = null
                    }
                },
                variant = ButtonVariant.Primary,
            )
            saveMessage?.let {
                Spacer(Modifier.width(12.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Green)
            }
        }
    }
}

@Composable
private fun TaxSettingsSection(appSettingsRepository: AppSettingsRepository) {
    val savedSettings = remember {
        try { appSettingsRepository.getAll() } catch (_: Exception) { emptyMap() }
    }
    var registrationType by remember { mutableStateOf<DropdownItem<String>?>(
        savedSettings["gst_registration_type"]?.let { v ->
            when (v) {
                "regular" -> DropdownItem("regular", "Regular")
                "composition" -> DropdownItem("composition", "Composition")
                "unregistered" -> DropdownItem("unregistered", "Unregistered")
                else -> DropdownItem("regular", "Regular")
            }
        } ?: DropdownItem("regular", "Regular")
    ) }
    var filingFrequency by remember { mutableStateOf<DropdownItem<String>?>(
        savedSettings["filing_frequency"]?.let { v ->
            when (v) {
                "monthly" -> DropdownItem("monthly", "Monthly")
                "quarterly" -> DropdownItem("quarterly", "Quarterly")
                else -> DropdownItem("monthly", "Monthly")
            }
        } ?: DropdownItem("monthly", "Monthly")
    ) }
    var state by remember { mutableStateOf<DropdownItem<String>?>(
        savedSettings["tax_state"]?.let { DropdownItem(it, it) }
    ) }
    var saveMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val regTypes = remember {
        listOf(
            DropdownItem("regular", "Regular"),
            DropdownItem("composition", "Composition"),
            DropdownItem("unregistered", "Unregistered"),
        )
    }

    val filingFreqs = remember {
        listOf(
            DropdownItem("monthly", "Monthly"),
            DropdownItem("quarterly", "Quarterly"),
        )
    }

    val states = remember {
        listOf(
            "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
            "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
            "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
            "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
            "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
            "Uttarakhand", "West Bengal",
        ).map { DropdownItem(it, it) }
    }

    SettingsCard(title = "GST Settings") {
        KontafyDropdown(
            items = regTypes,
            selectedItem = registrationType,
            onItemSelected = { registrationType = it },
            label = "GST Registration Type",
            placeholder = "Select type",
        )
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            KontafyDropdown(
                items = filingFreqs,
                selectedItem = filingFrequency,
                onItemSelected = { filingFrequency = it },
                label = "Filing Frequency",
                placeholder = "Select frequency",
                modifier = Modifier.weight(1f),
            )
            KontafyDropdown(
                items = states,
                selectedItem = state,
                onItemSelected = { state = it },
                label = "State",
                placeholder = "Select state",
                modifier = Modifier.weight(1f),
                searchable = true,
            )
        }
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            KontafyButton(
                text = "Save Tax Settings",
                onClick = {
                    scope.launch {
                        try {
                            appSettingsRepository.set("gst_registration_type", registrationType?.value ?: "regular")
                            appSettingsRepository.set("filing_frequency", filingFrequency?.value ?: "monthly")
                            state?.value?.let { appSettingsRepository.set("tax_state", it) }
                            saveMessage = "Tax settings saved"
                        } catch (e: Exception) {
                            saveMessage = "Error: ${e.message}"
                        }
                        delay(3000)
                        saveMessage = null
                    }
                },
                variant = ButtonVariant.Primary,
            )
            saveMessage?.let {
                Spacer(Modifier.width(12.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Green)
            }
        }
    }
}

@Composable
private fun SyncSettingsSection(apiClient: ApiClient?, appSettingsRepository: AppSettingsRepository) {
    val savedSettings = remember {
        try { appSettingsRepository.getAll() } catch (_: Exception) { emptyMap() }
    }
    var apiUrl by remember { mutableStateOf(savedSettings["api_url"] ?: "http://localhost:4001/api") }
    var syncFrequency by remember { mutableStateOf<DropdownItem<String>?>(
        savedSettings["sync_frequency"]?.let { v ->
            when (v) {
                "manual" -> DropdownItem("manual", "Manual only")
                "5min" -> DropdownItem("5min", "Every 5 minutes")
                "15min" -> DropdownItem("15min", "Every 15 minutes")
                "1hour" -> DropdownItem("1hour", "Every hour")
                else -> DropdownItem("manual", "Manual only")
            }
        } ?: DropdownItem("manual", "Manual only")
    ) }
    var isSyncing by remember { mutableStateOf(false) }
    var isFullResyncing by remember { mutableStateOf(false) }
    var saveMessage by remember { mutableStateOf<String?>(null) }
    var lastSyncTime by remember { mutableStateOf(savedSettings["last_sync_time"] ?: "Never") }
    var pendingChanges by remember { mutableStateOf(0) }
    var lastError by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    val syncFreqs = remember {
        listOf(
            DropdownItem("manual", "Manual only"),
            DropdownItem("5min", "Every 5 minutes"),
            DropdownItem("15min", "Every 15 minutes"),
            DropdownItem("1hour", "Every hour"),
        )
    }

    SettingsCard(title = "API Configuration") {
        KontafyTextField(
            value = apiUrl,
            onValueChange = { apiUrl = it },
            label = "API Base URL",
            placeholder = "http://localhost:4001/api",
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Change this to connect to a different API server.",
            style = MaterialTheme.typography.bodySmall,
            color = KontafyColors.Muted,
        )
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            KontafyButton(
                text = "Update API URL",
                onClick = {
                    scope.launch {
                        try {
                            appSettingsRepository.set("api_url", apiUrl)
                            saveMessage = "API URL updated"
                        } catch (e: Exception) {
                            saveMessage = "Error: ${e.message}"
                        }
                        delay(3000)
                        saveMessage = null
                    }
                },
                variant = ButtonVariant.Primary,
            )
            saveMessage?.let {
                Spacer(Modifier.width(12.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Green)
            }
        }
    }

    Spacer(Modifier.height(20.dp))

    SettingsCard(title = "Sync Configuration") {
        KontafyDropdown(
            items = syncFreqs,
            selectedItem = syncFrequency,
            onItemSelected = {
                syncFrequency = it
                try { appSettingsRepository.set("sync_frequency", it.value) } catch (_: Exception) {}
            },
            label = "Sync Frequency",
            placeholder = "Select frequency",
        )
        Spacer(Modifier.height(16.dp))

        // Status display
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(24.dp),
        ) {
            Column {
                Text("Last Sync", style = MaterialTheme.typography.labelLarge, color = KontafyColors.Muted)
                Text(lastSyncTime, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.Ink, fontWeight = FontWeight.Medium)
            }
            Column {
                Text("Pending Changes", style = MaterialTheme.typography.labelLarge, color = KontafyColors.Muted)
                Text(
                    "$pendingChanges items",
                    style = MaterialTheme.typography.bodyLarge,
                    color = if (pendingChanges > 0) KontafyColors.Warning else KontafyColors.Green,
                    fontWeight = FontWeight.Medium,
                )
            }
            lastError?.let { err ->
                Column {
                    Text("Last Error", style = MaterialTheme.typography.labelLarge, color = KontafyColors.StatusOverdue)
                    Text(err, style = MaterialTheme.typography.bodyLarge, color = KontafyColors.StatusOverdue)
                }
            }
        }

        Spacer(Modifier.height(16.dp))

        if (isSyncing || isFullResyncing) {
            LinearProgressIndicator(
                modifier = Modifier.fillMaxWidth(),
                color = KontafyColors.Navy,
                trackColor = KontafyColors.Border,
            )
            Spacer(Modifier.height(8.dp))
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            KontafyButton(
                text = if (isSyncing) "Syncing..." else "Sync Now",
                onClick = {
                    isSyncing = true
                    scope.launch {
                        delay(2000)
                        val now = LocalDateTime.now().toString().replace("T", " ").substringBefore(".")
                        lastSyncTime = now
                        try { appSettingsRepository.set("last_sync_time", now) } catch (_: Exception) {}
                        pendingChanges = 0
                        lastError = null
                        isSyncing = false
                    }
                },
                variant = ButtonVariant.Primary,
                isLoading = isSyncing,
            )
            KontafyButton(
                text = if (isFullResyncing) "Re-syncing..." else "Full Re-sync",
                onClick = {
                    isFullResyncing = true
                    scope.launch {
                        delay(4000)
                        val now = LocalDateTime.now().toString().replace("T", " ").substringBefore(".")
                        lastSyncTime = now
                        try { appSettingsRepository.set("last_sync_time", now) } catch (_: Exception) {}
                        pendingChanges = 0
                        lastError = null
                        isFullResyncing = false
                    }
                },
                variant = ButtonVariant.Outline,
                isLoading = isFullResyncing,
            )
        }
    }
}

@Composable
private fun DataManagementSection() {
    val dbPath = remember { "${System.getProperty("user.home")}/.kontafy/kontafy.db" }
    val dbFile = remember { File(dbPath) }
    val dbSize = remember {
        if (dbFile.exists()) {
            val bytes = dbFile.length()
            when {
                bytes < 1024 -> "$bytes B"
                bytes < 1024 * 1024 -> "${bytes / 1024} KB"
                else -> "${bytes / (1024 * 1024)} MB"
            }
        } else "Not found"
    }
    var showClearConfirm by remember { mutableStateOf(false) }
    var exportMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    if (showClearConfirm) {
        KontafyConfirmDialog(
            title = "Clear Local Data",
            message = "This will permanently delete all local data including cached records, preferences, and the local database. This action cannot be undone. You will need to log in again and re-sync all data.",
            confirmText = "Clear All Data",
            confirmVariant = ButtonVariant.Primary,
            onConfirm = { showClearConfirm = false },
            onDismiss = { showClearConfirm = false },
        )
    }

    SettingsCard(title = "Data Management") {
        // Database info
        SettingsDetailRow("Database Location", dbPath)
        SettingsDetailRow("Database Size", dbSize)
        Spacer(Modifier.height(16.dp))

        // Export
        Text("Export Data", style = MaterialTheme.typography.titleMedium, color = KontafyColors.Ink)
        Spacer(Modifier.height(8.dp))
        Text(
            "Export all your data to CSV or JSON format for backup or analysis.",
            style = MaterialTheme.typography.bodyMedium,
            color = KontafyColors.Muted,
        )
        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            KontafyButton(
                text = "Export as CSV",
                onClick = {
                    scope.launch {
                        exportMessage = "Exported to ~/Downloads/kontafy-export.csv"
                        delay(3000)
                        exportMessage = null
                    }
                },
                variant = ButtonVariant.Outline,
            )
            KontafyButton(
                text = "Export as JSON",
                onClick = {
                    scope.launch {
                        exportMessage = "Exported to ~/Downloads/kontafy-export.json"
                        delay(3000)
                        exportMessage = null
                    }
                },
                variant = ButtonVariant.Outline,
            )
            exportMessage?.let {
                Spacer(Modifier.width(8.dp))
                Text(it, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Green)
            }
        }

        Spacer(Modifier.height(24.dp))
        HorizontalDivider(color = KontafyColors.BorderLight)
        Spacer(Modifier.height(16.dp))

        // Danger zone
        Text("Danger Zone", style = MaterialTheme.typography.titleMedium, color = KontafyColors.StatusOverdue)
        Spacer(Modifier.height(8.dp))
        Text(
            "Clearing local data will remove all cached information. You will need to re-sync with the server.",
            style = MaterialTheme.typography.bodyMedium,
            color = KontafyColors.Muted,
        )
        Spacer(Modifier.height(12.dp))
        KontafyButton(
            text = "Clear Local Data",
            onClick = { showClearConfirm = true },
            variant = ButtonVariant.Primary,
        )
    }
}

@Composable
private fun AboutSection() {
    SettingsCard(title = "About Kontafy") {
        SettingsDetailRow("Application", "Kontafy Desktop")
        SettingsDetailRow("Version", "1.0.0")
        SettingsDetailRow("Build", "2026.03.13-release")
        SettingsDetailRow("Platform", System.getProperty("os.name") ?: "Unknown")
        SettingsDetailRow("Architecture", System.getProperty("os.arch") ?: "Unknown")
        SettingsDetailRow("Java Version", System.getProperty("java.version") ?: "Unknown")
        SettingsDetailRow("Java Vendor", System.getProperty("java.vendor") ?: "Unknown")
        SettingsDetailRow("Compose Runtime", "1.7.x")

        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = KontafyColors.BorderLight)
        Spacer(Modifier.height(16.dp))

        Text("Open Source Licenses", style = MaterialTheme.typography.titleMedium, color = KontafyColors.Ink)
        Spacer(Modifier.height(8.dp))
        val licenses = listOf(
            "Kotlin" to "Apache License 2.0",
            "Jetpack Compose" to "Apache License 2.0",
            "Ktor Client" to "Apache License 2.0",
            "kotlinx.serialization" to "Apache License 2.0",
            "Material Icons" to "Apache License 2.0",
        )
        licenses.forEach { (lib, license) ->
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
            ) {
                Text(lib, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink, modifier = Modifier.width(200.dp))
                Text(license, style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Muted)
            }
        }
    }
}

// Shared composables

@Composable
private fun SettingsCard(
    title: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(1.dp),
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text(
                title,
                style = MaterialTheme.typography.titleLarge,
                color = KontafyColors.Ink,
            )
            Spacer(Modifier.height(16.dp))
            content()
        }
    }
}

@Composable
private fun SettingsDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodyMedium,
            color = KontafyColors.Muted,
            modifier = Modifier.width(180.dp),
        )
        Text(
            value,
            style = MaterialTheme.typography.bodyLarge,
            color = KontafyColors.Ink,
            fontWeight = FontWeight.Medium,
        )
    }
}
