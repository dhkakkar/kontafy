package com.kontafy.desktop.components

import androidx.compose.animation.*
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kontafy.desktop.navigation.Screen
import com.kontafy.desktop.theme.KontafyColors

data class SidebarItem(
    val screen: Screen,
    val label: String,
    val icon: ImageVector,
    val activeIcon: ImageVector,
)

data class SidebarSection(
    val label: String?,
    val icon: ImageVector? = null,
    val items: List<SidebarItem>,
    val defaultExpanded: Boolean = false,
)

val sidebarSections = listOf(
    SidebarSection(
        label = null,
        items = listOf(
            SidebarItem(Screen.Dashboard, "Dashboard", Icons.Outlined.Dashboard, Icons.Filled.Dashboard),
        ),
    ),
    SidebarSection(
        label = "Invoicing",
        icon = Icons.Outlined.Receipt,
        items = listOf(
            SidebarItem(Screen.InvoiceList, "Invoices", Icons.Outlined.Receipt, Icons.Filled.Receipt),
            SidebarItem(Screen.QuotationList, "Quotations", Icons.Outlined.Description, Icons.Filled.Description),
            SidebarItem(Screen.PurchaseOrderList, "Purchase Orders", Icons.Outlined.ShoppingCart, Icons.Filled.ShoppingCart),
            SidebarItem(Screen.RecurringInvoices, "Recurring", Icons.Outlined.Refresh, Icons.Filled.Refresh),
        ),
    ),
    SidebarSection(
        label = "Contacts",
        icon = Icons.Outlined.People,
        items = listOf(
            SidebarItem(Screen.CustomerList, "Customers", Icons.Outlined.People, Icons.Filled.People),
            SidebarItem(Screen.VendorList, "Vendors", Icons.Outlined.Store, Icons.Filled.Store),
        ),
    ),
    SidebarSection(
        label = "Books",
        icon = Icons.Outlined.MenuBook,
        items = listOf(
            SidebarItem(Screen.ChartOfAccounts, "Chart of Accounts", Icons.Outlined.AccountTree, Icons.Filled.AccountTree),
            SidebarItem(Screen.JournalEntries, "Journal Entries", Icons.Outlined.MenuBook, Icons.Filled.MenuBook),
            SidebarItem(Screen.Ledger(), "Ledger", Icons.Outlined.ListAlt, Icons.Filled.ListAlt),
        ),
    ),
    SidebarSection(
        label = "Inventory",
        icon = Icons.Outlined.Inventory,
        items = listOf(
            SidebarItem(Screen.ProductList, "Products", Icons.Outlined.Inventory, Icons.Filled.Inventory),
            SidebarItem(Screen.StockMovements, "Stock Movements", Icons.Outlined.CompareArrows, Icons.Filled.CompareArrows),
            SidebarItem(Screen.Warehouses, "Warehouses", Icons.Outlined.Store, Icons.Filled.Store),
        ),
    ),
    SidebarSection(
        label = "Banking",
        icon = Icons.Outlined.AccountBalance,
        items = listOf(
            SidebarItem(Screen.BankAccounts, "Bank Accounts", Icons.Outlined.AccountBalance, Icons.Filled.AccountBalance),
        ),
    ),
    SidebarSection(
        label = "Payments",
        icon = Icons.Outlined.Payments,
        items = listOf(
            SidebarItem(Screen.Payments, "All Payments", Icons.Outlined.Payments, Icons.Filled.Payments),
            SidebarItem(Screen.RecordPayment, "Record Payment", Icons.Outlined.AddCard, Icons.Filled.AddCard),
        ),
    ),
    SidebarSection(
        label = "Tax",
        icon = Icons.Outlined.Receipt,
        items = listOf(
            SidebarItem(Screen.GSTDashboard, "GST Dashboard", Icons.Outlined.Receipt, Icons.Filled.Receipt),
            SidebarItem(Screen.GSTR1, "GSTR-1", Icons.Outlined.Description, Icons.Filled.Description),
            SidebarItem(Screen.GSTR3B, "GSTR-3B", Icons.Outlined.Summarize, Icons.Filled.Summarize),
            SidebarItem(Screen.EWayBillList, "E-Way Bills", Icons.Outlined.LocalShipping, Icons.Filled.LocalShipping),
            SidebarItem(Screen.TDS, "TDS", Icons.Outlined.PriceCheck, Icons.Filled.PriceCheck),
        ),
    ),
    SidebarSection(
        label = "Reports",
        icon = Icons.Outlined.BarChart,
        items = listOf(
            SidebarItem(Screen.ReportsHub, "Reports Hub", Icons.Outlined.BarChart, Icons.Filled.BarChart),
            SidebarItem(Screen.TrialBalance, "Trial Balance", Icons.Outlined.Balance, Icons.Filled.Balance),
            SidebarItem(Screen.ProfitLoss, "Profit & Loss", Icons.Outlined.TrendingUp, Icons.Filled.TrendingUp),
            SidebarItem(Screen.BalanceSheet, "Balance Sheet", Icons.Outlined.AccountBalance, Icons.Filled.AccountBalance),
        ),
    ),
    SidebarSection(
        label = null,
        items = listOf(
            SidebarItem(Screen.Shortcuts, "Shortcuts", Icons.Outlined.Keyboard, Icons.Filled.Keyboard),
            SidebarItem(Screen.Settings, "Settings", Icons.Outlined.Settings, Icons.Filled.Settings),
        ),
    ),
)

