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
import androidx.compose.ui.unit.dp
import com.kontafy.desktop.api.*
import com.kontafy.desktop.components.*
import com.kontafy.desktop.db.repositories.BankAccountRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch

@Composable
fun BankAccountsScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    bankAccountRepository: BankAccountRepository = BankAccountRepository(),
    onAccountClick: (String) -> Unit,
    onAddAccount: () -> Unit,
    showSnackbar: (String) -> Unit = {},
) {
    var accounts by remember { mutableStateOf<List<BankAccountDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            // First load from local DB for instant display
            try {
                val localAccounts = bankAccountRepository.getByOrgId(currentOrgId)
                if (localAccounts.isNotEmpty()) {
                    accounts = localAccounts.map { model ->
                        BankAccountDto(
                            id = model.id,
                            bankName = model.bankName,
                            accountNumber = model.accountNumber,
                            ifscCode = model.ifscCode ?: "",
                            accountType = model.accountType,
                            balance = model.balance.toDouble(),
                            isActive = model.isActive,
                        )
                    }
                    isLoading = false
                }
            } catch (e: Exception) {
                e.printStackTrace()
                showSnackbar("Failed to load bank accounts: ${e.message}")
            }
            // Then try to refresh from API
            val result = apiClient.getBankAccounts()
            result.fold(
                onSuccess = { accounts = it },
                onFailure = { e ->
                    e.printStackTrace()
                    if (accounts.isEmpty()) showSnackbar("Failed to fetch bank accounts: ${e.message}")
                },
            )
            isLoading = false
        }
    }

    val totalBalance = accounts.sumOf { it.balance }

    Column(
        modifier = Modifier.fillMaxSize().background(KontafyColors.Surface),
    ) {
        TopBar(
            title = "Bank Accounts",
            actions = {
                KontafyButton(
                    text = "Add Account",
                    onClick = onAddAccount,
                    variant = ButtonVariant.Secondary,
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
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Total balance summary
                item {
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = KontafyColors.Navy),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(24.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column {
                                Text(
                                    "Total Balance",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = KontafyColors.White.copy(alpha = 0.7f),
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    formatCurrency(totalBalance),
                                    style = MaterialTheme.typography.displaySmall,
                                    color = KontafyColors.White,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                            Spacer(Modifier.weight(1f))
                            Text(
                                "${accounts.size} accounts",
                                style = MaterialTheme.typography.bodyLarge,
                                color = KontafyColors.White.copy(alpha = 0.7f),
                            )
                        }
                    }
                }

                // Account cards
                items(accounts) { account ->
                    BankAccountCard(
                        account = account,
                        onClick = { onAccountClick(account.id) },
                    )
                }
            }
        }
    }
}

@Composable
private fun BankAccountCard(
    account: BankAccountDto,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        onClick = onClick,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Bank icon
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(12.dp),
                color = KontafyColors.Navy.copy(alpha = 0.1f),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Outlined.AccountBalance,
                        contentDescription = account.bankName,
                        tint = KontafyColors.Navy,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }

            Spacer(Modifier.width(16.dp))

            // Bank details
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    account.bankName,
                    style = MaterialTheme.typography.titleMedium,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        maskAccountNumber(account.accountNumber),
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.Muted,
                    )
                    Text(
                        "IFSC: ${account.ifscCode}",
                        style = MaterialTheme.typography.bodySmall,
                        color = KontafyColors.Muted,
                    )
                }
            }

            // Type badge
            AccountTypeBadge(account.accountType)

            Spacer(Modifier.width(20.dp))

            // Balance
            Text(
                formatCurrency(account.balance),
                style = MaterialTheme.typography.titleLarge,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun AccountTypeBadge(type: String) {
    val (bgColor, textColor) = when (type.lowercase()) {
        "current" -> Color(0xFFDBEAFE) to KontafyColors.StatusSent
        "savings" -> Color(0xFFD1FAE5) to KontafyColors.Green
        "cc" -> Color(0xFFFEF3C7) to KontafyColors.Warning
        "od" -> Color(0xFFFEE2E2) to KontafyColors.StatusOverdue
        else -> KontafyColors.StatusDraftBg to KontafyColors.StatusDraft
    }
    Surface(
        shape = RoundedCornerShape(6.dp),
        color = bgColor,
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        ) {
            Text(
                text = type,
                style = MaterialTheme.typography.labelMedium,
                color = textColor,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

private fun maskAccountNumber(number: String): String {
    if (number.length <= 4) return number
    return "XXXX" + number.takeLast(4)
}
