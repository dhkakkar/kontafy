package com.kontafy.desktop.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.window.Dialog
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
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
import com.kontafy.desktop.db.repositories.AccountRepository
import com.kontafy.desktop.theme.KontafyColors
import kotlinx.coroutines.launch
import java.util.UUID

private object AccountTypeColors {
    val Asset = Color(0xFF3B82F6)
    val AssetBg = Color(0xFFDBEAFE)
    val Liability = Color(0xFFEF4444)
    val LiabilityBg = Color(0xFFFEE2E2)
    val Equity = Color(0xFF8B5CF6)
    val EquityBg = Color(0xFFEDE9FE)
    val Income = Color(0xFF10B981)
    val IncomeBg = Color(0xFFD1FAE5)
    val Expense = Color(0xFFF59E0B)
    val ExpenseBg = Color(0xFFFEF3C7)

    fun colorFor(type: String): Color = when (type.uppercase()) {
        "ASSET" -> Asset
        "LIABILITY" -> Liability
        "EQUITY" -> Equity
        "INCOME" -> Income
        "EXPENSE" -> Expense
        else -> KontafyColors.Muted
    }

    fun bgColorFor(type: String): Color = when (type.uppercase()) {
        "ASSET" -> AssetBg
        "LIABILITY" -> LiabilityBg
        "EQUITY" -> EquityBg
        "INCOME" -> IncomeBg
        "EXPENSE" -> ExpenseBg
        else -> KontafyColors.StatusDraftBg
    }
}

