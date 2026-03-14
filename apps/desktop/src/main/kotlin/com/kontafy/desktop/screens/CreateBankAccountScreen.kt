package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.BankAccountRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.math.BigDecimal
import java.util.UUID

@Composable
fun CreateBankAccountScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    bankAccountRepository: BankAccountRepository = BankAccountRepository(),
    onBack: () -> Unit,
    onSaved: () -> Unit,
    showSnackbar: (String) -> Unit = {},
) {
    var bankName by remember { mutableStateOf("") }
    var accountNumber by remember { mutableStateOf("") }
    var ifscCode by remember { mutableStateOf("") }
    var openingBalance by remember { mutableStateOf("") }
    var isSaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val accountTypes = remember {
        listOf(
            DropdownItem("Current", "Current Account"),
            DropdownItem("Savings", "Savings Account"),
            DropdownItem("CC", "Cash Credit"),
            DropdownItem("OD", "Overdraft"),
        )
    }
    var selectedType by remember { mutableStateOf<DropdownItem<String>?>(null) }

    val isValid = bankName.isNotBlank() && accountNumber.isNotBlank() && ifscCode.isNotBlank() && selectedType != null

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Add Bank Account",
            actions = {
                KontafyButton(
                    text = "Back",
                    onClick = onBack,
                    variant = ButtonVariant.Outline,
                )
            },
        )

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.TopCenter,
        ) {
            Card(
                modifier = Modifier.widthIn(max = 560.dp).padding(24.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Column(
                    modifier = Modifier.padding(32.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text(
                        "Bank Account Details",
                        style = MaterialTheme.typography.titleLarge,
                        color = KontafyColors.Ink,
                        fontWeight = FontWeight.SemiBold,
                    )

                    Spacer(Modifier.height(4.dp))

                    KontafyTextField(
                        value = bankName,
                        onValueChange = { bankName = it },
                        label = "Bank Name",
                        placeholder = "e.g. HDFC Bank",
                    )

                    KontafyTextField(
                        value = accountNumber,
                        onValueChange = { accountNumber = it },
                        label = "Account Number",
                        placeholder = "e.g. 50100012345678",
                    )

                    KontafyTextField(
                        value = ifscCode,
                        onValueChange = { ifscCode = it.uppercase() },
                        label = "IFSC Code",
                        placeholder = "e.g. HDFC0001234",
                    )

                    KontafyDropdown(
                        items = accountTypes,
                        selectedItem = selectedType,
                        onItemSelected = { selectedType = it },
                        label = "Account Type",
                        placeholder = "Select account type",
                    )

                    KontafyTextField(
                        value = openingBalance,
                        onValueChange = { openingBalance = it },
                        label = "Opening Balance",
                        placeholder = "0.00",
                    )

                    Spacer(Modifier.height(8.dp))

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
                            text = "Save Account",
                            onClick = {
                                scope.launch {
                                    isSaving = true
                                    val request = CreateBankAccountRequest(
                                        bankName = bankName,
                                        accountNumber = accountNumber,
                                        ifscCode = ifscCode,
                                        accountType = selectedType?.value ?: "Current",
                                        openingBalance = openingBalance.toDoubleOrNull() ?: 0.0,
                                    )
                                    val result = apiClient.createBankAccount(request)
                                    // Save to local database
                                    val balance = BigDecimal.valueOf(openingBalance.toDoubleOrNull() ?: 0.0)
                                    result.fold(
                                        onSuccess = { dto ->
                                            val model = BankAccountModel(
                                                id = dto.id,
                                                orgId = currentOrgId,
                                                bankName = dto.bankName,
                                                accountNumber = dto.accountNumber,
                                                ifscCode = dto.ifscCode,
                                                accountType = dto.accountType,
                                                balance = BigDecimal.valueOf(dto.balance),
                                                isActive = dto.isActive,
                                            )
                                            bankAccountRepository.upsert(model)
                                            showSnackbar("Bank account created successfully")
                                        },
                                        onFailure = {
                                            // API failed — save locally with generated ID
                                            val model = BankAccountModel(
                                                id = UUID.randomUUID().toString(),
                                                orgId = currentOrgId,
                                                bankName = bankName,
                                                accountNumber = accountNumber,
                                                ifscCode = ifscCode,
                                                accountType = selectedType?.value ?: "Current",
                                                balance = balance,
                                                isActive = true,
                                            )
                                            bankAccountRepository.create(model)
                                            showSnackbar("Bank account saved locally")
                                        },
                                    )
                                    isSaving = false
                                    onSaved()
                                }
                            },
                            variant = ButtonVariant.Primary,
                            enabled = isValid && !isSaving,
                            isLoading = isSaving,
                        )
                    }
                }
            }
        }
    }
}