val syncSidebarItem = SidebarItem(Screen.SyncStatus, "Sync Status", Icons.Outlined.Sync, Icons.Filled.Sync)
val sidebarItems = sidebarSections.flatMap { it.items }

@Composable
fun Sidebar(
    currentScreen: Screen,
    onNavigate: (Screen) -> Unit,
    userName: String,
    onLogout: () -> Unit,
    currentOrgName: String = "",
    organizations: List<Pair<String, String>> = emptyList(),
    onSwitchOrganization: (String, String) -> Unit = { _, _ -> },
    onAddCompany: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var isCollapsed by remember { mutableStateOf(true) }
    val sidebarWidth by animateDpAsState(
        targetValue = if (isCollapsed) 64.dp else 240.dp,
        animationSpec = tween(250),
    )

    // Track which sections are expanded
    val expandedSections = remember {
        mutableStateMapOf<String, Boolean>().apply {
            sidebarSections.forEach { section ->
                section.label?.let { put(it, section.defaultExpanded) }
            }
        }
    }

    // Auto-expand section containing the current screen
    LaunchedEffect(currentScreen) {
        sidebarSections.forEach { section ->
            section.label?.let { label ->
                if (section.items.any { isScreenActive(it.screen, currentScreen) }) {
                    expandedSections[label] = true
                }
            }
        }
    }

    Column(
        modifier = modifier
            .width(sidebarWidth)
            .fillMaxHeight()
            .background(KontafyColors.Navy)
            .padding(vertical = 16.dp),
    ) {
        // Logo / Brand + Collapse toggle
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = if (isCollapsed) 12.dp else 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                modifier = Modifier.size(36.dp),
                shape = RoundedCornerShape(8.dp),
                color = KontafyColors.Green,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        "K",
                        color = KontafyColors.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
            if (!isCollapsed) {
                Spacer(Modifier.width(10.dp))
                Text(
                    "Kontafy",
                    style = MaterialTheme.typography.headlineMedium,
                    color = KontafyColors.White,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        // Collapse/Expand toggle button
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = if (isCollapsed) 12.dp else 16.dp, vertical = 4.dp),
        ) {
            IconButton(
                onClick = { isCollapsed = !isCollapsed },
                modifier = Modifier
                    .size(28.dp)
                    .then(if (isCollapsed) Modifier.align(Alignment.Center) else Modifier),
            ) {
                Icon(
                    if (isCollapsed) Icons.Filled.ChevronRight else Icons.Filled.ChevronLeft,
                    contentDescription = if (isCollapsed) "Expand sidebar" else "Collapse sidebar",
                    tint = KontafyColors.White.copy(alpha = 0.5f),
                    modifier = Modifier.size(20.dp),
                )
            }
        }

        Spacer(Modifier.height(8.dp))

        // Company Switcher
        if (organizations.isNotEmpty()) {
            CompanySwitcher(
                currentOrgName = currentOrgName,
                organizations = organizations,
                onSwitchOrganization = onSwitchOrganization,
                onAddCompany = onAddCompany,
                isCollapsed = isCollapsed,
            )
            Spacer(Modifier.height(4.dp))
            HorizontalDivider(
                modifier = Modifier.padding(horizontal = if (isCollapsed) 8.dp else 16.dp),
                color = KontafyColors.White.copy(alpha = 0.12f),
            )
            Spacer(Modifier.height(4.dp))
        }

        // Scrollable navigation sections
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
        ) {
            sidebarSections.forEach { section ->
                if (section.label != null) {
                    val isExpanded = expandedSections[section.label] ?: false
                    val hasActiveItem = section.items.any { isScreenActive(it.screen, currentScreen) }

                    if (isCollapsed) {
                        // Collapsed: show section icon
                        val sectionIcon = section.icon ?: section.items.firstOrNull()?.icon ?: Icons.Outlined.Folder
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp, vertical = 2.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            IconButton(
                                onClick = {
                                    section.items.firstOrNull()?.let { onNavigate(it.screen) }
                                },
                                modifier = Modifier.size(40.dp),
                            ) {
                                Icon(
                                    sectionIcon,
                                    contentDescription = section.label,
                                    tint = if (hasActiveItem) KontafyColors.Green else KontafyColors.White.copy(alpha = 0.5f),
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        }
                    } else {
                        // Expanded: clickable section header with chevron
                        Spacer(Modifier.height(4.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .clickable {
                                    expandedSections[section.label] = !isExpanded
                                }
                                .padding(horizontal = 12.dp, vertical = 7.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = section.label.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = if (hasActiveItem) KontafyColors.White.copy(alpha = 0.7f) else KontafyColors.White.copy(alpha = 0.4f),
                                letterSpacing = 1.sp,
                                fontWeight = if (hasActiveItem) FontWeight.Bold else FontWeight.Normal,
                                modifier = Modifier.weight(1f),
                            )
                            Icon(
                                Icons.Filled.ExpandMore,
                                contentDescription = if (isExpanded) "Collapse" else "Expand",
                                tint = KontafyColors.White.copy(alpha = 0.35f),
                                modifier = Modifier
                                    .size(16.dp)
                                    .rotate(if (isExpanded) 0f else -90f),
                            )
                        }

                        // Animated expand/collapse of items
                        AnimatedVisibility(
                            visible = isExpanded,
                            enter = expandVertically(animationSpec = tween(200)) + fadeIn(animationSpec = tween(200)),
                            exit = shrinkVertically(animationSpec = tween(200)) + fadeOut(animationSpec = tween(150)),
                        ) {
                            Column {
                                section.items.forEach { item ->
                                    val isActive = isScreenActive(item.screen, currentScreen)
                                    SidebarNavItem(
                                        label = item.label,
                                        icon = if (isActive) item.activeIcon else item.icon,
                                        isActive = isActive,
                                        onClick = { onNavigate(item.screen) },
                                        isCollapsed = false,
                                    )
                                }
                            }
                        }
                    }
                } else {
                    // Unlabeled section (Dashboard, Settings, Shortcuts)
                    // Add a divider before the bottom unlabeled section (not the top Dashboard one)
                    if (section.items.any { it.screen is Screen.Shortcuts || it.screen is Screen.Settings }) {
                        if (!isCollapsed) {
                            Spacer(Modifier.height(6.dp))
                            HorizontalDivider(
                                modifier = Modifier.padding(horizontal = 16.dp),
                                color = KontafyColors.White.copy(alpha = 0.12f),
                            )
                            Spacer(Modifier.height(6.dp))
                        }
                    }
                    section.items.forEach { item ->
                        val isActive = isScreenActive(item.screen, currentScreen)
                        SidebarNavItem(
                            label = item.label,
                            icon = if (isActive) item.activeIcon else item.icon,
                            isActive = isActive,
                            onClick = { onNavigate(item.screen) },
                            isCollapsed = isCollapsed,
                        )
                    }
                }
            }
        }

        // Sync status at bottom
        val isSyncActive = isScreenActive(syncSidebarItem.screen, currentScreen)
        SyncStatusIndicator(
            isActive = isSyncActive,
            onClick = { onNavigate(Screen.SyncStatus) },
            isCollapsed = isCollapsed,
        )

        Spacer(Modifier.height(6.dp))

        HorizontalDivider(
            modifier = Modifier.padding(horizontal = if (isCollapsed) 8.dp else 16.dp),
            color = KontafyColors.White.copy(alpha = 0.12f),
        )

        Spacer(Modifier.height(8.dp))

        // User info + Logout
        if (isCollapsed) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Surface(
                    modifier = Modifier.size(32.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = KontafyColors.Green.copy(alpha = 0.3f),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            userName.take(1).uppercase(),
                            color = KontafyColors.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                        )
                    }
                }
                Spacer(Modifier.height(4.dp))
                IconButton(
                    onClick = onLogout,
                    modifier = Modifier.size(24.dp),
                ) {
                    Icon(
                        Icons.Outlined.Logout,
                        contentDescription = "Logout",
                        tint = KontafyColors.White.copy(alpha = 0.5f),
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        } else {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    modifier = Modifier.size(32.dp),
                    shape = RoundedCornerShape(16.dp),
                    color = KontafyColors.Green.copy(alpha = 0.3f),
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            userName.take(1).uppercase(),
                            color = KontafyColors.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                        )
                    }
                }
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        userName,
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.White,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                IconButton(
                    onClick = onLogout,
                    modifier = Modifier.size(28.dp),
                ) {
                    Icon(
                        Icons.Outlined.Logout,
                        contentDescription = "Logout",
                        tint = KontafyColors.White.copy(alpha = 0.6f),
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}

private fun isScreenActive(sidebarScreen: Screen, currentScreen: Screen): Boolean {
    return when {
        sidebarScreen is Screen.InvoiceList && currentScreen is Screen.InvoiceDetail -> true
        sidebarScreen is Screen.InvoiceList && currentScreen is Screen.InvoiceList -> true
        sidebarScreen is Screen.InvoiceList && currentScreen is Screen.CreateInvoice -> true
        sidebarScreen is Screen.InvoiceList && currentScreen is Screen.EditInvoice -> true
        sidebarScreen is Screen.CustomerList && currentScreen is Screen.CustomerDetail -> true
        sidebarScreen is Screen.CustomerList && currentScreen is Screen.CreateCustomer -> true
        sidebarScreen is Screen.CustomerList && currentScreen is Screen.EditCustomer -> true
        sidebarScreen is Screen.JournalEntries && currentScreen is Screen.CreateJournalEntry -> true
        sidebarScreen is Screen.Ledger && currentScreen is Screen.Ledger -> true
        sidebarScreen is Screen.GSTDashboard && currentScreen is Screen.GSTCompute -> true
        sidebarScreen is Screen.BankAccounts && currentScreen is Screen.BankRegister -> true
        sidebarScreen is Screen.BankAccounts && currentScreen is Screen.BankReconciliation -> true
        sidebarScreen is Screen.BankAccounts && currentScreen is Screen.CreateBankAccount -> true
        sidebarScreen is Screen.Payments && currentScreen is Screen.RecordPayment -> false
        sidebarScreen is Screen.ProductList && currentScreen is Screen.ProductDetail -> true
        sidebarScreen is Screen.ProductList && currentScreen is Screen.CreateProduct -> true
        sidebarScreen is Screen.StockMovements && currentScreen is Screen.StockAdjustment -> true
        sidebarScreen is Screen.EWayBillList && currentScreen is Screen.GenerateEWayBill -> true
        sidebarScreen is Screen.EWayBillList && currentScreen is Screen.EWayBillDetail -> true
        sidebarScreen::class == currentScreen::class -> true
        else -> sidebarScreen == currentScreen
    }
}

@Composable
private fun SyncStatusIndicator(
    isActive: Boolean,
    onClick: () -> Unit,
    isCollapsed: Boolean,
) {
    val bgColor = if (isActive) KontafyColors.White.copy(alpha = 0.12f) else KontafyColors.Navy

    if (isCollapsed) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 2.dp),
            contentAlignment = Alignment.Center,
        ) {
            IconButton(
                onClick = onClick,
                modifier = Modifier.size(40.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Outlined.Sync,
                        contentDescription = "Sync Status",
                        tint = if (isActive) KontafyColors.Green else KontafyColors.White.copy(alpha = 0.5f),
                        modifier = Modifier.size(20.dp),
                    )
                    Surface(
                        modifier = Modifier
                            .size(6.dp)
                            .align(Alignment.TopEnd),
                        shape = RoundedCornerShape(3.dp),
                        color = KontafyColors.Green,
                    ) {}
                }
            }
        }
    } else {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 2.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(bgColor)
                .clickable(onClick = onClick)
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Outlined.Sync,
                contentDescription = "Sync Status",
                tint = if (isActive) KontafyColors.Green else KontafyColors.White.copy(alpha = 0.65f),
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(12.dp))
            Text(
                "Sync Status",
                style = MaterialTheme.typography.bodyLarge,
                color = if (isActive) KontafyColors.White else KontafyColors.White.copy(alpha = 0.65f),
                fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
            )
            Spacer(Modifier.weight(1f))
            Surface(
                modifier = Modifier.size(8.dp),
                shape = RoundedCornerShape(4.dp),
                color = KontafyColors.Green,
            ) {}
        }
    }
}