@Composable
fun ChartOfAccountsScreen(
    apiClient: ApiClient,
    currentOrgId: String,
    accountRepository: AccountRepository = AccountRepository(),
    onAccountClick: (String) -> Unit,
) {
    var accounts by remember { mutableStateOf<List<AccountDto>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }
    var editingAccount by remember { mutableStateOf<AccountDto?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        scope.launch {
            // Load from local DB first, build tree structure
            val dbAccounts = try {
                accountRepository.getByOrgId(currentOrgId).map { it.toDto() }
            } catch (e: Exception) { e.printStackTrace(); emptyList() }

            if (dbAccounts.isNotEmpty()) {
                accounts = buildAccountTree(dbAccounts)
            } else {
                val result = apiClient.getAccounts()
                result.fold(
                    onSuccess = { accounts = it },
                    onFailure = { it.printStackTrace() },
                )
            }
            isLoading = false
        }
    }

    val displayAccounts = accounts
    val filteredAccounts = if (searchQuery.isBlank()) displayAccounts else {
        displayAccounts.flatMap { flattenAccounts(it) }
            .filter {
                it.name.contains(searchQuery, ignoreCase = true) ||
                    it.code.contains(searchQuery, ignoreCase = true)
            }
    }

    Column(modifier = Modifier.fillMaxSize().background(KontafyColors.Surface)) {
        TopBar(
            title = "Chart of Accounts",
            showSearch = true,
            searchQuery = searchQuery,
            onSearchChange = { searchQuery = it },
            actions = {
                KontafyButton(
                    text = "Add Account",
                    onClick = { showAddDialog = true },
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
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                // Table header
                item {
                    AccountTableHeader()
                }

                if (searchQuery.isBlank()) {
                    // Tree view grouped by type
                    val grouped = displayAccounts.groupBy { it.type.uppercase() }
                    val typeOrder = listOf("ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE")

                    typeOrder.forEach { type ->
                        val typeAccounts = grouped[type] ?: emptyList()
                        if (typeAccounts.isNotEmpty()) {
                            item {
                                AccountGroupHeader(type)
                            }
                            typeAccounts.forEach { account ->
                                item(key = account.id) {
                                    AccountTreeNode(
                                        account = account,
                                        depth = 0,
                                        onClick = { onAccountClick(it) },
                                        onEdit = { editingAccount = it },
                                    )
                                }
                            }
                        }
                    }
                } else {
                    items(filteredAccounts, key = { it.id }) { account ->
                        AccountRow(
                            account = account,
                            depth = 0,
                            onClick = { onAccountClick(account.id) },
                            onEdit = { editingAccount = account },
                        )
                    }
                }
            }
        }
    }

    if (showAddDialog || editingAccount != null) {
        AddEditAccountDialog(
            account = editingAccount,
            allAccounts = displayAccounts.flatMap { flattenAccounts(it) },
            onDismiss = {
                showAddDialog = false
                editingAccount = null
            },
            onSave = { request ->
                scope.launch {
                    val accountId = editingAccount?.id ?: UUID.randomUUID().toString()
                    // Save locally
                    try {
                        val model = AccountModel(
                            id = accountId,
                            orgId = currentOrgId,
                            code = request.code,
                            name = request.name,
                            type = request.type,
                            parentId = request.parentId,
                            isGroup = request.isGroup,
                            openingBalance = java.math.BigDecimal.valueOf(request.openingBalance),
                            description = request.description,
                        )
                        accountRepository.upsert(model)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }

                    // Also try API
                    try {
                        if (editingAccount != null) {
                            apiClient.updateAccount(editingAccount!!.id, request)
                        } else {
                            apiClient.createAccount(request)
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }

                    // Refresh from local DB
                    val dbAccounts = try {
                        accountRepository.getByOrgId(currentOrgId).map { it.toDto() }
                    } catch (e: Exception) { e.printStackTrace(); emptyList() }
                    if (dbAccounts.isNotEmpty()) {
                        accounts = buildAccountTree(dbAccounts)
                    }
                }
                showAddDialog = false
                editingAccount = null
            },
        )
    }
}

@Composable
private fun AccountTableHeader() {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = KontafyColors.Surface,
        shape = RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("Code", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
            Text("Account Name", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.weight(1f))
            Text("Type", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(100.dp))
            Text("Balance", style = MaterialTheme.typography.labelMedium, color = KontafyColors.Muted, modifier = Modifier.width(140.dp))
        }
    }
}

@Composable
private fun AccountGroupHeader(type: String) {
    val color = AccountTypeColors.colorFor(type)
    Surface(
        modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        color = AccountTypeColors.bgColorFor(type).copy(alpha = 0.5f),
        shape = RoundedCornerShape(8.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(8.dp),
                shape = RoundedCornerShape(4.dp),
                color = color,
            ) {}
            Spacer(Modifier.width(10.dp))
            Text(
                text = type.lowercase().replaceFirstChar { it.uppercase() },
                style = MaterialTheme.typography.titleSmall,
                color = color,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun AccountTreeNode(
    account: AccountDto,
    depth: Int,
    onClick: (String) -> Unit,
    onEdit: (AccountDto) -> Unit,
) {
    var expanded by remember { mutableStateOf(true) }

    Column {
        AccountRow(
            account = account,
            depth = depth,
            isExpandable = account.isGroup && account.children.isNotEmpty(),
            isExpanded = expanded,
            onToggleExpand = { expanded = !expanded },
            onClick = { onClick(account.id) },
            onEdit = { onEdit(account) },
        )

        if (expanded && account.children.isNotEmpty()) {
            account.children.forEach { child ->
                AccountTreeNode(
                    account = child,
                    depth = depth + 1,
                    onClick = onClick,
                    onEdit = onEdit,
                )
            }
        }
    }
}

@Composable
private fun AccountRow(
    account: AccountDto,
    depth: Int,
    isExpandable: Boolean = false,
    isExpanded: Boolean = false,
    onToggleExpand: () -> Unit = {},
    onClick: () -> Unit,
    onEdit: () -> Unit,
) {
    val typeColor = AccountTypeColors.colorFor(account.type)
    val typeBgColor = AccountTypeColors.bgColorFor(account.type)

    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        color = KontafyColors.SurfaceElevated,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(start = (20 + depth * 24).dp, end = 20.dp, top = 12.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (isExpandable) {
                IconButton(
                    onClick = onToggleExpand,
                    modifier = Modifier.size(24.dp),
                ) {
                    Icon(
                        if (isExpanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                        contentDescription = if (isExpanded) "Collapse" else "Expand",
                        tint = KontafyColors.Muted,
                        modifier = Modifier.size(18.dp),
                    )
                }
                Spacer(Modifier.width(4.dp))
            } else {
                Spacer(Modifier.width(28.dp))
            }

            // Code
            Text(
                text = account.code,
                style = MaterialTheme.typography.bodyMedium,
                color = KontafyColors.Muted,
                modifier = Modifier.width(72.dp),
            )

            // Name
            Text(
                text = account.name,
                style = MaterialTheme.typography.bodyLarge,
                color = KontafyColors.Ink,
                fontWeight = if (account.isGroup) FontWeight.SemiBold else FontWeight.Normal,
                modifier = Modifier.weight(1f),
            )

            // Type badge
            Surface(
                shape = RoundedCornerShape(6.dp),
                color = typeBgColor,
                modifier = Modifier.width(90.dp),
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)) {
                    Text(
                        text = account.type.lowercase().replaceFirstChar { it.uppercase() },
                        style = MaterialTheme.typography.labelSmall,
                        color = typeColor,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Spacer(Modifier.width(16.dp))

            // Balance
            Text(
                text = formatCurrency(account.currentBalance),
                style = MaterialTheme.typography.bodyLarge,
                color = KontafyColors.Ink,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.width(140.dp),
            )
        }
    }
    HorizontalDivider(color = KontafyColors.BorderLight)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddEditAccountDialog(
    account: AccountDto?,
    allAccounts: List<AccountDto>,
    onDismiss: () -> Unit,
    onSave: (CreateAccountRequest) -> Unit,
) {
    var name by remember { mutableStateOf(account?.name ?: "") }
    var code by remember { mutableStateOf(account?.code ?: "") }
    var type by remember { mutableStateOf(account?.type ?: "ASSET") }
    var parentId by remember { mutableStateOf(account?.parentId) }
    var isGroup by remember { mutableStateOf(account?.isGroup ?: false) }
    var openingBalance by remember { mutableStateOf(account?.openingBalance?.toString() ?: "0") }
    var description by remember { mutableStateOf(account?.description ?: "") }
    var typeExpanded by remember { mutableStateOf(false) }
    var parentExpanded by remember { mutableStateOf(false) }

    val accountTypes = listOf("ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE")
    val groupAccounts = allAccounts.filter { it.isGroup }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier.width(500.dp).heightIn(max = 600.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = KontafyColors.SurfaceElevated),
            elevation = CardDefaults.cardElevation(8.dp),
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    if (account != null) "Edit Account" else "Add Account",
                    style = MaterialTheme.typography.headlineSmall,
                    color = KontafyColors.Ink,
                    fontWeight = FontWeight.Bold,
                )

                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = KontafyColors.Border)
                Spacer(Modifier.height(16.dp))

                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState()),
                ) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Account Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(8.dp),
                    )
                    OutlinedTextField(
                        value = code,
                        onValueChange = { code = it },
                        label = { Text("Account Code") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(8.dp),
                    )

                    // Type dropdown
                    ExposedDropdownMenuBox(
                        expanded = typeExpanded,
                        onExpandedChange = { typeExpanded = !typeExpanded },
                    ) {
                        OutlinedTextField(
                            value = type.lowercase().replaceFirstChar { it.uppercase() },
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Account Type") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = typeExpanded) },
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                            shape = RoundedCornerShape(8.dp),
                        )
                        ExposedDropdownMenu(
                            expanded = typeExpanded,
                            onDismissRequest = { typeExpanded = false },
                        ) {
                            accountTypes.forEach { t ->
                                DropdownMenuItem(
                                    text = { Text(t.lowercase().replaceFirstChar { it.uppercase() }) },
                                    onClick = {
                                        type = t
                                        typeExpanded = false
                                    },
                                )
                            }
                        }
                    }

                    // Parent account
                    ExposedDropdownMenuBox(
                        expanded = parentExpanded,
                        onExpandedChange = { parentExpanded = !parentExpanded },
                    ) {
                        OutlinedTextField(
                            value = groupAccounts.find { it.id == parentId }?.name ?: "None (Top Level)",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Parent Account") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = parentExpanded) },
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                            shape = RoundedCornerShape(8.dp),
                        )
                        ExposedDropdownMenu(
                            expanded = parentExpanded,
                            onDismissRequest = { parentExpanded = false },
                        ) {
                            DropdownMenuItem(
                                text = { Text("None (Top Level)") },
                                onClick = {
                                    parentId = null
                                    parentExpanded = false
                                },
                            )
                            groupAccounts.forEach { ga ->
                                DropdownMenuItem(
                                    text = { Text("${ga.code} - ${ga.name}") },
                                    onClick = {
                                        parentId = ga.id
                                        parentExpanded = false
                                    },
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = openingBalance,
                        onValueChange = { openingBalance = it },
                        label = { Text("Opening Balance") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(8.dp),
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = isGroup, onCheckedChange = { isGroup = it })
                        Spacer(Modifier.width(4.dp))
                        Text("Is Group (contains sub-accounts)", style = MaterialTheme.typography.bodyMedium, color = KontafyColors.Ink)
                    }

                    OutlinedTextField(
                        value = description,
                        onValueChange = { description = it },
                        label = { Text("Description") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2,
                        maxLines = 3,
                        shape = RoundedCornerShape(8.dp),
                    )
                }

                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = KontafyColors.Border)
                Spacer(Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    KontafyButton(
                        text = "Cancel",
                        onClick = onDismiss,
                        variant = ButtonVariant.Outline,
                    )
                    Spacer(Modifier.width(8.dp))
                    KontafyButton(
                        text = if (account != null) "Update" else "Create",
                        onClick = {
                            onSave(
                                CreateAccountRequest(
                                    code = code,
                                    name = name,
                                    type = type,
                                    parentId = parentId,
                                    isGroup = isGroup,
                                    openingBalance = openingBalance.toDoubleOrNull() ?: 0.0,
                                    description = description.ifBlank { null },
                                ),
                            )
                        },
                        variant = ButtonVariant.Primary,
                    )
                }
            }
        }
    }
}

private fun flattenAccounts(account: AccountDto): List<AccountDto> {
    return listOf(account) + account.children.flatMap { flattenAccounts(it) }
}

private fun buildAccountTree(flatAccounts: List<AccountDto>): List<AccountDto> {
    val byId = flatAccounts.associateBy { it.id }
    val childrenMap = flatAccounts.groupBy { it.parentId }

    fun buildNode(account: AccountDto): AccountDto {
        val children = childrenMap[account.id]?.map { buildNode(it) } ?: emptyList()
        return account.copy(children = children)
    }

    // Root accounts have no parentId or parentId not in the map
    return flatAccounts
        .filter { it.parentId == null || !byId.containsKey(it.parentId) }
        .map { buildNode(it) }
}