@Composable
private fun SidebarNavItem(
    label: String,
    icon: ImageVector,
    isActive: Boolean,
    onClick: () -> Unit,
    isCollapsed: Boolean,
) {
    val bgColor = if (isActive) KontafyColors.White.copy(alpha = 0.12f) else KontafyColors.Navy
    val iconColor = if (isActive) KontafyColors.Green else KontafyColors.White.copy(alpha = 0.65f)

    if (isCollapsed) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 1.dp),
            contentAlignment = Alignment.Center,
        ) {
            IconButton(
                onClick = onClick,
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(bgColor),
            ) {
                Icon(
                    icon,
                    contentDescription = label,
                    tint = iconColor,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    } else {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 1.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(bgColor)
                .clickable(onClick = onClick)
                .padding(horizontal = 12.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = iconColor,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(12.dp))
            Text(
                label,
                style = MaterialTheme.typography.bodyMedium,
                color = if (isActive) KontafyColors.White else KontafyColors.White.copy(alpha = 0.65f),
                fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )

            if (isActive) {
                Spacer(Modifier.weight(1f))
                Surface(
                    modifier = Modifier.size(5.dp),
                    shape = RoundedCornerShape(3.dp),
                    color = KontafyColors.Green,
                ) {}
            }
        }
    }
}

@Composable
private fun CompanySwitcher(
    currentOrgName: String,
    organizations: List<Pair<String, String>>,
    onSwitchOrganization: (String, String) -> Unit,
    onAddCompany: () -> Unit,
    isCollapsed: Boolean,
) {
    var expanded by remember { mutableStateOf(false) }

    if (isCollapsed) {
        // Collapsed: just show a building icon that opens the dropdown
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 2.dp),
            contentAlignment = Alignment.Center,
        ) {
            Box {
                IconButton(
                    onClick = { expanded = !expanded },
                    modifier = Modifier.size(40.dp),
                ) {
                    Icon(
                        Icons.Outlined.Business,
                        contentDescription = "Switch Company",
                        tint = KontafyColors.Green,
                        modifier = Modifier.size(20.dp),
                    )
                }

                DropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false },
                    modifier = Modifier
                        .background(KontafyColors.SurfaceElevated)
                        .widthIn(min = 200.dp),
                ) {
                    organizations.forEach { (orgId, orgName) ->
                        val isSelected = orgName == currentOrgName
                        DropdownMenuItem(
                            text = {
                                Text(
                                    orgName,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) KontafyColors.Navy else KontafyColors.Ink,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            },
                            onClick = {
                                expanded = false
                                onSwitchOrganization(orgId, orgName)
                            },
                            leadingIcon = {
                                Icon(
                                    Icons.Filled.Business,
                                    contentDescription = null,
                                    tint = if (isSelected) KontafyColors.Navy else KontafyColors.Muted,
                                    modifier = Modifier.size(18.dp),
                                )
                            },
                            modifier = if (isSelected) {
                                Modifier.background(KontafyColors.Navy.copy(alpha = 0.08f))
                            } else {
                                Modifier
                            },
                        )
                    }

                    HorizontalDivider(color = KontafyColors.Border)

                    DropdownMenuItem(
                        text = {
                            Text(
                                "+ Add Company",
                                fontWeight = FontWeight.Medium,
                                color = KontafyColors.Green,
                            )
                        },
                        onClick = {
                            expanded = false
                            onAddCompany()
                        },
                        leadingIcon = {
                            Icon(
                                Icons.Filled.Add,
                                contentDescription = null,
                                tint = KontafyColors.Green,
                                modifier = Modifier.size(18.dp),
                            )
                        },
                    )
                }
            }
        }
    } else {
        // Expanded sidebar: show full company switcher
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp),
        ) {
            Box {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(KontafyColors.White.copy(alpha = 0.08f))
                        .border(
                            width = 1.dp,
                            color = KontafyColors.White.copy(alpha = 0.15f),
                            shape = RoundedCornerShape(8.dp),
                        )
                        .clickable { expanded = !expanded }
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Filled.Business,
                        contentDescription = null,
                        tint = KontafyColors.Green,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        text = currentOrgName.ifEmpty { "Select Company" },
                        style = MaterialTheme.typography.bodyMedium,
                        color = KontafyColors.White,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Icon(
                        Icons.Filled.ExpandMore,
                        contentDescription = if (expanded) "Close" else "Open",
                        tint = KontafyColors.White.copy(alpha = 0.5f),
                        modifier = Modifier
                            .size(18.dp)
                            .rotate(if (expanded) 180f else 0f),
                    )
                }

                DropdownMenu(
                    expanded = expanded,
                    onDismissRequest = { expanded = false },
                    modifier = Modifier
                        .background(KontafyColors.SurfaceElevated)
                        .widthIn(min = 200.dp),
                ) {
                    organizations.forEach { (orgId, orgName) ->
                        val isSelected = orgName == currentOrgName
                        DropdownMenuItem(
                            text = {
                                Text(
                                    orgName,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) KontafyColors.Navy else KontafyColors.Ink,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            },
                            onClick = {
                                expanded = false
                                onSwitchOrganization(orgId, orgName)
                            },
                            leadingIcon = {
                                Icon(
                                    Icons.Filled.Business,
                                    contentDescription = null,
                                    tint = if (isSelected) KontafyColors.Navy else KontafyColors.Muted,
                                    modifier = Modifier.size(18.dp),
                                )
                            },
                            modifier = if (isSelected) {
                                Modifier.background(KontafyColors.Navy.copy(alpha = 0.08f))
                            } else {
                                Modifier
                            },
                        )
                    }

                    HorizontalDivider(color = KontafyColors.Border)

                    DropdownMenuItem(
                        text = {
                            Text(
                                "+ Add Company",
                                fontWeight = FontWeight.Medium,
                                color = KontafyColors.Green,
                            )
                        },
                        onClick = {
                            expanded = false
                            onAddCompany()
                        },
                        leadingIcon = {
                            Icon(
                                Icons.Filled.Add,
                                contentDescription = null,
                                tint = KontafyColors.Green,
                                modifier = Modifier.size(18.dp),
                            )
                        },
                    )
                }
            }
        }
    }
}
